// Йўловчи саҳифаси — socket билан реал вақтда уланган
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Harita from '../components/Harita';
import Chat from '../components/Chat';
import Baholash from '../components/Baholash';
import Tolov from '../components/Tolov';
import Kirish from '../components/Kirish';
import YolovchiProfili from '../components/YolovchiProfili';
import ManzilSaqlash from '../components/ManzilSaqlash';
import Ulashish from '../components/Ulashish';
import SOS from '../components/SOS';
import NarxTarkibi from '../components/NarxTarkibi';
import SevimliKodQosh from '../components/SevimliKodQosh';
import ReklamaBanner from '../components/ReklamaBanner';
import { tavsiyaHisobi, ASOSIY, PER_KM, TARIFLAR } from '../utils/narx';
import { masofaKm } from '../utils/geo';
import { api, yolHisobla } from '../services/api';
import { useSocket } from '../services/useSocket';
import { bildir, ruxsatSora } from '../services/bildirishnoma';
import { tebrat, TEBRANISH } from '../services/haptika';
import { pushObunaBol } from '../services/push';
import { useT } from '../i18n';
import SozlamalarTugma from '../components/SozlamalarTugma';
import Ikonka from '../components/Ikonka';
import Pastki from '../components/Pastki';
import { useToast } from '../components/Toast';
import { joylashuvOl } from '../services/telegram';

if (typeof window !== 'undefined') ruxsatSora();

const TOSHKENT = [41.2995, 69.2401];

// datetime-local форматига ўгириш (маҳаллий вақт) — модул даражасида (TDZ'сиз)
const localInput = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const urlParam = (k) => { try { return new URLSearchParams(window.location.search).get(k); } catch { return null; } };

