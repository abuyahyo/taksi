// Сoзламалар тугмаси — gear иконка, босилганда поповер ичида тема + тил.
// Header'даги жойни тoзалaш учун (аввал тема ва тил тугмалари алоҳида турарди).
import { useEffect, useRef, useState } from 'react';
import { useT, TILLAR_RUYXAT } from '../i18n';
import { useTema } from '../theme';
import Ikonka from './Ikonka';

export default function SozlamalarTugma({ style }) {
  const { t, til, setTil } = useT();
  const { tema, setTema } = useTema();
  const [ochiq, setOchiq] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ochiq) return;
    const tashqari = (e) => { if (ref.current && !ref.current.contains(e.target)) setOchiq(false); };
    const esc = (e) => { if (e.key === 'Escape') setOchiq(false); };
    document.addEventListener('mousedown', tashqari);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', tashqari);
      document.removeEventListener('keydown', esc);
    };
  }, [ochiq]);

  const temalar = [
    ['light', t('theme.light'), 'sun'],
    ['dark',  t('theme.dark'),  'moon'],
  ];

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <button
        type="button"
        onClick={() => setOchiq((v) => !v)}
        aria-label={t('akkaunt.settings')}
        title={t('akkaunt.settings')}
        aria-haspopup="menu"
        aria-expanded={ochiq}
        style={st.tugma}
      >
        <Ikonka nom="settings" size={18} />
      </button>

      {ochiq && (
        <div role="menu" style={st.popover}>
          {/* Кўриниш */}
          <div style={st.sarlavha}>{t('akkaunt.theme')}</div>
          {temalar.map(([k, label, ikon]) => {
            const tanlangan = tema === k;
            return (
              <button
                key={k}
                type="button"
                role="menuitemradio"
                aria-checked={tanlangan}
                onClick={() => setTema(k)}
                style={{
                  ...st.qator,
                  background: tanlangan ? 'var(--tint-fill)' : 'transparent',
                  color: tanlangan ? 'var(--tint)' : 'var(--label)',
                  fontWeight: tanlangan ? 600 : 500,
                }}
              >
                <span style={st.qatorIkon}><Ikonka nom={ikon} size={14} /></span>
                <span style={st.qatorMatn}>{label}</span>
                {tanlangan && <Ikonka nom="check" size={14} />}
              </button>
            );
          })}

          <div style={st.ajratgich} />

          {/* Тил */}
          <div style={st.sarlavha}>{t('akkaunt.lang')}</div>
          {TILLAR_RUYXAT.map(([k, _q, toliq]) => {
            const tanlangan = til === k;
            return (
              <button
                key={k}
                type="button"
                role="menuitemradio"
                aria-checked={tanlangan}
                onClick={() => { setTil(k); }}
                style={{
                  ...st.qator,
                  background: tanlangan ? 'var(--tint-fill)' : 'transparent',
                  color: tanlangan ? 'var(--tint)' : 'var(--label)',
                  fontWeight: tanlangan ? 600 : 500,
                }}
              >
                <span style={st.qatorMatn}>{toliq}</span>
                {tanlangan && <Ikonka nom="check" size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const st = {
  tugma: {
    width: 34, height: 34,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 'var(--r-full)',
    background: 'var(--fill)', color: 'var(--label)',
  },
  popover: {
    position: 'absolute', top: 'calc(100% + 6px)', right: 0,
    minWidth: 200, padding: 4, zIndex: 4000,
    background: 'var(--surface-elevated)',
    borderRadius: 'var(--r-md)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.18), 0 0 0 0.5px var(--separator)',
  },
  sarlavha: {
    padding: '8px 12px 4px',
    fontSize: 11, fontWeight: 600,
    color: 'var(--secondary-label)',
    textTransform: 'uppercase', letterSpacing: '0.4px',
  },
  qator: {
    display: 'flex', alignItems: 'center',
    gap: 8, width: '100%',
    padding: '10px 12px', borderRadius: 'var(--r-sm)',
    fontSize: 14, textAlign: 'left',
  },
  qatorIkon: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 22, height: 22, flexShrink: 0,
  },
  qatorMatn: { flex: 1, minWidth: 0 },
  ajratgich: { height: 1, background: 'var(--separator)', margin: '6px 0' },
};
