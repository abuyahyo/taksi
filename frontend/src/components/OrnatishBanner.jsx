// PWA install banner — beforeinstallprompt'ни ушлаб, фойдаланувчига
// "Иловани ўрнатиш" таклифи кўрсатамиз. iOS Safari beforeinstallprompt'ни
// қўлламайди (банер кўрсатилмайди — нормал). Standalone режимда ишлаётганлар
// ёки яқинда "X" билан ёпган фойдаланувчиларга кўрсатилмайди.
import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
import Ikonka from './Ikonka';

const DISMISS_KEY = 'manzil_install_dismissed_at';
const DISMISS_TTL = 14 * 24 * 60 * 60 * 1000; // 14 кун

function standaloneMi() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function yaqindaYopildimi() {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return t && (Date.now() - t < DISMISS_TTL);
  } catch { return false; }
}

export default function OrnatishBanner() {
  const { t } = useT();
  const [koʻrinmoqda, setKoʻrinmoqda] = useState(false);
  const promptRef = useRef(null);

  useEffect(() => {
    const yopildi = yaqindaYopildimi();
    if (standaloneMi() || yopildi) return;

    const tutib = (e) => {
      e.preventDefault();
      promptRef.current = e;
      setKoʻrinmoqda(true);
    };
    const ornatildi = () => {
      promptRef.current = null;
      setKoʻrinmoqda(false);
    };
    window.addEventListener('beforeinstallprompt', tutib);
    window.addEventListener('appinstalled', ornatildi);
    return () => {
      window.removeEventListener('beforeinstallprompt', tutib);
      window.removeEventListener('appinstalled', ornatildi);
    };
  }, []);

  const ornat = async () => {
    if (!promptRef.current) { setKoʻrinmoqda(false); return; }
    setKoʻrinmoqda(false);
    try {
      promptRef.current.prompt();
      await promptRef.current.userChoice;
    } catch {/* foydalanuvchi bekor qildi — tinch */}
    promptRef.current = null;
  };

  const yop = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {/* private mode — тинч */}
    setKoʻrinmoqda(false);
  };

  if (!koʻrinmoqda) return null;

  return (
    <div style={st.banner} className="slide-up">
      <img src="/icon-192.png" alt="" style={st.ikon} />
      <div style={st.matnWrap}>
        <div style={st.sarlavha}>{t('install.title')}</div>
        <div style={st.izoh}>{t('install.body')}</div>
      </div>
      <button style={st.tugma} onClick={ornat}>{t('install.action')}</button>
      <button style={st.yopish} onClick={yop} aria-label={t('common.close')}><Ikonka nom="x" size={14} /></button>
    </div>
  );
}

const st = {
  banner: {
    // Pastki nav (~62px) ustiga жойлашади — content'ни ёпиб қўймайди
    position: 'fixed', bottom: 'calc(76px + env(safe-area-inset-bottom))',
    left: 16, right: 16, maxWidth: 460, margin: '0 auto',
    background: 'var(--surface-elevated)', color: 'var(--label)',
    padding: 12, borderRadius: 'var(--r-xl)',
    display: 'flex', alignItems: 'center', gap: 12,
    zIndex: 1200, boxShadow: '0 12px 32px rgba(0,0,0,0.18), 0 0 0 0.5px var(--separator)',
  },
  ikon: { width: 44, height: 44, borderRadius: 10, flexShrink: 0, objectFit: 'cover' },
  matnWrap: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  sarlavha: { fontSize: 15, fontWeight: 600, color: 'var(--label)' },
  izoh: { fontSize: 12, color: 'var(--secondary-label)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis' },
  tugma: { background: 'var(--tint)', color: 'var(--on-tint)', padding: '8px 14px', borderRadius: 'var(--r-full)', fontWeight: 600, fontSize: 13, flexShrink: 0 },
  yopish: { background: 'var(--fill)', color: 'var(--secondary-label)', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
};
