// Глобал toast системa — alert() ўрнига
import { createContext, useCallback, useContext, useState } from 'react';

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
            style={{ ...st.toast, ...st[t.tur] }}
            onClick={() => yopish(t.id)}
            role="status"
          >
            <span style={st.ikon}>{ikonkasi(t.tur)}</span>
            <span style={st.matn}>{t.matn}</span>
            <span style={st.yopishX}>✕</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ikonkasi(tur) {
  if (tur === 'success') return '✅';
  if (tur === 'error')   return '⚠️';
  if (tur === 'warning') return '⏱';
  return 'ℹ️';
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
    padding: '12px 14px', borderRadius: 'var(--r-lg)',
    boxShadow: 'var(--shadow-3)',
    fontSize: 14, fontWeight: 600,
    animation: 'slideUp 220ms cubic-bezier(0.4,0,0.2,1)',
    cursor: 'pointer',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  ikon: { fontSize: 16, flexShrink: 0 },
  matn:  { flex: 1, lineHeight: 1.35 },
  yopishX: { fontSize: 11, opacity: 0.55, marginLeft: 6 },
  success: { background: '#DCFCE7', color: '#14532D' },
  error:   { background: '#FEE2E2', color: '#7F1D1D' },
  warning: { background: '#FEF3C7', color: '#7C2D12' },
  info:    { background: '#DBEAFE', color: '#1E3A8A' },
};
