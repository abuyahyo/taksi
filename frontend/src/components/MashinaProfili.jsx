// Ҳайдовчи машина профили — модел, рақам, ранг
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useT } from '../i18n';
import Ikonka from './Ikonka';
import KycHujjatlar from './KycHujjatlar';

// Санани форма input учун ҳамюзалаймиз ("2025-05-29" формати)
const sanaUchun = (s) => (s ? String(s).slice(0, 10) : '');

export default function MashinaProfili({ onYopish, onSaqlandi }) {
  const { t } = useT();
  const [profil, setProfil] = useState({
    mashina_modeli: '', mashina_raqami: '', mashina_rangi: '', mashina_yili: '',
    tugilgan_sana: '', gpro_raqami: '', gpro_amal_qiladi: '',
  });
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
          mashina_yili:   data.mashina_yili ? String(data.mashina_yili) : '',
          tugilgan_sana:    sanaUchun(data.tugilgan_sana),
          gpro_raqami:      data.gpro_raqami || '',
          gpro_amal_qiladi: sanaUchun(data.gpro_amal_qiladi),
        });
        setYuklanmoqda(false);
      })
      .catch((err) => { setXato(err.response?.data?.xato || t('common.error')); setYuklanmoqda(false); });
    // Фақат mount'да — t deps'га қўшилса тил алмашганда форма қайта юкланиб,
    // фойдаланувчи киритган ўзгаришлар ўчиб кетарди
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

            <label style={st.label}>
              <span style={st.labelMatn}>{t('car.year')}</span>
              <input
                style={st.input}
                type="number"
                placeholder={t('car.yearPh')}
                value={profil.mashina_yili}
                onChange={ozgartir('mashina_yili')}
              />
            </label>

            <div style={{ ...st.labelMatn, marginTop: 8 }}>{t('car.driverDetails')}</div>

            <label style={st.label}>
              <span style={st.labelMatn}>{t('car.dob')}</span>
              <input
                style={st.input}
                type="date"
                value={profil.tugilgan_sana}
                onChange={ozgartir('tugilgan_sana')}
              />
            </label>

            <label style={st.label}>
              <span style={st.labelMatn}>{t('car.licenseNum')}</span>
              <input
                style={st.input}
                placeholder={t('onb.f.licenseNumPh')}
                value={profil.gpro_raqami}
                onChange={ozgartir('gpro_raqami')}
              />
            </label>

            <label style={st.label}>
              <span style={st.labelMatn}>{t('car.licenseExp')}</span>
              <input
                style={st.input}
                type="date"
                value={profil.gpro_amal_qiladi}
                onChange={ozgartir('gpro_amal_qiladi')}
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

        {!yuklanmoqda && <KycHujjatlar />}
      </div>
    </div>
  );
}

const st = {
  fon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3500, padding: 24, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' },
  modal: { width: '100%', maxWidth: 420, borderRadius: 'var(--r-xl)', padding: 24, maxHeight: '90dvh', overflowY: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  sarlavha: { fontSize: 20, fontWeight: 600 },
  yopish: { width: 44, height: 44, borderRadius: '50%', background: 'var(--fill)', color: 'var(--secondary-label)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  bosh: { textAlign: 'center', padding: 40, color: 'var(--secondary-label)' },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  label: { display: 'flex', flexDirection: 'column', gap: 6 },
  labelMatn: { fontSize: 13, fontWeight: 400, color: 'var(--secondary-label)', textTransform: 'uppercase', letterSpacing: '-0.08px', paddingLeft: 4 },
  input: { padding: 14, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--fill)', color: 'var(--label)', fontSize: 17 },
  xato: { color: 'var(--qizil)', fontSize: 14, textAlign: 'center' },
  tugma: { background: 'var(--tint)', color: 'var(--on-tint)', padding: 15, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 17, marginTop: 4 },
};
