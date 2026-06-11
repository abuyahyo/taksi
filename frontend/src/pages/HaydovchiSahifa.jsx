// Ҳайдовчи саҳифаси — socket билан реал вақтда уланган
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, yolHisobla } from '../services/api';
import { useSocket } from '../services/useSocket';
import Kirish from '../components/Kirish';
import Chat from '../components/Chat';
import Baholash from '../components/Baholash';
import MashinaProfili, { mashinaMatn } from '../components/MashinaProfili';
import HaydovchiKodi from '../components/HaydovchiKodi';
import HaritaPreview from '../components/HaritaPreview';
import { parseLatLng } from '../utils/geo';
import { useToast } from '../components/Toast';
import IssiqXarita from '../components/IssiqXarita';
import SOS from '../components/SOS';
import Obuna from '../components/Obuna';
import DaromadSolishtiruv from '../components/DaromadSolishtiruv';
import DaromadPaneli from '../components/DaromadPaneli';
import { bildir, ruxsatSora } from '../services/bildirishnoma';
import { tebrat, TEBRANISH } from '../services/haptika';
import { pushObunaBol } from '../services/push';
import { useT } from '../i18n';
import SozlamalarTugma from '../components/SozlamalarTugma';
import NavigatorTugma from '../components/NavigatorTugma';
import Ikonka from '../components/Ikonka';

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

  return <Ichki user={user} />;
}

