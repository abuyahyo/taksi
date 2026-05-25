// Ҳайдовчи машина профили — модел, рақам, ранг
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useT } from '../i18n';

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
          <button style={st.yopish} onClick={onYopish}>✕</button>
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
  fon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3500, padding: 16 },
  modal: { width: '100%', maxWidth: 420, borderRadius: 20, padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  sarlavha: { fontSize: 19, fontWeight: 800 },
  yopish: { width: 36, height: 36, borderRadius: '50%', background: 'var(--och-kulrang)', fontSize: 16, fontWeight: 700 },
  bosh: { textAlign: 'center', padding: 40, color: 'var(--kulrang)' },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  label: { display: 'flex', flexDirection: 'column', gap: 6 },
  labelMatn: { fontSize: 13, fontWeight: 700, color: 'var(--kulrang)' },
  input: { padding: 14, borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 15 },
  xato: { color: 'var(--qizil)', fontSize: 13, textAlign: 'center' },
  tugma: { background: 'var(--sariq)', padding: 14, borderRadius: 12, fontWeight: 800, fontSize: 16, marginTop: 4 },
};
