// Йўловчи саҳифаси — socket билан реал вақтда уланган
import { useState } from 'react';
import Harita from '../components/Harita';
import { useSocket } from '../services/useSocket';

const TOSHKENT = [41.2995, 69.2401];

export default function YolovchiSahifa() {
  const [boshlanish, setBoshlanish] = useState(null);
  const [tugash, setTugash] = useState(null);
  const [tanlovRejimi, setTanlovRejimi] = useState('boshlanish');
  const [narx, setNarx] = useState(15000);
  const [bosqich, setBosqich] = useState('manzil');
  const [takliflar, setTakliflar] = useState([]);
  const [rideId, setRideId] = useState(null);

  // Socket — ҳайдовчи таклифларини реал вақтда қабул қилиш
  const { yubor } = useSocket({
    yangi_taklif: (taklif) => {
      setTakliflar((oldin) => [...oldin, taklif]);
    },
  });

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
    const yangiId = Date.now();
    setRideId(yangiId);
    setTakliflar([]);
    setBosqich('kutish');
    yubor('yangi_buyurtma', {
      id: yangiId,
      mijoz: 'Сиз',
      reyting: 5.0,
      boshlanish: `${boshlanish[0].toFixed(4)}, ${boshlanish[1].toFixed(4)}`,
      tugash: `${tugash[0].toFixed(4)}, ${tugash[1].toFixed(4)}`,
      masofa: masofa(),
      narx,
      vaqt: 'ҳозиргина',
    });
  };

  // Ҳайдовчини танлаш
  const haydovchiTanla = (t) => {
    yubor('haydovchi_tanlandi', { rideId, haydovchi_ism: t.haydovchi_ism, narx: t.haydovchi_narx });
    alert(`${t.haydovchi_ism} танланди! Сафар бошланади.`);
    // Қайта бошлаш
    setBosqich('manzil');
    setBoshlanish(null);
    setTugash(null);
    setTanlovRejimi('boshlanish');
    setTakliflar([]);
  };

  const bekorQilish = () => {
    if (rideId) yubor('buyurtma_bekor', { rideId });
    setBosqich('narx');
  };

  return (
    <div style={st.sahifa}>
      <div style={st.harita}>
        <Harita markaz={TOSHKENT} boshlanish={boshlanish} tugash={tugash} onBosish={haritaBosildi} />
      </div>
      <div style={st.logo}>🚕 Tez Taxi</div>
      <div style={st.yordam}>Ёрдам 24/7</div>

      <div style={st.panel}>
        {bosqich === 'manzil' && (
          <>
            <h2 style={st.sarlavha}>Қаёрга борасиз?</h2>
            <div style={st.maydon} onClick={() => setTanlovRejimi('boshlanish')}>
              <span style={{ ...st.nuqta, background: 'var(--yashil)' }} />
              <div style={st.maydonMatn}>{boshlanish ? 'Бошланиш танланди ✓' : 'Харитадан бошланишни белгиланг'}</div>
            </div>
            <div style={st.maydon} onClick={() => setTanlovRejimi('tugash')}>
              <span style={{ ...st.nuqta, background: 'var(--qizil)' }} />
              <div style={st.maydonMatn}>{tugash ? 'Манзил танланди ✓' : 'Харитадан манзилни белгиланг'}</div>
            </div>
            <button style={{ ...st.tugma, opacity: boshlanish && tugash ? 1 : 0.5 }} onClick={davomEtish} disabled={!boshlanish || !tugash}>
              Давом этиш
            </button>
          </>
        )}

        {bosqich === 'narx' && (
          <>
            <h2 style={st.sarlavha}>Нархни таклиф қилинг</h2>
            <p style={st.izoh}>Масофа: {masofa()} км · Тавсия: {tavsiyaNarx.toLocaleString()} сўм</p>
            <div style={st.narxBox}>
              <button style={st.narxTugma} onClick={() => setNarx(Math.max(5000, narx - 1000))}>−</button>
              <div style={st.narxMatn}>{narx.toLocaleString()} <span style={st.som}>сўм</span></div>
              <button style={st.narxTugma} onClick={() => setNarx(narx + 1000)}>+</button>
            </div>
            <button style={st.tugma} onClick={buyurtmaBerish}>Буюртма бериш</button>
            <button style={st.orqaga} onClick={() => setBosqich('manzil')}>← Орқага</button>
          </>
        )}

        {bosqich === 'kutish' && (
          <>
            {takliflar.length === 0 ? (
              <div style={st.kutish}>
                <div style={st.spinner} />
                <h2 style={st.sarlavha}>Ҳайдовчилар қидирилмоқда...</h2>
                <p style={st.izoh}>{narx.toLocaleString()} сўм · {masofa()} км</p>
                <button style={st.bekor} onClick={bekorQilish}>Бекор қилиш</button>
              </div>
            ) : (
              <>
                <h2 style={st.sarlavha}>Таклифлар ({takliflar.length})</h2>
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {takliflar.map((t, i) => (
                    <div key={i} style={st.haydovchi}>
                      <div style={st.avatar}>{t.haydovchi_ism[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={st.hIsm}>{t.haydovchi_ism} ⭐ {t.reyting}</div>
                        <div style={st.hMashina}>{t.mashina} · {t.min} мин</div>
                      </div>
                      <button style={st.qabul} onClick={() => haydovchiTanla(t)}>
                        {t.haydovchi_narx.toLocaleString()}
                      </button>
                    </div>
                  ))}
                </div>
                <button style={st.bekor} onClick={bekorQilish}>Бекор қилиш</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const st = {
  sahifa: { position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' },
  harita: { position: 'absolute', inset: 0 },
  logo: { position: 'absolute', top: 16, left: 16, zIndex: 1000, background: 'var(--sariq)', padding: '8px 16px', borderRadius: 12, fontWeight: 800, fontSize: 18, boxShadow: 'var(--soya)' },
  yordam: { position: 'absolute', top: 16, right: 16, zIndex: 1000, background: 'var(--oq)', padding: '8px 14px', borderRadius: 12, fontWeight: 600, fontSize: 13, boxShadow: 'var(--soya)', color: 'var(--kulrang)' },
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
};
