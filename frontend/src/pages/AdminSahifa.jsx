// Админ панели — статистика, фойдаланувчилар, буюртмалар, блоклаш
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import Kirish from '../components/Kirish';

export default function AdminSahifa() {
  const [user, setUser] = useState(() => {
    const saqlangan = localStorage.getItem('user');
    if (!saqlangan) return null;
    try {
      const u = JSON.parse(saqlangan);
      return u.rol === 'admin' ? u : null;
    } catch {
      return null;
    }
  });

  if (!user) return <Kirish kerakliRol="admin" sarlavha="Админ панелига кириш" onKirildi={setUser} />;

  return <AdminIchki onChiqish={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); }} />;
}

function AdminIchki({ onChiqish }) {
  const [tab, setTab] = useState('statistika');
  const [stat, setStat] = useState(null);
  const [users, setUsers] = useState(null);
  const [rides, setRides] = useState(null);
  const [xato, setXato] = useState('');
  const [blokModal, setBlokModal] = useState(null);
  const [sabab, setSabab] = useState('');

  const yukla = async () => {
    try {
      setXato('');
      const [s, u, r] = await Promise.all([
        api.get('/admin/statistika'),
        api.get('/admin/foydalanuvchilar'),
        api.get('/admin/buyurtmalar'),
      ]);
      setStat(s.data);
      setUsers(u.data);
      setRides(r.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        onChiqish();
      } else {
        setXato(err.response?.data?.xato || 'Маълумотларни юклаб бўлмади');
      }
    }
  };

  useEffect(() => { yukla(); }, []);

  const bloklash = async () => {
    try {
      await api.post(`/admin/bloklash/${blokModal.id}`, { sabab });
      setBlokModal(null);
      setSabab('');
      yukla();
    } catch (err) {
      alert(err.response?.data?.xato || 'Блоклашда хато');
    }
  };

  const blokniYechish = async (id) => {
    try {
      await api.post(`/admin/blok-yechish/${id}`);
      yukla();
    } catch (err) {
      alert(err.response?.data?.xato || 'Хато');
    }
  };

  return (
    <div style={st.sahifa}>
      <div style={st.header}>
        <div style={st.logo}>🚕 Tez Taxi · Админ</div>
        <button style={st.chiqish} onClick={onChiqish}>Чиқиш</button>
      </div>

      <div style={st.tablar}>
        {[['statistika', '📊 Статистика'], ['users', '👥 Фойдаланувчилар'], ['rides', '🚗 Буюртмалар']].map(([k, n]) => (
          <button key={k} style={{ ...st.tab, ...(tab === k ? st.tabFaol : {}) }} onClick={() => setTab(k)}>{n}</button>
        ))}
      </div>

      <div style={st.kontent}>
        {xato && <div style={st.xato}>{xato}</div>}

        {tab === 'statistika' && (
          stat == null ? <Yuklanmoqda /> : (
            <div style={st.statGrid}>
              <Stat raqam={stat.jami_foydalanuvchi.toLocaleString()} matn="Фойдаланувчилар" ikon="👥" />
              <Stat raqam={stat.jami_haydovchi.toLocaleString()} matn="Ҳайдовчилар" ikon="🚗" />
              <Stat raqam={stat.jami_safar.toLocaleString()} matn="Жами сафар" ikon="📦" />
              <Stat raqam={stat.yakunlangan_safar.toLocaleString()} matn="Якунланган" ikon="✅" />
              <Stat raqam={stat.jami_daromad >= 1_000_000 ? `${(stat.jami_daromad / 1_000_000).toFixed(1)}M` : stat.jami_daromad.toLocaleString()} matn="Даромад (сўм)" ikon="💰" keng />
            </div>
          )
        )}

        {tab === 'users' && (
          users == null ? <Yuklanmoqda /> : users.length === 0 ? <Bosh matn="Ҳали фойдаланувчи йўқ" /> : (
            <div style={st.royxat}>
              {users.map((u) => (
                <div key={u.id} style={st.userKarta}>
                  <div style={st.avatar}>{u.ism[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={st.userIsm}>{u.ism}</div>
                    <div style={st.userMeta}>
                      {u.telefon} · {u.rol === 'haydovchi' ? '🚗 Ҳайдовчи' : u.rol === 'admin' ? '👑 Админ' : '🧍 Йўловчи'} · ⭐ {u.reyting}
                    </div>
                    {u.bloklangan && <div style={st.blokBelgi}>🚫 Блокланган: {u.blok_sababi}</div>}
                  </div>
                  {u.rol !== 'admin' && (u.bloklangan ? (
                    <button style={st.yechishTugma} onClick={() => blokniYechish(u.id)}>Ечиш</button>
                  ) : (
                    <button style={st.blokTugma} onClick={() => setBlokModal(u)}>Блоклаш</button>
                  ))}
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'rides' && (
          rides == null ? <Yuklanmoqda /> : rides.length === 0 ? <Bosh matn="Ҳали сафар йўқ" /> : (
            <div style={st.royxat}>
              {rides.map((r) => (
                <div key={r.id} style={st.rideKarta}>
                  <div style={st.rideYuqori}>
                    <span style={st.rideId}>#{r.id}</span>
                    <span style={{ ...st.holatBelgi, ...(r.holat === 'yakunlandi' ? st.holatYashil : st.holatSariq) }}>
                      {r.holat === 'yakunlandi' ? 'Якунланди' : r.holat === 'kutilmoqda' ? 'Кутилмоқда' : r.holat}
                    </span>
                  </div>
                  <div style={st.rideYol}>{r.boshlanish_manzil} → {r.tugash_manzil}</div>
                  <div style={st.rideMeta}>
                    {r.mijoz_ism || '—'} → {r.haydovchi_ism || '—'} · {r.kelishilgan_narx ? `${Number(r.kelishilgan_narx).toLocaleString()} сўм` : '—'}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {blokModal && (
        <div style={st.modalFon} onClick={() => setBlokModal(null)}>
          <div style={st.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={st.modalSarlavha}>Блоклаш: {blokModal.ism}</h3>
            <p style={st.modalIzoh}>Шаффофлик учун сабаб мажбурий. Фойдаланувчи буни кўради.</p>
            <input style={st.input} placeholder="Блоклаш сабаби" value={sabab} onChange={(e) => setSabab(e.target.value)} />
            <button style={{ ...st.tasdiqTugma, opacity: sabab ? 1 : 0.5 }} disabled={!sabab} onClick={bloklash}>
              Блоклашни тасдиқлаш
            </button>
            <button style={st.bekorTugma} onClick={() => setBlokModal(null)}>Бекор қилиш</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ raqam, matn, ikon, keng }) {
  return (
    <div style={{ ...stStat.karta, ...(keng ? { gridColumn: '1 / -1' } : {}) }}>
      <div style={stStat.ikon}>{ikon}</div>
      <div style={stStat.raqam}>{raqam}</div>
      <div style={stStat.matn}>{matn}</div>
    </div>
  );
}

function Yuklanmoqda() {
  return <div style={{ textAlign: 'center', padding: 40, color: 'var(--kulrang)' }}>Юкланмоқда...</div>;
}

function Bosh({ matn }) {
  return <div style={{ textAlign: 'center', padding: 40, color: 'var(--kulrang)', fontSize: 14 }}>{matn}</div>;
}

const st = {
  sahifa: { width: '100vw', maxWidth: 720, margin: '0 auto', minHeight: '100vh', background: 'var(--och-kulrang)' },
  header: { padding: 20, background: 'var(--qora)', color: 'var(--oq)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontWeight: 800, fontSize: 18 },
  chiqish: { background: 'transparent', color: 'var(--oq)', border: '1px solid rgba(255,255,255,.3)', padding: '6px 12px', borderRadius: 8, fontSize: 13 },
  tablar: { display: 'flex', gap: 8, padding: 16, background: 'var(--oq)' },
  tab: { flex: 1, padding: 12, borderRadius: 12, background: 'var(--och-kulrang)', fontWeight: 600, fontSize: 13 },
  tabFaol: { background: 'var(--sariq)', fontWeight: 800 },
  kontent: { padding: 16 },
  xato: { background: '#FEE2E2', color: '#991B1B', padding: 12, borderRadius: 10, marginBottom: 12, fontSize: 14 },
  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  royxat: { display: 'flex', flexDirection: 'column', gap: 10 },
  userKarta: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--oq)', padding: 14, borderRadius: 14, boxShadow: 'var(--soya)' },
  avatar: { width: 44, height: 44, borderRadius: '50%', background: 'var(--sariq)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 },
  userIsm: { fontWeight: 700, fontSize: 15 },
  userMeta: { fontSize: 12, color: 'var(--kulrang)', marginTop: 2 },
  blokBelgi: { fontSize: 12, color: 'var(--qizil)', marginTop: 4, fontWeight: 600 },
  blokTugma: { background: 'var(--qizil)', color: 'var(--oq)', padding: '8px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13 },
  yechishTugma: { background: 'var(--yashil)', color: 'var(--oq)', padding: '8px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13 },
  rideKarta: { background: 'var(--oq)', padding: 14, borderRadius: 14, boxShadow: 'var(--soya)' },
  rideYuqori: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rideId: { fontWeight: 800, fontSize: 14 },
  holatBelgi: { padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 },
  holatYashil: { background: '#DCFCE7', color: '#16A34A' },
  holatSariq: { background: '#FEF9C3', color: '#CA8A04' },
  rideYol: { fontSize: 14, fontWeight: 600 },
  rideMeta: { fontSize: 12, color: 'var(--kulrang)', marginTop: 4 },
  modalFon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 },
  modal: { background: 'var(--oq)', width: '100%', maxWidth: 400, borderRadius: 20, padding: 24 },
  modalSarlavha: { fontSize: 20, fontWeight: 800, marginBottom: 8 },
  modalIzoh: { fontSize: 13, color: 'var(--kulrang)', marginBottom: 16 },
  input: { width: '100%', padding: 14, borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 15, marginBottom: 16 },
  tasdiqTugma: { width: '100%', background: 'var(--qizil)', color: 'var(--oq)', padding: 14, borderRadius: 12, fontWeight: 700, fontSize: 15 },
  bekorTugma: { width: '100%', background: 'transparent', padding: 12, color: 'var(--kulrang)', fontSize: 14, marginTop: 4 },
};

const stStat = {
  karta: { background: 'var(--oq)', padding: 20, borderRadius: 16, boxShadow: 'var(--soya)', textAlign: 'center' },
  ikon: { fontSize: 28, marginBottom: 8 },
  raqam: { fontSize: 26, fontWeight: 800 },
  matn: { fontSize: 13, color: 'var(--kulrang)', marginTop: 2 },
};