function Ichki({ user }) {
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
  const [pinModal, setPinModal] = useState(false); // машина PIN-кодини сўраш модали
  const [pinKiritma, setPinKiritma] = useState('');
  const [hozir, setHozir] = useState(() => Date.now()); // таймер учун
  const [baholashUchun, setBaholashUchun] = useState(null); // {rideId, ism} — модаль очилади
  const [mashina, setMashina] = useState(null); // {mashina_modeli, mashina_raqami, mashina_rangi}
  const [onb, setOnb] = useState(null); // онбординг ҳолати — {tasdiqlangan, tasdiq_holati, foiz, rad_sababi}
  const [profilOchiq, setProfilOchiq] = useState(false);
  const [kodOchiq, setKodOchiq] = useState(false); // QR/код модали
  const [issiqOchiq, setIssiqOchiq] = useState(false);
  const [obunaOchiq, setObunaOchiq] = useState(false);
  const [daromadOchiq, setDaromadOchiq] = useState(false);
  const [obuna, setObuna] = useState(null); // faol subscription
  const [joylashuvOchiqmi, setJoylashuvOchiqmi] = useState(false); // GPS таклиф қилинганми
  const [gpsRad, setGpsRad] = useState(false); // GPS рухсати рад этилган
  const joriyJoyRef = useRef(null); // [lat,lng] — ҳайдовчининг жорий жойи (таклифда ETA ҳисоблаш учун)
  const gpsToastRef = useRef(false); // рад этиш toast'и бир марта чиқсин

  // GPS хатоси — рад этилса аниқ огоҳлантириш (акс ҳолда ҳайдовчи сабабини билмасди)
  const gpsXatosi = (err) => {
    console.warn('Geolocation:', err.message);
    if (err.code === 1) { // PERMISSION_DENIED
      setGpsRad(true);
      if (!gpsToastRef.current) { toast.error(t('drv.gpsDenied')); gpsToastRef.current = true; }
    }
  };
  const gpsTiklandi = () => { setGpsRad(false); gpsToastRef.current = false; };

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
  const onbYukla = async () => {
    try {
      const { data } = await api.get('/driver/onboarding');
      setOnb(data);
    } catch {}
  };
  useEffect(() => {
    statsYukla(); profilYukla(); obunaYukla(); onbYukla();
    ruxsatSora().then((ok) => { if (ok) pushObunaBol(); });
  }, []);

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
        gpsTiklandi();
        joriyJoyRef.current = [pos.coords.latitude, pos.coords.longitude];
        yubor('joylashuv', { rideId: faolSafar.rideId, lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => { setJoylashuvOchiqmi(false); gpsXatosi(err); },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faolSafar]);

  // Онлайн (сафарсиз) — жорий жойни кузатамиз, токи таклифда пикапгача ETA ҳисобланса
  useEffect(() => {
    if (!onlayn || faolSafar || !('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => { joriyJoyRef.current = [pos.coords.latitude, pos.coords.longitude]; gpsTiklandi(); },
      gpsXatosi,
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlayn, faolSafar]);

  // Пикапгача ETA (дақиқа) — жорий жой ва буюртма пикап координатасидан (OSRM). Йўқ бўлса null.
  const etaHisobla = async (b) => {
    const pos = joriyJoyRef.current;
    const pickup = Array.isArray(b.boshlanish_koord) ? b.boshlanish_koord : parseLatLng(b.boshlanish);
    if (!pos || !pickup) return null;
    const r = await yolHisobla([pos, pickup]);
    return r && Number.isFinite(r.davomiylik_min) ? r.davomiylik_min : null;
  };

  const { yubor } = useSocket({
    // Қайта уланганда (socket узилиб-уланса) ҳолатни тиклаймиз — акс ҳолда
    // ҳайдовчи "онлайн"дек кўриниб, аслида буюртма олмай қоларди.
    connect: () => {
      if (onlayn) yubor('haydovchi_online', { userId: user.id, ism: user.ism });
      if (faolSafar) yubor('safarga_qoshil', { rideId: faolSafar.rideId });
    },
    obuna_kerak: () => {
      toast.error(t('sub.requiredToOnline'));
      setObunaOchiq(true);
      setOnlayn(false);
    },
    // Тасдиқ керак — KYC тугатилмаган ёки админ ҳали тасдиқламаган
    tasdiq_kerak: () => {
      toast.error(t('onb.gateTitle'));
      setOnlayn(false);
      navigate('/haydovchi/ulanish');
    },
    // Рейтинг пасайди — шаффоф огоҳлантириш (сабаб сервердан келади)
    reyting_ogoh: ({ sabab }) => {
      toast.error(sabab, { muddat: 9000 });
    },
    // Рейтинг жуда паст — ҳисоб вақтинча блокланди (шаффоф, сабаб билан)
    hisob_bloklandi: ({ sabab }) => {
      toast.error(sabab, { muddat: 12000 });
      setOnlayn(false);
    },
    buyurtma_keldi: (b) => {
      // Дубликатсиз — маqsadли буюртма барчага очилса яна келиши мумкин
      setBuyurtmalar((oldin) => (oldin.some((x) => x.id === b.id) ? oldin.map((x) => (x.id === b.id ? b : x)) : [...oldin, b]));
      tebrat(TEBRANISH.muvaffaqiyat);
      const sarlavha = b.maqsadli ? t('fav.forYouOrder') : t('notif.newOrder');
      bildir(sarlavha, `${Number(b.narx).toLocaleString()} · ${b.boshlanish} → ${b.tugash}`, { tag: `buyurtma-${b.id}` });
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
        setFaolSafar({
          rideId: data.rideId, narx: data.narx, mijoz_ism: data.mijoz_ism,
          holati: 'kelmoqda', kutish_haqi: 0,
          boshlanish_koord: data.boshlanish_koord, tugash_koord: data.tugash_koord,
          boshlanish_manzil: data.boshlanish_manzil, tugash_manzil: data.tugash_manzil,
        });
      }
    },
    // Кутиш ҳақи ҳисобланди — нархни янгилаймиз
    holat_yangilandi: (data) => {
      if (!faolSafar || Number(data.rideId) !== Number(faolSafar.rideId)) return;
      if (data.holat === 'yolda' && data.yangi_narx != null) {
        setFaolSafar((s) => s && ({ ...s, holati: 'yolda', narx: data.yangi_narx, kutish_haqi: data.kutish_haqi || 0 }));
        setPinModal(false); setPinKiritma(''); // тўғри PIN — модал ёпилади
      }
    },
    // Машина PIN-коди нотўғри
    pin_xato: () => {
      toast.error(t('pin.wrong'));
      setPinKiritma('');
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
    setPinKiritma('');
    setPinModal(true); // йўловчидан машина PIN-кодини сўраймиз
  };

  const pinTasdiqla = () => {
    if (!faolSafar) return;
    yubor('safar_holati', { rideId: faolSafar.rideId, holat: 'yolda', pin: pinKiritma });
    // narx ва kutish_haqi server holat_yangilandi'дан келади; тўғри бўлса модал ёпилади
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

  // Онлайн/офлайн ўзгартириш — тасдиқланмаган бўлса визардга йўналтирамиз
  const statusOzgartir = () => {
    if (!onb?.tasdiqlangan) {
      navigate('/haydovchi/ulanish');
      return;
    }
    const yangi = !onlayn;
    setOnlayn(yangi);
    if (yangi) {
      yubor('haydovchi_online', { userId: user.id, ism: user.ism });
    } else {
      yubor('haydovchi_offline');
      setBuyurtmalar([]);
      gpsTiklandi();
    }
  };

  // Сизга атаб буюртмани рад этиш — йўловчидан "барчага очайми?" сўралади
  const maqsadliRad = (b) => {
    tebrat(TEBRANISH.yengil);
    yubor('maqsadli_rad', { rideId: b.id });
    setBuyurtmalar((oldin) => oldin.filter((x) => x.id !== b.id));
  };

  const roziBolish = async (b) => {
    tebrat(TEBRANISH.muvaffaqiyat);
    const min = await etaHisobla(b);
    yubor('narx_taklif', {
      rideId: b.id, haydovchi_ism: user.ism, haydovchi_narx: b.narx,
      reyting: Number(user.reyting) || 5, mashina: mashinaJamiMatn, min,
    });
    setBuyurtmalar((oldin) => oldin.filter((x) => x.id !== b.id));
  };

  const oznarxYuborish = async () => {
    tebrat(TEBRANISH.muvaffaqiyat);
    const b = tanlangan;
    const min = await etaHisobla(b);
    yubor('narx_taklif', {
      rideId: b.id, haydovchi_ism: user.ism, haydovchi_narx: oznarx,
      reyting: Number(user.reyting) || 5, mashina: mashinaJamiMatn, min,
    });
    setTanlangan(null);
  };

  return (
    <div style={st.sahifa}>
      <div style={st.header}>
        <div style={st.logo}><Ikonka nom="taxi" size={18} /> <span className="driver-name">{user.ism}</span></div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <SozlamalarTugma />
          <button
            className="driver-header-btn"
            style={{ ...st.tarixTugma, background: obunaBormi ? 'var(--tint-fill)' : 'rgba(255,59,48,0.14)', color: obunaBormi ? 'var(--tint)' : 'var(--qizil)', position: 'relative' }}
            onClick={() => setObunaOchiq(true)}
            title={t('sub.title')}
          >
            <Ikonka nom="card" />
            {obunaBormi && obunaKun < 5 && <span style={st.obunaBadge}>{obunaKun}</span>}
          </button>
          <button className="driver-header-btn" style={st.tarixTugma} onClick={() => setKodOchiq(true)} title={t('drvcode.title')}><Ikonka nom="grid" /></button>
          <button className="driver-header-btn" style={st.tarixTugma} onClick={() => setIssiqOchiq(true)} title={t('heat.title')}><Ikonka nom="flame" /></button>
          <button className="driver-header-btn" style={st.tarixTugma} onClick={() => setProfilOchiq(true)} title={t('car.title')}><Ikonka nom="car" /></button>
          <button className="driver-header-btn" style={st.tarixTugma} onClick={() => navigate('/tarix')} title={t('hist.title')}><Ikonka nom="clock" /></button>
          <button
            className="driver-status-btn"
            style={{
              ...st.statusTugma,
              background: onlayn ? 'var(--accept)' : !onb?.tasdiqlangan ? 'var(--fill)' : 'var(--fill-strong)',
              color: onlayn ? '#fff' : !onb?.tasdiqlangan ? 'var(--tertiary-label)' : 'var(--label)',
            }}
            onClick={statusOzgartir}
            title={!onb?.tasdiqlangan ? t('onb.gateTitle') : undefined}
          >
            {onlayn ? t('drv.online') : t('drv.offline')}
          </button>
        </div>
      </div>

      {/* Тасдиқ кутилмоқда / тугатилмаган уланиш — Uber услубида прогресс билан */}
      {onb && !onb.tasdiqlangan && (
        <div style={st.tasdiqBaner} onClick={() => navigate('/haydovchi/ulanish')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--label)' }}>
              {onb.tasdiq_holati === 'kutilmoqda' ? t('onb.statusPending')
                : onb.tasdiq_holati === 'rad' ? t('onb.statusRejected')
                : t('onb.gateTitle')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--tint)', fontWeight: 600 }}>{onb.foiz || 0}%</div>
          </div>
          <div style={st.tasdiqTrack}><div style={{ ...st.tasdiqBar, width: `${onb.foiz || 0}%` }} /></div>
          <div style={{ fontSize: 12, color: 'var(--secondary-label)', marginTop: 6 }}>
            {onb.tasdiq_holati === 'rad' && onb.rad_sababi ? onb.rad_sababi : t('onb.openWizard')}
          </div>
        </div>
      )}

      {!mashinaToldirilganmi && (
        <div style={st.ogohlantirish} onClick={() => setProfilOchiq(true)}>
          {t('drv.carInfoEmpty', { link: '' })}<b>{t('drv.carInfoFill')}</b>
        </div>
      )}

      {onlayn && gpsRad && (
        <div style={st.gpsOgoh}>
          <Ikonka nom="alert" size={16} /> {t('drv.gpsDenied')}
        </div>
      )}

      <div
        style={{ ...st.daromad, cursor: 'pointer' }}
        onClick={() => { tebrat(TEBRANISH.yengil); setDaromadOchiq(true); }}
        role="button"
        title={t('drv.incomePanel')}
      >
        <div>
          <div style={st.daromadRaqam}>{stats.daromad.toLocaleString()}</div>
          <div style={st.daromadMatn}>{t('drv.todayIncome')}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={st.kichikRaqam}>{stats.safar}</div>
            <div style={st.daromadMatn}>{t('drv.rides')}</div>
          </div>
          <Ikonka nom="grid" size={18} />
        </div>
      </div>

      {/* Даромад солиштируви — комиссиясизлик устунлиги */}
      <DaromadSolishtiruv daromad={stats.daromad} />

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
            <button style={st.chatTugma} onClick={() => setChatOchiq(true)} title={t('chat.tripChat')}><Ikonka nom="chat" size={20} /></button>
          </div>

          {/* Кутиш таймери (yetib_keldi ҳолатида) */}
          {kutish && (
            <div style={{ ...st.kutishKarta, background: kutish.tekin ? 'rgba(52,199,89,0.14)' : 'rgba(255,149,0,0.14)' }}>
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
              <button style={st.harakatTugma} onClick={yetibKeldim}><Ikonka nom="car" size={18} /> {t('wait.iArrived')}</button>
            )}
            {faolSafar.holati === 'yetib_keldi' && (
              <button style={st.harakatTugma} onClick={yolgaChiqdik}><Ikonka nom="road" size={18} /> {t('wait.startDrive')}</button>
            )}
            {faolSafar.holati === 'yolda' && (
              <button style={st.harakatTugma} onClick={safarTugatish}>{t('drv.endRide')}</button>
            )}
            {/* Навигаторда очиш — "келмоқда/кутаяпман"да пикапгача, "йўлда"да манзилгача */}
            {faolSafar.holati === 'yolda'
              ? <NavigatorTugma koord={faolSafar.tugash_koord} manzil={faolSafar.tugash_manzil} />
              : <NavigatorTugma koord={faolSafar.boshlanish_koord} manzil={faolSafar.boshlanish_manzil} />}
            <div style={{ marginTop: 10 }}>
              <SOS rideId={faolSafar.rideId} />
            </div>
          </div>
        </>
      )}
      {chatOchiq && faolSafar && (
        <Chat rideId={faolSafar.rideId} meId={user.id} hamrohIsm={faolSafar.mijoz_ism || t('chat.guestName')} onClose={() => setChatOchiq(false)} />
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

      {kodOchiq && (
        <HaydovchiKodi onYopish={() => setKodOchiq(false)} />
      )}

      {obunaOchiq && (
        <Obuna
          onYopish={() => setObunaOchiq(false)}
          onYangilandi={(o) => setObuna(o)}
        />
      )}

      {daromadOchiq && <DaromadPaneli onYopish={() => setDaromadOchiq(false)} />}

      <div style={st.royxat}>
        {!onlayn ? (
          <div style={st.bosh}>
            <div style={st.boshIkon}><Ikonka nom="moon" size={32} /></div>
            <h3 style={st.boshSarlavha}>{t('drv.youOffline')}</h3>
            <p style={st.boshMatn}>{t('drv.youOfflineHint')}</p>
          </div>
        ) : buyurtmalar.length === 0 ? (
          <div style={st.bosh}>
            <div style={st.boshIkon}><Ikonka nom="search" size={32} /></div>
            <h3 style={st.boshSarlavha}>{t('drv.waiting')}</h3>
            <p style={st.boshMatn}>{t('drv.waitingHint')}</p>
          </div>
        ) : (
          buyurtmalar.map((b) => (
            <div key={b.id} style={st.karta}>
              <div style={st.kartaYuqori}>
                <div>
                  <span style={st.tarifChip}>{t(`tarif.${b.tarif || 'ekonom'}`)}</span>
                  {b.maqsadli && (
                    <span style={st.maqsadliChip}><Ikonka nom="star" size={11} /> {t('fav.forYou')}</span>
                  )}
                  {b.reja_vaqt && (
                    <span style={st.rejaChip}>
                      <Ikonka nom="clock" size={11} /> {new Date(b.reja_vaqt).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  <div style={st.narx}>{Number(b.narx).toLocaleString()} <span style={st.narxSom}>{t('wait.sum')}</span></div>
                  <div style={st.masofa}>
                    <span style={st.masofaItem}><Ikonka nom="road" size={12} /> {b.masofa} км</span>
                    <span style={st.masofaSep}>·</span>
                    <span style={st.masofaItem}>{b.mijoz}</span>
                    <span style={st.masofaChip}><Ikonka nom="star" size={11} /> {b.reyting}</span>
                  </div>
                </div>
                <div style={st.vaqt}>{b.vaqt}</div>
              </div>
              <div style={st.haritaWrap}>
                <HaritaPreview
                  boshlanish={(Array.isArray(b.boshlanish_koord) && b.boshlanish_koord) || parseLatLng(b.boshlanish)}
                  tugash={(Array.isArray(b.tugash_koord) && b.tugash_koord) || parseLatLng(b.tugash)}
                />
              </div>
              <div style={st.yollar}>
                <div style={st.yol}>
                  <span style={{ ...st.nuqta, background: 'var(--yashil)' }} />
                  <span style={st.yolMatn}>{b.boshlanish}</span>
                </div>
                {Array.isArray(b.oraliq_manzillar) && b.oraliq_manzillar.map((m, i) => (
                  <div key={`o-${i}`}>
                    <div style={st.chiziq} />
                    <div style={st.yol}>
                      <span style={{ ...st.nuqta, background: 'var(--tint)' }} />
                      <span style={st.yolMatn}>{m}</span>
                    </div>
                  </div>
                ))}
                <div style={st.chiziq} />
                <div style={st.yol}>
                  <span style={{ ...st.nuqta, background: 'var(--qizil)' }} />
                  <span style={st.yolMatn}>{b.tugash}</span>
                </div>
              </div>
              {b.opsiyalar && (b.opsiyalar.izoh || b.opsiyalar.boshqaUchun || b.opsiyalar.yuk) && (
                <div style={st.opsiyaQator}>
                  {b.opsiyalar.boshqaUchun && <span style={st.opsiyaTeg}>{t('opt.forOther')}</span>}
                  {b.opsiyalar.yuk && <span style={st.opsiyaTeg}>{t('opt.luggage')}</span>}
                  {b.opsiyalar.izoh && <span style={st.opsiyaIzoh}>{b.opsiyalar.izoh}</span>}
                </div>
              )}
              <div style={st.tugmalar}>
                <button style={st.oznarxTugma} onClick={() => { setTanlangan(b); setOznarx(b.narx + 3000); }}>
                  {t('drv.myPrice')}
                </button>
                <button style={st.roziTugma} onClick={() => roziBolish(b)}>
                  {t('drv.agree')} · {Number(b.narx).toLocaleString()}
                </button>
              </div>
              {b.maqsadli && (
                <button style={st.radTugma} onClick={() => maqsadliRad(b)}>
                  {t('fav.decline')}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {tanlangan && (
        <div style={st.modalFon} onClick={() => setTanlangan(null)}>
          <div style={st.modal} onClick={(e) => e.stopPropagation()}>
            <div style={st.grabber} />
            <h3 style={st.modalSarlavha}>{t('drv.myPriceTitle')}</h3>
            <p style={st.modalIzoh}>{tanlangan.boshlanish} → {tanlangan.tugash} ({tanlangan.masofa} км)</p>
            <div style={st.narxBox}>
              <button style={st.narxTugma} onClick={() => setOznarx(Math.max(5000, oznarx - 1000))}><Ikonka nom="minus" size={20} /></button>
              <div style={st.modalNarx}>{oznarx.toLocaleString()}</div>
              <button style={st.narxTugma} onClick={() => setOznarx(oznarx + 1000)}><Ikonka nom="plus" size={20} /></button>
            </div>
            <button style={st.yuborishTugma} onClick={oznarxYuborish}>{t('drv.sendOffer')}</button>
            <button style={st.bekorTugma} onClick={() => setTanlangan(null)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {/* Машина PIN-кодини сўраш — сафар фақат тўғри PIN билан бошланади */}
      {pinModal && (
        <div style={st.modalFon} onClick={() => setPinModal(false)}>
          <div style={st.modal} onClick={(e) => e.stopPropagation()}>
            <div style={st.grabber} />
            <h3 style={st.modalSarlavha}><Ikonka nom="lock" size={18} /> {t('pin.enterTitle')}</h3>
            <input
              style={st.pinInput}
              type="tel"
              inputMode="numeric"
              maxLength={4}
              value={pinKiritma}
              onChange={(e) => setPinKiritma(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              autoFocus
            />
            <button
              style={{ ...st.yuborishTugma, opacity: pinKiritma.length === 4 ? 1 : 0.5 }}
              disabled={pinKiritma.length !== 4}
              onClick={pinTasdiqla}
            >{t('wait.startDrive')}</button>
            <button style={st.bekorTugma} onClick={() => setPinModal(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

const st = {
  sahifa: { width: '100%', maxWidth: 480, margin: '0 auto', minHeight: '100dvh', background: 'var(--bg)', paddingBottom: 'calc(140px + env(safe-area-inset-bottom))' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', paddingTop: 'calc(12px + env(safe-area-inset-top))', background: 'var(--material-bar)', backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)', borderBottom: '0.5px solid var(--separator)', gap: 8, position: 'sticky', top: 0, zIndex: 50 },
  logo: { display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 15, color: 'var(--label)', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap' },
  tarixTugma: { background: 'var(--fill)', width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tint)' },
  obunaBadge: { position: 'absolute', top: -3, right: -3, background: 'var(--qizil)', color: '#fff', minWidth: 18, height: 18, borderRadius: 9, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '1.5px solid var(--surface)' },
  ogohlantirish: { margin: '12px 16px 0', padding: 12, background: 'rgba(255,149,0,0.14)', color: 'var(--amber)', borderRadius: 'var(--r-md)', fontSize: 14, cursor: 'pointer', fontWeight: 500 },
  tasdiqBaner: { margin: '12px 16px 0', padding: 14, background: 'var(--surface)', borderRadius: 'var(--r-lg)', cursor: 'pointer', border: '0.5px solid var(--separator)' },
  tasdiqTrack: { height: 4, borderRadius: 999, background: 'var(--fill)', overflow: 'hidden' },
  tasdiqBar:   { height: '100%', background: 'var(--tint)', transition: 'width 0.3s ease' },
  gpsOgoh: { display: 'flex', alignItems: 'flex-start', gap: 8, margin: '12px 16px 0', padding: 12, background: 'rgba(255,59,48,0.12)', color: 'var(--qizil)', borderRadius: 'var(--r-md)', fontSize: 14, fontWeight: 500 },
  statusTugma: { color: '#fff', padding: '8px 18px', borderRadius: 'var(--r-full)', fontWeight: 600, fontSize: 14 },
  daromad: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px', padding: 18, background: 'var(--surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-1)' },
  faolSafar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 16px 10px', padding: 16, background: 'var(--yashil)', borderRadius: 'var(--r-lg)', color: '#fff', gap: 8 },
  tugatTugma: { background: '#fff', color: 'var(--yashil)', padding: '10px 12px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 13 },
  chatTugma: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.22)', color: '#fff', width: 40, height: 40, borderRadius: '50%' },
  kutishKarta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 16px 10px', padding: 14, borderRadius: 'var(--r-md)' },
  kutishMatn: { fontSize: 13, fontWeight: 500, color: 'var(--secondary-label)' },
  kutishVaqt: { fontSize: 26, fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginTop: 2, color: 'var(--label)' },
  kutishHaq: { fontSize: 18, fontWeight: 600, color: 'var(--amber)' },
  tugmaQator: { margin: '0 16px 16px' },
  harakatTugma: { width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--tint)', color: 'var(--on-tint)', padding: 15, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 17 },
  daromadRaqam: { fontSize: 30, fontWeight: 700, color: 'var(--tint)', letterSpacing: '0.3px' },
  kichikRaqam: { fontSize: 30, fontWeight: 700, color: 'var(--label)', letterSpacing: '0.3px' },
  daromadMatn: { fontSize: 13, color: 'var(--secondary-label)', marginTop: 2 },
  royxat: { padding: '4px 16px 16px' },
  bosh: { textAlign: 'center', padding: '60px 20px', color: 'var(--secondary-label)' },
  boshIkon: { display: 'inline-flex', color: 'var(--tertiary-label)', marginBottom: 12 },
  boshSarlavha: { fontSize: 20, fontWeight: 600, color: 'var(--label)', marginBottom: 6 },
  boshMatn: { fontSize: 15 },
  karta: { background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 16, marginBottom: 12, boxShadow: 'var(--shadow-1)' },
  kartaYuqori: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  tarifChip: { display: 'inline-block', fontSize: 11, fontWeight: 600, color: 'var(--tint)', background: 'var(--tint-fill)', padding: '2px 8px', borderRadius: 'var(--r-full)', marginBottom: 6 },
  rejaChip: { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: 'var(--amber)', background: 'rgba(255,149,0,0.14)', padding: '2px 8px', borderRadius: 'var(--r-full)', marginLeft: 6, marginBottom: 6, verticalAlign: 'middle' },
  narx: { fontSize: 26, fontWeight: 700, letterSpacing: '0.3px', color: 'var(--label)' },
  narxSom: { fontSize: 13, fontWeight: 500, color: 'var(--secondary-label)' },
  masofa: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 13, color: 'var(--secondary-label)', marginTop: 4 },
  masofaItem: { display: 'inline-flex', alignItems: 'center', gap: 3 },
  masofaSep: { color: 'var(--tertiary-label)' },
  masofaChip: { display: 'inline-flex', alignItems: 'center', gap: 2, padding: '1px 6px', background: 'var(--fill)', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 500, color: 'var(--amber)' },
  vaqt: { fontSize: 13, color: 'var(--secondary-label)' },
  haritaWrap: { marginBottom: 12, borderRadius: 'var(--r-md)', overflow: 'hidden' },
  yollar: { marginBottom: 16 },
  yol: { display: 'flex', alignItems: 'center', gap: 10 },
  nuqta: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  chiziq: { width: 2, height: 16, background: 'var(--separator)', marginLeft: 4 },
  yolMatn: { fontSize: 15, fontWeight: 400 },
  opsiyaQator: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 14 },
  opsiyaTeg: { fontSize: 12, fontWeight: 600, color: 'var(--tint)', background: 'var(--tint-fill)', padding: '3px 10px', borderRadius: 'var(--r-full)' },
  opsiyaIzoh: { fontSize: 13, color: 'var(--secondary-label)', flexBasis: '100%' },
  tugmalar: { display: 'flex', gap: 10 },
  oznarxTugma: { flex: 1, background: 'var(--fill)', color: 'var(--tint)', padding: 13, borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15 },
  roziTugma: { flex: 1.4, background: 'var(--accept)', color: '#fff', padding: 13, borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15 },
  maqsadliChip: { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: 'var(--on-tint)', background: 'var(--tint)', padding: '2px 8px', borderRadius: 'var(--r-full)', marginLeft: 6, marginBottom: 6, verticalAlign: 'middle' },
  radTugma: { width: '100%', background: 'transparent', color: 'var(--decline)', padding: 10, borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 14, marginTop: 8 },
  modalFon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' },
  modal: { background: 'var(--surface-elevated)', width: '100%', maxWidth: 480, borderRadius: '14px 14px 0 0', padding: '8px 20px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' },
  grabber: { width: 36, height: 5, borderRadius: 3, background: 'var(--fill-strong)', margin: '0 auto 14px' },
  modalSarlavha: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 20, fontWeight: 600, marginBottom: 8 },
  modalIzoh: { fontSize: 15, color: 'var(--secondary-label)', marginBottom: 20 },
  narxBox: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--fill)', padding: 14, borderRadius: 'var(--r-lg)', marginBottom: 16 },
  narxTugma: { width: 44, height: 44, borderRadius: '50%', background: 'var(--surface)', color: 'var(--tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-1)' },
  modalNarx: { fontSize: 30, fontWeight: 700, letterSpacing: '0.3px' },
  yuborishTugma: { width: '100%', background: 'var(--ink)', color: 'var(--on-tint)', padding: 15, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 17 },
  pinInput: { width: '100%', textAlign: 'center', letterSpacing: 14, fontSize: 32, fontWeight: 700, padding: '14px 0', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--fill)', color: 'var(--label)', marginBottom: 16 },
  bekorTugma: { width: '100%', background: 'transparent', padding: 12, color: 'var(--tint)', fontSize: 17, fontWeight: 400, marginTop: 4 },
};
