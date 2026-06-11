// Кичик i18n кутубхонаси — Provider + t() + til свитчер
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import uz from './uz';
import uzLatn from './uz-latn';
import ru from './ru';
import en from './en';
import Ikonka from '../components/Ikonka';

const TILLAR = { uz, 'uz-latn': uzLatn, ru, en };
const I18nCtx = createContext(null);

function brauserTil() {
  if (typeof navigator === 'undefined') return 'uz';
  const l = (navigator.language || '').toLowerCase();
  if (l.startsWith('ru')) return 'ru';
  if (l.startsWith('en')) return 'en';
  // uz-latn brauzer тилидан осон аниқлаб бўлмайди, шунинг учун дефолт uz (кирилл)
  return 'uz';
}

export function I18nProvider({ children }) {
  const [til, setTilState] = useState(() => {
    try {
      const saqlangan = localStorage.getItem('til');
      if (saqlangan && TILLAR[saqlangan]) return saqlangan;
    } catch {/* private mode — localStorage йўқ, тинч */}
    return brauserTil();
  });

  const setTil = (yangi) => {
    if (!TILLAR[yangi]) return;
    setTilState(yangi);
    try { localStorage.setItem('til', yangi); } catch {/* private mode — тинч */}
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

// Hook'ни алоҳида файлга кўчириш барча import'ларни бузарди — Fast Refresh
// фақат HMR грануларлигига таъсир қилади, runtime'га эмас.
// eslint-disable-next-line react-refresh/only-export-components
export function useT() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error('useT must be used inside <I18nProvider>');
  return ctx;
}

// Тил тугмаси — глобус ва жорий тил қисқартмаси, босилганда поповер ичида 4 та танлов.
// eslint-disable-next-line react-refresh/only-export-components
export const TILLAR_RUYXAT = [
  ['uz',      'Кир',  'Ўзбек (кирилл)'],
  ['uz-latn', 'Lat',  'Oʻzbek (lotin)'],
  ['ru',      'Рус',  'Русский'],
  ['en',      'EN',   'English'],
];

export function TilTanlovchi({ style }) {
  const { til, setTil } = useT();
  const [ochiq, setOchiq] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ochiq) return;
    const tashqari = (e) => { if (ref.current && !ref.current.contains(e.target)) setOchiq(false); };
    const escBosildi = (e) => { if (e.key === 'Escape') setOchiq(false); };
    document.addEventListener('mousedown', tashqari);
    document.addEventListener('keydown', escBosildi);
    return () => {
      document.removeEventListener('mousedown', tashqari);
      document.removeEventListener('keydown', escBosildi);
    };
  }, [ochiq]);

  const joriy = TILLAR_RUYXAT.find(([k]) => k === til) || TILLAR_RUYXAT[0];

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <button
        type="button"
        onClick={() => setOchiq((v) => !v)}
        aria-label="Til"
        aria-haspopup="menu"
        aria-expanded={ochiq}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          height: 32, padding: '0 10px', borderRadius: 999,
          background: 'var(--fill)', color: 'var(--label)',
          fontSize: 13, fontWeight: 600, lineHeight: 1,
        }}
      >
        <Ikonka nom="globe" size={14} />
        <span>{joriy[1]}</span>
      </button>

      {ochiq && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0,
            minWidth: 168, padding: 4, zIndex: 4000,
            background: 'var(--surface-elevated)',
            borderRadius: 'var(--r-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18), 0 0 0 0.5px var(--separator)',
          }}
        >
          {TILLAR_RUYXAT.map(([k, , toliq]) => {
            const tanlangan = til === k;
            return (
              <button
                key={k}
                type="button"
                role="menuitemradio"
                aria-checked={tanlangan}
                onClick={() => { setTil(k); setOchiq(false); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '10px 12px', borderRadius: 'var(--r-sm)',
                  background: tanlangan ? 'var(--tint-fill)' : 'transparent',
                  color: tanlangan ? 'var(--tint)' : 'var(--label)',
                  fontSize: 14, fontWeight: tanlangan ? 600 : 500,
                  textAlign: 'left',
                }}
              >
                <span>{toliq}</span>
                {tanlangan && <Ikonka nom="check" size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
