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
import Ikonka from '../components/Ikonka';

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
  const [safarPin, setSafarPin] = useState(null); // машина PIN-коди
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
    buyurtma_yaratildi: ({ id, pin }) => {
      setRideId(id); // мижоз ID'сини базадан келган реал ID билан алмаштирамиз
      if (pin) setSafarPin(pin); // машина PIN-коди — ҳайдовчига айтилади
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
    setSafarPin(null);
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
      <div style={st.logo} className="glass-tugma"><Ikonka nom="taxi" size={18} /> Safar Taksi</div>
      <div style={st.tilWrap}><TemaTanlovchi /><TilTanlovchi /></div>
      <button
        style={st.profilTugma}
        className="glass-tugma"
        onClick={() => user ? setProfilOchiq(true) : setKirishOchiq(true)}
        title={user ? t('prof.title') : t('login.title')}
      ><Ikonka nom={user ? 'user' : 'key'} /></button>
      <button style={st.tarixTugma} className="glass-tugma" onClick={() => navigate('/tarix')} title={t('hist.title')}><Ikonka nom="clock" /></button>
      <div style={st.yordam} className="glass-tugma">{t('common.help')}</div>

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

            <button style={{ ...st.tugma, opacity: markazNuqta ? 1 : 0.5 }} onClick={markaznidanTanla} disabled={!markazNuqta}>
              {tanlovRejimi === 'boshlanish' ? t('pass.confirmStart') : t('common.continue')}
            </button>
            {tanlovRejimi === 'tugash' && (
              <button style={st.orqaga} onClick={() => setTanlovRejimi('boshlanish')}><Ikonka nom="arrow-left" size={16} /> {t('common.back')}</button>
            )}
          </>
        )}

        {bosqich === 'narx' && (
          <>
            <h2 style={st.sarlavha}>{t('pass.offerPrice')}</h2>
            <p style={st.izoh}>{t('pass.distance')}: {masofa()} км · {t('pass.recommended')}: {tavsiyaNarx.toLocaleString()}</p>
            <div style={st.narxBox}>
              <button style={st.narxTugma} onClick={() => setNarx(Math.max(5000, narx - 1000))}><Ikonka nom="minus" size={20} /></button>
              <div style={st.narxMatn}>{narx.toLocaleString()}</div>
              <button style={st.narxTugma} onClick={() => setNarx(narx + 1000)}><Ikonka nom="plus" size={20} /></button>
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
            <h2 style={st.sarlavha}>
              {haydovchiInfo.holati === 'yetib_keldi' ? t('wait.driverHere')
               : haydovchiInfo.holati === 'yolda' ? t('pass.inRide')
               : t('wait.driverComing')}
            </h2>
            {/* Келиш вақти (ETA) — ҳайдовчи йўлда бўлганда */}
            {haydovchiInfo.holati !== 'yetib_keldi' && haydovchiInfo.holati !== 'yolda' && kelishVaqti() && (
              <div style={st.eta}><Ikonka nom="car" size={16} /> {t('wait.etaMin', { min: kelishVaqti() })}</div>
            )}
            <div style={st.haydovchi}>
              <div style={st.avatar}>{haydovchiInfo.ism[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={st.hIsm}>
                  {haydovchiInfo.ism}
                  {haydovchiInfo.tasdiqlangan && <span style={st.tasdiqBelgi} title={t('verify.badge')}>✓</span>}
                  {' '}<Ikonka nom="star" size={13} /> {haydovchiInfo.reyting}
                </div>
                <div style={st.hMashina}>{haydovchiInfo.mashina} · {Number(haydovchiInfo.narx).toLocaleString()}</div>
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
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...st.tugma, flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => setChatOchiq(true)}><Ikonka nom="chat" size={18} /> {t('pass.chatWithDriver')}</button>
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
                <div style={{ maxHeight: 260, overflowY: 'auto' }} className="royxat-anim">
                  {takliflar.map((tk, i) => (
                    <div key={i} style={st.haydovchi}>
                      <div style={st.avatar}>{tk.haydovchi_ism[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={st.hIsm}>
                          {tk.haydovchi_ism}
                          {tk.tasdiqlangan && <span style={st.tasdiqBelgi} title={t('verify.badge')}>✓</span>}
                          {' '}<Ikonka nom="star" size={13} /> {tk.reyting}
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
  markazManzilQator: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--fill)', padding: 14, borderRadius: 'var(--r-md)', marginBottom: 10, minHeight: 48 },
  markazManzilMatn: { fontSize: 15, fontWeight: 500, lineHeight: 1.3, color: 'var(--label)' },
  tugma: { width: '100%', background: 'var(--tint)', color: '#fff', padding: 15, borderRadius: 'var(--r-lg)', fontSize: 17, fontWeight: 600, marginTop: 8 },
  orqaga: { width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2, background: 'transparent', padding: 12, color: 'var(--tint)', fontSize: 17, fontWeight: 400, marginTop: 2 },
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
};
