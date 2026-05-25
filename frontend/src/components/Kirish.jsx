// Логин/Регистрация формаси — admin/haydovchi/mijoz саҳифалари учун
import { useState } from 'react';
import { api } from '../services/api';
import { useT, TilTanlovchi } from '../i18n';
import { TemaTanlovchi } from '../theme';
import Ikonka from './Ikonka';

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
    <div style={st.fon}>
      <div style={st.topbar}><TemaTanlovchi /><TilTanlovchi /></div>

      <form style={st.karta} className="slide-up" onSubmit={yubor}>
        <div style={st.logoBadge}><Ikonka nom="taxi" size={36} /></div>
        <h2 style={st.sarlavha}>{sarlavha}</h2>

        <div style={st.group}>
          {ozRegister && (
            <div style={st.maydon}>
              <span style={st.ikon}><Ikonka nom="user" size={18} /></span>
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
            <span style={st.ikon}><Ikonka nom="phone" size={18} /></span>
            <input
              style={st.input}
              type="tel"
              placeholder={t('login.phone')}
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              required
            />
          </div>
          <div style={{ ...st.maydon, borderBottom: 'none' }}>
            <span style={st.ikon}><Ikonka nom="lock" size={18} /></span>
            <input
              style={st.input}
              type="password"
              placeholder={t('login.password')}
              value={parol}
              onChange={(e) => setParol(e.target.value)}
              required
            />
          </div>
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
    background: 'var(--bg)',
    padding: 'calc(var(--space-6) + env(safe-area-inset-top)) var(--space-5) calc(var(--space-6) + env(safe-area-inset-bottom))',
    overflow: 'hidden',
  },
  topbar: {
    position: 'absolute',
    top: 'calc(var(--space-4) + env(safe-area-inset-top))', right: 'var(--space-5)',
    zIndex: 10, display: 'flex', alignItems: 'center', gap: 8,
  },

  karta: {
    width: '100%', maxWidth: 400,
    display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
  },
  logoBadge: {
    width: 76, height: 76, borderRadius: 18,
    background: 'linear-gradient(160deg, var(--sariq-light), var(--tint) 70%, var(--sariq-dark))',
    boxShadow: 'var(--shadow-sariq), inset 0 1px 0 rgba(255,255,255,0.4)',
    color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto var(--space-2)',
  },
  sarlavha: { fontSize: 26, fontWeight: 700, textAlign: 'center', marginBottom: 'var(--space-3)', letterSpacing: '0.36px' },

  group: {
    background: 'var(--surface)', borderRadius: 'var(--r-md)', overflow: 'hidden',
  },
  maydon: { position: 'relative', display: 'flex', alignItems: 'center', borderBottom: '0.5px solid var(--separator)' },
  ikon: {
    position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
    color: 'var(--secondary-label)', pointerEvents: 'none', display: 'inline-flex',
  },
  input: {
    width: '100%', padding: '14px 16px 14px 46px',
    border: 'none', background: 'transparent', color: 'var(--label)', fontSize: 17,
  },

  xato: {
    color: 'var(--qizil)', fontSize: 14, textAlign: 'center',
    background: 'rgba(255,59,48,0.1)', padding: '11px 14px', borderRadius: 'var(--r-md)',
  },

  tugma: {
    background: 'var(--tint)',
    color: '#fff', padding: 15, borderRadius: 'var(--r-lg)',
    fontWeight: 600, fontSize: 17,
    marginTop: 'var(--space-2)',
  },
  almashtir: {
    background: 'transparent', padding: 10,
    color: 'var(--tint)', fontSize: 15, fontWeight: 400, marginTop: 2,
  },
};
