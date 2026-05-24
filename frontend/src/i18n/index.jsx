// Кичик i18n кутубхонаси — Provider + t() + til свитчер
import { createContext, useContext, useEffect, useState } from 'react';
import uz from './uz';
import ru from './ru';

const TILLAR = { uz, ru };
const I18nCtx = createContext(null);

function brauserTil() {
  if (typeof navigator === 'undefined') return 'uz';
  const l = (navigator.language || '').toLowerCase();
  if (l.startsWith('ru')) return 'ru';
  return 'uz';
}

export function I18nProvider({ children }) {
  const [til, setTilState] = useState(() => {
    try {
      const saqlangan = localStorage.getItem('til');
      if (saqlangan && TILLAR[saqlangan]) return saqlangan;
    } catch {}
    return brauserTil();
  });

  const setTil = (yangi) => {
    if (!TILLAR[yangi]) return;
    setTilState(yangi);
    try { localStorage.setItem('til', yangi); } catch {}
    if (typeof document !== 'undefined') document.documentElement.lang = yangi;
  };

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = til;
  }, [til]);

  const t = (kalit, ozgaruvchilar) => {
    const lugat = TILLAR[til] || TILLAR.uz;
    let matn = lugat[kalit] ?? TILLAR.uz[kalit] ?? kalit;
    if (ozgaruvchilar) {
      Object.entries(ozgaruvchilar).forEach(([k, v]) => {
        matn = matn.split(`{${k}}`).join(String(v));
      });
    }
    return matn;
  };

  return <I18nCtx.Provider value={{ til, setTil, t }}>{children}</I18nCtx.Provider>;
}

export function useT() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error('useT must be used inside <I18nProvider>');
  return ctx;
}

// Кичик "UZ ⇄ RU" свитчер
export function TilTanlovchi({ style }) {
  const { til, setTil } = useT();
  const ulanish = (k) => ({
    background: til === k ? 'var(--qora)' : 'transparent',
    color: til === k ? 'var(--oq)' : 'var(--qora)',
    padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
    border: '1px solid #E5E7EB',
  });
  return (
    <div style={{ display: 'inline-flex', gap: 4, background: 'var(--oq)', padding: 3, borderRadius: 10, ...style }}>
      <button style={ulanish('uz')} onClick={() => setTil('uz')}>UZ</button>
      <button style={ulanish('ru')} onClick={() => setTil('ru')}>RU</button>
    </div>
  );
}
