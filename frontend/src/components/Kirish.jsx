// Логин формаси — admin/haydovchi саҳифалари учун
import { useState } from 'react';
import { api } from '../services/api';
import { useT, TilTanlovchi } from '../i18n';

export default function Kirish({ kerakliRol, sarlavhaKey, onKirildi }) {
  const { t } = useT();
  const [telefon, setTelefon] = useState('');
  const [parol, setParol] = useState('');
  const [xato, setXato] = useState('');
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  const sarlavha = sarlavhaKey ? t(sarlavhaKey) : t('login.title');

  const yubor = async (e) => {
    e.preventDefault();
    setXato('');
    setYuklanmoqda(true);
    try {
      const { data } = await api.post('/auth/login', { telefon, parol });
      if (kerakliRol && data.user.rol !== kerakliRol) {
        const rolMatni = kerakliRol === 'admin' ? t('admin.titleShort') : t('home.driver');
        setXato(t('login.wrongRole', { rol: rolMatni }));
        setYuklanmoqda(false);
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onKirildi?.(data.user);
    } catch (err) {
      const xabar = err.response?.data?.xato || t('common.error');
      const sabab = err.response?.data?.sabab ? ` (${err.response.data.sabab})` : '';
      setXato(xabar + sabab);
      setYuklanmoqda(false);
    }
  };

  return (
    <div style={st.fon}>
      <div style={st.til}><TilTanlovchi /></div>
      <form style={st.karta} onSubmit={yubor}>
        <div style={st.logo}>🚕</div>
        <h2 style={st.sarlavha}>{sarlavha}</h2>
        <input
          style={st.input}
          type="tel"
          placeholder={t('login.phone')}
          value={telefon}
          onChange={(e) => setTelefon(e.target.value)}
          required
        />
        <input
          style={st.input}
          type="password"
          placeholder={t('login.password')}
          value={parol}
          onChange={(e) => setParol(e.target.value)}
          required
        />
        {xato && <div style={st.xato}>{xato}</div>}
        <button style={{ ...st.tugma, opacity: yuklanmoqda ? 0.5 : 1 }} type="submit" disabled={yuklanmoqda}>
          {yuklanmoqda ? t('common.wait') : t('login.submit')}
        </button>
      </form>
    </div>
  );
}

const st = {
  fon: { position: 'relative', width: '100vw', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--och-kulrang)' },
  til: { position: 'absolute', top: 16, right: 16 },
  karta: { background: 'var(--oq)', width: '100%', maxWidth: 400, padding: 32, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: 'var(--soya)' },
  logo: { fontSize: 48, textAlign: 'center' },
  sarlavha: { fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 8 },
  input: { padding: 14, borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 15 },
  xato: { color: 'var(--qizil)', fontSize: 13, textAlign: 'center' },
  tugma: { background: 'var(--sariq)', padding: 14, borderRadius: 12, fontWeight: 800, fontSize: 16 },
};
