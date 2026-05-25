// Глобал toast системa — alert() ўрнига (iOS banner услуби)
import { createContext, useCallback, useContext, useState } from 'react';
import Ikonka from './Ikonka';

const ToastCtx = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toastlar, setToastlar] = useState([]);

  const koʻrsat = useCallback((matn, opts = {}) => {
    const id = nextId++;
    const tur = opts.tur || 'info';   // info | success | error | warning
    const muddat = opts.muddat ?? 3500;
    setToastlar((eski) => [...eski, { id, matn, tur }]);
    if (muddat > 0) {
      setTimeout(() => {
        setToastlar((eski) => eski.filter((t) => t.id !== id));
      }, muddat);
    }
    return id;
  }, []);

  const yopish = useCallback((id) => {
    setToastlar((eski) => eski.filter((t) => t.id !== id));
  }, []);

  const api = {
    koʻrsat,
    success: (m, o) => koʻrsat(m, { ...o, tur: 'success' }),
    error:   (m, o) => koʻrsat(m, { ...o, tur: 'error' }),
    warning: (m, o) => koʻrsat(m, { ...o, tur: 'warning' }),
    info:    (m, o) => koʻrsat(m, { ...o, tur: 'info' }),
    yopish,
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div style={st.qator} aria-live="polite">
        {toastlar.map((t) => (
          <div
            key={t.id}
            style={st.toast}
            className="glass"
            onClick={() => yopish(t.id)}
            role="status"
          >
            <span style={{ ...st.ikon, color: rangi(t.tur) }}><Ikonka nom={ikonkasi(t.tur)} size={20} /></span>
            <span style={st.matn}>{t.matn}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ikonkasi(tur) {
  if (tur === 'success') return 'check';
  if (tur === 'error')   return 'alert';
  if (tur === 'warning') return 'clock';
  return 'info';
}
function rangi(tur) {
  if (tur === 'success') return 'var(--yashil)';
  if (tur === 'error')   return 'var(--qizil)';
  if (tur === 'warning') return 'var(--amber)';
  return 'var(--kok)';
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast <ToastProvider> ичида ишлатилиши керак');
  return ctx;
}

const st = {
  qator: {
    position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
    zIndex: 6000, display: 'flex', flexDirection: 'column', gap: 8,
    width: '100%', maxWidth: 460, padding: '0 16px',
    pointerEvents: 'none',
  },
  toast: {
    pointerEvents: 'auto',
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '13px 16px', borderRadius: 'var(--r-xl)',
    boxShadow: 'var(--shadow-3)',
    fontSize: 15, fontWeight: 500,
    color: 'var(--label)',
    animation: 'slideUp 280ms var(--easing)',
    cursor: 'pointer',
  },
  ikon: { display: 'inline-flex', flexShrink: 0 },
  matn:  { flex: 1, lineHeight: 1.35 },
};
