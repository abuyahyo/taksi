// Логин/Регистрация формаси — admin/haydovchi/mijoz саҳифалари учун
import { useState, useEffect, useRef, useMemo } from 'react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import ruLabels from 'react-phone-number-input/locale/ru.json';
import enLabels from 'react-phone-number-input/locale/en.json';
import { api } from '../services/api';
import { useT } from '../i18n';
import SozlamalarTugma from './SozlamalarTugma';
import Ikonka from './Ikonka';
import { tgIchidami } from '../services/telegram';
import { googleYoqilgan, googleTayyor, googleRender } from '../services/google';

export default function Kirish({ kerakliRol, sarlavhaKey, onKirildi }) {
  const { t, til } = useT();
  const [rejim, setRejim] = useState('login'); // login | register
  const [ism, setIsm] = useState('');
  const [telefon, setTelefon] = useState('');
  const [parol, setParol] = useState('');
  const [xato, setXato] = useState('');
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  // Telefon picker учун давлат лейбллари (uz/uz-latn → en, ru → ru)
  const telLabels = useMemo(() => (til === 'ru' ? ruLabels : enLabels), [til]);

  const sarlavha = sarlavhaKey ? t(sarlavhaKey) : (rejim === 'login' ? t('login.title') : t('login.register'));
  const ozRegister = rejim === 'register';
  // Админ учун фақат логин (админни админ яратади). Йўловчи ва ҳайдовчи ўзи рўйхатдан ўтади.
  const registerKoʻrsatish = !kerakliRol || kerakliRol === 'mijoz' || kerakliRol === 'haydovchi';

  // Google Sign-In — Telegram'дан ташқарида ва client_id берилганда
  const googleRef = useRef(null);
  const googleKoʻrsatish = registerKoʻrsatish && googleYoqilgan() && !tgIchidami();

  // Telegram Login Widget — Telegram'дан ташқарида ва bot username берилганда
  const tgWidgetRef = useRef(null);
  const tgBot = import.meta.env.VITE_TELEGRAM_BOT?.trim() || '';
  const tgWidgetKoʻrsatish = registerKoʻrsatish && tgBot && !tgIchidami();
  useEffect(() => {
    if (!googleKoʻrsatish) return;
    let bekor = false;
    googleTayyor().then((ok) => {
      if (!ok || bekor || !googleRef.current) return;
      googleRender(googleRef.current, async (idToken) => {
        setXato(''); setYuklanmoqda(true);
        try {
          const { data } = await api.post('/auth/google', { idToken, rol: kerakliRol || 'mijoz' });
          if (kerakliRol && data.user.rol !== kerakliRol) {
            const rolMatni = kerakliRol === 'haydovchi' ? t('home.driver') : t('home.passenger');
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
      });
    });
    return () => { bekor = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Telegram Login Widget — глобал callback + script инжекция
  useEffect(() => {
    if (!tgWidgetKoʻrsatish || !tgWidgetRef.current) return;
    // Глобал callback — widget script шуни чақиради
    window.onTelegramAuth = async (auth) => {
      setXato(''); setYuklanmoqda(true);
      try {
        const { data } = await api.post('/auth/telegram-widget', { auth, rol: kerakliRol || 'mijoz' });
        if (kerakliRol && data.user.rol !== kerakliRol) {
          const rolMatni = kerakliRol === 'haydovchi' ? t('home.driver') : t('home.passenger');
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
    // Widget script — botFather'да /setdomain қилинган домейнда ишлайди
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://telegram.org/js/telegram-widget.js?22';
    s.setAttribute('data-telegram-login', tgBot);
    s.setAttribute('data-size', 'large');
    s.setAttribute('data-onauth', 'onTelegramAuth(user)');
    s.setAttribute('data-request-access', 'write');
    s.setAttribute('data-radius', '12');
    tgWidgetRef.current.appendChild(s);
    return () => {
      try { tgWidgetRef.current?.removeChild(s); } catch {}
      delete window.onTelegramAuth;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const yubor = async (e) => {
    e.preventDefault();
    setXato('');
    // Телефон валидацияси — E.164 шакли, либфонрумbер бўйича
    if (!telefon || !isValidPhoneNumber(String(telefon))) {
      setXato(t('login.phoneInvalid'));
      return;
    }
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
      <div style={st.topbar}><SozlamalarTugma /></div>

      <form style={st.karta} className="slide-up" onSubmit={yubor}>
        <img src="/logo.png" alt="Manzil" style={st.logoBadge} />
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
            <PhoneInput
              international
              defaultCountry="UZ"
              countryCallingCodeEditable={false}
              labels={telLabels}
              placeholder={t('login.phone')}
              value={telefon}
              onChange={(v) => setTelefon(v || '')}
              autoComplete="tel"
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

        {(googleKoʻrsatish || tgWidgetKoʻrsatish) && (
          <div style={st.ajratgich}><span style={st.ajratgichMatn}>{t('login.or')}</span></div>
        )}
        {googleKoʻrsatish && <div ref={googleRef} style={st.googleWrap} />}
        {tgWidgetKoʻrsatish && <div ref={tgWidgetRef} style={st.tgWidgetWrap} />}
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
    boxShadow: 'var(--shadow-sariq)',
    objectFit: 'cover', display: 'block',
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
    color: 'var(--on-tint)', padding: 15, borderRadius: 'var(--r-lg)',
    fontWeight: 600, fontSize: 17,
    marginTop: 'var(--space-2)',
  },
  almashtir: {
    background: 'transparent', padding: 10,
    color: 'var(--tint)', fontSize: 15, fontWeight: 400, marginTop: 2,
  },
  ajratgich: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--tertiary-label)', fontSize: 13, margin: '6px 0',
  },
  ajratgichMatn: { padding: '0 10px' },
  googleWrap: { display: 'flex', justifyContent: 'center', minHeight: 44 },
  tgWidgetWrap: { display: 'flex', justifyContent: 'center', minHeight: 44, marginTop: 8 },
};
