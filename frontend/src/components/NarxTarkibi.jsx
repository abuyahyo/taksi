// Шаффоф нарх таркиби — фойдаланувчи нима учун шу нарх эканини кўради
import { useT } from '../i18n';

export default function NarxTarkibi({ qatorlar, jami, izoh }) {
  const { t } = useT();
  const fmt = (n) => Number(n).toLocaleString();

  return (
    <div style={st.qutisi}>
      <div style={st.sarlavha}>🧾 {t('price.breakdown')}</div>
      {qatorlar.map((q, i) => (
        <div key={i} style={st.qator}>
          <span style={st.label}>{q.label}</span>
          <span style={{ ...st.qiymat, color: q.qoshimcha ? '#92400E' : undefined }}>
            {q.qoshimcha ? '+ ' : ''}{fmt(q.qiymat)}
          </span>
        </div>
      ))}
      <div style={st.chiziq} />
      <div style={{ ...st.qator, fontWeight: 800, fontSize: 16 }}>
        <span>{t('price.total')}</span>
        <span>{fmt(jami)} {t('wait.sum')}</span>
      </div>
      {izoh && <div style={st.izoh}>{izoh}</div>}
    </div>
  );
}

const st = {
  qutisi: { background: 'var(--och-kulrang)', borderRadius: 12, padding: 14, marginTop: 12, marginBottom: 4 },
  sarlavha: { fontSize: 13, fontWeight: 700, color: 'var(--kulrang)', marginBottom: 10 },
  qator: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 13 },
  label: { color: 'var(--qora)' },
  qiymat: { fontWeight: 600 },
  chiziq: { height: 1, background: 'var(--neutral-200)', margin: '8px 0' },
  izoh: { fontSize: 11, color: 'var(--kulrang)', marginTop: 8, fontStyle: 'italic' },
};
