// Мавзу (ёруғ/тунги) — localStorage 'tema' + тизим афзаллигини ҳурмат қилади
import { createContext, useContext, useEffect, useState } from 'react';
import Ikonka from './components/Ikonka';

const TemaCtx = createContext(null);

function boshlangichTema() {
  try {
    const saqlangan = localStorage.getItem('tema');
    if (saqlangan === 'dark' || saqlangan === 'light') return saqlangan;
  } catch { /* localStorage йўқ */ }
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function qoll(tema) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = tema;
  }
}

export function TemaProvider({ children }) {
  const [tema, setTemaState] = useState(boshlangichTema);

  // Биринчи рендердан олдин ҳам қўлланиши учун (FOUC камайтириш)
  useEffect(() => { qoll(tema); }, [tema]);

  const setTema = (yangi) => {
    if (yangi !== 'dark' && yangi !== 'light') return;
    setTemaState(yangi);
    qoll(yangi);
    try { localStorage.setItem('tema', yangi); } catch { /* localStorage йўқ */ }
  };

  const almashtir = () => setTema(tema === 'dark' ? 'light' : 'dark');

  return <TemaCtx.Provider value={{ tema, setTema, almashtir }}>{children}</TemaCtx.Provider>;
}

export function useTema() {
  const ctx = useContext(TemaCtx);
  if (!ctx) throw new Error('useTema must be used inside <TemaProvider>');
  return ctx;
}

// Ёруғ/тунги алмаштиргич тугмаси
export function TemaTanlovchi({ style }) {
  const { tema, almashtir } = useTema();
  const tungi = tema === 'dark';
  return (
    <button
      onClick={almashtir}
      aria-label={tungi ? 'Ёруғ режим' : 'Тунги режим'}
      title={tungi ? 'Ёруғ режим' : 'Тунги режим'}
      style={{
        width: 34, height: 34,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'var(--r-full)',
        background: 'var(--fill)', color: 'var(--label)',
        ...style,
      }}
    >
      <Ikonka nom={tungi ? 'sun' : 'moon'} size={18} />
    </button>
  );
}
