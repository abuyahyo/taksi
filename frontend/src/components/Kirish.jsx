// Логин/Регистрация формаси — admin/haydovchi/mijoz саҳифалари учун
import { useState } from 'react';
import { api } from '../services/api';
import { useT, TilTanlovchi } from '../i18n';
import { TemaTanlovchi } from '../theme';

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
      <div style={st.topbar}><TemaTanlovchi /><TilTanlovchi /></div>

      <form style={st.karta} className="glass slide-up" onSubmit={yubor}>
        <div style={st.logoBadge}>🚕</div>
        <h2 style={st.sarlavha}>{sarlavha}</h2>

        {ozRegister && (
          <div style={st.maydon}>
            <span style={st.ikon}>👤</span>
            <input
              style={st.input}
              type="text"
              placeholder={t('login.name')}
              value={ism}
              onChange={(e) => setIsm(e.target.value)}
              required
            />
          </div>
        )}
        <div style={st.maydon}>
          <span style={st.ikon}>📞</span>
          <input
            style={st.input}
            type="tel"
            placeholder={t('login.phone')}
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
            required
          />
        </div>
        <div style={st.maydon}>
          <span style={st.ikon}>🔒</span>
          <input
            style={st.input}
            type="password"
            placeholder={t('login.password')}
            value={parol}
            onChange={(e) => setParol(e.target.value)}
            required
          />
        </div>

        {xato && <div style={st.xato}>{xato}</div>}

        <button style={{ ...st.tugma, opacity: yuklanmoqda ? 0.6 : 1 }} type="submit" disabled={yuklanmoqda}>
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
  fon: {
    position: 'relative', width: '100%', minHeight: '100dvh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 'calc(var(--space-6) + env(safe-area-inset-top)) var(--space-5) calc(var(--space-6) + env(safe-area-inset-bottom))',
    overflow: 'hidden',
  },
  topbar: {
    position: 'absolute',
    top: 'calc(var(--space-4) + env(safe-area-inset-top))', right: 'var(--space-5)',
    zIndex: 10, display: 'flex', alignItems: 'center', gap: 6,
  },

  karta: {
    width: '100%', maxWidth: 400,
    padding: 'var(--space-7)', borderRadius: 'var(--r-xl)',
    display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
  },
  logoBadge: {
    width: 64, height: 64, borderRadius: 'var(--r-lg)',
    background: 'linear-gradient(135deg, var(--sariq-light), var(--sariq))',
    boxShadow: 'var(--shadow-sariq)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 34, margin: '0 auto',
  },
  sarlavha: { fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 'var(--space-2)' },

  maydon: { position: 'relative', display: 'flex', alignItems: 'center' },
  ikon: {
    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
    fontSize: 16, opacity: 0.6, pointerEvents: 'none',
  },
  input: {
    width: '100%', padding: '14px 14px 14px 42px',
    borderRadius: 'var(--r-md)', border: '1px solid var(--neutral-200)',
    background: 'var(--oq)', color: 'var(--qora)', fontSize: 15,
  },

  xato: {
    color: 'var(--qizil-dark)', fontSize: 13, textAlign: 'center',
    background: 'rgba(239,68,68,0.1)', padding: '10px 12px', borderRadius: 'var(--r-md)',
  },

  tugma: {
    background: 'linear-gradient(135deg, var(--sariq-light), var(--sariq))',
    color: '#fff', padding: 14, borderRadius: 'var(--r-lg)',
    fontWeight: 800, fontSize: 16, boxShadow: 'var(--shadow-sariq)',
    marginTop: 'var(--space-2)',
  },
  almashtir: {
    background: 'transparent', padding: 8,
    color: 'var(--asosiy)', fontSize: 13, fontWeight: 600, marginTop: 2,
  },
};
