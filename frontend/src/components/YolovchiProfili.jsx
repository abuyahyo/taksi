// Йўловчи профили модали — исм, стат, сақланган Уй/Иш манзиллари
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useT } from '../i18n';

export default function YolovchiProfili({ onYopish, onYangilandi, mapNuqta }) {
  const { t } = useT();
  const [profil, setProfil] = useState(null);
  const [ism, setIsm] = useState('');
  const [homeManzil, setHomeManzil] = useState('');
  const [ishManzil, setIshManzil] = useState('');
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState('');

  useEffect(() => {
    api.get('/passenger/me')
      .then(({ data }) => {
        setProfil(data);
        setIsm(data.ism || '');
        setHomeManzil(data.home_manzil || '');
        setIshManzil(data.ish_manzil || '');
      })
      .catch((err) => setXato(err.response?.data?.xato || t('common.error')));
  }, []);

  const saqla = async (qaysi) => {
    if (!mapNuqta) {
      setXato(t('prof.pickPointFirst'));
      return;
    }
    setSaqlanmoqda(true);
    setXato('');
    try {
      const body = { ism };
      const manzil = `${mapNuqta[0].toFixed(4)}, ${mapNuqta[1].toFixed(4)}`;
      const yangi = { manzil, lat: mapNuqta[0], lng: mapNuqta[1] };
      const eski = (k, l) => ({ manzil: profil[k] || null, lat: profil[l + '_lat'], lng: profil[l + '_lng'] });
      body.home = qaysi === 'home' ? yangi : eski('home_manzil', 'home');
      body.ish  = qaysi === 'ish'  ? yangi : eski('ish_manzil', 'ish');
      const { data } = await api.put('/passenger/me', body);
      setProfil(data);
      if (qaysi === 'home') setHomeManzil(data.home_manzil || '');
      if (qaysi === 'ish')  setIshManzil(data.ish_manzil || '');
      onYangilandi?.(data);
    } catch (err) {
      setXato(err.response?.data?.xato || t('common.error'));
    }
    setSaqlanmoqda(false);
  };

  const ismSaqla = async () => {
    setSaqlanmoqda(true);
    try {
      const { data } = await api.put('/passenger/me', {
        ism,
        home: { manzil: profil.home_manzil, lat: profil.home_lat, lng: profil.home_lng },
        ish:  { manzil: profil.ish_manzil,  lat: profil.ish_lat,  lng: profil.ish_lng },
      });
      setProfil(data);
      onYangilandi?.(data);
    } catch (err) {
      setXato(err.response?.data?.xato || t('common.error'));
    }
    setSaqlanmoqda(false);
  };

  if (!profil) {
    return (
      <div style={st.fon} onClick={onYopish}>
        <div style={st.modal} className="glass slide-up-modal" onClick={(e) => e.stopPropagation()}>
          <div>{t('common.loading')}</div>
          {xato && <div style={st.xato}>{xato}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={st.fon} onClick={onYopish}>
      <div style={st.modal} className="glass slide-up-modal" onClick={(e) => e.stopPropagation()}>
        <div style={st.header}>
          <div style={st.sarlavha}>👤 {t('prof.title')}</div>
          <button style={st.yopish} onClick={onYopish}>✕</button>
        </div>

        <div style={st.avatar}>{(profil.ism || '?')[0]}</div>

        <div style={st.ismQator}>
          <input
            style={st.input}
            value={ism}
            onChange={(e) => setIsm(e.target.value)}
            placeholder={t('login.name')}
          />
          <button style={st.kichikTugma} onClick={ismSaqla} disabled={saqlanmoqda || !ism.trim() || ism === profil.ism}>
            {t('common.save')}
          </button>
        </div>
        <div style={st.metaQator}>
          📞 {profil.telefon} · ⭐ {profil.reyting}
        </div>

        <div style={st.statGrid}>
          <Stat raqam={profil.stat.jami_safar} matn={t('admin.totalRides')} />
          <Stat raqam={profil.stat.yakunlangan} matn={t('admin.completed')} />
          <Stat raqam={Number(profil.stat.jami_xarajat).toLocaleString()} matn={t('prof.spent')} keng />
        </div>

        <div style={st.manzilSarlavha}>{t('prof.savedAddresses')}</div>
        <div style={st.manzilQator}>
          <div style={st.manzilBelgi}>🏠</div>
          <div style={{ flex: 1 }}>
            <div style={st.manzilLabel}>{t('prof.home')}</div>
            <div style={st.manzilQiymat}>{homeManzil || t('prof.noAddress')}</div>
          </div>
          <button style={st.kichikTugma} onClick={() => saqla('home')} disabled={saqlanmoqda || !mapNuqta}>
            {mapNuqta ? t('prof.saveFromMap') : t('prof.pickPointFirst')}
          </button>
        </div>
        <div style={st.manzilQator}>
          <div style={st.manzilBelgi}>🏢</div>
          <div style={{ flex: 1 }}>
            <div style={st.manzilLabel}>{t('prof.work')}</div>
            <div style={st.manzilQiymat}>{ishManzil || t('prof.noAddress')}</div>
          </div>
          <button style={st.kichikTugma} onClick={() => saqla('ish')} disabled={saqlanmoqda || !mapNuqta}>
            {mapNuqta ? t('prof.saveFromMap') : t('prof.pickPointFirst')}
          </button>
        </div>

        {xato && <div style={st.xato}>{xato}</div>}
      </div>
    </div>
  );
}

function Stat({ raqam, matn, keng }) {
  return (
    <div style={{ ...stStat.karta, ...(keng ? { gridColumn: '1 / -1' } : {}) }}>
      <div style={stStat.raqam}>{raqam}</div>
      <div style={stStat.matn}>{matn}</div>
    </div>
  );
}

const st = {
  fon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 3500, padding: 0 },
  modal: { width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', borderRadius: '24px 24px 0 0', padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sarlavha: { fontSize: 19, fontWeight: 800 },
  yopish: { width: 36, height: 36, borderRadius: '50%', background: 'var(--och-kulrang)', fontSize: 16 },
  avatar: { width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--sariq-light), var(--sariq))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800, margin: '0 auto 12px' },
  ismQator: { display: 'flex', gap: 8, marginBottom: 6 },
  input: { flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--neutral-200)', fontSize: 15 },
  kichikTugma: { background: 'var(--qora)', color: 'var(--oq)', padding: '8px 14px', borderRadius: 10, fontWeight: 700, fontSize: 12 },
  metaQator: { textAlign: 'center', fontSize: 13, color: 'var(--kulrang)', marginBottom: 18 },
  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 },
  manzilSarlavha: { fontSize: 14, fontWeight: 700, color: 'var(--kulrang)', marginBottom: 8 },
  manzilQator: { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--och-kulrang)', padding: 12, borderRadius: 12, marginBottom: 8 },
  manzilBelgi: { fontSize: 22 },
  manzilLabel: { fontSize: 11, color: 'var(--kulrang)', fontWeight: 600 },
  manzilQiymat: { fontSize: 14, fontWeight: 600 },
  xato: { color: 'var(--qizil)', fontSize: 13, textAlign: 'center', marginTop: 10 },
};

const stStat = {
  karta: { background: 'var(--och-kulrang)', padding: 14, borderRadius: 12, textAlign: 'center' },
  raqam: { fontSize: 22, fontWeight: 800 },
  matn: { fontSize: 11, color: 'var(--kulrang)', marginTop: 2 },
};
