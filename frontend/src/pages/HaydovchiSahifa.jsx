// Ҳайдовчи саҳифаси — socket билан реал вақтда уланган
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useSocket } from '../services/useSocket';
import Kirish from '../components/Kirish';
import Chat from '../components/Chat';
import Baholash from '../components/Baholash';
import MashinaProfili, { mashinaMatn } from '../components/MashinaProfili';
import HaritaPreview, { parseLatLng } from '../components/HaritaPreview';
import { useToast } from '../components/Toast';
import IssiqXarita from '../components/IssiqXarita';
import SOS from '../components/SOS';
import Obuna from '../components/Obuna';
import { bildir, ruxsatSora } from '../services/bildirishnoma';
import { useT, TilTanlovchi } from '../i18n';
import { TemaTanlovchi } from '../theme';

export default function HaydovchiSahifa() {
  const [user, setUser] = useState(() => {
    const saqlangan = localStorage.getItem('user');
    if (!saqlangan) return null;
    try {
      const u = JSON.parse(saqlangan);
      return u.rol === 'haydovchi' ? u : null;
    } catch {
      return null;
    }
  });

  if (!user) return <Kirish kerakliRol="haydovchi" sarlavhaKey="login.titleDriver" onKirildi={setUser} />;

  return <Ichki user={user} onChiqish={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); }} />;
}

