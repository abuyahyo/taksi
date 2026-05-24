// Йўловчи саҳифаси — socket билан реал вақтда уланган
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Harita from '../components/Harita';
import Chat from '../components/Chat';
import Baholash from '../components/Baholash';
import Tolov from '../components/Tolov';
import { useSocket } from '../services/useSocket';
import { bildir, ruxsatSora } from '../services/bildirishnoma';
import { useT, TilTanlovchi } from '../i18n';

if (typeof window !== 'undefined') ruxsatSora();

const TOSHKENT = [41.2995, 69.2401];

export default function YolovchiSahifa() {
  const navigate = useNavigate();
  const { t } = useT();
  const [boshlanish, setBoshlanish] = useState(null);
  const [tugash, setTugash] = useState(null);
  const [tanlovRejimi, setTanlovRejimi] = useState('boshlanish');
  const [narx, setNarx] = useState(15000);
  const [bosqich, setBosqich] = useState('manzil');
  const [takliflar, setTakliflar] = useState([]);
  const [rideId, setRideId] = useState(null);
  const [haydovchiInfo, setHaydovchiInfo] = useState(null); // {ism, narx} — танланган ҳайдовчи
  const [haydovchiNuqta, setHaydovchiNuqta] = useState(null); // [lat, lng] — реал вақт жойлашуви
  const [chatOchiq, setChatOchiq] = useState(false);
  const [tolovOchiq, setTolovOchiq] = useState(false);
  const [baholashUchun, setBaholashUchun] = useState(null); // {rideId, ism}

  // Меҳмон фойдаланувчи бўлсаям чатга кириш учун ID — localStorage'дан
  const meId = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null')?.id || null; }
    catch { return null; }
  })();

  const { yubor } = useSocket({
    buyurtma_yaratildi: ({ id }) => {
      setRideId(id); // мижоз ID'сини базадан келган реал ID билан алмаштирамиз
    },
    yangi_taklif: (taklif) => {
      setTakliflar((oldin) => [...oldin, taklif]);
      bildir('💰 Янги таклиф', `${taklif.haydovchi_ism} · ${Number(taklif.haydovchi_narx).toLocaleString()} сўм · ${taklif.min} мин`, { tag: 'taklif' });
    },
    // Ҳайдовчи сафарни тугатганда — баҳолаш модалини кўрсатамиз
    holat_yangilandi: (data) => {
      if (data.holat === 'yakunlandi' && Number(data.rideId) === Number(rideId)) {
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
    setTanlovRejimi('boshlanish');
    setTakliflar([]);
    setRideId(null);
    setHaydovchiInfo(null);
    setHaydovchiNuqta(null);
    setChatOchiq(false);
  };

  const haritaBosildi = (nuqta) => {
    if (tanlovRejimi === 'boshlanish') {
      setBoshlanish(nuqta);
      setTanlovRejimi('tugash');
    } else {
      setTugash(nuqta);
    }
  };

  const masofa = () => {
    if (!boshlanish || !tugash) return 0;
    const [lat1, lng1] = boshlanish;
    const [lat2, lng2] = tugash;
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
  };

  const tavsiyaNarx = Math.max(10000, Math.round(masofa() * 3000));

  const davomEtish = () => {
    if (boshlanish && tugash) {
      setNarx(tavsiyaNarx);
      setBosqich('narx');
    }
  };

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
      boshlanish: `${boshlanish[0].toFixed(4)}, ${boshlanish[1].toFixed(4)}`,
      tugash: `${tugash[0].toFixed(4)}, ${tugash[1].toFixed(4)}`,
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
    setHaydovchiInfo({ ism: t.haydovchi_ism, narx: t.haydovchi_narx, mashina: t.mashina, reyting: t.reyting });
    setBosqich('safar');
  };

  const bekorQilish = () => {
    if (rideId) yubor('buyurtma_bekor', { rideId });
    setBosqich('narx');
  };

  return (
    <div style={st.sahifa}>
      <div style={st.harita}>
        <Harita markaz={TOSHKENT} boshlanish={boshlanish} tugash={tugash} haydovchi={haydovchiNuqta} onBosish={haritaBosildi} />
      </div>
      <div style={st.logo}>🚕 Tez Taxi</div>
      <div style={st.tilWrap}><TilTanlovchi /></div>
      <button style={st.tarixTugma} onClick={() => navigate('/tarix')} title={t('hist.title')}>🕒</button>
      <div style={st.yordam}>{t('common.help')}</div>

      <div style={st.panel}>
        {bosqich === 'manzil' && (
          <>
            <h2 style={st.sarlavha}>{t('pass.whereTo')}</h2>
            <div style={st.maydon} onClick={() => setTanlovRejimi('boshlanish')}>
              <span style={{ ...st.nuqta, background: 'var(--yashil)' }} />
              <div style={st.maydonMatn}>{boshlanish ? t('pass.startPicked') : t('pass.markStart')}</div>
            </div>
            <div style={st.maydon} onClick={() => setTanlovRejimi('tugash')}>
              <span style={{ ...st.nuqta, background: 'var(--qizil)' }} />
              <div style={st.maydonMatn}>{tugash ? t('pass.endPicked') : t('pass.markEnd')}</div>
            </div>
            <button style={{ ...st.tugma, opacity: boshlanish && tugash ? 1 : 0.5 }} onClick={davomEtish} disabled={!boshlanish || !tugash}>
              {t('common.continue')}
            </button>
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
            <button style={st.tugma} onClick={buyurtmaBerish}>{t('pass.placeOrder')}</button>
            <button style={st.orqaga} onClick={() => setBosqich('manzil')}>← {t('common.back')}</button>
          </>
        )}

        {bosqich === 'safar' && haydovchiInfo && (
          <>
            <h2 style={st.sarlavha}>{t('pass.inRide')}</h2>
            <div style={st.haydovchi}>
              <div style={st.avatar}>{haydovchiInfo.ism[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={st.hIsm}>{haydovchiInfo.ism} ⭐ {haydovchiInfo.reyting}</div>
                <div style={st.hMashina}>{haydovchiInfo.mashina} · {Number(haydovchiInfo.narx).toLocaleString()}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...st.tugma, flex: 1 }} onClick={() => setChatOchiq(true)}>{t('pass.chatWithDriver')}</button>
              <button style={st.tolovTugma} onClick={() => setTolovOchiq(true)}>{t('pay.open')}</button>
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
                        <div style={st.hIsm}>{tk.haydovchi_ism} ⭐ {tk.reyting}</div>
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

      {baholashUchun && (
        <Baholash
          rideId={baholashUchun.rideId}
          kimni="driver"
          ism={baholashUchun.ism}
          onYopish={() => { setBaholashUchun(null); boshlanishigaQayt(); }}
        />
      )}
    </div>
  );
}

const st = {
  sahifa: { position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' },
  harita: { position: 'absolute', inset: 0 },
  logo: { position: 'absolute', top: 16, left: 16, zIndex: 1000, background: 'var(--sariq)', padding: '8px 16px', borderRadius: 12, fontWeight: 800, fontSize: 18, boxShadow: 'var(--soya)' },
  yordam: { position: 'absolute', top: 16, right: 16, zIndex: 1000, background: 'var(--oq)', padding: '8px 14px', borderRadius: 12, fontWeight: 600, fontSize: 13, boxShadow: 'var(--soya)', color: 'var(--kulrang)' },
  tarixTugma: { position: 'absolute', top: 16, right: 116, zIndex: 1000, background: 'var(--oq)', width: 38, height: 38, borderRadius: '50%', fontSize: 16, boxShadow: 'var(--soya)' },
  tilWrap: { position: 'absolute', top: 64, right: 16, zIndex: 1000 },
  tolovTugma: { background: 'var(--qora)', color: 'var(--oq)', padding: 16, borderRadius: 14, fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap' },
  panel: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000, background: 'var(--oq)', borderRadius: '24px 24px 0 0', padding: 24, boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' },
  sarlavha: { fontSize: 22, fontWeight: 800, marginBottom: 16 },
  izoh: { color: 'var(--kulrang)', fontSize: 14, marginBottom: 16 },
  maydon: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--och-kulrang)', padding: 14, borderRadius: 14, marginBottom: 10, cursor: 'pointer' },
  nuqta: { width: 12, height: 12, borderRadius: '50%', flexShrink: 0 },
  maydonMatn: { fontSize: 14 },
  tugma: { width: '100%', background: 'var(--sariq)', padding: 16, borderRadius: 14, fontSize: 16, fontWeight: 700, marginTop: 8 },
  orqaga: { width: '100%', background: 'transparent', padding: 12, color: 'var(--kulrang)', fontSize: 14, marginTop: 4 },
  narxBox: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--och-kulrang)', padding: 16, borderRadius: 16, marginBottom: 16 },
  narxTugma: { width: 44, height: 44, borderRadius: '50%', background: 'var(--oq)', fontSize: 24, fontWeight: 700, boxShadow: 'var(--soya)' },
  narxMatn: { fontSize: 28, fontWeight: 800 },
  som: { fontSize: 16, fontWeight: 500, color: 'var(--kulrang)' },
  kutish: { textAlign: 'center', padding: '12px 0' },
  spinner: { width: 48, height: 48, margin: '0 auto 16px', border: '4px solid var(--och-kulrang)', borderTop: '4px solid var(--sariq)', borderRadius: '50%', animation: 'aylanish 1s linear infinite' },
  bekor: { width: '100%', background: 'var(--och-kulrang)', padding: 14, borderRadius: 14, fontSize: 15, fontWeight: 600, marginTop: 8 },
  haydovchi: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--och-kulrang)', padding: 12, borderRadius: 14, marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: '50%', background: 'var(--sariq)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 },
  hIsm: { fontWeight: 700, fontSize: 15 },
  hMashina: { fontSize: 12, color: 'var(--kulrang)' },
  qabul: { background: 'var(--sariq)', padding: '10px 16px', borderRadius: 10, fontWeight: 800, fontSize: 15 },
  kuzatishMatn: { textAlign: 'center', padding: 12, color: 'var(--kulrang)', fontSize: 13, marginTop: 4 },
};
