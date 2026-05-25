// Логин/Регистрация формаси — admin/haydovchi/mijoz саҳифалари учун
import { useState } from 'react';
import { api } from '../services/api';
import { useT, TilTanlovchi } from '../i18n';

export default function Kirish({ kerakliRol, sarlavhaKey, onKirildi }) {
  const { t } = useT();
  const [rejim, setRejim] = useState('login'); // login | register
  const [ism, setIsm] = useState('');
  const [telefon, setTelefon] = useState('');
  const [parol, setParol] = useState('');
  const [xato, setXato] = useState('');
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  const sarlavha = sarlavhaKey ? t(sarlavhaKey) : (rejim === 'login' ? t('login.title') : t('login.register'));
  const ozRegister = rejim === 'register';
  // Админ ва ҳайдовчи учун саҳифаларда фақат логин (рўйхатдан ўтиш бошқа усулда)
  const registerKoʻrsatish = !kerakliRol || kerakliRol === 'mijoz';

  const yubor = async (e) => {
    e.preventDefault();
    setXato('');
    setYuklanmoqda(true);
    try {
      const yoʻl = ozRegister ? '/auth/register' : '/auth/login';
      const tana = ozRegister
        ? { ism, telefon, parol, rol: kerakliRol || 'mijoz' }
        : { telefon, parol };
      const { data } = await api.post(yoʻl, tana);
      if (kerakliRol && data.user.rol !== kerakliRol) {
        const rolMatni = kerakliRol === 'admin' ? t('admin.titleShort') : kerakliRol === 'haydovchi' ? t('home.driver') : t('home.passenger');
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
    <div style={st.fon} className="fon-blobs">
      <div style={st.til}><TilTanlovchi /></div>
      <form style={st.karta} className="glass slide-up" onSubmit={yubor}>
        <div style={st.logo}>🚕</div>
        <h2 style={st.sarlavha}>{sarlavha}</h2>

        {ozRegister && (
          <input
            style={st.input}
            type="text"
            placeholder={t('login.name')}
            value={ism}
            onChange={(e) => setIsm(e.target.value)}
            required
          />
        )}
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
          {yuklanmoqda ? t('common.wait') : (ozRegister ? t('login.registerSubmit') : t('login.submit'))}
        </button>

        {registerKoʻrsatish && (
          <button
            type="button"
            style={st.almashtir}
            onClick={() => { setRejim(ozRegister ? 'login' : 'register'); setXato(''); }}
          >
            {ozRegister ? t('login.haveAccount') : t('login.noAccount')}
          </button>
        )}
      </form>
    </div>
  );
}

const st = {
  fon: { position: 'relative', width: '100vw', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--och-kulrang)' },
  til: { position: 'absolute', top: 16, right: 16 },
  karta: { width: '100%', maxWidth: 400, padding: 32, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 14 },
  logo: { fontSize: 48, textAlign: 'center' },
  sarlavha: { fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 8 },
  input: { padding: 14, borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 15 },
  xato: { color: 'var(--qizil)', fontSize: 13, textAlign: 'center' },
  tugma: { background: 'var(--sariq)', padding: 14, borderRadius: 12, fontWeight: 800, fontSize: 16 },
  almashtir: { background: 'transparent', padding: 8, color: 'var(--kulrang)', fontSize: 13, marginTop: 4 },
};