export default function YolovchiSahifa() {
  const navigate = useNavigate();
  const { t, til } = useT();
  const toast = useToast();
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
  // Сервислар саҳифасидан келганда — тариф/олдиндан буюртма query орқали олдиндан танланади
  const [tarif, setTarif] = useState(() => {
    const tr = urlParam('tarif');
    return TARIFLAR.some((x) => x.kod === tr) ? tr : 'ekonom';
  });
  const [izoh, setIzoh] = useState('');
  const [boshqaUchun, setBoshqaUchun] = useState(false);
  const [yuk, setYuk] = useState(false);
  const [rejaVaqt, setRejaVaqt] = useState(() => urlParam('reja') === '1' ? localInput(new Date(Date.now() + 3600000)) : ''); // datetime-local; '' = ҳозир
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
  const [saqlanganlar, setSaqlanganlar] = useState([]); // фойдаланувчи номлаган манзиллар
  const [saqlashOchiq, setSaqlashOchiq] = useState(null); // null | {turi: 'home'|'ish'|'custom', tahrirla?}
  const [oxirgiSafar, setOxirgiSafar] = useState(null); // {tugash_manzil, tugash_lat, tugash_lng, kelishilgan_narx, ...}
  const [qidiruvBoshlandi, setQidiruvBoshlandi] = useState(0); // 'kutish' bosqichi бошланган мс
  const [hozirSek, setHozirSek] = useState(0); // ҳар сонияда таймер
  const [sevimlilar, setSevimlilar] = useState([]); // севимли ҳайдовчилар
  const [maqsadliHaydovchi, setMaqsadliHaydovchi] = useState(null); // {haydovchi_id, ism, ...} — тўғридан-тўғри чақириладиган ҳайдовчи
  const [maqsadliSorov, setMaqsadliSorov] = useState(null); // {rideId, ism, sabab} — "барчага очайми?" сўрови
  const [kodQosh, setKodQosh] = useState(null); // null | {boshlangichKod} — код/QR билан севимли қўшиш модали

  const meId = user?.id || null;

  // Логин қилинган йўловчи — push билдиришнома + профил/манзилларни юклаймиз
  useEffect(() => {
    if (!user) return;
    ruxsatSora().then((ok) => { if (ok) pushObunaBol(); });
    api.get('/passenger/me').then(({ data }) => setProfil(data)).catch(() => {});
    api.get('/passenger/recent').then(({ data }) => setSonggiManzillar(data)).catch(() => {});
    api.get('/passenger/addresses').then(({ data }) => setSaqlanganlar(data)).catch(() => {});
    api.get('/passenger/last-ride').then(({ data }) => setOxirgiSafar(data)).catch(() => {});
    api.get('/passenger/favorites').then(({ data }) => setSevimlilar(data)).catch(() => {});
  }, [user?.id]);

  // QR deep-link (?haydovchi=<kod>) — ҳайдовчи QR'ини скан қилиб киргандa
  // код билан севимли қўшиш модалини очамиз. Меҳмон бўлса аввал киришни сўраймиз.
  useEffect(() => {
    const k = urlParam('haydovchi');
    if (!k) return;
    if (user) setKodQosh({ boshlangichKod: k });
    else setKirishOchiq(true);
  }, [user?.id]);

  // Қидирув таймери (Uber услуби — фойдаланувчи қанча кутаётганини кўриш)
  useEffect(() => {
    if (bosqich !== 'kutish' || !qidiruvBoshlandi) { setHozirSek(0); return; }
    const id = setInterval(() => setHozirSek(Math.floor((Date.now() - qidiruvBoshlandi) / 1000)), 1000);
    return () => clearInterval(id);
  }, [bosqich, qidiruvBoshlandi]);

  // Сақланган манзилни ўчириш — confirm билан
  const manzilOchir = async (m) => {
    if (!window.confirm(t('addr.deleteConfirm', { nom: m.nom }))) return;
    try {
      await api.delete(`/passenger/addresses/${m.id}`);
      setSaqlanganlar((eski) => eski.filter((x) => x.id !== m.id));
      toast.success(t('common.save'));
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    }
  };

  // Манзил сақлангандан кейин рўйхатларни янгилаймиз. Profile обектида
  // 'home_manzil' калити доим бор (NULL ёки матн); кастом манзилда йўқ.
  const saqlashYakuni = (yangi) => {
    if (yangi && 'home_manzil' in yangi) setProfil(yangi);
    else if (yangi?.id && yangi.nom) setSaqlanganlar((eski) => [yangi, ...eski.filter((x) => x.id !== yangi.id)]);
  };

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

  // ===== Uber услуби — қидирув-биринчи оқим =====
  const [qidiruvOchiq, setQidiruvOchiq] = useState(false);
  const [qidiruvMaydon, setQidiruvMaydon] = useState('tugash'); // 'boshlanish' | 'tugash'
  const [qidiruvMatn, setQidiruvMatn] = useState('');
  const [qidiruvNatija, setQidiruvNatija] = useState([]);
  const [qidiruvYuk, setQidiruvYuk] = useState(false);
  const [joyYuklanmoqda, setJoyYuklanmoqda] = useState(false);
  const [xaritaTanlov, setXaritaTanlov] = useState(false); // харитадан танлаш overlay

  // Харитадан танланган нуқтани тасдиқлаш (актив майдонга қараб)
  const xaritadanTasdiqla = () => {
    if (!markazNuqta) return;
    setXaritaTanlov(false);
    if (qidiruvMaydon === 'boshlanish') {
      setBoshlanish(markazNuqta);
      setBoshlanishManzil(markazManzil || '');
      setUchish(markazNuqta);
    } else {
      safargaOt(markazNuqta, markazManzil);
    }
  };

  // pickup (boshlanish)'ни манзилга реверс-геокод қилиб ёзамиз
  const pickupYoz = async (p) => {
    setBoshlanish(p);
    setUchish(p);
    try {
      const { data } = await api.get(`/geocode/reverse?lat=${p[0]}&lng=${p[1]}&til=${til}`);
      if (data.manzil) setBoshlanishManzil(data.manzil);
    } catch { /* координата қолади */ }
  };

  // Уй очилганда — pickup'ни GPS'дан автомат (Uber услуби)
  useEffect(() => {
    let bekor = false;
    joylashuvOl().then((p) => { if (!bekor && p) pickupYoz(p); });
    return () => { bekor = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Мени топ" — жорий жойни pickup қилиб олиш
  const meniTop = async () => {
    setJoyYuklanmoqda(true);
    const p = await joylashuvOl();
    if (p) await pickupYoz(p);
    setJoyYuklanmoqda(false);
  };

  // Қидирув debounce (Nominatim)
  useEffect(() => {
    if (!qidiruvOchiq) return;
    const q = qidiruvMatn.trim();
    if (q.length < 2) { setQidiruvNatija([]); return; }
    const timer = setTimeout(async () => {
      setQidiruvYuk(true);
      try {
        const { data } = await api.get(`/geocode?q=${encodeURIComponent(q)}&til=${til}`);
        setQidiruvNatija(data);
      } catch { /* тинч */ }
      setQidiruvYuk(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [qidiruvMatn, qidiruvOchiq, til]);

  const qidiruvAch = (maydon) => { setQidiruvMaydon(maydon); setQidiruvMatn(''); setQidiruvNatija([]); setQidiruvOchiq(true); };

  // Масофа матни pickup'дан (км/м)
  const masofaMatn = (nuqta) => {
    if (!boshlanish || !nuqta) return '';
    const km = masofaKm(boshlanish, nuqta);
    if (!km) return '';
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  };

  // recent манзилни [lat,lng]'га ажратиш
  const recentNuqta = (s) => { const x = String(s).match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/); return x ? [parseFloat(x[1]), parseFloat(x[2])] : null; };

  // Қидирувда манзил танланди (актив майдонга қараб pickup ёки dest)
  const qidiruvTanla = async (nuqta, manzil) => {
    if (qidiruvMaydon === 'boshlanish') {
      setBoshlanish(nuqta); setBoshlanishManzil(manzil || ''); setUchish(nuqta);
      setQidiruvOchiq(false);
      return;
    }
    await safargaOt(nuqta, manzil);
  };

  // Манзил танлангач — нарх босқичига (pickup = GPS/танланган)
  const safargaOt = async (destNuqta, destManzil) => {
    if (!boshlanish) { qidiruvAch('boshlanish'); return; } // pickup йўқ — аввал уни сўраймиз
    const manzil = destManzil || `${destNuqta[0].toFixed(4)}, ${destNuqta[1].toFixed(4)}`;
    setTugash(destNuqta); setTugashManzil(manzil);
    setOraliqlar([{ nuqta: destNuqta, manzil }]);
    setQidiruvOchiq(false);
    setNarx(tavsiyaHisobi(masofaKm(boshlanish, destNuqta), tarif));
    setBosqich('narx');
    const natija = await yolHisobla([boshlanish, destNuqta]);
    if (natija && Number.isFinite(natija.masofa_km)) { setAniqYol(natija); setNarx(tavsiyaHisobi(natija.masofa_km, tarif)); }
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
    // Севимли ҳайдовчи онлайн эмас — дарҳол "барчага очайми?" сўраймиз
    maqsadli_band: ({ rideId: rid, sabab }) => {
      setMaqsadliSorov({ rideId: rid, ism: maqsadliHaydovchi?.ism, sabab: sabab || 'oflayn' });
    },
    // Севимли ҳайдовчи жавоб бермади/рад этди — "барчага очайми?" сўраймиз
    maqsadli_javob_yoq: ({ rideId: rid, sabab }) => {
      if (rideId && Number(rid) !== Number(rideId)) return;
      tebrat(TEBRANISH.ogohlantirish);
      setMaqsadliSorov({ rideId: rid, ism: maqsadliHaydovchi?.ism, sabab: sabab || 'vaqt' });
    },
    // Барчага очилди — энди оддий буюртмадек таклифлар келади
    hammaga_ochildi: () => {
      setMaqsadliSorov(null);
      setMaqsadliHaydovchi(null);
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
        setBaholashUchun({ rideId, ism: haydovchiInfo?.ism || t('home.driver'), haydovchi_id: haydovchiInfo?.haydovchi_id });
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
    // pickup (boshlanish) сақланади — фойдаланувчи яна қидиришда қайта киритмасин
    setTugash(null);
    setTugashManzil('');
    setTanlovRejimi('boshlanish');
    setQidiruvOchiq(false);
    setQidiruvMatn('');
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
    setMaqsadliHaydovchi(null);
    setMaqsadliSorov(null);
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
  const toLocalInput = localInput;
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
    setMaqsadliSorov(null);
    setQidiruvBoshlandi(Date.now()); // Uber услубида сонияни ҳисоблаш учун
    setBosqich('kutish');
    yubor('yangi_buyurtma', {
      id: taklifId,
      mijoz: 'Сиз',
      reyting: 5.0,
      maqsadli_haydovchi_id: maqsadliHaydovchi?.haydovchi_id || null, // тўғридан-тўғри чақириш
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
    setHaydovchiInfo({ haydovchi_id: t.haydovchi_id, ism: t.haydovchi_ism, narx: t.haydovchi_narx, mashina: t.mashina, reyting: t.reyting, tasdiqlangan: t.tasdiqlangan });
    setMaqsadliSorov(null);
    setBosqich('safar');
  };

  // Севимли ҳайдовчи банд — буюртмани барча ҳайдовчиларга очамиз
  const hammagaOch = () => {
    if (rideId) yubor('buyurtma_hammaga', { rideId });
    tebrat(TEBRANISH.yengil);
    setMaqsadliSorov(null);
    setMaqsadliHaydovchi(null);
  };

  const bekorQilish = () => {
    if (rideId) yubor('buyurtma_bekor', { rideId });
    setMaqsadliSorov(null);
    setMaqsadliHaydovchi(null);
    setBosqich('narx');
  };

  return (
    <div style={st.sahifa}>
      {bosqich === 'manzil' ? (
        <>
          {/* Карта фон — Uber услуби */}
          <div style={st.harita}>
            <Harita
              markaz={markazNuqta || TOSHKENT}
              markazRejim={false}
            />
          </div>

          {/* Float'ли лого — чап юқори */}
          {!qidiruvOchiq && (
            <div style={st.logo} className="glass-tugma"><Ikonka nom="taxi" size={18} /> Manzil</div>
          )}

          {/* Float'ли ўнг юқори тугмалар: созлама, профил, тарих */}
          {!qidiruvOchiq && (
            <div style={st.uyHeaderOng}>
              <SozlamalarTugma />
              <button style={st.uyIkonTugma} className="press glass-tugma" onClick={() => user ? setProfilOchiq(true) : setKirishOchiq(true)} aria-label={user ? t('prof.title') : t('login.title')}><Ikonka nom={user ? 'user' : 'key'} /></button>
              <button style={st.uyIkonTugma} className="press glass-tugma" onClick={() => navigate('/tarix')} aria-label={t('hist.title')}><Ikonka nom="clock" /></button>
            </div>
          )}

          {qidiruvOchiq ? (
            <div style={st.panel} className="glass slide-up"><div style={st.grabber} />
              <button style={st.qidirOrqa} className="press" onClick={() => setQidiruvOchiq(false)}><Ikonka nom="arrow-left" size={18} /> {t('common.back')}</button>

              <div style={st.maydonKarta}>
                <button style={st.maydonQator} className="bosiladi" onClick={() => qidiruvAch('boshlanish')}>
                  <span style={{ ...st.maydonNuqta, background: 'var(--tint)' }} />
                  <span style={st.maydonIchi}>
                    <span style={st.maydonLabel}>{t('pass.fromWhere')}</span>
                    {qidiruvMaydon === 'boshlanish'
                      ? <input style={st.maydonInput} autoFocus value={qidiruvMatn} onChange={(e) => setQidiruvMatn(e.target.value)} placeholder={t('pass.myLocation')} />
                      : <span style={st.maydonQiymat}>{boshlanishManzil || t('pass.myLocation')}</span>}
                  </span>
                </button>
                <div style={st.maydonChiziq} />
                <div style={st.maydonQator} onClick={() => qidiruvMaydon !== 'tugash' && setQidiruvMaydon('tugash')}>
                  <span style={{ ...st.maydonNuqta, ...st.maydonKvadrat }} />
                  <span style={st.maydonIchi}>
                    <span style={st.maydonLabel}>{t('pass.dest')}</span>
                    {qidiruvMaydon === 'tugash'
                      ? <input style={st.maydonInput} autoFocus value={qidiruvMatn} onChange={(e) => setQidiruvMatn(e.target.value)} placeholder={t('pass.toWhere')} />
                      : <span style={st.maydonQiymatBosh}>{t('pass.toWhere')}</span>}
                  </span>
                  {qidiruvMatn && qidiruvMaydon === 'tugash' && <button style={st.maydonTozala} onClick={() => setQidiruvMatn('')}><Ikonka nom="x" size={14} /></button>}
                </div>
              </div>

              <button style={st.xaritadanTugma} className="bosiladi" onClick={() => setXaritaTanlov(true)}>
                <Ikonka nom="pin" size={18} /> {t('pass.fromMap')}
              </button>

              <div style={st.qidirRoyxat} className="royxat-anim">
                {qidiruvYuk && <div style={st.qidirYuk}><span className="spinner" /></div>}
                {qidiruvNatija.map((n, i) => (
                  <button key={i} style={st.taklifQator} className="bosiladi" onClick={() => qidiruvTanla([n.lat, n.lng], n.manzil)}>
                    <span style={st.taklifIkon}><Ikonka nom="pin" size={18} /></span>
                    <span style={st.taklifMatn}>{n.manzil}</span>
                    <span style={st.taklifMasofa}>{masofaMatn([n.lat, n.lng])}</span>
                  </button>
                ))}
                {qidiruvMatn.trim().length < 2 && (
                  <>
                    {profil?.home_lat && (
                      <button style={st.taklifQator} className="bosiladi" onClick={() => qidiruvTanla([Number(profil.home_lat), Number(profil.home_lng)], t('prof.useHome'))}>
                        <span style={st.taklifIkon}><Ikonka nom="home" size={18} /></span>
                        <span style={st.taklifMatn}>{t('prof.useHome')}</span>
                        <span style={st.taklifMasofa}>{masofaMatn([Number(profil.home_lat), Number(profil.home_lng)])}</span>
                      </button>
                    )}
                    {profil?.ish_lat && (
                      <button style={st.taklifQator} className="bosiladi" onClick={() => qidiruvTanla([Number(profil.ish_lat), Number(profil.ish_lng)], t('prof.useWork'))}>
                        <span style={st.taklifIkon}><Ikonka nom="work" size={18} /></span>
                        <span style={st.taklifMatn}>{t('prof.useWork')}</span>
                        <span style={st.taklifMasofa}>{masofaMatn([Number(profil.ish_lat), Number(profil.ish_lng)])}</span>
                      </button>
                    )}
                    {songgiManzillar.slice(0, 5).map((m, i) => {
                      const p = recentNuqta(m.manzil);
                      if (!p) return null;
                      return (
                        <button key={`r${i}`} style={st.taklifQator} className="bosiladi" onClick={() => qidiruvTanla(p, m.manzil)}>
                          <span style={st.taklifIkon}><Ikonka nom="clock" size={18} /></span>
                          <span style={st.taklifMatn}>{m.manzil}</span>
                          <span style={st.taklifMasofa}>{masofaMatn(p)}</span>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div style={{ ...st.panel, maxHeight: '55vh', paddingBottom: 'calc(90px + env(safe-area-inset-bottom))' }} className="glass slide-up">
              <div style={st.grabber} />
              {/* Қидирув + Харитадан тугмалари ёнма-ён */}
              <div style={st.qidirvaXarita}>
                <button style={{ ...st.qayergaTugma, flex: 1, marginBottom: 0 }} className="press" onClick={() => qidiruvAch('tugash')}>
                  <Ikonka nom="search" size={20} />
                  <span>{t('pass.toWhere')}</span>
                </button>
                <button
                  style={st.xaritaChip}
                  className="press"
                  onClick={() => { setQidiruvMaydon('tugash'); setXaritaTanlov(true); }}
                  title={t('pass.openMap')}
                  aria-label={t('pass.openMap')}
                >
                  <Ikonka nom="pin" size={18} />
                </button>
              </div>

              {/* Сўнгги сафар — "Қайтариш" карточкаси (Uber услубида) */}
              {oxirgiSafar?.tugash_lat && oxirgiSafar?.tugash_lng && (
                <button
                  style={st.oxirgiKarta}
                  className="bosiladi"
                  onClick={() => safargaOt([Number(oxirgiSafar.tugash_lat), Number(oxirgiSafar.tugash_lng)], oxirgiSafar.tugash_manzil)}
                >
                  <span style={st.oxirgiIkon}><Ikonka nom="clock" size={18} /></span>
                  <span style={st.oxirgiMatnWrap}>
                    <span style={st.oxirgiSarlavha}>{t('pass.lastRide')}</span>
                    <span style={st.oxirgiManzil}>{oxirgiSafar.tugash_manzil}</span>
                    {oxirgiSafar.kelishilgan_narx != null && (
                      <span style={st.oxirgiNarx}>{Number(oxirgiSafar.kelishilgan_narx).toLocaleString()} {t('wait.sum')} · {t('pass.lastPaid')}</span>
                    )}
                  </span>
                  <span style={st.oxirgiKnopka}>{t('pass.repeatRide')}</span>
                </button>
              )}

              <div style={st.uberSection}>
                {/* Уй — ҳар доим кўрсатамиз; бўш бўлса "қўшинг" такfлифи */}
                {profil?.home_lat ? (
                  <div style={st.uberRowKonteyner}>
                    <button style={st.uberRow} className="bosiladi" onClick={() => safargaOt([Number(profil.home_lat), Number(profil.home_lng)], t('prof.useHome'))}>
                      <span style={st.uberRowIkon}><Ikonka nom="home" size={18} /></span>
                      <span style={st.uberRowMatn}>{t('prof.useHome')}</span>
                      <span style={st.uberRowMasofa}>{masofaMatn([Number(profil.home_lat), Number(profil.home_lng)])}</span>
                    </button>
                    <button
                      style={st.qatorAmal}
                      onClick={() => user ? setSaqlashOchiq({ turi: 'home' }) : setKirishOchiq(true)}
                      aria-label={t('addr.edit')}
                      title={t('addr.edit')}
                    ><Ikonka nom="edit" size={14} /></button>
                  </div>
                ) : (
                  <button style={{ ...st.uberRow, color: 'var(--secondary-label)' }} className="bosiladi" onClick={() => user ? setSaqlashOchiq({ turi: 'home' }) : setKirishOchiq(true)}>
                    <span style={{ ...st.uberRowIkon, background: 'var(--fill)', color: 'var(--secondary-label)' }}><Ikonka nom="home" size={18} /></span>
                    <span style={st.uberRowMatn}>{t('addr.addHome')}</span>
                    <span style={st.uberRowQoshish}><Ikonka nom="plus" size={14} /></span>
                  </button>
                )}

                {/* Иш — ҳар доим кўрсатамиз */}
                {profil?.ish_lat ? (
                  <div style={st.uberRowKonteyner}>
                    <button style={st.uberRow} className="bosiladi" onClick={() => safargaOt([Number(profil.ish_lat), Number(profil.ish_lng)], t('prof.useWork'))}>
                      <span style={st.uberRowIkon}><Ikonka nom="work" size={18} /></span>
                      <span style={st.uberRowMatn}>{t('prof.useWork')}</span>
                      <span style={st.uberRowMasofa}>{masofaMatn([Number(profil.ish_lat), Number(profil.ish_lng)])}</span>
                    </button>
                    <button
                      style={st.qatorAmal}
                      onClick={() => user ? setSaqlashOchiq({ turi: 'ish' }) : setKirishOchiq(true)}
                      aria-label={t('addr.edit')}
                      title={t('addr.edit')}
                    ><Ikonka nom="edit" size={14} /></button>
                  </div>
                ) : (
                  <button style={{ ...st.uberRow, color: 'var(--secondary-label)' }} className="bosiladi" onClick={() => user ? setSaqlashOchiq({ turi: 'ish' }) : setKirishOchiq(true)}>
                    <span style={{ ...st.uberRowIkon, background: 'var(--fill)', color: 'var(--secondary-label)' }}><Ikonka nom="work" size={18} /></span>
                    <span style={st.uberRowMatn}>{t('addr.addWork')}</span>
                    <span style={st.uberRowQoshish}><Ikonka nom="plus" size={14} /></span>
                  </button>
                )}

                {/* Кастом сақланган манзиллар — ҳар бирида ўчириш тугмаси */}
                {saqlanganlar.filter((m) => m.lat != null && m.lng != null).map((m) => (
                  <div key={`s${m.id}`} style={st.uberRowKonteyner}>
                    <button style={st.uberRow} className="bosiladi" onClick={() => safargaOt([Number(m.lat), Number(m.lng)], m.manzil)}>
                      <span style={st.uberRowIkon}><Ikonka nom="pin" size={18} /></span>
                      <span style={st.uberRowMatn}>{m.nom}</span>
                      <span style={st.uberRowMasofa}>{masofaMatn([Number(m.lat), Number(m.lng)])}</span>
                    </button>
                    <button
                      style={st.qatorAmal}
                      onClick={() => manzilOchir(m)}
                      aria-label={t('addr.delete')}
                      title={t('addr.delete')}
                    ><Ikonka nom="x" size={14} /></button>
                  </div>
                ))}

                {songgiManzillar.slice(0, 3).map((m, i) => {
                  const p = recentNuqta(m.manzil);
                  if (!p) return null;
                  return (
                    <button key={i} style={st.uberRow} className="bosiladi" onClick={() => safargaOt(p, m.manzil)}>
                      <span style={st.uberRowIkon}><Ikonka nom="clock" size={18} /></span>
                      <span style={st.uberRowMatn}>{m.manzil}</span>
                      <span style={st.uberRowMasofa}>{masofaMatn(p)}</span>
                    </button>
                  );
                })}

                {/* + Янги манзил сақлаш — Uber услубида кастом ном билан */}
                <button style={st.uberRow} className="bosiladi" onClick={() => user ? setSaqlashOchiq({ turi: 'custom' }) : setKirishOchiq(true)}>
                  <span style={{ ...st.uberRowIkon, background: 'var(--fill)', color: 'var(--secondary-label)' }}><Ikonka nom="plus" size={18} /></span>
                  <span style={st.uberRowMatn}>{t('pass.saveAddr')}</span>
                </button>
              </div>

              {/* Ой кимошди ғолибининг рекламаси — пастда, асосий контент устида турмайди */}
              <ReklamaBanner />
            </div>
          )}
          {!qidiruvOchiq && <Pastki faol="home" />}
        </>
      ) : (
      <>
      <div style={st.harita}>
        <Harita
          markaz={TOSHKENT}
          boshlanish={boshlanish}
          tugash={tugash}
          yol={[boshlanish, ...oraliqlar.map((o) => o.nuqta)].filter(Boolean)}
          yolChizigi={aniqYol?.yol_chizigi}
          haydovchi={haydovchiNuqta}
          markazRejim={false}
          onMarkaz={markazKuzat}
          uchish={uchish}
        />
      </div>
      <div style={st.logo} className="glass-tugma"><Ikonka nom="taxi" size={18} /> Manzil</div>

      <div style={st.panel} className="glass slide-up">
        <div style={st.grabber} />

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

            {/* Севимли ҳайдовчини чақириш — тўғридан-тўғри буюртма (фақат логин қилганлар) */}
            {user && (
              <div style={st.sevimliBolimi}>
                <div style={st.sevimliLabel}><Ikonka nom="star" size={14} /> {t('fav.call')}</div>
                <div style={st.sevimliChiplar}>
                  {sevimlilar.map((s) => {
                    const tanlangan = maqsadliHaydovchi?.haydovchi_id === s.haydovchi_id;
                    return (
                      <button
                        key={s.haydovchi_id}
                        style={{ ...st.sevimliChip, ...(tanlangan ? st.sevimliChipFaol : {}) }}
                        onClick={() => setMaqsadliHaydovchi(tanlangan ? null : s)}
                      >
                        <span style={st.sevimliAvatar}>{s.ism[0]}</span>
                        <span style={st.sevimliIsm}>{s.ism}</span>
                        {tanlangan && <Ikonka nom="check" size={14} />}
                      </button>
                    );
                  })}
                  <button style={st.kodChip} onClick={() => setKodQosh({ boshlangichKod: '' })}>
                    <Ikonka nom="plus" size={16} /> {t('favcode.enter')}
                  </button>
                </div>
                {maqsadliHaydovchi && (
                  <div style={st.sevimliIzoh}>{t('fav.willCall', { ism: maqsadliHaydovchi.ism })}</div>
                )}
              </div>
            )}

            <button style={st.tugma} onClick={buyurtmaBerish}>
              {maqsadliHaydovchi ? t('fav.callBtn', { ism: maqsadliHaydovchi.ism }) : t('pass.placeOrder')}
            </button>
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
            {maqsadliSorov ? (
              <div style={st.kutish}>
                <div style={st.sorovIkon}><Ikonka nom="car" size={28} /></div>
                <h2 style={st.sarlavha}>{t('fav.busyTitle')}</h2>
                <p style={st.izoh}>
                  {maqsadliSorov.sabab === 'rad'
                    ? t('fav.declined', { ism: maqsadliSorov.ism || t('home.driver') })
                    : maqsadliSorov.sabab === 'oflayn'
                    ? t('fav.offline', { ism: maqsadliSorov.ism || t('home.driver') })
                    : t('fav.noAnswer', { ism: maqsadliSorov.ism || t('home.driver') })}
                </p>
                <button style={st.tugma} onClick={hammagaOch}>{t('fav.openAll')}</button>
                <button style={st.bekor} onClick={bekorQilish}>{t('common.cancel')}</button>
              </div>
            ) : takliflar.length === 0 ? (
              <div style={st.kutish}>
                <div style={st.radar}>
                  <span style={st.radarHalqa} />
                  <span style={{ ...st.radarHalqa, animationDelay: '0.8s' }} />
                  <span style={st.radarMarkaz}><Ikonka nom="car" size={26} /></span>
                </div>
                <h2 style={st.sarlavha}>{maqsadliHaydovchi ? t('fav.waiting', { ism: maqsadliHaydovchi.ism }) : t('pass.searching')}</h2>
                <p style={st.izoh}>{narx.toLocaleString()} · {masofa()} км</p>
                {hozirSek > 0 && (
                  <p style={st.qidirvaqt}>{Math.floor(hozirSek / 60)}:{String(hozirSek % 60).padStart(2, '0')}</p>
                )}
                <button style={st.bekor} onClick={bekorQilish}>{t('common.cancel')}</button>
              </div>
            ) : (
              <>
                <div style={st.takliflarHeader}>
                  <h2 style={st.sarlavha}>{t('pass.offers')} ({takliflar.length})</h2>
                  {hozirSek > 0 && (
                    <span style={st.qidirvaqtChip}>{Math.floor(hozirSek / 60)}:{String(hozirSek % 60).padStart(2, '0')}</span>
                  )}
                </div>
                <div style={{ maxHeight: 280, overflowY: 'auto' }} className="royxat-anim">
                  {saralanganTakliflar.map((tk, i) => {
                    const tavsiya = i === 0;
                    const sizdanArzon = Number(tk.haydovchi_narx) <= Number(narx);
                    return (
                      <div key={tk.haydovchi_id ?? i} style={{ ...st.haydovchi, ...(tavsiya ? st.haydovchiTavsiya : {}) }}>
                        <div style={st.avatar}>{tk.haydovchi_ism[0]}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={st.hIsm}>
                            {tk.haydovchi_ism}
                            {tk.tasdiqlangan && <span style={st.tasdiqBelgi} title={t('verify.badge')}>✓</span>}
                            {' '}<Ikonka nom="star" size={13} /> {tk.reyting}
                            {tavsiya && <span style={st.tavsiyaChip}>{t('sub.recommended')}</span>}
                          </div>
                          <div style={st.hMashina}>
                            {tk.mashina}
                            {tk.min != null && ` · ${tk.min} ${t('drv.minute')}`}
                            {sizdanArzon && <span style={st.arzonChip}>{t('pass.matchPrice')}</span>}
                          </div>
                        </div>
                        <button style={st.qabul} onClick={() => haydovchiTanla(tk)}>
                          {tk.haydovchi_narx.toLocaleString()}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button style={st.bekor} onClick={bekorQilish}>{t('common.cancel')}</button>
              </>
            )}
          </>
        )}
      </div>
      </>
      )}

      {xaritaTanlov && (
        <div style={st.xaritaOverlay}>
          <div style={st.harita}>
            <Harita
              markaz={boshlanish || TOSHKENT}
              markazRejim={true}
              markazRang={qidiruvMaydon === 'boshlanish' ? '#000000' : '#E11900'}
              onMarkaz={markazKuzat}
              uchish={uchish}
            />
          </div>
          <button style={st.xaritaOrqa} className="glass-tugma press" onClick={() => setXaritaTanlov(false)} aria-label={t('common.back')}>
            <Ikonka nom="arrow-left" size={20} />
          </button>
          <div style={st.xaritaPanel} className="glass slide-up">
            <div style={st.markazManzilQator}>
              <span style={{ ...st.nuqta, background: qidiruvMaydon === 'boshlanish' ? 'var(--yashil)' : 'var(--qizil)' }} />
              <div style={st.markazManzilMatn}>{markazManzilYuk ? t('common.loading') : (markazManzil || t('pass.movePin'))}</div>
            </div>
            <button style={{ ...st.tugma, opacity: markazNuqta ? 1 : 0.5 }} disabled={!markazNuqta} onClick={xaritadanTasdiqla}>
              {t('common.confirm')}
            </button>
          </div>
        </div>
      )}

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

      {kodQosh && (
        <SevimliKodQosh
          boshlangichKod={kodQosh.boshlangichKod}
          onQoshildi={(h) => {
            api.get('/passenger/favorites').then(({ data }) => setSevimlilar(data)).catch(() => {});
            setMaqsadliHaydovchi({ haydovchi_id: h.haydovchi_id, ism: h.ism });
          }}
          onYopish={() => setKodQosh(null)}
        />
      )}

      {baholashUchun && (
        <Baholash
          rideId={baholashUchun.rideId}
          kimni="driver"
          ism={baholashUchun.ism}
          narx={haydovchiInfo?.narx}
          haydovchiId={baholashUchun.haydovchi_id}
          sevimliMi={sevimlilar.some((s) => s.haydovchi_id === baholashUchun.haydovchi_id)}
          onSevimliOzgardi={() => api.get('/passenger/favorites').then(({ data }) => setSevimlilar(data)).catch(() => {})}
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

      {saqlashOchiq && (
        <ManzilSaqlash
          turi={saqlashOchiq.turi}
          tahrirla={saqlashOchiq.tahrirla}
          profil={profil}
          onYopish={() => setSaqlashOchiq(null)}
          onSaqlandi={saqlashYakuni}
        />
      )}

      {kirishOchiq && (
        <div style={st.kirishOverlay}>
          <button style={st.kirishYopish} className="press" onClick={() => setKirishOchiq(false)} aria-label={t('common.close')}><Ikonka nom="x" size={20} /></button>
          <Kirish
            kerakliRol="mijoz"
            onKirildi={(u) => { setUser(u); setKirishOchiq(false); }}
          />
        </div>
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
  panel: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 500, maxWidth: 480, margin: '0 auto', borderRadius: '14px 14px 0 0', padding: '6px 20px calc(20px + env(safe-area-inset-bottom))', maxHeight: '85vh', overflowY: 'auto' },
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
  // Севимли ҳайдовчилар (тўғридан-тўғри чақириш)
  sevimliBolimi: { marginTop: 4, marginBottom: 12 },
  sevimliLabel: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--secondary-label)', marginBottom: 8 },
  sevimliChiplar: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 },
  sevimliChip: { flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px 7px 7px', borderRadius: 'var(--r-full)', background: 'var(--fill)', color: 'var(--label)', fontSize: 14, fontWeight: 500, border: '1.5px solid transparent' },
  sevimliChipFaol: { background: 'var(--tint)', color: '#fff', borderColor: 'var(--tint)' },
  sevimliAvatar: { width: 26, height: 26, borderRadius: '50%', background: 'var(--tint)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 },
  sevimliIsm: { maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sevimliIzoh: { fontSize: 13, color: 'var(--tint)', marginTop: 8, fontWeight: 500 },
  kodChip: { flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 'var(--r-full)', background: 'var(--fill)', color: 'var(--tint)', fontSize: 14, fontWeight: 600, border: '1.5px dashed var(--tint)' },
  sorovIkon: { width: 72, height: 72, borderRadius: '50%', background: 'var(--fill)', color: 'var(--secondary-label)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px auto 16px' },
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
  haydovchiTavsiya: { background: 'var(--tint-fill)', outline: '1px solid var(--tint)' },
  tavsiyaChip: { display: 'inline-block', marginLeft: 8, padding: '2px 8px', borderRadius: 'var(--r-full)', background: 'var(--tint)', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.3px', verticalAlign: 'middle' },
  arzonChip: { display: 'inline-block', marginLeft: 8, padding: '2px 8px', borderRadius: 'var(--r-full)', background: 'rgba(52,199,89,0.18)', color: 'var(--yashil)', fontSize: 10, fontWeight: 700, letterSpacing: '0.3px' },
  takliflarHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  qidirvaqt: { fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--tint)', marginTop: 6 },
  qidirvaqtChip: { padding: '4px 10px', borderRadius: 'var(--r-full)', background: 'var(--fill)', color: 'var(--secondary-label)', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' },
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

  // ===== Uber услуби — бош/қидирув саҳифа =====
  uyHeaderOng: { position: 'absolute', top: 'calc(16px + env(safe-area-inset-top))', right: 16, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 8 },
  uyIkonTugma: { width: 38, height: 38, borderRadius: '50%', color: 'var(--label)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  qayergaTugma: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--fill)', color: 'var(--secondary-label)', padding: '16px 18px', borderRadius: 'var(--r-lg)', fontSize: 18, fontWeight: 500, marginBottom: 18, textAlign: 'left' },
  uberSection: { background: 'var(--surface)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-1)' },
  uberRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'transparent', borderBottom: '0.5px solid var(--separator)', textAlign: 'left' },
  uberRowIkon: { width: 38, height: 38, borderRadius: 10, background: 'var(--tint-fill)', color: 'var(--tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  uberRowMatn: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: 600, color: 'var(--label)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  uberRowMasofa: { fontSize: 13, color: 'var(--secondary-label)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' },
  uberRowKonteyner: { display: 'flex', alignItems: 'stretch', borderBottom: '0.5px solid var(--separator)' },
  qatorAmal: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, color: 'var(--secondary-label)', background: 'transparent', flexShrink: 0, borderLeft: '0.5px solid var(--separator)' },
  uberRowQoshish: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: 'var(--tint-fill)', color: 'var(--tint)', flexShrink: 0 },
  qidirvaXarita: { display: 'flex', gap: 8, marginBottom: 22 },
  xaritaChip: { display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 54, background: 'var(--fill)', color: 'var(--label)', borderRadius: 'var(--r-lg)' },
  oxirgiKarta: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', marginBottom: 18, borderRadius: 'var(--r-lg)', background: 'var(--surface)', boxShadow: 'var(--shadow-1)', textAlign: 'left' },
  oxirgiIkon: { width: 38, height: 38, borderRadius: 10, background: 'var(--tint-fill)', color: 'var(--tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  oxirgiMatnWrap: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  oxirgiSarlavha: { fontSize: 11, fontWeight: 600, color: 'var(--secondary-label)', textTransform: 'uppercase', letterSpacing: '0.4px' },
  oxirgiManzil: { fontSize: 15, fontWeight: 600, color: 'var(--label)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  oxirgiNarx: { fontSize: 12, color: 'var(--secondary-label)' },
  oxirgiKnopka: { flexShrink: 0, padding: '8px 14px', borderRadius: 'var(--r-full)', background: 'var(--tint-fill)', color: 'var(--tint)', fontSize: 13, fontWeight: 600 },
  qidirOrqa: { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', color: 'var(--tint)', fontSize: 16, fontWeight: 500, marginBottom: 12, padding: '4px 0' },
  maydonKarta: { background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '4px 14px', boxShadow: 'var(--shadow-1)', marginBottom: 16 },
  maydonQator: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', background: 'transparent', textAlign: 'left', position: 'relative' },
  maydonNuqta: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  maydonKvadrat: { borderRadius: 2, background: 'var(--label)' },
  maydonIchi: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 },
  maydonLabel: { fontSize: 11, color: 'var(--secondary-label)', fontWeight: 500 },
  maydonInput: { border: 'none', background: 'transparent', fontSize: 16, color: 'var(--label)', outline: 'none', padding: 0, marginTop: 1 },
  maydonQiymat: { fontSize: 16, color: 'var(--label)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 },
  maydonQiymatBosh: { fontSize: 16, color: 'var(--tertiary-label)', marginTop: 1 },
  maydonChiziq: { height: '0.5px', background: 'var(--separator)', marginLeft: 22 },
  maydonTozala: { width: 24, height: 24, borderRadius: '50%', background: 'var(--fill)', color: 'var(--secondary-label)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  qidirRoyxat: { display: 'flex', flexDirection: 'column' },
  qidirYuk: { display: 'flex', justifyContent: 'center', padding: 20 },
  taklifQator: { width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '13px 4px', background: 'transparent', borderBottom: '0.5px solid var(--separator)', textAlign: 'left' },
  taklifIkon: { width: 34, height: 34, borderRadius: '50%', background: 'var(--fill)', color: 'var(--secondary-label)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  taklifMatn: { flex: 1, minWidth: 0, fontSize: 15, color: 'var(--label)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  taklifMasofa: { fontSize: 13, color: 'var(--secondary-label)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' },
  xaritadanTugma: { width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--fill)', color: 'var(--tint)', padding: 13, borderRadius: 'var(--r-md)', fontSize: 15, fontWeight: 600, marginBottom: 14 },

  // Харитадан танлаш overlay
  xaritaOverlay: { position: 'absolute', inset: 0, zIndex: 1600, background: 'var(--bg)' },
  xaritaOrqa: { position: 'absolute', top: 'calc(16px + env(safe-area-inset-top))', left: 16, zIndex: 1700, width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tint)' },
  xaritaPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1700, maxWidth: 480, margin: '0 auto', borderRadius: '14px 14px 0 0', padding: '18px 20px calc(20px + env(safe-area-inset-bottom))' },
  kirishOverlay: { position: 'fixed', inset: 0, zIndex: 4000, background: 'var(--bg)', overflowY: 'auto' },
  kirishYopish: { position: 'absolute', top: 'calc(14px + env(safe-area-inset-top))', left: 16, zIndex: 4001, width: 40, height: 40, borderRadius: '50%', background: 'var(--fill)', color: 'var(--label)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
};
