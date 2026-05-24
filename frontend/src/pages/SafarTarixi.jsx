// Сафар тарихи — фойдаланувчи мижоз ёки ҳайдовчи сифатида қилган сафарлар
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Kirish from '../components/Kirish';
import { useT } from '../i18n';

export default function SafarTarixi() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); }
    catch { return null; }
  });

  if (!user) return <Kirish sarlavhaKey="login.titleHistory" onKirildi={setUser} />;

  return <Ichki user={user} onOrqaga={() => navigate(-1)} onChiqish={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); }} />;
}

function Ichki({ user, onOrqaga, onChiqish }) {
  const { t } = useT();
  const [rides, setRides] = useState(null);
  const [xato, setXato] = useState('');

  useEffect(() => {
    api.get('/rides/me')
      .then(({ data }) => setRides(data))
      .catch((err) => {
        if (err.response?.status === 401) onChiqish();
        else setXato(err.response?.data?.xato || t('common.error'));
      });
  }, []);

  const sana = (v) => {
    if (!v) return '';
    const d = new Date(v);
    return d.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const holatBelgi = (h) => {
    const ranglar = {
      yakunlandi: st.holatYashil,
      qabul_qilindi: st.holatKok,
      kutilmoqda: st.holatSariq,
      bekor_qilindi: st.holatKulrang,
    };
    return { matn: t(`hist.status.${h}`) !== `hist.status.${h}` ? t(`hist.status.${h}`) : h, ...(ranglar[h] || st.holatKulrang) };
  };

  return (
    <div style={st.sahifa}>
      <div style={st.header}>
        <button style={st.orqaga} onClick={onOrqaga}>←</button>
        <div style={st.sarlavha}>{t('hist.title')}</div>
        <button style={st.chiqish} onClick={onChiqish}>{t('common.exit')}</button>
      </div>

      <div style={st.kontent}>
        {xato && <div style={st.xato}>{xato}</div>}

        {rides == null ? (
          <div style={st.bosh}>{t('common.loading')}</div>
        ) : rides.length === 0 ? (
          <div style={st.bosh}>
            <div style={st.boshIkon}>🚖</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>{t('hist.empty')}</div>
            <div style={{ fontSize: 13, color: 'var(--kulrang)', marginTop: 6 }}>{t('hist.emptyHint')}</div>
          </div>
        ) : (
          <div style={st.royxat}>
            {rides.map((r) => {
              const menMijoz = Number(r.mijoz_id) === Number(user.id);
              const hamroh = menMijoz ? (r.haydovchi_ism || '—') : (r.mijoz_ism || t('hist.guest'));
              const hamrohBelgi = menMijoz ? '🚗' : '🧍';
              const h = holatBelgi(r.holat);
              return (
                <div key={r.id} style={st.karta}>
                  <div style={st.kartaYuqori}>
                    <div style={st.kartaSarlavha}>#{r.id} · {sana(r.yaratilgan)}</div>
                    <span style={{ ...st.holatBelgi, background: h.bg, color: h.fg }}>{h.matn}</span>
                  </div>
                  <div style={st.yol}>
                    <span style={{ ...st.nuqta, background: 'var(--yashil)' }} />
                    <span style={st.yolMatn}>{r.boshlanish_manzil || '—'}</span>
                  </div>
                  <div style={st.chiziq} />
                  <div style={st.yol}>
                    <span style={{ ...st.nuqta, background: 'var(--qizil)' }} />
                    <span style={st.yolMatn}>{r.tugash_manzil || '—'}</span>
                  </div>
                  <div style={st.kartaPast}>
                    <div style={st.hamroh}>{hamrohBelgi} {hamroh}</div>
                    <div style={st.narx}>
                      {r.kelishilgan_narx
                        ? Number(r.kelishilgan_narx).toLocaleString()
                        : r.taklif_narx ? `~${Number(r.taklif_narx).toLocaleString()}` : '—'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const st = {
  sahifa: { width: '100vw', maxWidth: 720, margin: '0 auto', minHeight: '100vh', background: 'var(--och-kulrang)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'var(--qora)', color: 'var(--oq)', gap: 12 },
  orqaga: { width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.15)', color: 'var(--oq)', fontSize: 18, fontWeight: 700 },
  sarlavha: { flex: 1, fontWeight: 800, fontSize: 17 },
  chiqish: { background: 'transparent', color: 'var(--oq)', border: '1px solid rgba(255,255,255,.3)', padding: '6px 12px', borderRadius: 8, fontSize: 13 },
  kontent: { padding: 16 },
  xato: { background: '#FEE2E2', color: '#991B1B', padding: 12, borderRadius: 10, marginBottom: 12, fontSize: 14 },
  bosh: { textAlign: 'center', padding: 60, color: 'var(--kulrang)' },
  boshIkon: { fontSize: 56 },
  royxat: { display: 'flex', flexDirection: 'column', gap: 10 },
  karta: { background: 'var(--oq)', padding: 16, borderRadius: 16, boxShadow: 'var(--soya)' },
  kartaYuqori: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  kartaSarlavha: { fontWeight: 700, fontSize: 13, color: 'var(--kulrang)' },
  holatBelgi: { padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700 },
  holatYashil: { bg: '#DCFCE7', fg: '#16A34A' },
  holatKok:    { bg: '#DBEAFE', fg: '#1D4ED8' },
  holatSariq:  { bg: '#FEF9C3', fg: '#CA8A04' },
  holatKulrang:{ bg: '#E5E7EB', fg: '#374151' },
  yol: { display: 'flex', alignItems: 'center', gap: 10 },
  nuqta: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  chiziq: { width: 2, height: 14, background: '#E5E7EB', marginLeft: 4 },
  yolMatn: { fontSize: 14, fontWeight: 500 },
  kartaPast: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid #F3F4F6' },
  hamroh: { fontSize: 13, color: 'var(--kulrang)' },
  narx: { fontSize: 15, fontWeight: 800 },
};
