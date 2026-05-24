// Ҳайдовчи машина профили — модел, рақам, ранг
import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function MashinaProfili({ onYopish, onSaqlandi }) {
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
      .catch((err) => { setXato(err.response?.data?.xato || 'Юклашда хато'); setYuklanmoqda(false); });
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
      setXato(err.response?.data?.xato || 'Сақлашда хато');
      setSaqlanmoqda(false);
    }
  };

  const ozgartir = (field) => (e) => setProfil({ ...profil, [field]: e.target.value });

  return (
    <div style={st.fon} onClick={onYopish}>
      <div style={st.modal} onClick={(e) => e.stopPropagation()}>
        <div style={st.header}>
          <div style={st.sarlavha}>🚗 Машина профили</div>
          <button style={st.yopish} onClick={onYopish}>✕</button>
        </div>

        {yuklanmoqda ? (
          <div style={st.bosh}>Юкланмоқда...</div>
        ) : (
          <form onSubmit={saqlash} style={st.form}>
            <label style={st.label}>
              <span style={st.labelMatn}>Машина модели</span>
              <input
                style={st.input}
                placeholder="масалан, Chevrolet Cobalt"
                value={profil.mashina_modeli}
                onChange={ozgartir('mashina_modeli')}
                required
              />
            </label>

            <label style={st.label}>
              <span style={st.labelMatn}>Давлат рақами</span>
              <input
                style={st.input}
                placeholder="01 A 777 BA"
                value={profil.mashina_raqami}
                onChange={ozgartir('mashina_raqami')}
                required
              />
            </label>

            <label style={st.label}>
              <span style={st.labelMatn}>Ранги</span>
              <input
                style={st.input}
                placeholder="оқ"
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
              {saqlanmoqda ? 'Сақланмоқда...' : 'Сақлаш'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// Машина матн форматлаш — narx_taklif'да юбориш ва кўрсатиш учун
export function mashinaMatn(profil) {
  if (!profil) return 'Машина';
  const { mashina_modeli, mashina_rangi, mashina_raqami } = profil;
  const ism = [mashina_modeli, mashina_rangi].filter(Boolean).join(' ');
  return [ism || 'Машина', mashina_raqami].filter(Boolean).join(' · ');
}

const st = {
  fon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3500, padding: 16 },
  modal: { background: 'var(--oq)', width: '100%', maxWidth: 420, borderRadius: 20, padding: 24 },
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
