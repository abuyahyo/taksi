// Даромад солиштируви — ҳайдовчига комиссиясизликни кўрсатади.
// Рақобатчи номи зикр қилинмайди; "тахминий комиссия" слайдери — ҳайдовчи
// ўзи % танлайди, биз аниқ рақам даъво қилмаймиз.
import { useState } from 'react';
import { useT } from '../i18n';
import Ikonka from './Ikonka';

export default function DaromadSolishtiruv({ daromad = 0 }) {
  const { t } = useT();
  const [pct, setPct] = useState(15);
  const yoqotish = Math.round((Number(daromad) || 0) * pct / 100);

  return (
    <div style={st.karta}>
      <div style={st.bosh}>
        <span style={st.belgi}>0%</span>
        <span style={st.sarlavha}>{t('drv.commTitle')}</span>
      </div>

      <div style={st.daromad}>{(Number(daromad) || 0).toLocaleString()} <span style={st.som}>{t('wait.sum')}</span></div>
      <div style={st.izoh}>{t('drv.commKept')}</div>

      <div style={st.sliderQator}>
        <span style={st.sliderLabel}>{t('drv.commSlider')}: <b>{pct}%</b></span>
        <input
          type="range" min="5" max="30" step="1" value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          style={st.slider}
          aria-label={t('drv.commSlider')}
        />
      </div>

      <div style={st.yoqotish}>
        <Ikonka nom="alert" size={14} /> {t('drv.commLost')}: <b>~{yoqotish.toLocaleString()}</b>
      </div>
      <div style={st.note}>{t('drv.commNote')}</div>
    </div>
  );
}

const st = {
  karta: { margin: '0 16px 16px', padding: 16, background: 'var(--surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-1)' },
  bosh: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  belgi: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 40, height: 28, padding: '0 8px', borderRadius: 'var(--r-full)', background: 'var(--tint)', color: '#fff', fontWeight: 700, fontSize: 15 },
  sarlavha: { fontSize: 16, fontWeight: 600, color: 'var(--label)' },
  daromad: { fontSize: 28, fontWeight: 700, color: 'var(--tint)', letterSpacing: '0.3px' },
  som: { fontSize: 15, fontWeight: 400, color: 'var(--secondary-label)' },
  izoh: { fontSize: 13, color: 'var(--secondary-label)', marginBottom: 14 },
  sliderQator: { marginBottom: 10 },
  sliderLabel: { fontSize: 14, color: 'var(--label)' },
  slider: { width: '100%', marginTop: 8, accentColor: 'var(--tint)' },
  yoqotish: { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,149,0,0.14)', color: 'var(--amber)', padding: '10px 12px', borderRadius: 'var(--r-md)', fontSize: 14, fontWeight: 500 },
  note: { fontSize: 12, color: 'var(--secondary-label)', marginTop: 8, textAlign: 'center' },
};
