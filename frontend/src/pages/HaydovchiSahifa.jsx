// Ҳайдовчи саҳифаси — socket билан реал вақтда уланган
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useSocket } from '../services/useSocket';
import Kirish from '../components/Kirish';

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

  if (!user) return <Kirish kerakliRol="haydovchi" sarlavha="Ҳайдовчи кириши" onKirildi={setUser} />;

  return <Ichki user={user} onChiqish={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); }} />;
}

function Ichki({ user, onChiqish }) {
  const [onlayn, setOnlayn] = useState(false);
  const [buyurtmalar, setBuyurtmalar] = useState([]);
  const [tanlangan, setTanlangan] = useState(null);
  const [oznarx, setOznarx] = useState(0);
  const [stats, setStats] = useState({ daromad: 0, safar: 0 });
  const [faolSafar, setFaolSafar] = useState(null); // {rideId, narx} — қабул қилинган сафар

  const statsYukla = async () => {
    try {
      const { data } = await api.get('/driver/stats');
      setStats(data);
    } catch {}
  };
  useEffect(() => { statsYukla(); }, []);

  const { yubor } = useSocket({
    buyurtma_keldi: (b) => setBuyurtmalar((oldin) => [...oldin, b]),
    mavjud_buyurtmalar: (royxat) => setBuyurtmalar(royxat),
    buyurtma_yopildi: ({ rideId }) => {
      setBuyurtmalar((oldin) => oldin.filter((x) => x.id !== rideId));
    },
    // Йўловчи мени танлади — сафар бошланди
    tasdiqlandi: (data) => {
      if (data.haydovchi_id === user.id) {
        setFaolSafar({ rideId: data.rideId, narx: data.narx });
      }
    },
  });

  // Сафар тугатиш — backend rides.holat = 'yakunlandi', сўнг статистикани янгилаймиз
  const safarTugatish = () => {
    if (!faolSafar) return;
    yubor('safar_holati', { rideId: faolSafar.rideId, holat: 'yakunlandi' });
    setFaolSafar(null);
    setTimeout(statsYukla, 600); // BD янгилангач, статистикани қайта оламиз
  };

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

  const mashina = 'Машина'; // кейин ҳайдовчи профилидан олиниши мумкин

  const roziBolish = (b) => {
    yubor('narx_taklif', {
      rideId: b.id, haydovchi_ism: user.ism, haydovchi_narx: b.narx,
      reyting: Number(user.reyting) || 5, mashina, min: Math.ceil(Math.random() * 6) + 2,
    });
    setBuyurtmalar(buyurtmalar.filter((x) => x.id !== b.id));
  };

  const oznarxYuborish = () => {
    yubor('narx_taklif', {
      rideId: tanlangan.id, haydovchi_ism: user.ism, haydovchi_narx: oznarx,
      reyting: Number(user.reyting) || 5, mashina, min: Math.ceil(Math.random() * 6) + 2,
    });
    setTanlangan(null);
  };

  return (
    <div style={st.sahifa}>
      <div style={st.header}>
        <div style={st.logo}>🚕 Tez Taxi · {user.ism}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={st.chiqish} onClick={onChiqish}>Чиқиш</button>
          <button style={{ ...st.statusTugma, background: onlayn ? 'var(--yashil)' : 'var(--kulrang)' }} onClick={statusOzgartir}>
            {onlayn ? '● Онлайн' : '○ Офлайн'}
          </button>
        </div>
      </div>

      <div style={st.daromad}>
        <div>
          <div style={st.daromadRaqam}>{stats.daromad.toLocaleString()}</div>
          <div style={st.daromadMatn}>бугунги даромад (сўм)</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={st.kichikRaqam}>{stats.safar}</div>
          <div style={st.daromadMatn}>сафар</div>
        </div>
      </div>

      {/* Қабул қилинган сафар — "Сафар тугади" тугмаси */}
      {faolSafar && (
        <div style={st.faolSafar}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Сафар жараёнда</div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>#{faolSafar.rideId} · {Number(faolSafar.narx).toLocaleString()} сўм</div>
          </div>
          <button style={st.tugatTugma} onClick={safarTugatish}>Сафар тугади ✓</button>
        </div>
      )}

      <div style={st.royxat}>
        {!onlayn ? (
          <div style={st.bosh}>
            <div style={st.boshIkon}>🌙</div>
            <h3 style={st.boshSarlavha}>Сиз офлайнсиз</h3>
            <p style={st.boshMatn}>Буюртма олиш учун "Офлайн" тугмасини босинг</p>
          </div>
        ) : buyurtmalar.length === 0 ? (
          <div style={st.bosh}>
            <div style={st.boshIkon}>🔍</div>
            <h3 style={st.boshSarlavha}>Буюртма кутилмоқда...</h3>
            <p style={st.boshMatn}>Янги буюртмалар шу ерда пайдо бўлади</p>
          </div>
        ) : (
          buyurtmalar.map((b) => (
            <div key={b.id} style={st.karta}>
              <div style={st.kartaYuqori}>
                <div>
                  <div style={st.narx}>{Number(b.narx).toLocaleString()} сўм</div>
                  <div style={st.masofa}>{b.masofa} км · {b.mijoz} ⭐ {b.reyting}</div>
                </div>
                <div style={st.vaqt}>{b.vaqt}</div>
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
                  Ўз нархим
                </button>
                <button style={st.roziTugma} onClick={() => roziBolish(b)}>
                  Рози · {Number(b.narx).toLocaleString()}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {tanlangan && (
        <div style={st.modalFon} onClick={() => setTanlangan(null)}>
          <div style={st.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={st.modalSarlavha}>Ўз нархингизни таклиф қилинг</h3>
            <p style={st.modalIzoh}>{tanlangan.boshlanish} → {tanlangan.tugash} ({tanlangan.masofa} км)</p>
            <div style={st.narxBox}>
              <button style={st.narxTugma} onClick={() => setOznarx(Math.max(5000, oznarx - 1000))}>−</button>
              <div style={st.modalNarx}>{oznarx.toLocaleString()}</div>
              <button style={st.narxTugma} onClick={() => setOznarx(oznarx + 1000)}>+</button>
            </div>
            <button style={st.yuborishTugma} onClick={oznarxYuborish}>Таклифни юбориш</button>
            <button style={st.bekorTugma} onClick={() => setTanlangan(null)}>Бекор қилиш</button>
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
  statusTugma: { color: 'var(--oq)', padding: '8px 16px', borderRadius: 20, fontWeight: 700, fontSize: 13 },
  daromad: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 16, padding: 20, background: 'var(--qora)', borderRadius: 18, color: 'var(--oq)' },
  faolSafar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 16px 16px', padding: 16, background: 'var(--yashil)', borderRadius: 16, color: 'var(--oq)' },
  tugatTugma: { background: 'var(--oq)', color: 'var(--yashil)', padding: '10px 14px', borderRadius: 12, fontWeight: 800, fontSize: 13 },
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
  yollar: { marginBottom: 16 },
  yol: { display: 'flex', alignItems: 'center', gap: 10 },
  nuqta: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  chiziq: { width: 2, height: 16, background: '#E5E7EB', marginLeft: 4 },
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
