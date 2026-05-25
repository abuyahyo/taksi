// Ҳайдовчи машина профили — модел, рақам, ранг
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useT } from '../i18n';
import Ikonka from './Ikonka';

export default function MashinaProfili({ onYopish, onSaqlandi }) {
  const { t } = useT();
  const [profil, setProfil] = useState({ mashina_modeli: '', mashina_raqami: '', mashina_rangi: '' });
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xato, setXato] = useState('');

  useEffect(() => {
    api.get('/driver/profile')
      .then(({ data }) => {
        setProfil({
          mashina_modeli: data.mashina_modeli || '',
          mashina_raqami: data.mashina_raqami || '',
          mashina_rangi:  data.mashina_rangi  || '',
        });
        setYuklanmoqda(false);
      })
      .catch((err) => { setXato(err.response?.data?.xato || t('common.error')); setYuklanmoqda(false); });
  }, []);

  const saqlash = async (e) => {
    e.preventDefault();
    setSaqlanmoqda(true);
    setXato('');
    try {
      const { data } = await api.put('/driver/profile', profil);
      onSaqlandi?.(data);
      onYopish();
    } catch (err) {
      setXato(err.response?.data?.xato || t('common.error'));
      setSaqlanmoqda(false);
    }
  };

  const ozgartir = (field) => (e) => setProfil({ ...profil, [field]: e.target.value });

  return (
    <div style={st.fon} onClick={onYopish}>
      <div style={st.modal} className="glass slide-up" onClick={(e) => e.stopPropagation()}>
        <div style={st.header}>
          <div style={st.sarlavha}>{t('car.title')}</div>
          <button style={st.yopish} onClick={onYopish}><Ikonka nom="x" size={16} /></button>
        </div>

        {yuklanmoqda ? (
          <div style={st.bosh}>{t('common.loading')}</div>
        ) : (
          <form onSubmit={saqlash} style={st.form}>
            <label style={st.label}>
              <span style={st.labelMatn}>{t('car.model')}</span>
              <input
                style={st.input}
                placeholder={t('car.modelPh')}
                value={profil.mashina_modeli}
                onChange={ozgartir('mashina_modeli')}
                required
              />
            </label>

            <label style={st.label}>
              <span style={st.labelMatn}>{t('car.plate')}</span>
              <input
                style={st.input}
                placeholder={t('car.platePh')}
                value={profil.mashina_raqami}
                onChange={ozgartir('mashina_raqami')}
                required
              />
            </label>

            <label style={st.label}>
              <span style={st.labelMatn}>{t('car.color')}</span>
              <input
                style={st.input}
                placeholder={t('car.colorPh')}
                value={profil.mashina_rangi}
                onChange={ozgartir('mashina_rangi')}
                required
              />
            </label>

            {xato && <div style={st.xato}>{xato}</div>}

            <button
              type="submit"
              style={{ ...st.tugma, opacity: saqlanmoqda ? 0.5 : 1 }}
              disabled={saqlanmoqda}
            >
              {saqlanmoqda ? t('car.saving') : t('common.save')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function mashinaMatn(profil) {
  if (!profil) return '';
  const { mashina_modeli, mashina_rangi, mashina_raqami } = profil;
  const ism = [mashina_modeli, mashina_rangi].filter(Boolean).join(' ');
  return [ism, mashina_raqami].filter(Boolean).join(' · ');
}

const st = {
  fon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3500, padding: 24, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' },
  modal: { width: '100%', maxWidth: 420, borderRadius: 'var(--r-xl)', padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  sarlavha: { fontSize: 20, fontWeight: 600 },
  yopish: { width: 30, height: 30, borderRadius: '50%', background: 'var(--fill)', color: 'var(--secondary-label)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  bosh: { textAlign: 'center', padding: 40, color: 'var(--secondary-label)' },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  label: { display: 'flex', flexDirection: 'column', gap: 6 },
  labelMatn: { fontSize: 13, fontWeight: 400, color: 'var(--secondary-label)', textTransform: 'uppercase', letterSpacing: '-0.08px', paddingLeft: 4 },
  input: { padding: 14, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--fill)', color: 'var(--label)', fontSize: 17 },
  xato: { color: 'var(--qizil)', fontSize: 14, textAlign: 'center' },
  tugma: { background: 'var(--tint)', color: '#fff', padding: 15, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 17, marginTop: 4 },
};
