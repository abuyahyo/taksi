// Админ панели — статистика, фойдаланувчилар, буюртмалар, блоклаш
import { useState } from 'react';

// Намуна маълумотлар (ҳақиқий ишда API'дан келади)
const NAMUNA_STAT = {
  jami_foydalanuvchi: 1248, jami_haydovchi: 312,
  jami_safar: 5680, yakunlangan_safar: 5102, jami_daromad: 142500000,
};
const NAMUNA_USERS = [
  { id: 1, ism: 'Азиз Каримов', telefon: '998901112233', rol: 'mijoz', reyting: 4.9, bloklangan: false },
  { id: 2, ism: 'Бахтиёр Алиев', telefon: '998902223344', rol: 'haydovchi', reyting: 4.8, bloklangan: false },
  { id: 3, ism: 'Жасур Усмонов', telefon: '998903334455', rol: 'haydovchi', reyting: 3.2, bloklangan: true, blok_sababi: 'Кўп бекор қилиш' },
];
const NAMUNA_RIDES = [
  { id: 101, mijoz_ism: 'Азиз', haydovchi_ism: 'Бахтиёр', boshlanish_manzil: 'Чилонзор', tugash_manzil: 'Юнусобод', kelishilgan_narx: 25000, holat: 'yakunlandi' },
  { id: 102, mijoz_ism: 'Нодира', haydovchi_ism: '—', boshlanish_manzil: 'Олой', tugash_manzil: 'ЦУМ', kelishilgan_narx: null, holat: 'kutilmoqda' },
];

export default function AdminSahifa() {
  const [tab, setTab] = useState('statistika');
  const [users, setUsers] = useState(NAMUNA_USERS);
  const [blokModal, setBlokModal] = useState(null);
  const [sabab, setSabab] = useState('');

  const bloklash = () => {
    setUsers(users.map((u) => u.id === blokModal.id ? { ...u, bloklangan: true, blok_sababi: sabab } : u));
    setBlokModal(null);
    setSabab('');
  };

  const blokniYechish = (id) => {
    setUsers(users.map((u) => u.id === id ? { ...u, bloklangan: false, blok_sababi: null } : u));
  };

  return (
    <div style={st.sahifa}>
      <div style={st.header}>
        <div style={st.logo}>🚕 Tez Taxi · Админ</div>
      </div>

      {/* Таблар */}
      <div style={st.tablar}>
        {[['statistika', '📊 Статистика'], ['users', '👥 Фойдаланувчилар'], ['rides', '🚗 Буюртмалар']].map(([k, n]) => (
          <button key={k} style={{ ...st.tab, ...(tab === k ? st.tabFaol : {}) }} onClick={() => setTab(k)}>{n}</button>
        ))}
      </div>

      <div style={st.kontent}>
        {tab === 'statistika' && (
          <div style={st.statGrid}>
            <Stat raqam={NAMUNA_STAT.jami_foydalanuvchi.toLocaleString()} matn="Фойдаланувчилар" ikon="👥" />
            <Stat raqam={NAMUNA_STAT.jami_haydovchi.toLocaleString()} matn="Ҳайдовчилар" ikon="🚗" />
            <Stat raqam={NAMUNA_STAT.jami_safar.toLocaleString()} matn="Жами сафар" ikon="📦" />
            <Stat raqam={NAMUNA_STAT.yakunlangan_safar.toLocaleString()} matn="Якунланган" ikon="✅" />
            <Stat raqam={`${(NAMUNA_STAT.jami_daromad / 1000000).toFixed(1)}M`} matn="Даромад (сўм)" ikon="💰" keng />
          </div>
        )}

        {tab === 'users' && (
          <div style={st.royxat}>
            {users.map((u) => (
              <div key={u.id} style={st.userKarta}>
                <div style={st.avatar}>{u.ism[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={st.userIsm}>{u.ism}</div>
                  <div style={st.userMeta}>
                    {u.telefon} · {u.rol === 'haydovchi' ? '🚗 Ҳайдовчи' : '🧍 Йўловчи'} · ⭐ {u.reyting}
                  </div>
                  {u.bloklangan && <div style={st.blokBelgi}>🚫 Блокланган: {u.blok_sababi}</div>}
                </div>
                {u.bloklangan ? (
                  <button style={st.yechishTugma} onClick={() => blokniYechish(u.id)}>Ечиш</button>
                ) : (
                  <button style={st.blokTugma} onClick={() => setBlokModal(u)}>Блоклаш</button>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'rides' && (
          <div style={st.royxat}>
            {NAMUNA_RIDES.map((r) => (
              <div key={r.id} style={st.rideKarta}>
                <div style={st.rideYuqori}>
                  <span style={st.rideId}>#{r.id}</span>
                  <span style={{ ...st.holatBelgi, ...(r.holat === 'yakunlandi' ? st.holatYashil : st.holatSariq) }}>
                    {r.holat === 'yakunlandi' ? 'Якунланди' : 'Кутилмоқда'}
                  </span>
                </div>
                <div style={st.rideYol}>{r.boshlanish_manzil} → {r.tugash_manzil}</div>
                <div style={st.rideMeta}>
                  {r.mijoz_ism} → {r.haydovchi_ism} · {r.kelishilgan_narx ? `${r.kelishilgan_narx.toLocaleString()} сўм` : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Блоклаш ойнаси — сабаб мажбурий (шаффофлик) */}
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

const st = {
  sahifa: { width: '100vw', maxWidth: 720, margin: '0 auto', minHeight: '100vh', background: 'var(--och-kulrang)' },
  header: { padding: 20, background: 'var(--qora)', color: 'var(--oq)' },
  logo: { fontWeight: 800, fontSize: 18 },
  tablar: { display: 'flex', gap: 8, padding: 16, background: 'var(--oq)' },
  tab: { flex: 1, padding: 12, borderRadius: 12, background: 'var(--och-kulrang)', fontWeight: 600, fontSize: 13 },
  tabFaol: { background: 'var(--sariq)', fontWeight: 800 },
  kontent: { padding: 16 },
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
