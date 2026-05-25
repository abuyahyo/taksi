// Админ панели — статистика, фойдаланувчилар, буюртмалар, блоклаш
import { useEffect, useState } from 'react';
import { api, socket } from '../services/api';
import Kirish from '../components/Kirish';
import { useT } from '../i18n';
import { useToast } from '../components/Toast';

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

  if (!user) return <Kirish kerakliRol="admin" sarlavhaKey="admin.titleLogin" onKirildi={setUser} />;

  return <AdminIchki onChiqish={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); }} />;
}

function AdminIchki({ onChiqish }) {
  const { t } = useT();
  const toast = useToast();
  const [tab, setTab] = useState('statistika');
  const [sosOyna, setSosOyna] = useState([]); // фаол SOS сигналлар
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
        setXato(err.response?.data?.xato || t('common.error'));
      }
    }
  };

  useEffect(() => { yukla(); }, []);

  // SOS — жонли қабул қилиш
  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit('admin_qoshil');
    // Олдинги тугатилмаган SOS'ларни оламиз
    api.get('/admin/sos').then(({ data }) => {
      setSosOyna(data.filter((s) => !s.qabul_qilindi));
    }).catch(() => {});
    const tinglovchi = (sig) => {
      setSosOyna((eski) => [sig, ...eski]);
      toast.error(`🆘 SOS! ${sig.yuboruvchi_ism || sig.rol} — сафар #${sig.rideId || '?'}`, { muddat: 10000 });
      // Браузер уведомление ҳам — таб ёпиқ бўлса
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try { new Notification('🆘 SOS', { body: `${sig.yuboruvchi_ism} (${sig.rol})`, tag: 'sos-' + sig.id }); } catch {}
      }
    };
    socket.on('sos_keldi', tinglovchi);
    return () => socket.off('sos_keldi', tinglovchi);
  }, []);

  const sosQabul = async (id) => {
    try {
      await api.post(`/admin/sos/${id}/qabul`);
      setSosOyna((eski) => eski.filter((s) => s.id !== id));
      toast.success(t('sos.acknowledged'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const bloklash = async () => {
    try {
      await api.post(`/admin/bloklash/${blokModal.id}`, { sabab });
      toast.success(`${blokModal.ism} ${t('admin.blockSuccess')}`);
      setBlokModal(null);
      setSabab('');
      yukla();
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    }
  };

  const blokniYechish = async (id) => {
    try {
      await api.post(`/admin/blok-yechish/${id}`);
      toast.success(t('admin.unblockSuccess'));
      yukla();
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    }
  };

  return (
    <div style={st.sahifa}>
      <div style={st.header}>
        <div style={st.logo}>{t('admin.title')}</div>
        <button style={st.chiqish} onClick={onChiqish}>{t('common.exit')}</button>
      </div>

      {/* SOS аларм banner — фаол сигналлар бўлса */}
      {sosOyna.length > 0 && (
        <div style={st.sosBanner}>
          <div style={st.sosBoshi}>🆘 {t('sos.activeAlerts', { n: sosOyna.length })}</div>
          {sosOyna.map((s) => (
            <div key={s.id} style={st.sosKarta}>
              <div style={{ flex: 1 }}>
                <div style={st.sosIsm}>{s.yuboruvchi_ism || s.rol} {s.yuboruvchi_telefon ? `· ${s.yuboruvchi_telefon}` : ''}</div>
                <div style={st.sosMeta}>
                  {t('chat.ride')} #{s.ride_id || '—'} · {s.rol}
                  {s.lat && ` · ${Number(s.lat).toFixed(4)}, ${Number(s.lng).toFixed(4)}`}
                </div>
              </div>
              <button style={st.sosQabulTugma} onClick={() => sosQabul(s.id)}>
                {t('sos.acknowledge')}
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={st.tablar}>
        {[['statistika', t('admin.tab.stats')], ['users', t('admin.tab.users')], ['rides', t('admin.tab.rides')]].map(([k, n]) => (
          <button key={k} style={{ ...st.tab, ...(tab === k ? st.tabFaol : {}) }} onClick={() => setTab(k)}>{n}</button>
        ))}
      </div>

      <div style={st.kontent}>
        {xato && <div style={st.xato}>{xato}</div>}

        {tab === 'statistika' && (
          stat == null ? <Yuklanmoqda /> : (
            <div style={st.statGrid}>
              <Stat raqam={stat.jami_foydalanuvchi.toLocaleString()} matn={t('admin.users')} ikon="👥" />
              <Stat raqam={stat.jami_haydovchi.toLocaleString()} matn={t('admin.drivers')} ikon="🚗" />
              <Stat raqam={stat.jami_safar.toLocaleString()} matn={t('admin.totalRides')} ikon="📦" />
              <Stat raqam={stat.yakunlangan_safar.toLocaleString()} matn={t('admin.completed')} ikon="✅" />
              <Stat raqam={stat.jami_daromad >= 1_000_000 ? `${(stat.jami_daromad / 1_000_000).toFixed(1)}M` : stat.jami_daromad.toLocaleString()} matn={t('admin.income')} ikon="💰" keng />
            </div>
          )
        )}

        {tab === 'users' && (
          users == null ? <Yuklanmoqda /> : users.length === 0 ? <Bosh matn={t('admin.noUsers')} /> : (
            <div style={st.royxat}>
              {users.map((u) => (
                <div key={u.id} style={st.userKarta}>
                  <div style={st.avatar}>{u.ism[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={st.userIsm}>{u.ism}</div>
                    <div style={st.userMeta}>
                      {u.telefon} · {u.rol === 'haydovchi' ? t('admin.roleDriver') : u.rol === 'admin' ? t('admin.roleAdmin') : t('admin.roleClient')} · ⭐ {u.reyting}
                    </div>
                    {u.bloklangan && <div style={st.blokBelgi}>{t('admin.blocked', { sabab: u.blok_sababi })}</div>}
                  </div>
                  {u.rol !== 'admin' && (u.bloklangan ? (
                    <button style={st.yechishTugma} onClick={() => blokniYechish(u.id)}>{t('admin.unblock')}</button>
                  ) : (
                    <button style={st.blokTugma} onClick={() => setBlokModal(u)}>{t('admin.block')}</button>
                  ))}
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'rides' && (
          rides == null ? <Yuklanmoqda /> : rides.length === 0 ? <Bosh matn={t('admin.noRides')} /> : (
            <div style={st.royxat}>
              {rides.map((r) => (
                <div key={r.id} style={st.rideKarta}>
                  <div style={st.rideYuqori}>
                    <span style={st.rideId}>#{r.id}</span>
                    <span style={{ ...st.holatBelgi, ...(r.holat === 'yakunlandi' ? st.holatYashil : st.holatSariq) }}>
                      {t(`hist.status.${r.holat}`) !== `hist.status.${r.holat}` ? t(`hist.status.${r.holat}`) : r.holat}
                    </span>
                  </div>
                  <div style={st.rideYol}>{r.boshlanish_manzil} → {r.tugash_manzil}</div>
                  <div style={st.rideMeta}>
                    {r.mijoz_ism || '—'} → {r.haydovchi_ism || '—'} · {r.kelishilgan_narx ? `${Number(r.kelishilgan_narx).toLocaleString()}` : '—'}
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
            <h3 style={st.modalSarlavha}>{t('admin.blockTitle', { ism: blokModal.ism })}</h3>
            <p style={st.modalShaffoflik}>{t('admin.blockHint')}</p>
            <input style={st.input} placeholder={t('admin.blockReason')} value={sabab} onChange={(e) => setSabab(e.target.value)} />
            <button style={{ ...st.tasdiqTugma, opacity: sabab ? 1 : 0.5 }} disabled={!sabab} onClick={bloklash}>
              {t('admin.blockConfirm')}
            </button>
            <button style={st.bekorTugma} onClick={() => setBlokModal(null)}>{t('common.cancel')}</button>
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
  sosBanner: { background: '#FEE2E2', borderTop: '3px solid #DC2626', padding: '12px 16px' },
  sosBoshi: { fontSize: 13, fontWeight: 800, color: '#7F1D1D', marginBottom: 10 },
  sosKarta: { display: 'flex', alignItems: 'center', gap: 12, background: '#fff', padding: 12, borderRadius: 12, marginBottom: 8, boxShadow: '0 2px 8px rgba(220,38,38,0.15)' },
  sosIsm: { fontWeight: 800, fontSize: 14 },
  sosMeta: { fontSize: 12, color: 'var(--kulrang)', marginTop: 2 },
  sosQabulTugma: { background: '#DC2626', color: '#fff', padding: '8px 14px', borderRadius: 10, fontWeight: 800, fontSize: 12 },
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
  modalShaffoflik: { fontSize: 13, color: '#92400E', background: '#FEF3C7', borderLeft: '4px solid #F59E0B', padding: '10px 12px', borderRadius: 8, marginBottom: 16, lineHeight: 1.5 },
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
