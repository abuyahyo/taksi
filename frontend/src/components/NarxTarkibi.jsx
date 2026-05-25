// Шаффоф нарх таркиби — фойдаланувчи нима учун шу нарх эканини кўради
import { useT } from '../i18n';

export default function NarxTarkibi({ qatorlar, jami, izoh }) {
  const { t } = useT();
  const fmt = (n) => Number(n).toLocaleString();

  return (
    <div style={st.qutisi}>
      <div style={st.sarlavha}>{t('price.breakdown')}</div>
      {qatorlar.map((q, i) => (
        <div key={i} style={st.qator}>
          <span style={st.label}>{q.label}</span>
          <span style={{ ...st.qiymat, color: q.qoshimcha ? 'var(--amber)' : 'var(--label)' }}>
            {q.qoshimcha ? '+ ' : ''}{fmt(q.qiymat)}
          </span>
        </div>
      ))}
      <div style={st.chiziq} />
      <div style={{ ...st.qator, fontWeight: 600, fontSize: 17 }}>
        <span>{t('price.total')}</span>
        <span>{fmt(jami)} {t('wait.sum')}</span>
      </div>
      {izoh && <div style={st.izoh}>{izoh}</div>}
    </div>
  );
}

const st = {
  qutisi: { background: 'var(--fill)', borderRadius: 'var(--r-md)', padding: 14, marginTop: 12, marginBottom: 4 },
  sarlavha: { fontSize: 13, fontWeight: 400, color: 'var(--secondary-label)', textTransform: 'uppercase', letterSpacing: '-0.08px', marginBottom: 10 },
  qator: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', fontSize: 15 },
  label: { color: 'var(--label)' },
  qiymat: { fontWeight: 500, fontVariantNumeric: 'tabular-nums' },
  chiziq: { height: '0.5px', background: 'var(--separator)', margin: '8px 0' },
  izoh: { fontSize: 13, color: 'var(--secondary-label)', marginTop: 8 },
};
