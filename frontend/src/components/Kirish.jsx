// Логин формаси — admin/haydovchi саҳифалари учун
import { useState } from 'react';
import { api } from '../services/api';

export default function Kirish({ kerakliRol, sarlavha = 'Кириш', onKirildi }) {
  const [telefon, setTelefon] = useState('');
  const [parol, setParol] = useState('');
  const [xato, setXato] = useState('');
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  const yubor = async (e) => {
    e.preventDefault();
    setXato('');
    setYuklanmoqda(true);
    try {
      const { data } = await api.post('/auth/login', { telefon, parol });
      if (kerakliRol && data.user.rol !== kerakliRol) {
        setXato(`Бу саҳифа фақат ${kerakliRol === 'admin' ? 'админ' : 'ҳайдовчи'} учун`);
        setYuklanmoqda(false);
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onKirildi?.(data.user);
    } catch (err) {
      const xabar = err.response?.data?.xato || 'Хатолик юз берди';
      const sabab = err.response?.data?.sabab ? ` (${err.response.data.sabab})` : '';
      setXato(xabar + sabab);
      setYuklanmoqda(false);
    }
  };

  return (
    <div style={st.fon}>
      <form style={st.karta} onSubmit={yubor}>
        <div style={st.logo}>🚕</div>
        <h2 style={st.sarlavha}>{sarlavha}</h2>
        <input
          style={st.input}
          type="tel"
          placeholder="Телефон (+998...)"
          value={telefon}
          onChange={(e) => setTelefon(e.target.value)}
          required
        />
        <input
          style={st.input}
          type="password"
          placeholder="Парол"
          value={parol}
          onChange={(e) => setParol(e.target.value)}
          required
        />
        {xato && <div style={st.xato}>{xato}</div>}
        <button style={{ ...st.tugma, opacity: yuklanmoqda ? 0.5 : 1 }} type="submit" disabled={yuklanmoqda}>
          {yuklanmoqda ? 'Кутинг...' : 'Кириш'}
        </button>
      </form>
    </div>
  );
}

const st = {
  fon: { width: '100vw', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--och-kulrang)' },
  karta: { background: 'var(--oq)', width: '100%', maxWidth: 400, padding: 32, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: 'var(--soya)' },
  logo: { fontSize: 48, textAlign: 'center' },
  sarlavha: { fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 8 },
  input: { padding: 14, borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 15 },
  xato: { color: 'var(--qizil)', fontSize: 13, textAlign: 'center' },
  tugma: { background: 'var(--sariq)', padding: 14, borderRadius: 12, fontWeight: 800, fontSize: 16 },
};
