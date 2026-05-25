// Йўловчи саҳифаси — socket билан реал вақтда уланган
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Harita from '../components/Harita';
import Chat from '../components/Chat';
import Baholash from '../components/Baholash';
import Tolov from '../components/Tolov';
import Kirish from '../components/Kirish';
import YolovchiProfili from '../components/YolovchiProfili';
import Ulashish from '../components/Ulashish';
import ManzilQidirish from '../components/ManzilQidirish';
import SOS from '../components/SOS';
import NarxTarkibi from '../components/NarxTarkibi';
import { tavsiyaHisobi, ASOSIY, PER_KM } from '../utils/narx';
import { masofaKm } from '../utils/geo';
import { api } from '../services/api';
import { useSocket } from '../services/useSocket';
import { bildir, ruxsatSora } from '../services/bildirishnoma';
import { pushObunaBol } from '../services/push';
import { useT, TilTanlovchi } from '../i18n';
import { TemaTanlovchi } from '../theme';

if (typeof window !== 'undefined') ruxsatSora();

const TOSHKENT = [41.2995, 69.2401];

export default function YolovchiSahifa() {
  const navigate = useNavigate();
  const { t, til } = useT();
  const [boshlanish, setBoshlanish] = useState(null);
  const [tugash, setTugash] = useState(null);
  const [boshlanishManzil, setBoshlanishManzil] = useState('');
  const [tugashManzil, setTugashManzil] = useState('');
  const [tanlovRejimi, setTanlovRejimi] = useState('boshlanish');
  // Yandex услуби — харита маркази (пин остидаги нуқта ва манзил)
  const [markazNuqta, setMarkazNuqta] = useState(null);
  const [markazManzil, setMarkazManzil] = useState('');
  const [markazManzilYuk, setMarkazManzilYuk] = useState(false);
  const [uchish, setUchish] = useState(null); // харитани кўчириш мақсади
  const reverseTimerRef = useRef(null);
  const [narx, setNarx] = useState(15000);
  const [bosqich, setBosqich] = useState('manzil');
  const [takliflar, setTakliflar] = useState([]);
  const [rideId, setRideId] = useState(null);
  const [haydovchiInfo, setHaydovchiInfo] = useState(null); // {ism, narx} — танланган ҳайдовчи
  const [haydovchiNuqta, setHaydovchiNuqta] = useState(null); // [lat, lng] — реал вақт жойлашуви
  const [chatOchiq, setChatOchiq] = useState(false);
  const [tolovOchiq, setTolovOchiq] = useState(false);
  const [ulashishOchiq, setUlashishOchiq] = useState(false);
  const [baholashUchun, setBaholashUchun] = useState(null); // {rideId, ism}
  const [profilOchiq, setProfilOchiq] = useState(false);
  const [kirishOchiq, setKirishOchiq] = useState(false);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); }
    catch { return null; }
  });
  const [profil, setProfil] = useState(null);
  const [songgiManzillar, setSonggiManzillar] = useState([]);

  const meId = user?.id || null;

  // Логин қилинган йўловчи — push билдиришнома + профил/манзилларни юклаймиз
  useEffect(() => {
    if (!user) return;
    ruxsatSora().then((ok) => { if (ok) pushObunaBol(); });
    api.get('/passenger/me').then(({ data }) => setProfil(data)).catch(() => {});
    api.get('/passenger/recent').then(({ data }) => setSonggiManzillar(data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const { yubor } = useSocket({
    buyurtma_yaratildi: ({ id }) => {
      setRideId(id); // мижоз ID'сини базадан келган реал ID билан алмаштирамиз
    },
    yangi_taklif: (taklif) => {
      setTakliflar((oldin) => [...oldin, taklif]);
      bildir('💰 Янги таклиф', `${taklif.haydovchi_ism} · ${Number(taklif.haydovchi_narx).toLocaleString()} сўм · ${taklif.min} мин`, { tag: 'taklif' });
    },
    // Ҳайдовчи сафар ҳолатини янгилаганда
    holat_yangilandi: (data) => {
      if (Number(data.rideId) !== Number(rideId)) return;
      if (data.holat === 'yetib_keldi') {
        bildir(t('wait.driverArrived'), t('wait.comeOut'));
        setHaydovchiInfo((h) => h && ({ ...h, holati: 'yetib_keldi', kelgan_vaqti: Date.now() }));
      }
      if (data.holat === 'yolda') {
        setHaydovchiInfo((h) => h && ({
          ...h, holati: 'yolda',
          narx: data.yangi_narx ?? h.narx,
          kutish_haqi: data.kutish_haqi || 0,
        }));
      }
      if (data.holat === 'yakunlandi') {
        bildir(t('notif.rideEnded'), t('rate.askPassenger'));
        setBaholashUchun({ rideId, ism: haydovchiInfo?.ism || t('home.driver') });
      }
    },
    // Ҳайдовчи жонли жойлашуви — харитада кузатиш учун
    haydovchi_joylashuvi: (data) => {
      if (Number(data.rideId) === Number(rideId) && data.lat != null && data.lng != null) {
        setHaydovchiNuqta([data.lat, data.lng]);
      }
    },
    // Чат ёпиқ бўлганда хабар келса — билдирамиз
    xabar_keldi: (x) => {
      if (meId && Number(x.yuboruvchi_id) === Number(meId)) return; // ўз хабарим
      if (!chatOchiq) bildir(`💬 ${x.yuboruvchi_ism}`, x.matn, { tag: `chat-${x.ride_id}` });
    },
  });

  const boshlanishigaQayt = () => {
    setBosqich('manzil');
    setBoshlanish(null);
    setTugash(null);
    setBoshlanishManzil('');
    setTugashManzil('');
    setTanlovRejimi('boshlanish');
    setMarkazManzil('');
    setTakliflar([]);
    setRideId(null);
    setHaydovchiInfo(null);
    setHaydovchiNuqta(null);
    setChatOchiq(false);
  };

  // Yandex услуби — харита маркази ўзгарганда пин остидаги манзилни (debounce) оламиз
  const markazKuzat = (nuqta) => {
    setMarkazNuqta(nuqta);
    setMarkazManzilYuk(true);
    clearTimeout(reverseTimerRef.current);
    reverseTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/geocode/reverse?lat=${nuqta[0]}&lng=${nuqta[1]}&til=${til}`);
        setMarkazManzil(data.manzil || '');
      } catch { setMarkazManzil(''); }
      setMarkazManzilYuk(false);
    }, 450);
  };

  // Пин остидаги нуқтани тасдиқлаш (тап билан қўйиш ўрнига)
  const markaznidanTanla = () => {
    if (!markazNuqta) return;
    if (tanlovRejimi === 'boshlanish') {
      setBoshlanish(markazNuqta);
      setBoshlanishManzil(markazManzil);
      setTanlovRejimi('tugash');
    } else {
      setTugash(markazNuqta);
      setTugashManzil(markazManzil);
      setNarx(tavsiyaHisobi(masofaKm(boshlanish, markazNuqta)));
      setBosqich('narx');
    }
  };

  const masofa = () => masofaKm(boshlanish, tugash);

  // Ҳайдовчининг келиш вақти (ETA) — жонли GPS'дан пикап нуқтасигача, шаҳар ўртача тезлиги
  const kelishVaqti = () => {
    if (!haydovchiNuqta || !boshlanish) return null;
    const km = masofaKm(haydovchiNuqta, boshlanish);
    if (!km) return null;
    const SHAHAR_TEZLIK = 22; // км/соат
    return Math.max(1, Math.round((km / SHAHAR_TEZLIK) * 60));
  };

  const tavsiyaNarx = tavsiyaHisobi(masofa());

  // Буюртма бериш — socket орқали ҳайдовчиларга юборилади
  const buyurtmaBerish = () => {
    const taklifId = Date.now(); // вақтинча — сервер DB id'ни қайтариб buyurtma_yaratildi'да юборади
    setRideId(null);
    setTakliflar([]);
    setBosqich('kutish');
    yubor('yangi_buyurtma', {
      id: taklifId,
      mijoz: 'Сиз',
      reyting: 5.0,
      boshlanish: boshlanishManzil || `${boshlanish[0].toFixed(4)}, ${boshlanish[1].toFixed(4)}`,
      tugash: tugashManzil || `${tugash[0].toFixed(4)}, ${tugash[1].toFixed(4)}`,
      masofa: masofa(),
      narx,
      vaqt: 'ҳозиргина',
    });
  };

  // Ҳайдовчини танлаш — haydovchi_id ҳам юборамиз, токи backend rides жадвалини янгилаб қўйсин
  const haydovchiTanla = (t) => {
    yubor('haydovchi_tanlandi', {
      rideId,
      haydovchi_id: t.haydovchi_id,
      haydovchi_ism: t.haydovchi_ism,
      narx: t.haydovchi_narx,
    });
    setHaydovchiInfo({ ism: t.haydovchi_ism, narx: t.haydovchi_narx, mashina: t.mashina, reyting: t.reyting, tasdiqlangan: t.tasdiqlangan });
    setBosqich('safar');
  };

  const bekorQilish = () => {
    if (rideId) yubor('buyurtma_bekor', { rideId });
    setBosqich('narx');
  };

  return (
    <div style={st.sahifa}>
      <div style={st.harita}>
        <Harita
          markaz={TOSHKENT}
          boshlanish={boshlanish}
          tugash={tugash}
          haydovchi={haydovchiNuqta}
          markazRejim={bosqich === 'manzil'}
          markazRang={tanlovRejimi === 'boshlanish' ? '#0E9384' : '#EF4444'}
          onMarkaz={markazKuzat}
          uchish={uchish}
        />
      </div>
      <div style={st.logo}>🚕 Safar Taksi</div>
      <div style={st.tilWrap}><TemaTanlovchi /><TilTanlovchi /></div>
      <button
        style={st.profilTugma}
        className="glass-tugma"
        onClick={() => user ? setProfilOchiq(true) : setKirishOchiq(true)}
        title={user ? t('prof.title') : t('login.title')}
      >{user ? '👤' : '🔑'}</button>
      <button style={st.tarixTugma} className="glass-tugma" onClick={() => navigate('/tarix')} title={t('hist.title')}>🕒</button>
      <div style={st.yordam} className="glass-tugma">{t('common.help')}</div>

      <div style={st.panel} className="glass slide-up">
        {bosqich === 'manzil' && (
          <>
            <h2 style={st.sarlavha}>{tanlovRejimi === 'boshlanish' ? t('pass.fromWhere') : t('pass.toWhere')}</h2>

            {/* Манзил қидириш — топилган нуқтага харитани кўчиради */}
            <ManzilQidirish
              rejimMatn={tanlovRejimi === 'boshlanish' ? t('geo.modeStart') : t('geo.modeEnd')}
              onTanlandi={(nuqta) => setUchish([nuqta[0], nuqta[1]])}
            />

            {/* Пин остидаги жонли манзил */}
            <div style={st.markazManzilQator}>
              <span style={{ ...st.nuqta, background: tanlovRejimi === 'boshlanish' ? 'var(--yashil)' : 'var(--qizil)' }} />
              <div style={st.markazManzilMatn}>
                {markazManzilYuk ? t('common.loading') : (markazManzil || t('pass.movePin'))}
              </div>
            </div>

            {/* Сақланган манзиллар — харитани ўша жойга кўчиради */}
            {(profil?.home_lat || profil?.ish_lat || songgiManzillar.length > 0) && (
              <div style={st.tezManzillar}>
                {profil?.home_lat && (
                  <button style={st.tezTugma} onClick={() => setUchish([Number(profil.home_lat), Number(profil.home_lng)])}>{t('prof.useHome')}</button>
                )}
                {profil?.ish_lat && (
                  <button style={st.tezTugma} onClick={() => setUchish([Number(profil.ish_lat), Number(profil.ish_lng)])}>{t('prof.useWork')}</button>
                )}
                {songgiManzillar.slice(0, 3).map((m, i) => {
                  const parse = (s) => { const x = s.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/); return x ? [parseFloat(x[1]), parseFloat(x[2])] : null; };
                  const p = parse(m.manzil);
                  if (!p) return null;
                  return (
                    <button key={i} style={st.tezTugma} onClick={() => setUchish([p[0], p[1]])}>🕒 {p[0].toFixed(2)}, {p[1].toFixed(2)}</button>
                  );
                })}
              </div>
            )}

            <button style={{ ...st.tugma, opacity: markazNuqta ? 1 : 0.5 }} onClick={markaznidanTanla} disabled={!markazNuqta}>
              {tanlovRejimi === 'boshlanish' ? t('pass.confirmStart') : t('common.continue')}
            </button>
            {tanlovRejimi === 'tugash' && (
              <button style={st.orqaga} onClick={() => setTanlovRejimi('boshlanish')}>← {t('common.back')}</button>
            )}
          </>
        )}

        {bosqich === 'narx' && (
          <>
            <h2 style={st.sarlavha}>{t('pass.offerPrice')}</h2>
            <p style={st.izoh}>{t('pass.distance')}: {masofa()} км · {t('pass.recommended')}: {tavsiyaNarx.toLocaleString()}</p>
            <div style={st.narxBox}>
              <button style={st.narxTugma} onClick={() => setNarx(Math.max(5000, narx - 1000))}>−</button>
              <div style={st.narxMatn}>{narx.toLocaleString()}</div>
              <button style={st.narxTugma} onClick={() => setNarx(narx + 1000)}>+</button>
            </div>

            {/* Шаффоф нарх таркиби */}
            <NarxTarkibi
              qatorlar={[
                { label: t('price.base'), qiymat: ASOSIY },
                { label: t('price.perKm', { km: masofa(), rate: PER_KM.toLocaleString() }), qiymat: Math.round(masofa() * PER_KM) },
              ]}
              jami={tavsiyaNarx}
              izoh={t('price.tavsiyaIzoh')}
            />

            <button style={st.tugma} onClick={buyurtmaBerish}>{t('pass.placeOrder')}</button>
            <button style={st.orqaga} onClick={() => setBosqich('manzil')}>← {t('common.back')}</button>
          </>
        )}

        {bosqich === 'safar' && haydovchiInfo && (
          <>
            <h2 style={st.sarlavha}>
              {haydovchiInfo.holati === 'yetib_keldi' ? t('wait.driverHere')
               : haydovchiInfo.holati === 'yolda' ? t('pass.inRide')
               : t('wait.driverComing')}
            </h2>
            {/* Келиш вақти (ETA) — ҳайдовчи йўлда бўлганда */}
            {haydovchiInfo.holati !== 'yetib_keldi' && haydovchiInfo.holati !== 'yolda' && kelishVaqti() && (
              <div style={st.eta}>🚗 {t('wait.etaMin', { min: kelishVaqti() })}</div>
            )}
            <div style={st.haydovchi}>
              <div style={st.avatar}>{haydovchiInfo.ism[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={st.hIsm}>
                  {haydovchiInfo.ism}
                  {haydovchiInfo.tasdiqlangan && <span style={st.tasdiqBelgi} title={t('verify.badge')}>✓</span>}
                  {' '}⭐ {haydovchiInfo.reyting}
                </div>
                <div style={st.hMashina}>{haydovchiInfo.mashina} · {Number(haydovchiInfo.narx).toLocaleString()}</div>
              </div>
            </div>

            {/* Кутиш огоҳлантириш — ҳайдовчи етиб келганда */}
            {haydovchiInfo.holati === 'yetib_keldi' && (
              <div style={st.kutishOgoh}>
                ⚠️ {t('wait.passengerHurry')}
              </div>
            )}

            {/* Шаффоф нарх таркиби — сафар жараёнида */}
            <NarxTarkibi
              qatorlar={[
                { label: t('price.agreed'), qiymat: Number(haydovchiInfo.narx) - (Number(haydovchiInfo.kutish_haqi) || 0) },
                ...(haydovchiInfo.kutish_haqi > 0 ? [{
                  label: t('wait.feeAdded'),
                  qiymat: Number(haydovchiInfo.kutish_haqi),
                  qoshimcha: true,
                }] : []),
              ]}
              jami={Number(haydovchiInfo.narx)}
            />

            {/* Кутиш ҳақи қўшилган бўлса огоҳлантириш */}
            {haydovchiInfo.kutish_haqi > 0 && (
              <div style={st.kutishQushilgan}>
                {t('wait.feeAdded')}: <b>+{Number(haydovchiInfo.kutish_haqi).toLocaleString()}</b>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...st.tugma, flex: 1 }} onClick={() => setChatOchiq(true)}>{t('pass.chatWithDriver')}</button>
              <button style={st.tolovTugma} onClick={() => setTolovOchiq(true)}>{t('pay.open')}</button>
            </div>
            <button style={st.ulashishTugma} onClick={() => setUlashishOchiq(true)}>{t('share.open')}</button>
            <div style={{ marginTop: 8 }}>
              <SOS rideId={rideId} />
            </div>
            <div style={st.kuzatishMatn}>
              {haydovchiNuqta ? t('pass.gpsLive') : t('pass.gpsWait')}
            </div>
          </>
        )}

        {bosqich === 'kutish' && (
          <>
            {takliflar.length === 0 ? (
              <div style={st.kutish}>
                <div style={st.spinner} />
                <h2 style={st.sarlavha}>{t('pass.searching')}</h2>
                <p style={st.izoh}>{narx.toLocaleString()} · {masofa()} км</p>
                <button style={st.bekor} onClick={bekorQilish}>{t('common.cancel')}</button>
              </div>
            ) : (
              <>
                <h2 style={st.sarlavha}>{t('pass.offers')} ({takliflar.length})</h2>
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {takliflar.map((tk, i) => (
                    <div key={i} style={st.haydovchi}>
                      <div style={st.avatar}>{tk.haydovchi_ism[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={st.hIsm}>
                          {tk.haydovchi_ism}
                          {tk.tasdiqlangan && <span style={st.tasdiqBelgi} title={t('verify.badge')}>✓</span>}
                          {' '}⭐ {tk.reyting}
                        </div>
                        <div style={st.hMashina}>{tk.mashina} · {tk.min} {t('drv.minute')}</div>
                      </div>
                      <button style={st.qabul} onClick={() => haydovchiTanla(tk)}>
                        {tk.haydovchi_narx.toLocaleString()}
                      </button>
                    </div>
                  ))}
                </div>
                <button style={st.bekor} onClick={bekorQilish}>{t('common.cancel')}</button>
              </>
            )}
          </>
        )}
      </div>

      {chatOchiq && rideId && (
        <Chat rideId={rideId} meId={meId} hamrohIsm={`💬 ${haydovchiInfo?.ism || t('home.driver')}`} onClose={() => setChatOchiq(false)} />
      )}

      {tolovOchiq && rideId && haydovchiInfo && (
        <Tolov
          rideId={rideId}
          summa={haydovchiInfo.narx}
          onYopish={() => setTolovOchiq(false)}
        />
      )}

      {ulashishOchiq && rideId && (
        <Ulashish
          rideId={rideId}
          onYopish={() => setUlashishOchiq(false)}
        />
      )}

      {baholashUchun && (
        <Baholash
          rideId={baholashUchun.rideId}
          kimni="driver"
          ism={baholashUchun.ism}
          narx={haydovchiInfo?.narx}
          onYopish={() => { setBaholashUchun(null); boshlanishigaQayt(); }}
        />
      )}

      {profilOchiq && (
        <YolovchiProfili
          mapNuqta={boshlanish || tugash}
          onYopish={() => setProfilOchiq(false)}
          onYangilandi={(yangi) => setProfil(yangi)}
        />
      )}

      {kirishOchiq && (
        <Kirish
          kerakliRol="mijoz"
          onKirildi={(u) => { setUser(u); setKirishOchiq(false); }}
        />
      )}
    </div>
  );
}

const st = {
  sahifa: { position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden' },
  harita: { position: 'absolute', inset: 0 },
  logo: { position: 'absolute', top: 'calc(16px + env(safe-area-inset-top))', left: 16, zIndex: 1000, background: 'linear-gradient(135deg, var(--sariq-light), var(--sariq))', color: '#fff', padding: '8px 16px', borderRadius: 'var(--r-md)', fontWeight: 800, fontSize: 18, boxShadow: 'var(--shadow-sariq)' },
  yordam: { position: 'absolute', top: 'calc(16px + env(safe-area-inset-top))', right: 16, zIndex: 1000, padding: '8px 14px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 13, color: 'var(--qora-faint)' },
  tarixTugma: { position: 'absolute', top: 'calc(16px + env(safe-area-inset-top))', right: 116, zIndex: 1000, width: 38, height: 38, borderRadius: '50%', fontSize: 16, color: 'var(--qora)' },
  profilTugma: { position: 'absolute', top: 'calc(16px + env(safe-area-inset-top))', right: 162, zIndex: 1000, width: 38, height: 38, borderRadius: '50%', fontSize: 16, color: 'var(--qora)' },
  tilWrap: { position: 'absolute', top: 'calc(64px + env(safe-area-inset-top))', right: 16, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 6 },
  tolovTugma: { background: 'var(--qora)', color: 'var(--oq)', padding: 16, borderRadius: 14, fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap' },
  ulashishTugma: { width: '100%', background: 'var(--och-kulrang)', padding: 12, borderRadius: 12, fontSize: 14, fontWeight: 700, marginTop: 8 },
  tezManzillar: { display: 'flex', gap: 8, marginTop: 8, marginBottom: 8 },
  tezTugma: { flex: 1, background: 'var(--och-kulrang)', padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 700 },
  kutishOgoh: { background: '#FEF3C7', borderLeft: '4px solid #F59E0B', padding: '10px 12px', borderRadius: 10, marginBottom: 10, fontSize: 13, color: '#92400E', fontWeight: 600 },
  kutishQushilgan: { background: '#FEE2E2', padding: 8, borderRadius: 8, fontSize: 13, color: '#991B1B', textAlign: 'center', marginBottom: 10 },
  panel: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000, borderRadius: '24px 24px 0 0', padding: '24px 24px calc(24px + env(safe-area-inset-bottom))', boxShadow: '0 -8px 32px rgba(0,0,0,0.12)' },
  sarlavha: { fontSize: 22, fontWeight: 800, marginBottom: 16 },
  izoh: { color: 'var(--kulrang)', fontSize: 14, marginBottom: 16 },
  maydon: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--och-kulrang)', padding: 14, borderRadius: 14, marginBottom: 10, cursor: 'pointer' },
  nuqta: { width: 12, height: 12, borderRadius: '50%', flexShrink: 0 },
  maydonMatn: { fontSize: 14 },
  markazManzilQator: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--och-kulrang)', padding: 14, borderRadius: 14, marginBottom: 10, minHeight: 48 },
  markazManzilMatn: { fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: 'var(--qora)' },
  tugma: { width: '100%', background: 'linear-gradient(135deg, var(--sariq-light), var(--sariq))', color: '#fff', padding: 16, borderRadius: 14, fontSize: 16, fontWeight: 800, marginTop: 8, boxShadow: 'var(--shadow-sariq)' },
  orqaga: { width: '100%', background: 'transparent', padding: 12, color: 'var(--kulrang)', fontSize: 14, marginTop: 4 },
  narxBox: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--och-kulrang)', padding: 16, borderRadius: 16, marginBottom: 16 },
  narxTugma: { width: 44, height: 44, borderRadius: '50%', background: 'var(--oq)', fontSize: 24, fontWeight: 700, boxShadow: 'var(--soya)' },
  narxMatn: { fontSize: 28, fontWeight: 800 },
  som: { fontSize: 16, fontWeight: 500, color: 'var(--kulrang)' },
  kutish: { textAlign: 'center', padding: '12px 0' },
  spinner: { width: 48, height: 48, margin: '0 auto 16px', border: '4px solid var(--och-kulrang)', borderTop: '4px solid var(--sariq)', borderRadius: '50%', animation: 'aylanish 1s linear infinite' },
  bekor: { width: '100%', background: 'var(--och-kulrang)', padding: 14, borderRadius: 14, fontSize: 15, fontWeight: 600, marginTop: 8 },
  haydovchi: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--och-kulrang)', padding: 12, borderRadius: 14, marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, var(--sariq-light), var(--sariq))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 },
  hIsm: { fontWeight: 700, fontSize: 15 },
  tasdiqBelgi: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', background: 'var(--asosiy)', color: '#fff', fontSize: 10, fontWeight: 900, marginLeft: 5, verticalAlign: 'middle' },
  hMashina: { fontSize: 12, color: 'var(--kulrang)' },
  qabul: { background: 'linear-gradient(135deg, var(--sariq-light), var(--sariq))', color: '#fff', padding: '10px 16px', borderRadius: 10, fontWeight: 800, fontSize: 15, boxShadow: 'var(--shadow-sariq)' },
  kuzatishMatn: { textAlign: 'center', padding: 12, color: 'var(--kulrang)', fontSize: 13, marginTop: 4 },
  eta: { background: 'rgba(14,147,132,0.12)', color: 'var(--asosiy-dark)', padding: '8px 12px', borderRadius: 10, fontSize: 15, fontWeight: 800, marginBottom: 12, textAlign: 'center' },
};
