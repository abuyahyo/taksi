// Бошланғич саҳифа — рол танлаш (премиум кўриниш)
import { useNavigate } from 'react-router-dom';
import { useT, TilTanlovchi } from '../i18n';
import { TemaTanlovchi } from '../theme';

export default function KirishSahifa() {
  const navigate = useNavigate();
  const { t } = useT();

  return (
    <div style={st.sahifa} className="fon-blobs">
      {/* Юқори ўнг — мавзу ва тил */}
      <div style={st.topbar}><TemaTanlovchi /><TilTanlovchi /></div>

      {/* Hero */}
      <div style={st.hero} className="fade-in">
        <div style={st.logoBadge}>🚕</div>
        <h1 style={st.appName}>{t('common.app')}</h1>
        <p style={st.tagline}>{t('home.tagline')}</p>
        <div style={st.cityChip} className="glass">📍 {t('home.city')}</div>
      </div>

      {/* Икки рол картаси */}
      <div style={st.kartalar} className="slide-up">
        <button style={st.passengerCard} onClick={() => navigate('/yolovchi')}>
          <span style={st.ikonOq}>🧍</span>
          <div style={st.kartaIchi}>
            <div style={st.kartaSarlavha}>{t('home.passenger')}</div>
            <div style={st.kartaIzohOq}>{t('home.passengerSub')}</div>
          </div>
          <span style={st.strelkaOq}>→</span>
        </button>

        <button style={st.driverCard} onClick={() => navigate('/haydovchi')}>
          <span style={st.ikonTint}>🚗</span>
          <div style={st.kartaIchi}>
            <div style={st.kartaSarlavhaQora}>{t('home.driver')}</div>
            <div style={st.kartaIzoh}>{t('home.driverSub')}</div>
          </div>
          <span style={st.strelka}>→</span>
        </button>
      </div>

      {/* Бизнинг устунликлар */}
      <div style={st.featKarta} className="glass fade-in">
        <div style={st.featRow}>
          <span style={st.featIkon}>💸</span>
          <span style={st.featMatn}>{t('home.featPrice')}</span>
        </div>
        <div style={st.featRow}>
          <span style={st.featIkon}>🛡️</span>
          <span style={st.featMatn}>{t('home.featSafe')}</span>
        </div>
        <div style={st.featRow}>
          <span style={st.featIkon}>🧾</span>
          <span style={st.featMatn}>{t('home.featFair')}</span>
        </div>
      </div>

      <div style={st.footer}>made with 🚕 in Toshkent</div>
    </div>
  );
}

const KARTA = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
  padding: 'var(--space-5)', borderRadius: 'var(--r-xl)',
  width: '100%', textAlign: 'left',
  transition: 'transform var(--t-med), box-shadow var(--t-med)',
};
const IKON = {
  width: 52, height: 52, borderRadius: 'var(--r-full)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 26, flexShrink: 0,
};

const st = {
  sahifa: {
    position: 'relative',
    width: '100%', maxWidth: 480, margin: '0 auto',
    minHeight: '100dvh',
    display: 'flex', flexDirection: 'column',
    padding: 'calc(var(--space-6) + env(safe-area-inset-top)) var(--space-5) calc(var(--space-6) + env(safe-area-inset-bottom))',
    overflow: 'hidden',
  },
  topbar: {
    position: 'absolute',
    top: 'calc(var(--space-4) + env(safe-area-inset-top))', right: 'var(--space-5)',
    zIndex: 10, display: 'flex', alignItems: 'center', gap: 6,
  },

  hero: {
    flex: 1,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    gap: 'var(--space-2)',
    paddingTop: 'var(--space-9)', paddingBottom: 'var(--space-6)',
    minHeight: 260,
  },
  logoBadge: {
    width: 84, height: 84, borderRadius: 'var(--r-2xl)',
    background: 'linear-gradient(135deg, var(--sariq-light), var(--sariq))',
    boxShadow: 'var(--shadow-sariq)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 46, marginBottom: 'var(--space-3)',
  },
  appName: { fontSize: 38, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--qora)' },
  tagline: { fontSize: 15.5, fontWeight: 600, color: 'var(--qora-faint)', maxWidth: 280 },
  cityChip: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 12.5, fontWeight: 700, color: 'var(--qora-soft)',
    padding: '5px 12px', borderRadius: 'var(--r-full)', marginTop: 'var(--space-2)',
  },

  kartalar: { display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' },

  passengerCard: {
    ...KARTA,
    background: 'linear-gradient(135deg, var(--sariq-light), var(--sariq))',
    color: '#fff', boxShadow: 'var(--shadow-sariq)',
  },
  driverCard: {
    ...KARTA,
    background: 'var(--oq)', color: 'var(--qora)',
    border: '1px solid var(--neutral-200)', boxShadow: 'var(--shadow-2)',
  },
  ikonOq:   { ...IKON, background: 'rgba(255,255,255,0.22)' },
  ikonTint: { ...IKON, background: 'rgba(14,147,132,0.12)' },

  kartaIchi: { flex: 1, minWidth: 0 },
  kartaSarlavha:     { fontSize: 18.5, fontWeight: 800, letterSpacing: '-0.01em' },
  kartaSarlavhaQora: { fontSize: 18.5, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--qora)' },
  kartaIzohOq: { fontSize: 13, marginTop: 2, fontWeight: 500, color: 'rgba(255,255,255,0.85)' },
  kartaIzoh:   { fontSize: 13, marginTop: 2, fontWeight: 500, color: 'var(--kulrang)' },
  strelkaOq: { fontSize: 20, fontWeight: 700, color: '#fff', opacity: 0.7 },
  strelka:   { fontSize: 20, fontWeight: 700, color: 'var(--kulrang)', opacity: 0.8 },

  featKarta: {
    marginTop: 'var(--space-5)',
    padding: 'var(--space-4)', borderRadius: 'var(--r-lg)',
    display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
  },
  featRow: { display: 'flex', alignItems: 'center', gap: 'var(--space-3)' },
  featIkon: {
    width: 34, height: 34, borderRadius: 'var(--r-md)',
    background: 'rgba(14,147,132,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 17, flexShrink: 0,
  },
  featMatn: { fontSize: 13.5, fontWeight: 600, color: 'var(--qora-soft)', lineHeight: 1.35 },

  footer: {
    marginTop: 'var(--space-5)', textAlign: 'center',
    fontSize: 11, color: 'var(--neutral-400)',
  },
};