function Ichki({ user, onChiqish }) {
  const navigate = useNavigate();
  const { t } = useT();
  const toast = useToast();
  const [onlayn, setOnlayn] = useState(false);
  const [buyurtmalar, setBuyurtmalar] = useState([]);
  const [tanlangan, setTanlangan] = useState(null);
  const [oznarx, setOznarx] = useState(0);
  const [stats, setStats] = useState({ daromad: 0, safar: 0 });
  const [faolSafar, setFaolSafar] = useState(null); // {rideId, narx, mijoz_ism, holati: 'kelmoqda'|'yetib_keldi'|'yolda', kelgan_vaqti, kutish_haqi}
  const [chatOchiq, setChatOchiq] = useState(false);
  const [hozir, setHozir] = useState(Date.now()); // таймер учун
  const [baholashUchun, setBaholashUchun] = useState(null); // {rideId, ism} — модаль очилади
  const [mashina, setMashina] = useState(null); // {mashina_modeli, mashina_raqami, mashina_rangi}
  const [profilOchiq, setProfilOchiq] = useState(false);
  const [issiqOchiq, setIssiqOchiq] = useState(false);
  const [obunaOchiq, setObunaOchiq] = useState(false);
  const [obuna, setObuna] = useState(null); // faol subscription
  const [joylashuvOchiqmi, setJoylashuvOchiqmi] = useState(false); // GPS таклиф қилинганми

  const statsYukla = async () => {
    try {
      const { data } = await api.get('/driver/stats');
      setStats(data);
    } catch {}
  };
  const profilYukla = async () => {
    try {
      const { data } = await api.get('/driver/profile');
      setMashina(data);
    } catch {}
  };
  const obunaYukla = async () => {
    try {
      const { data } = await api.get('/driver/subscription');
      setObuna(data.faol);
    } catch {}
  };
  useEffect(() => { statsYukla(); profilYukla(); obunaYukla(); ruxsatSora(); }, []);

  // Обуна қолган кунлар
  const obunaKun = obuna?.tugash_sana ? Math.max(0, Math.ceil((new Date(obuna.tugash_sana) - new Date()) / 86400000)) : 0;
  const obunaBormi = !!obuna && obunaKun > 0;

  const mashinaToldirilganmi = !!(mashina?.mashina_modeli && mashina?.mashina_raqami);
  const mashinaJamiMatn = mashinaMatn(mashina);

  // Сафар фаол бўлганда — браузернинг geolocation API'си орқали жонли GPS юбориш
  useEffect(() => {
    if (!faolSafar) { setJoylashuvOchiqmi(false); return; }
    if (!('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setJoylashuvOchiqmi(true);
        yubor('joylashuv', { rideId: faolSafar.rideId, lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => { console.warn('Geolocation:', err.message); setJoylashuvOchiqmi(false); },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faolSafar]);

  const { yubor } = useSocket({
    obuna_kerak: () => {
      toast.error(t('sub.requiredToOnline'));
      setObunaOchiq(true);
      setOnlayn(false);
    },
    buyurtma_keldi: (b) => {
      setBuyurtmalar((oldin) => [...oldin, b]);
      bildir(t('notif.newOrder'), `${Number(b.narx).toLocaleString()} · ${b.boshlanish} → ${b.tugash}`, { tag: `buyurtma-${b.id}` });
    },
    mavjud_buyurtmalar: (royxat) => setBuyurtmalar(royxat),
    buyurtma_yopildi: ({ rideId }) => {
      setBuyurtmalar((oldin) => oldin.filter((x) => x.id !== rideId));
    },
    // Чат ёпиқ бўлганда хабар келса — билдирамиз
    xabar_keldi: (x) => {
      if (Number(x.yuboruvchi_id) === Number(user.id)) return; // ўз хабарим
      if (!chatOchiq) bildir(`💬 ${x.yuboruvchi_ism}`, x.matn, { tag: `chat-${x.ride_id}` });
    },
    // Йўловчи мени танлади — сафар бошланди (ҳайдовчи "келмоқда" ҳолатда)
    tasdiqlandi: (data) => {
      if (data.haydovchi_id === user.id) {
        setFaolSafar({ rideId: data.rideId, narx: data.narx, mijoz_ism: data.mijoz_ism, holati: 'kelmoqda', kutish_haqi: 0 });
      }
    },
    // Кутиш ҳақи ҳисобланди — нархни янгилаймиз
    holat_yangilandi: (data) => {
      if (!faolSafar || Number(data.rideId) !== Number(faolSafar.rideId)) return;
      if (data.holat === 'yolda' && data.yangi_narx != null) {
        setFaolSafar((s) => s && ({ ...s, holati: 'yolda', narx: data.yangi_narx, kutish_haqi: data.kutish_haqi || 0 }));
      }
    },
  });

  // Кутиш ҳолатида таймерни ҳар сонияда янгилаймиз (UI учун)
  useEffect(() => {
    if (faolSafar?.holati !== 'yetib_keldi') return;
    const id = setInterval(() => setHozir(Date.now()), 1000);
    return () => clearInterval(id);
  }, [faolSafar?.holati]);

  // Ҳайдовчи "Етиб келдим" дейди — кутиш таймери бошланади
  const yetibKeldim = () => {
    if (!faolSafar) return;
    yubor('safar_holati', { rideId: faolSafar.rideId, holat: 'yetib_keldi' });
    setFaolSafar((s) => s && ({ ...s, holati: 'yetib_keldi', kelgan_vaqti: Date.now() }));
  };

  // Ҳайдовчи "Йўлга чиқдик" дейди — кутиш таймери тўхтайди, кутиш ҳақи нархга қўшилади
  const yolgaChiqdik = () => {
    if (!faolSafar) return;
    yubor('safar_holati', { rideId: faolSafar.rideId, holat: 'yolda' });
    // narx ва kutish_haqi server holat_yangilandi'дан келади
  };

  // Сафар тугатиш — backend rides.holat = 'yakunlandi', сўнг баҳолаш модаль
  const safarTugatish = () => {
    if (!faolSafar) return;
    yubor('safar_holati', { rideId: faolSafar.rideId, holat: 'yakunlandi' });
    setBaholashUchun({ rideId: faolSafar.rideId, ism: faolSafar.mijoz_ism || 'Йўловчи' });
    setFaolSafar(null);
    setChatOchiq(false);
    setTimeout(statsYukla, 600);
  };

  // Кутиш дисплейи: дақиқа:сония + ҳақ (агар грация ўтган бўлса)
  const kutishHisobi = () => {
    if (faolSafar?.holati !== 'yetib_keldi' || !faolSafar.kelgan_vaqti) return null;
    const sek = Math.max(0, Math.floor((hozir - faolSafar.kelgan_vaqti) / 1000));
    const mm = String(Math.floor(sek / 60)).padStart(2, '0');
    const ss = String(sek % 60).padStart(2, '0');
    const tekin = 3 * 60;
    // floor — backend билан мос (фақат тўла пуллик дақиқалар)
    const haqDaq = sek > tekin ? Math.floor((sek - tekin) / 60) : 0;
    const haq = haqDaq * 500;
    return { vaqt: `${mm}:${ss}`, haq, tekin: sek <= tekin };
  };
  const kutish = kutishHisobi();

  // Онлайн/офлайн ўзгартириш
  const statusOzgartir = () => {
    const yangi = !onlayn;
    setOnlayn(yangi);
    if (yangi) {
      yubor('haydovchi_online', { userId: user.id, ism: user.ism });
    } else {
      yubor('haydovchi_offline');
      setBuyurtmalar([]);
    }
  };

  const roziBolish = (b) => {
    yubor('narx_taklif', {
      rideId: b.id, haydovchi_ism: user.ism, haydovchi_narx: b.narx,
      reyting: Number(user.reyting) || 5, mashina: mashinaJamiMatn, min: Math.ceil(Math.random() * 6) + 2,
    });
    setBuyurtmalar(buyurtmalar.filter((x) => x.id !== b.id));
  };

  const oznarxYuborish = () => {
    yubor('narx_taklif', {
      rideId: tanlangan.id, haydovchi_ism: user.ism, haydovchi_narx: oznarx,
      reyting: Number(user.reyting) || 5, mashina: mashinaJamiMatn, min: Math.ceil(Math.random() * 6) + 2,
    });
    setTanlangan(null);
  };

  return (
    <div style={st.sahifa}>
      <div style={st.header}>
        <div style={st.logo}>🚕 {user.ism}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <TemaTanlovchi />
          <TilTanlovchi />
          <button
            style={{ ...st.tarixTugma, background: obunaBormi ? 'var(--asosiy-surface)' : '#FEE2E2', position: 'relative' }}
            onClick={() => setObunaOchiq(true)}
            title={t('sub.title')}
          >
            💳
            {obunaBormi && obunaKun < 5 && <span style={st.obunaBadge}>{obunaKun}</span>}
          </button>
          <button style={st.tarixTugma} onClick={() => setIssiqOchiq(true)} title={t('heat.title')}>🔥</button>
          <button style={st.tarixTugma} onClick={() => setProfilOchiq(true)} title={t('car.title')}>🚗</button>
          <button style={st.tarixTugma} onClick={() => navigate('/tarix')} title={t('hist.title')}>🕒</button>
          <button style={st.chiqish} onClick={onChiqish}>{t('common.exit')}</button>
          <button style={{ ...st.statusTugma, background: onlayn ? 'var(--yashil)' : 'var(--kulrang)' }} onClick={statusOzgartir}>
            {onlayn ? t('drv.online') : t('drv.offline')}
          </button>
        </div>
      </div>

      {!mashinaToldirilganmi && (
        <div style={st.ogohlantirish} onClick={() => setProfilOchiq(true)}>
          {t('drv.carInfoEmpty', { link: '' })}<b>{t('drv.carInfoFill')}</b>
        </div>
      )}

      <div style={st.daromad}>
        <div>
          <div style={st.daromadRaqam}>{stats.daromad.toLocaleString()}</div>
          <div style={st.daromadMatn}>{t('drv.todayIncome')}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={st.kichikRaqam}>{stats.safar}</div>
          <div style={st.daromadMatn}>{t('drv.rides')}</div>
        </div>
      </div>

      {/* Қабул қилинган сафар — 3 та босқич: kelmoqda → yetib_keldi → yolda */}
      {faolSafar && (
        <>
          <div style={st.faolSafar}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>
                {faolSafar.holati === 'kelmoqda' ? t('wait.driving')
                 : faolSafar.holati === 'yetib_keldi' ? t('wait.arrived')
                 : t('drv.activeRide')}
              </div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>
                #{faolSafar.rideId} · {Number(faolSafar.narx).toLocaleString()} · {joylashuvOchiqmi ? t('drv.gpsOn') : t('drv.gpsWait')}
              </div>
            </div>
            <button style={st.chatTugma} onClick={() => setChatOchiq(true)}>💬</button>
          </div>

          {/* Кутиш таймери (yetib_keldi ҳолатида) */}
          {kutish && (
            <div style={{ ...st.kutishKarta, background: kutish.tekin ? '#DCFCE7' : '#FEF3C7', borderLeft: `4px solid ${kutish.tekin ? '#16A34A' : '#F59E0B'}` }}>
              <div>
                <div style={st.kutishMatn}>{kutish.tekin ? t('wait.freeWait') : t('wait.feeAccruing')}</div>
                <div style={st.kutishVaqt}>{kutish.vaqt}</div>
              </div>
              {kutish.haq > 0 && (
                <div style={st.kutishHaq}>+{kutish.haq.toLocaleString()} {t('wait.sum')}</div>
              )}
            </div>
          )}

          {/* Тугмалар - ҳолатга қараб */}
          <div style={st.tugmaQator}>
            {faolSafar.holati === 'kelmoqda' && (
              <button style={st.harakatTugma} onClick={yetibKeldim}>🚗 {t('wait.iArrived')}</button>
            )}
            {faolSafar.holati === 'yetib_keldi' && (
              <button style={st.harakatTugma} onClick={yolgaChiqdik}>🛣 {t('wait.startDrive')}</button>
            )}
            {faolSafar.holati === 'yolda' && (
              <button style={st.harakatTugma} onClick={safarTugatish}>{t('drv.endRide')}</button>
            )}
            <div style={{ marginTop: 10 }}>
              <SOS rideId={faolSafar.rideId} />
            </div>
          </div>
        </>
      )}
      {chatOchiq && faolSafar && (
        <Chat rideId={faolSafar.rideId} meId={user.id} hamrohIsm={`💬 ${faolSafar.mijoz_ism || t('chat.guestName')}`} onClose={() => setChatOchiq(false)} />
      )}

      {baholashUchun && (
        <Baholash
          rideId={baholashUchun.rideId}
          kimni="passenger"
          ism={baholashUchun.ism}
          onYopish={() => setBaholashUchun(null)}
        />
      )}

      {profilOchiq && (
        <MashinaProfili
          onYopish={() => setProfilOchiq(false)}
          onSaqlandi={(yangi) => setMashina(yangi)}
        />
      )}

      {issiqOchiq && (
        <IssiqXarita onYopish={() => setIssiqOchiq(false)} />
      )}

      {obunaOchiq && (
        <Obuna
          onYopish={() => setObunaOchiq(false)}
          onYangilandi={(o) => setObuna(o)}
        />
      )}

      <div style={st.royxat}>
        {!onlayn ? (
          <div style={st.bosh}>
            <div style={st.boshIkon}>🌙</div>
            <h3 style={st.boshSarlavha}>{t('drv.youOffline')}</h3>
            <p style={st.boshMatn}>{t('drv.youOfflineHint')}</p>
          </div>
        ) : buyurtmalar.length === 0 ? (
          <div style={st.bosh}>
            <div style={st.boshIkon}>🔍</div>
            <h3 style={st.boshSarlavha}>{t('drv.waiting')}</h3>
            <p style={st.boshMatn}>{t('drv.waitingHint')}</p>
          </div>
        ) : (
          buyurtmalar.map((b) => (
            <div key={b.id} style={st.karta}>
              <div style={st.kartaYuqori}>
                <div>
                  <div style={st.narx}>{Number(b.narx).toLocaleString()}</div>
                  <div style={st.masofa}>{b.masofa} км · {b.mijoz} ⭐ {b.reyting}</div>
                </div>
                <div style={st.vaqt}>{b.vaqt}</div>
              </div>
              <div style={st.haritaWrap}>
                <HaritaPreview boshlanish={parseLatLng(b.boshlanish)} tugash={parseLatLng(b.tugash)} />
              </div>
              <div style={st.yollar}>
                <div style={st.yol}>
                  <span style={{ ...st.nuqta, background: 'var(--yashil)' }} />
                  <span style={st.yolMatn}>{b.boshlanish}</span>
                </div>
                <div style={st.chiziq} />
                <div style={st.yol}>
                  <span style={{ ...st.nuqta, background: 'var(--qizil)' }} />
                  <span style={st.yolMatn}>{b.tugash}</span>
                </div>
              </div>
              <div style={st.tugmalar}>
                <button style={st.oznarxTugma} onClick={() => { setTanlangan(b); setOznarx(b.narx + 3000); }}>
                  {t('drv.myPrice')}
                </button>
                <button style={st.roziTugma} onClick={() => roziBolish(b)}>
                  {t('drv.agree')} · {Number(b.narx).toLocaleString()}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {tanlangan && (
        <div style={st.modalFon} onClick={() => setTanlangan(null)}>
          <div style={st.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={st.modalSarlavha}>{t('drv.myPriceTitle')}</h3>
            <p style={st.modalIzoh}>{tanlangan.boshlanish} → {tanlangan.tugash} ({tanlangan.masofa} км)</p>
            <div style={st.narxBox}>
              <button style={st.narxTugma} onClick={() => setOznarx(Math.max(5000, oznarx - 1000))}>−</button>
              <div style={st.modalNarx}>{oznarx.toLocaleString()}</div>
              <button style={st.narxTugma} onClick={() => setOznarx(oznarx + 1000)}>+</button>
            </div>
            <button style={st.yuborishTugma} onClick={oznarxYuborish}>{t('drv.sendOffer')}</button>
            <button style={st.bekorTugma} onClick={() => setTanlangan(null)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

const st = {
  sahifa: { width: '100vw', maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: 'var(--och-kulrang)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: 'var(--oq)', gap: 8 },
  logo: { fontWeight: 800, fontSize: 14, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  chiqish: { background: 'var(--och-kulrang)', padding: '8px 12px', borderRadius: 16, fontWeight: 600, fontSize: 12 },
  tarixTugma: { background: 'var(--och-kulrang)', width: 36, height: 36, borderRadius: '50%', fontSize: 16 },
  obunaBadge: { position: 'absolute', top: -4, right: -4, background: '#DC2626', color: '#fff', minWidth: 18, height: 18, borderRadius: 9, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' },
  ogohlantirish: { margin: '0 16px 12px', padding: 12, background: '#FEF3C7', color: '#92400E', borderRadius: 12, fontSize: 13, cursor: 'pointer', borderLeft: '4px solid #F59E0B' },
  statusTugma: { color: 'var(--oq)', padding: '8px 16px', borderRadius: 20, fontWeight: 700, fontSize: 13 },
  daromad: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 16, padding: 20, background: 'var(--qora)', borderRadius: 18, color: 'var(--oq)' },
  faolSafar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 16px 10px', padding: 16, background: 'var(--yashil)', borderRadius: 16, color: 'var(--oq)', gap: 8 },
  tugatTugma: { background: 'var(--oq)', color: 'var(--yashil)', padding: '10px 12px', borderRadius: 12, fontWeight: 800, fontSize: 12 },
  chatTugma: { background: 'rgba(255,255,255,.2)', color: 'var(--oq)', width: 40, height: 40, borderRadius: '50%', fontSize: 18 },
  kutishKarta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 16px 10px', padding: 12, borderRadius: 12 },
  kutishMatn: { fontSize: 12, fontWeight: 700, color: 'var(--kulrang)' },
  kutishVaqt: { fontSize: 24, fontWeight: 800, fontFamily: 'monospace', marginTop: 2 },
  kutishHaq: { fontSize: 18, fontWeight: 800, color: '#92400E' },
  tugmaQator: { margin: '0 16px 16px' },
  harakatTugma: { width: '100%', background: 'var(--sariq)', color: 'var(--qora)', padding: 16, borderRadius: 14, fontWeight: 800, fontSize: 16 },
  daromadRaqam: { fontSize: 28, fontWeight: 800, color: 'var(--sariq)' },
  kichikRaqam: { fontSize: 28, fontWeight: 800 },
  daromadMatn: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  royxat: { padding: '0 16px 16px' },
  bosh: { textAlign: 'center', padding: '60px 20px', color: 'var(--kulrang)' },
  boshIkon: { fontSize: 48, marginBottom: 12 },
  boshSarlavha: { fontSize: 18, fontWeight: 700, color: 'var(--qora)', marginBottom: 6 },
  boshMatn: { fontSize: 14 },
  karta: { background: 'var(--oq)', borderRadius: 18, padding: 18, marginBottom: 12, boxShadow: 'var(--soya)' },
  kartaYuqori: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  narx: { fontSize: 24, fontWeight: 800 },
  masofa: { fontSize: 13, color: 'var(--kulrang)', marginTop: 2 },
  vaqt: { fontSize: 12, color: 'var(--kulrang)' },
  haritaWrap: { marginBottom: 12 },
  yollar: { marginBottom: 16 },
  yol: { display: 'flex', alignItems: 'center', gap: 10 },
  nuqta: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  chiziq: { width: 2, height: 16, background: 'var(--neutral-200)', marginLeft: 4 },
  yolMatn: { fontSize: 14, fontWeight: 500 },
  tugmalar: { display: 'flex', gap: 10 },
  oznarxTugma: { flex: 1, background: 'var(--och-kulrang)', padding: 14, borderRadius: 12, fontWeight: 700, fontSize: 14 },
  roziTugma: { flex: 1.4, background: 'var(--sariq)', padding: 14, borderRadius: 12, fontWeight: 700, fontSize: 14 },
  modalFon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 2000 },
  modal: { background: 'var(--oq)', width: '100%', maxWidth: 480, borderRadius: '24px 24px 0 0', padding: 24 },
  modalSarlavha: { fontSize: 20, fontWeight: 800, marginBottom: 8 },
  modalIzoh: { fontSize: 14, color: 'var(--kulrang)', marginBottom: 20 },
  narxBox: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--och-kulrang)', padding: 16, borderRadius: 16, marginBottom: 16 },
  narxTugma: { width: 44, height: 44, borderRadius: '50%', background: 'var(--oq)', fontSize: 24, fontWeight: 700, boxShadow: 'var(--soya)' },
  modalNarx: { fontSize: 28, fontWeight: 800 },
  yuborishTugma: { width: '100%', background: 'var(--sariq)', padding: 16, borderRadius: 14, fontWeight: 700, fontSize: 16 },
  bekorTugma: { width: '100%', background: 'transparent', padding: 12, color: 'var(--kulrang)', fontSize: 14, marginTop: 4 },
};
