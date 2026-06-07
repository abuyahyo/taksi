// Аккаунт саҳифаси — профиль, сақланган манзиллар, созламалар, чиқиш
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useT, TilTanlovchi } from '../i18n';
import { TemaTanlovchi } from '../theme';
import { joylashuvOl } from '../services/telegram';
import { useToast } from '../components/Toast';
import Kirish from '../components/Kirish';
import Pastki from '../components/Pastki';
import Ikonka from '../components/Ikonka';

const BOT_URL = 'https://t.me/manzil_taksi_bot';

export default function AkkauntSahifa() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); }
    catch { return null; }
  });

  if (!user) {
    return (
      <div style={st.sahifa}>
        <Kirish sarlavhaKey="prof.title" onKirildi={setUser} />
        <Pastki faol="akkaunt" />
      </div>
    );
  }

  return <Ichki user={user} onChiqish={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); }} />;
}

function Ichki({ user, onChiqish }) {
  const { t, til } = useT();
  const navigate = useNavigate();
  const toast = useToast();
  const [profil, setProfil] = useState(null);
  const [ism, setIsm] = useState('');
  const [manzillar, setManzillar] = useState([]);
  const [yangiNom, setYangiNom] = useState('');
  const [qoshmoqda, setQoshmoqda] = useState(false);

  useEffect(() => {
    api.get('/passenger/me')
      .then(({ data }) => { setProfil(data); setIsm(data.ism || ''); })
      .catch((err) => { if (err.response?.status === 401) onChiqish(); });
    api.get('/passenger/addresses').then(({ data }) => setManzillar(data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ismSaqla = async () => {
    try {
      await api.put('/passenger/me', {
        ism,
        home: { manzil: profil.home_manzil, lat: profil.home_lat, lng: profil.home_lng },
        ish:  { manzil: profil.ish_manzil,  lat: profil.ish_lat,  lng: profil.ish_lng },
      });
      toast.success(t('common.save'));
      setProfil((p) => ({ ...p, ism }));
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    }
  };

  // Жорий жойлашувни номлаб сақлаш
  const manzilQosh = async () => {
    const nom = yangiNom.trim();
    if (!nom) { toast.error(t('addr.namePh')); return; }
    setQoshmoqda(true);
    try {
      const p = await joylashuvOl();
      if (!p) { toast.error(t('pass.gpsWait')); setQoshmoqda(false); return; }
      let manzil = `${p[0].toFixed(4)}, ${p[1].toFixed(4)}`;
      try {
        const { data } = await api.get(`/geocode/reverse?lat=${p[0]}&lng=${p[1]}&til=${til}`);
        if (data.manzil) manzil = data.manzil;
      } catch { /* координата матни қолади */ }
      const { data } = await api.post('/passenger/addresses', { nom, manzil, lat: p[0], lng: p[1] });
      setManzillar((eski) => [data, ...eski]);
      setYangiNom('');
      toast.success(t('common.save'));
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    }
    setQoshmoqda(false);
  };

  const manzilOchir = async (id) => {
    try {
      await api.delete(`/passenger/addresses/${id}`);
      setManzillar((eski) => eski.filter((m) => m.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    }
  };

  const reyting = profil?.reyting ?? user.reyting;

  return (
    <div style={st.sahifa}>
      <div style={st.kontent}>
        {/* Профиль шапкаси */}
        <div style={st.shapka}>
          <div style={st.avatar}>{(ism || user.ism || '?')[0]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={st.ism}>{ism || user.ism || '—'}</div>
            {reyting != null && <div style={st.reyting}><Ikonka nom="star" size={14} /> {Number(reyting).toFixed(2)}</div>}
            {profil?.telefon && <div style={st.telefon}>{profil.telefon}</div>}
          </div>
        </div>

        {/* Стат */}
        {profil?.stat && (
          <div style={st.statGrid}>
            <Stat raqam={profil.stat.jami_safar} matn={t('admin.totalRides')} />
            <Stat raqam={profil.stat.yakunlangan} matn={t('admin.completed')} />
            <Stat raqam={Number(profil.stat.jami_xarajat).toLocaleString()} matn={t('prof.spent')} />
          </div>
        )}

        {/* Исм таҳрири */}
        <div style={st.bolim}>{t('login.name')}</div>
        <div style={st.ismQator}>
          <input style={st.input} value={ism} onChange={(e) => setIsm(e.target.value)} placeholder={t('login.name')} />
          <button style={st.kichikTugma} className="press" onClick={ismSaqla} disabled={!ism.trim() || ism === profil?.ism}>{t('common.save')}</button>
        </div>

        {/* Сақланган манзиллар */}
        <div style={st.bolim}>{t('prof.savedAddresses')}</div>
        <div style={st.karta}>
          {manzillar.length === 0 && <div style={st.boshMatn}>{t('addr.empty')}</div>}
          {manzillar.map((m) => (
            <div key={m.id} style={st.manzilQator}>
              <span style={st.manzilIkon}><Ikonka nom="pin" size={16} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={st.manzilNom}>{m.nom}</div>
                <div style={st.manzilMatn}>{m.manzil}</div>
              </div>
              <button style={st.ochir} className="press" onClick={() => manzilOchir(m.id)} aria-label={t('common.close')}><Ikonka nom="x" size={15} /></button>
            </div>
          ))}
          <div style={st.qoshQator}>
            <input style={st.input} value={yangiNom} onChange={(e) => setYangiNom(e.target.value.slice(0, 60))} placeholder={t('addr.namePh')} />
            <button style={st.kichikTugma} className="press" onClick={manzilQosh} disabled={qoshmoqda || !yangiNom.trim()}>
              {qoshmoqda ? t('common.wait') : t('addr.saveCurrent')}
            </button>
          </div>
        </div>

        {/* Тез амаллар */}
        <div style={st.bolim}>{t('akkaunt.more')}</div>
        <div style={st.karta}>
          <button style={st.amalQator} className="press" onClick={() => navigate('/tarix')}>
            <span style={{ ...st.amalIkon, background: 'var(--tint-fill)', color: 'var(--tint)' }}><Ikonka nom="clock" size={18} /></span>
            <span style={st.amalMatn}>{t('hist.title')}</span>
            <Ikonka nom="chevron-right" size={16} />
          </button>
          <a style={{ ...st.amalQator, textDecoration: 'none' }} href={BOT_URL} target="_blank" rel="noopener noreferrer">
            <span style={{ ...st.amalIkon, background: 'rgba(0,122,255,0.14)', color: 'var(--kok)' }}><Ikonka nom="chat" size={18} /></span>
            <span style={st.amalMatn}>{t('common.help')}</span>
            <Ikonka nom="chevron-right" size={16} />
          </a>
        </div>

        {/* Созламалар */}
        <div style={st.bolim}>{t('akkaunt.settings')}</div>
        <div style={st.karta}>
          <div style={st.sozQator}>
            <span style={st.amalMatn}>{t('akkaunt.theme')}</span>
            <TemaTanlovchi />
          </div>
          <div style={st.sozQator}>
            <span style={st.amalMatn}>{t('akkaunt.lang')}</span>
            <TilTanlovchi />
          </div>
        </div>

        <button style={st.chiqish} className="press" onClick={onChiqish}>
          <Ikonka nom="logout" size={18} /> {t('common.exit')}
        </button>
      </div>

      <Pastki faol="akkaunt" />
    </div>
  );
}

function Stat({ raqam, matn }) {
  return (
    <div style={stStat.karta}>
      <div style={stStat.raqam}>{raqam}</div>
      <div style={stStat.matn}>{matn}</div>
    </div>
  );
}

const st = {
  sahifa: { width: '100%', maxWidth: 480, margin: '0 auto', minHeight: '100dvh', background: 'var(--bg)' },
  kontent: { padding: 'calc(16px + env(safe-area-inset-top)) 16px calc(220px + env(safe-area-inset-bottom))' },
  shapka: { display: 'flex', alignItems: 'center', gap: 14, padding: '8px 4px 18px' },
  avatar: { width: 64, height: 64, borderRadius: '50%', background: 'var(--tint)', color: 'var(--on-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 600, flexShrink: 0 },
  ism: { fontSize: 26, fontWeight: 700, letterSpacing: '0.2px', color: 'var(--label)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  reyting: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600, color: 'var(--amber)', marginTop: 2 },
  telefon: { fontSize: 14, color: 'var(--secondary-label)', marginTop: 2 },
  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 8 },
  bolim: { fontSize: 13, fontWeight: 400, color: 'var(--secondary-label)', textTransform: 'uppercase', letterSpacing: '-0.08px', margin: '20px 4px 8px' },
  karta: { background: 'var(--surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-1)', overflow: 'hidden' },
  ismQator: { display: 'flex', gap: 8 },
  input: { flex: 1, minWidth: 0, padding: 12, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--fill)', color: 'var(--label)', fontSize: 16 },
  kichikTugma: { background: 'var(--tint-fill)', color: 'var(--tint)', padding: '8px 14px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' },
  boshMatn: { padding: 16, fontSize: 14, color: 'var(--secondary-label)', textAlign: 'center' },
  manzilQator: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: '0.5px solid var(--separator)' },
  manzilIkon: { width: 32, height: 32, borderRadius: 8, background: 'var(--tint-fill)', color: 'var(--tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  manzilNom: { fontSize: 15, fontWeight: 600, color: 'var(--label)' },
  manzilMatn: { fontSize: 13, color: 'var(--secondary-label)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  ochir: { width: 28, height: 28, borderRadius: '50%', background: 'var(--fill)', color: 'var(--secondary-label)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  qoshQator: { display: 'flex', gap: 8, padding: 12 },
  amalQator: { width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'transparent', borderBottom: '0.5px solid var(--separator)', textAlign: 'left', color: 'var(--tertiary-label)' },
  amalIkon: { width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  amalMatn: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: 500, color: 'var(--label)' },
  sozQator: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderBottom: '0.5px solid var(--separator)' },
  chiqish: { width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--fill)', color: 'var(--qizil)', padding: 15, borderRadius: 'var(--r-lg)', fontSize: 16, fontWeight: 600, marginTop: 24 },
};

const stStat = {
  karta: { background: 'var(--surface)', padding: 14, borderRadius: 'var(--r-md)', textAlign: 'center', boxShadow: 'var(--shadow-1)' },
  raqam: { fontSize: 20, fontWeight: 700, color: 'var(--label)' },
  matn: { fontSize: 11, color: 'var(--secondary-label)', marginTop: 2 },
};
