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
import { tavsiyaHisobi, ASOSIY, PER_KM, TARIFLAR } from '../utils/narx';
import { masofaKm } from '../utils/geo';
import { api, yolHisobla } from '../services/api';
import { useSocket } from '../services/useSocket';
import { bildir, ruxsatSora } from '../services/bildirishnoma';
import { tebrat, TEBRANISH } from '../services/haptika';
import { pushObunaBol } from '../services/push';
import { useT, TilTanlovchi } from '../i18n';
import { TemaTanlovchi } from '../theme';
import Ikonka from '../components/Ikonka';
import { joylashuvOl } from '../services/telegram';

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
  const [oraliqlar, setOraliqlar] = useState([]); // [{ nuqta:[lat,lng], manzil }] — манзил(лар), охиргиси якуний
  const [aniqYol, setAniqYol] = useState(null); // { masofa_km, davomiylik_min, yol_chizigi, taxminiy } — OSRM реал йўл
  // Yandex услуби — харита маркази (пин остидаги нуқта ва манзил)
  const [markazNuqta, setMarkazNuqta] = useState(null);
  const [markazManzil, setMarkazManzil] = useState('');
  const [markazManzilYuk, setMarkazManzilYuk] = useState(false);
  const [uchish, setUchish] = useState(null); // харитани кўчириш мақсади
  const [safarPin, setSafarPin] = useState(null); // машина PIN-коди
  const reverseTimerRef = useRef(null);
  const [narx, setNarx] = useState(15000);
  const [tarif, setTarif] = useState('ekonom');
  const [izoh, setIzoh] = useState('');
  const [boshqaUchun, setBoshqaUchun] = useState(false);
  const [yuk, setYuk] = useState(false);
  const [rejaVaqt, setRejaVaqt] = useState(''); // datetime-local; '' = ҳозир
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

  // Telegram локация тугмасидан кирганда — URL'даги манзилни олдиндан қўямиз.
  // Фойдаланувчи фақат "Қаердан?" (пикап)ни танлаб, давом этади.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const dlat = parseFloat(sp.get('dest_lat'));
    const dlng = parseFloat(sp.get('dest_lng'));
    if (!Number.isFinite(dlat) || !Number.isFinite(dlng)) return;
    let bekor = false;
    (async () => {
      let manzil = `${dlat.toFixed(4)}, ${dlng.toFixed(4)}`;
      try {
        const { data } = await api.get(`/geocode/reverse?lat=${dlat}&lng=${dlng}&til=${til}`);
        if (data.manzil) manzil = data.manzil;
      } catch { /* координата матни қолади */ }
      if (bekor) return;
      setOraliqlar([{ nuqta: [dlat, dlng], manzil }]);
      setTanlovRejimi('boshlanish');
      setBosqich('manzil');
    })();
    return () => { bekor = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Харита марказини фойдаланувчи жойига кўчирамиз (Telegram LocationManager ёки
  // браузер geolocation). Рухсат берилмаса дефолт марказ (Тошкент) қолади.
  useEffect(() => {
    let bekor = false;
    joylashuvOl().then((p) => { if (!bekor && p) setUchish(p); });
    return () => { bekor = true; };
  }, []);

  // "Мени топ" — жорий жойга қайтиш (қўлда)
  const [joyYuklanmoqda, setJoyYuklanmoqda] = useState(false);
  const meniTop = async () => {
    setJoyYuklanmoqda(true);
    const p = await joylashuvOl();
    if (p) setUchish([p[0], p[1]]);
    setJoyYuklanmoqda(false);
  };

  const { yubor } = useSocket({
    // Қайта уланганда фаол сафар хонасига қайта қўшиламиз (рўйхатдан ўтган мижоз)
    connect: () => {
      if (rideId) yubor('safarga_qoshil', { rideId });
    },
    buyurtma_yaratildi: ({ id, pin }) => {
      setRideId(id); // мижоз ID'сини базадан келган реал ID билан алмаштирамиз
      if (pin) setSafarPin(pin); // машина PIN-коди — ҳайдовчига айтилади
    },
    yangi_taklif: (taklif) => {
      setTakliflar((oldin) => [...oldin, taklif]);
      tebrat(TEBRANISH.muvaffaqiyat);
      bildir('💰 Янги таклиф', `${taklif.haydovchi_ism} · ${Number(taklif.haydovchi_narx).toLocaleString()} сўм${taklif.min != null ? ` · ${taklif.min} мин` : ''}`, { tag: 'taklif' });
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
    setOraliqlar([]);
    setAniqYol(null);
    setMarkazManzil('');
    setSafarPin(null);
    setIzoh('');
    setBoshqaUchun(false);
    setYuk(false);
    setRejaVaqt('');
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

  // Пин остидаги нуқтани тасдиқлаш — бошланиш ёки манзил (оралиқ) қўшиш
  const markaznidanTanla = () => {
    if (!markazNuqta) return;
    if (tanlovRejimi === 'boshlanish') {
      setBoshlanish(markazNuqta);
      setBoshlanishManzil(markazManzil);
      setTanlovRejimi('tugash');
    } else {
      // Манзилни рўйхатга қўшамиз (кўп манзил — оралиқ нуқталар)
      setOraliqlar((eski) => [...eski, { nuqta: markazNuqta, manzil: markazManzil }]);
    }
  };

  // "Давом этиш" — манзил(лар) танлангач нарх босқичига ўтамиз.
  // OSRM'дан реал йўл масофаси+ETA оламиз; натижа келгунча Haversine билан нархни кўрсатамиз.
  const manzillarTasdiqla = async () => {
    if (oraliqlar.length === 0) return;
    const oxirgi = oraliqlar[oraliqlar.length - 1];
    setTugash(oxirgi.nuqta);
    setTugashManzil(oxirgi.manzil);
    setNarx(tavsiyaHisobi(yolMasofa(), tarif)); // дастлабки (тахминий) нарх
    setBosqich('narx');

    const nuqtalar = [boshlanish, ...oraliqlar.map((o) => o.nuqta)].filter(Boolean);
    const natija = await yolHisobla(nuqtalar);
    if (natija && Number.isFinite(natija.masofa_km)) {
      setAniqYol(natija);
      setNarx(tavsiyaHisobi(natija.masofa_km, tarif)); // реал масофа бўйича нархни аниқлаймиз
    }
  };

  const oraliqOchir = (i) => { setAniqYol(null); setOraliqlar((eski) => eski.filter((_, j) => j !== i)); };

  // Тўлиқ йўл масофаси — бошланиш → манзил1 → ... → охирги
  const yolMasofa = () => {
    const nuqtalar = [boshlanish, ...oraliqlar.map((o) => o.nuqta)].filter(Boolean);
    let jami = 0;
    for (let i = 0; i < nuqtalar.length - 1; i++) jami += masofaKm(nuqtalar[i], nuqtalar[i + 1]);
    return Math.round(jami * 100) / 100;
  };

  // Реал йўл масофаси бўлса шуни, бўлмаса Haversine захирасини ишлатамиз
  const masofa = () => (aniqYol && Number.isFinite(aniqYol.masofa_km) ? aniqYol.masofa_km : yolMasofa());

  // Сафар вақти (ETA, дақиқа) — OSRM'дан. Йўқ бўлса null.
  const safarDaqiqa = () => (aniqYol && Number.isFinite(aniqYol.davomiylik_min) ? aniqYol.davomiylik_min : null);

  // Таклифларни саралаб кўрсатамиз: арзонроқ → тезроқ (ETA) → юқори рейтинг.
  // Йўловчи энг фойдалисини тепада кўради (Uber/Bolt услуби).
  const saralanganTakliflar = [...takliflar].sort((a, b) => {
    const na = Number(a.haydovchi_narx) || 0, nb = Number(b.haydovchi_narx) || 0;
    if (na !== nb) return na - nb;
    const ea = a.min ?? Infinity, eb = b.min ?? Infinity;
    if (ea !== eb) return ea - eb;
    return (Number(b.reyting) || 0) - (Number(a.reyting) || 0);
  });

  // Ҳайдовчининг келиш вақти (ETA) — жонли GPS'дан пикап нуқтасигача, шаҳар ўртача тезлиги
  const kelishVaqti = () => {
    if (!haydovchiNuqta || !boshlanish) return null;
    const km = masofaKm(haydovchiNuqta, boshlanish);
    if (!km) return null;
    const SHAHAR_TEZLIK = 22; // км/соат
    return Math.max(1, Math.round((km / SHAHAR_TEZLIK) * 60));
  };

  const tavsiyaNarx = tavsiyaHisobi(masofa(), tarif);

  // Тариф танлаш — тавсия нархни шу тарифга мослаб янгилаймиз
  const tarifTanla = (kod) => {
    setTarif(kod);
    setNarx(tavsiyaHisobi(masofa(), kod));
  };

  // datetime-local форматига ўгириш (маҳаллий вақт)
  const toLocalInput = (d) => {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const rejaMin = toLocalInput(new Date());
  const rejaMatn = (s) => {
    try { return new Date(s).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch { return s; }
  };

  // Буюртма бериш — socket орқали ҳайдовчиларга юборилади
  const buyurtmaBerish = () => {
    tebrat(TEBRANISH.yengil);
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
      boshlanish_koord: boshlanish, // [lat,lng] — ҳайдовчи ETA ва харита учун
      tugash_koord: tugash,
      masofa: masofa(),
      narx,
      tarif,
      opsiyalar: { izoh: izoh.trim() || null, boshqaUchun, yuk },
      reja_vaqt: rejaVaqt || null,
      // оралиқ манзиллар (бошланиш ва якуний орасидаги тўхташлар)
      oraliq_manzillar: oraliqlar.slice(0, -1).map((o) => o.manzil || `${o.nuqta[0].toFixed(4)}, ${o.nuqta[1].toFixed(4)}`),
      vaqt: 'ҳозиргина',
    });
  };

  // Ҳайдовчини танлаш — haydovchi_id ҳам юборамиз, токи backend rides жадвалини янгилаб қўйсин
  const haydovchiTanla = (t) => {
    tebrat(TEBRANISH.muvaffaqiyat);
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
          yol={[boshlanish, ...oraliqlar.map((o) => o.nuqta)].filter(Boolean)}
          yolChizigi={aniqYol?.yol_chizigi}
          haydovchi={haydovchiNuqta}
          markazRejim={bosqich === 'manzil'}
          markazRang={tanlovRejimi === 'boshlanish' ? '#0E9384' : '#EF4444'}
          onMarkaz={markazKuzat}
          uchish={uchish}
        />
      </div>
      <div style={st.logo} className="glass-tugma"><Ikonka nom="taxi" size={18} /> Manzil</div>
      <div style={st.tilWrap}><TemaTanlovchi /><TilTanlovchi /></div>
      <button
        style={st.profilTugma}
        className="glass-tugma"
        onClick={() => user ? setProfilOchiq(true) : setKirishOchiq(true)}
        title={user ? t('prof.title') : t('login.title')}
      ><Ikonka nom={user ? 'user' : 'key'} /></button>
      <button style={st.tarixTugma} className="glass-tugma" onClick={() => navigate('/tarix')} title={t('hist.title')}><Ikonka nom="clock" /></button>
      <div style={st.yordam} className="glass-tugma">{t('common.help')}</div>

      {bosqich === 'manzil' && (
        <button
          style={st.meniTop}
          className="glass-tugma press"
          onClick={meniTop}
          disabled={joyYuklanmoqda}
          title={t('geo.locateMe')}
          aria-label={t('geo.locateMe')}
        >
          {joyYuklanmoqda ? <span style={st.miniSpinner} /> : <Ikonka nom="pin" size={20} />}
        </button>
      )}

      <div style={st.panel} className="glass slide-up">
        <div style={st.grabber} />
        {bosqich === 'manzil' && (
          <>
            <h2 style={st.sarlavha}>{tanlovRejimi === 'boshlanish' ? t('pass.fromWhere') : t('pass.toWhere')}</h2>

            {/* Манзил қидириш — топилган нуқтага харитани кўчиради */}
            <ManzilQidirish
              rejimMatn={tanlovRejimi === 'boshlanish' ? t('geo.modeStart') : t('geo.modeEnd')}
              onTanlandi={(nuqta) => setUchish([nuqta[0], nuqta[1]])}
            />

            {/* Танланган манзиллар рўйхати (кўп манзил) */}
            {oraliqlar.length > 0 && (
              <div style={st.oraliqRoyxat}>
                {oraliqlar.map((o, i) => (
                  <div key={i} style={st.oraliqQator}>
                    <span style={{ ...st.nuqta, background: i === oraliqlar.length - 1 ? 'var(--qizil)' : 'var(--tint)' }} />
                    <span style={st.oraliqMatn}>{o.manzil || `${o.nuqta[0].toFixed(3)}, ${o.nuqta[1].toFixed(3)}`}</span>
                    <button style={st.oraliqOchir} onClick={() => oraliqOchir(i)}><Ikonka nom="x" size={14} /></button>
                  </div>
                ))}
              </div>
            )}

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
                    <button key={i} style={st.tezTugma} className="bosiladi" onClick={() => setUchish([p[0], p[1]])}><Ikonka nom="clock" size={14} /> {p[0].toFixed(2)}, {p[1].toFixed(2)}</button>
                  );
                })}
              </div>
            )}

            {tanlovRejimi === 'boshlanish' ? (
              <button style={{ ...st.tugma, opacity: markazNuqta ? 1 : 0.5 }} onClick={markaznidanTanla} disabled={!markazNuqta}>
                {t('pass.confirmStart')}
              </button>
            ) : (
              <>
                {oraliqlar.length > 0 && (
                  <button style={st.tugma} onClick={manzillarTasdiqla}>
                    {t('common.continue')}
                  </button>
                )}
                <button
                  style={{ ...(oraliqlar.length === 0 ? st.tugma : st.qoshTugma), opacity: markazNuqta ? 1 : 0.5 }}
                  onClick={markaznidanTanla}
                  disabled={!markazNuqta}
                >
                  {oraliqlar.length === 0 ? t('pass.markDest') : `+ ${t('pass.addStop')}`}
                </button>
                <button style={st.orqaga} onClick={() => { setTanlovRejimi('boshlanish'); setOraliqlar([]); setAniqYol(null); }}>
                  <Ikonka nom="arrow-left" size={16} /> {t('common.back')}
                </button>
              </>
            )}
          </>
        )}

        {bosqich === 'narx' && (
          <>
            <h2 style={st.sarlavha}>{t('pass.offerPrice')}</h2>

            {/* Тариф класслари — Yandex услуби */}
            <div style={st.tariflar}>
              {TARIFLAR.map((tr) => {
                const faol = tarif === tr.kod;
                return (
                  <button
                    key={tr.kod}
                    style={{ ...st.tarifKarta, ...(faol ? st.tarifFaol : {}) }}
                    onClick={() => tarifTanla(tr.kod)}
                  >
                    <span style={{ ...st.tarifIkon, color: faol ? '#fff' : 'var(--tint)' }}><Ikonka nom={tr.ikon} size={20} /></span>
                    <span style={st.tarifNom}>{t(`tarif.${tr.kod}`)}</span>
                    <span style={st.tarifNarx}>{tavsiyaHisobi(masofa(), tr.kod).toLocaleString()}</span>
                  </button>
                );
              })}
            </div>

            <p style={st.izoh}>
              {t('pass.distance')}: {masofa()} км
              {safarDaqiqa() != null && ` · ${aniqYol?.taxminiy ? '≈' : ''}${safarDaqiqa()} ${t('drv.minute')}`}
              {' · '}{t('pass.recommended')}: {tavsiyaNarx.toLocaleString()}
            </p>
            <div style={st.narxBox}>
              <button style={st.narxTugma} onClick={() => setNarx(Math.max(5000, narx - 1000))}><Ikonka nom="minus" size={20} /></button>
              <div style={st.narxMatn}>{narx.toLocaleString()}</div>
              <button style={st.narxTugma} onClick={() => setNarx(narx + 1000)}><Ikonka nom="plus" size={20} /></button>
            </div>

            {/* Буюртма опциялари — Yandex услуби */}
            <div style={st.opsiyalar}>
              <input
                style={st.opIzoh}
                value={izoh}
                onChange={(e) => setIzoh(e.target.value.slice(0, 200))}
                placeholder={t('opt.commentPh')}
              />
              <div style={st.opChiplar}>
                <button
                  style={{ ...st.opChip, ...(boshqaUchun ? st.opChipFaol : {}) }}
                  onClick={() => setBoshqaUchun((v) => !v)}
                >
                  <Ikonka nom={boshqaUchun ? 'check' : 'user'} size={15} /> {t('opt.forOther')}
                </button>
                <button
                  style={{ ...st.opChip, ...(yuk ? st.opChipFaol : {}) }}
                  onClick={() => setYuk((v) => !v)}
                >
                  <Ikonka nom={yuk ? 'check' : 'receipt'} size={15} /> {t('opt.luggage')}
                </button>
              </div>

              {/* Олдиндан буюртма */}
              <button
                style={{ ...st.rejaTugma, ...(rejaVaqt ? st.opChipFaol : {}) }}
                onClick={() => setRejaVaqt(rejaVaqt ? '' : toLocalInput(new Date(Date.now() + 3600000)))}
              >
                <Ikonka nom="clock" size={15} /> {rejaVaqt ? t('sched.for', { vaqt: rejaMatn(rejaVaqt) }) : t('sched.toggle')}
              </button>
              {rejaVaqt && (
                <input
                  type="datetime-local"
                  style={st.opIzoh}
                  value={rejaVaqt}
                  min={rejaMin}
                  onChange={(e) => setRejaVaqt(e.target.value)}
                />
              )}
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
            <button style={st.orqaga} onClick={() => setBosqich('manzil')}><Ikonka nom="arrow-left" size={16} /> {t('common.back')}</button>
          </>
        )}

        {bosqich === 'safar' && haydovchiInfo && (
          <>
            {/* Ҳолат пилюласи — Uber услуби */}
            <div style={st.statusPill}>
              <span style={st.statusNuqta} />
              <span style={{ flex: 1 }}>
                {haydovchiInfo.holati === 'yetib_keldi' ? t('wait.driverHere')
                 : haydovchiInfo.holati === 'yolda' ? t('pass.inRide')
                 : t('wait.driverComing')}
              </span>
              {haydovchiInfo.holati !== 'yetib_keldi' && haydovchiInfo.holati !== 'yolda' && kelishVaqti() && (
                <span style={st.statusEta}>{t('wait.etaMin', { min: kelishVaqti() })}</span>
              )}
            </div>

            {/* Ҳайдовчи картаси — Uber услуби */}
            <div style={st.drvKarta}>
              <div style={st.avatarKatta}>{haydovchiInfo.ism[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={st.hIsm}>
                  {haydovchiInfo.ism}
                  {haydovchiInfo.tasdiqlangan && <span style={st.tasdiqBelgi} title={t('verify.badge')}>✓</span>}
                </div>
                <div style={st.hReyting}><Ikonka nom="star" size={13} /> {haydovchiInfo.reyting}</div>
              </div>
              <div style={st.drvMashinaBox}>
                <div style={st.drvMashinaMatn}>{haydovchiInfo.mashina}</div>
                <div style={st.drvNarxBadge}>{Number(haydovchiInfo.narx).toLocaleString()}</div>
              </div>
            </div>

            {/* Машина PIN-коди — ҳайдовчига айтилади, сафар фақат тўғри PIN билан бошланади */}
            {safarPin && haydovchiInfo.holati !== 'yolda' && (
              <div style={st.pinKarta}>
                <div style={st.pinLabel}><Ikonka nom="lock" size={13} /> {t('pin.tellDriver')}</div>
                <div style={st.pinRaqam}>{String(safarPin).split('').map((d, i) => <span key={i} style={st.pinXona}>{d}</span>)}</div>
              </div>
            )}

            {/* Кутиш огоҳлантириш — ҳайдовчи етиб келганда */}
            {haydovchiInfo.holati === 'yetib_keldi' && (
              <div style={st.kutishOgoh}>
                <Ikonka nom="alert" size={15} /> {t('wait.passengerHurry')}
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
            {/* Амал тугмалари — Uber услуби (иконкали қатор) */}
            <div style={st.amalQator}>
              <button style={st.amalTugma} onClick={() => setChatOchiq(true)}>
                <span style={st.amalIkon}><Ikonka nom="chat" size={20} /></span>
                {t('pass.actChat')}
              </button>
              <button style={st.amalTugma} onClick={() => setTolovOchiq(true)}>
                <span style={st.amalIkon}><Ikonka nom="card" size={20} /></span>
                {t('pass.actPay')}
              </button>
              <button style={st.amalTugma} onClick={() => setUlashishOchiq(true)}>
                <span style={st.amalIkon}><Ikonka nom="share" size={20} /></span>
                {t('pass.actShare')}
              </button>
            </div>
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
                <div style={st.radar}>
                  <span style={st.radarHalqa} />
                  <span style={{ ...st.radarHalqa, animationDelay: '0.8s' }} />
                  <span style={st.radarMarkaz}><Ikonka nom="car" size={26} /></span>
                </div>
                <h2 style={st.sarlavha}>{t('pass.searching')}</h2>
                <p style={st.izoh}>{narx.toLocaleString()} · {masofa()} км</p>
                <button style={st.bekor} onClick={bekorQilish}>{t('common.cancel')}</button>
              </div>
            ) : (
              <>
                <h2 style={st.sarlavha}>{t('pass.offers')} ({takliflar.length})</h2>
                <div style={{ maxHeight: 260, overflowY: 'auto' }} className="royxat-anim">
                  {saralanganTakliflar.map((tk, i) => (
                    <div key={tk.haydovchi_id ?? i} style={st.haydovchi}>
                      <div style={st.avatar}>{tk.haydovchi_ism[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={st.hIsm}>
                          {tk.haydovchi_ism}
                          {tk.tasdiqlangan && <span style={st.tasdiqBelgi} title={t('verify.badge')}>✓</span>}
                          {' '}<Ikonka nom="star" size={13} /> {tk.reyting}
                        </div>
                        <div style={st.hMashina}>
                          {tk.mashina}
                          {tk.min != null && ` · ${tk.min} ${t('drv.minute')}`}
                        </div>
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
        <Chat rideId={rideId} meId={meId} hamrohIsm={haydovchiInfo?.ism || t('home.driver')} onClose={() => setChatOchiq(false)} />
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
  logo: { position: 'absolute', top: 'calc(16px + env(safe-area-inset-top))', left: 16, zIndex: 1000, display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--tint)', padding: '7px 14px', borderRadius: 'var(--r-full)', fontWeight: 600, fontSize: 15 },
  yordam: { position: 'absolute', top: 'calc(16px + env(safe-area-inset-top))', right: 16, zIndex: 1000, padding: '7px 14px', borderRadius: 'var(--r-full)', fontWeight: 500, fontSize: 13, color: 'var(--secondary-label)' },
  tarixTugma: { position: 'absolute', top: 'calc(16px + env(safe-area-inset-top))', right: 116, zIndex: 1000, width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tint)' },
  profilTugma: { position: 'absolute', top: 'calc(16px + env(safe-area-inset-top))', right: 162, zIndex: 1000, width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tint)' },
  tilWrap: { position: 'absolute', top: 'calc(64px + env(safe-area-inset-top))', right: 16, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 8 },
  meniTop: { position: 'absolute', right: 16, top: '40%', zIndex: 1000, width: 46, height: 46, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tint)' },
  miniSpinner: { width: 20, height: 20, border: '2px solid var(--fill)', borderTopColor: 'var(--tint)', borderRadius: '50%', animation: 'aylanish 0.8s linear infinite' },
  tolovTugma: { background: 'var(--fill)', color: 'var(--tint)', padding: 14, borderRadius: 'var(--r-lg)', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' },
  ulashishTugma: { width: '100%', background: 'var(--fill)', color: 'var(--label)', padding: 13, borderRadius: 'var(--r-lg)', fontSize: 15, fontWeight: 600, marginTop: 8 },
  tezManzillar: { display: 'flex', gap: 8, marginTop: 8, marginBottom: 8, flexWrap: 'wrap' },
  tezTugma: { flex: '1 0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'var(--fill)', color: 'var(--tint)', padding: '8px 14px', borderRadius: 'var(--r-full)', fontSize: 13, fontWeight: 600 },
  kutishOgoh: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,149,0,0.14)', padding: '11px 14px', borderRadius: 'var(--r-md)', marginBottom: 10, fontSize: 14, color: 'var(--amber)', fontWeight: 500 },
  kutishQushilgan: { background: 'rgba(255,59,48,0.12)', padding: 10, borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--qizil)', textAlign: 'center', marginBottom: 10 },
  panel: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000, maxWidth: 480, margin: '0 auto', borderRadius: '14px 14px 0 0', padding: '6px 20px calc(20px + env(safe-area-inset-bottom))', maxHeight: '85vh', overflowY: 'auto' },
  grabber: { width: 36, height: 5, borderRadius: 3, background: 'var(--fill-strong)', margin: '0 auto 14px' },
  sarlavha: { fontSize: 22, fontWeight: 700, letterSpacing: '0.35px', marginBottom: 14 },
  izoh: { color: 'var(--secondary-label)', fontSize: 15, marginBottom: 16 },
  maydon: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--fill)', padding: 14, borderRadius: 'var(--r-md)', marginBottom: 10, cursor: 'pointer' },
  nuqta: { width: 11, height: 11, borderRadius: '50%', flexShrink: 0 },
  maydonMatn: { fontSize: 15 },
  oraliqRoyxat: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 },
  oraliqQator: { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--fill)', padding: '10px 12px', borderRadius: 'var(--r-md)' },
  oraliqMatn: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: 'var(--label)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  oraliqOchir: { width: 26, height: 26, borderRadius: '50%', background: 'var(--fill-strong)', color: 'var(--secondary-label)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  qoshTugma: { width: '100%', background: 'var(--fill)', color: 'var(--tint)', padding: 14, borderRadius: 'var(--r-lg)', fontSize: 16, fontWeight: 600, marginTop: 8 },
  markazManzilQator: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--fill)', padding: 14, borderRadius: 'var(--r-md)', marginBottom: 10, minHeight: 48 },
  markazManzilMatn: { fontSize: 15, fontWeight: 500, lineHeight: 1.3, color: 'var(--label)' },
  tugma: { width: '100%', background: 'var(--tint)', color: '#fff', padding: 15, borderRadius: 'var(--r-lg)', fontSize: 17, fontWeight: 600, marginTop: 8 },
  orqaga: { width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2, background: 'transparent', padding: 12, color: 'var(--tint)', fontSize: 17, fontWeight: 400, marginTop: 2 },
  opsiyalar: { marginBottom: 4 },
  opIzoh: { width: '100%', background: 'var(--fill)', border: 'none', borderRadius: 'var(--r-md)', padding: '12px 14px', fontSize: 15, color: 'var(--label)', marginBottom: 8 },
  opChiplar: { display: 'flex', gap: 8 },
  opChip: { flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 10px', borderRadius: 'var(--r-full)', background: 'var(--fill)', color: 'var(--label)', fontSize: 13, fontWeight: 500 },
  opChipFaol: { background: 'var(--tint)', color: '#fff' },
  rejaTugma: { width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 10px', borderRadius: 'var(--r-md)', background: 'var(--fill)', color: 'var(--label)', fontSize: 14, fontWeight: 500, marginTop: 8 },
  tariflar: { display: 'flex', gap: 8, marginBottom: 16 },
  tarifKarta: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 6px', borderRadius: 'var(--r-md)', background: 'var(--fill)', border: '1.5px solid transparent', color: 'var(--label)' },
  tarifFaol: { background: 'var(--tint)', color: '#fff', borderColor: 'var(--tint)' },
  tarifIkon: { display: 'inline-flex' },
  tarifNom: { fontSize: 13, fontWeight: 600 },
  tarifNarx: { fontSize: 12, fontWeight: 400, opacity: 0.85, fontVariantNumeric: 'tabular-nums' },
  narxBox: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--fill)', padding: 14, borderRadius: 'var(--r-lg)', marginBottom: 16 },
  narxTugma: { width: 44, height: 44, borderRadius: '50%', background: 'var(--surface)', color: 'var(--tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-1)' },
  narxMatn: { fontSize: 30, fontWeight: 700, letterSpacing: '0.3px' },
  som: { fontSize: 16, fontWeight: 400, color: 'var(--secondary-label)' },
  kutish: { textAlign: 'center', padding: '12px 0' },
  spinner: { width: 40, height: 40, margin: '0 auto 16px', border: '3px solid var(--fill)', borderTop: '3px solid var(--tint)', borderRadius: '50%', animation: 'aylanish 0.9s linear infinite' },
  bekor: { width: '100%', background: 'var(--fill)', color: 'var(--qizil)', padding: 14, borderRadius: 'var(--r-lg)', fontSize: 17, fontWeight: 500, marginTop: 8 },
  haydovchi: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--fill)', padding: 12, borderRadius: 'var(--r-md)', marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: '50%', background: 'var(--tint)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 18, flexShrink: 0 },
  hIsm: { display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', fontWeight: 600, fontSize: 16 },
  tasdiqBelgi: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', background: 'var(--tint)', color: '#fff', fontSize: 10, fontWeight: 700, marginLeft: 4 },
  hMashina: { fontSize: 13, color: 'var(--secondary-label)', marginTop: 1 },
  qabul: { background: 'var(--tint)', color: '#fff', padding: '9px 16px', borderRadius: 'var(--r-full)', fontWeight: 600, fontSize: 15 },
  kuzatishMatn: { textAlign: 'center', padding: 12, color: 'var(--secondary-label)', fontSize: 13, marginTop: 4 },
  eta: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--tint-fill)', color: 'var(--tint)', padding: '9px 12px', borderRadius: 'var(--r-md)', fontSize: 15, fontWeight: 600, marginBottom: 12 },
  pinKarta: { background: 'var(--tint)', borderRadius: 'var(--r-lg)', padding: 16, marginBottom: 12, textAlign: 'center' },
  pinLabel: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.9)', marginBottom: 10 },
  pinRaqam: { display: 'flex', justifyContent: 'center', gap: 8 },
  pinXona: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 50, borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.22)', color: '#fff', fontSize: 26, fontWeight: 700 },

  // Uber услуби — қидириш радари
  radar: { position: 'relative', width: 96, height: 96, margin: '4px auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  radarHalqa: { position: 'absolute', width: 96, height: 96, borderRadius: '50%', background: 'var(--tint)', animation: 'radar 1.6s ease-out infinite' },
  radarMarkaz: { position: 'relative', width: 56, height: 56, borderRadius: '50%', background: 'var(--tint)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 },

  // Uber услуби — ҳолат пилюласи
  statusPill: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--tint-fill)', color: 'var(--tint)', padding: '10px 14px', borderRadius: 'var(--r-full)', fontSize: 15, fontWeight: 600, marginBottom: 12 },
  statusNuqta: { width: 9, height: 9, borderRadius: '50%', background: 'var(--tint)', flexShrink: 0, animation: 'pulse 1.4s ease-in-out infinite' },
  statusEta: { fontWeight: 700, fontVariantNumeric: 'tabular-nums' },

  // Uber услуби — ҳайдовчи картаси
  drvKarta: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', padding: 14, borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-1)', marginBottom: 12 },
  avatarKatta: { width: 52, height: 52, borderRadius: '50%', background: 'var(--tint)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, flexShrink: 0 },
  hReyting: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--secondary-label)', marginTop: 2 },
  drvMashinaBox: { textAlign: 'right', maxWidth: 130, flexShrink: 0 },
  drvMashinaMatn: { fontSize: 13, color: 'var(--secondary-label)', lineHeight: 1.25 },
  drvNarxBadge: { fontSize: 18, fontWeight: 700, color: 'var(--label)', marginTop: 2, fontVariantNumeric: 'tabular-nums' },

  // Uber услуби — иконкали амал қатори
  amalQator: { display: 'flex', gap: 8, marginBottom: 12 },
  amalTugma: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'var(--fill)', color: 'var(--tint)', padding: '12px 6px', borderRadius: 'var(--r-md)', fontSize: 13, fontWeight: 600 },
  amalIkon: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
};
