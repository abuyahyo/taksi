// Бошланғич саҳифа — рол танлаш
import { useNavigate } from 'react-router-dom';
import { useT, TilTanlovchi } from '../i18n';

export default function KirishSahifa() {
  const navigate = useNavigate();
  const { t } = useT();

  return (
    <div style={st.sahifa}>
      {/* Юқорида тил свитчер */}
      <div style={st.tilSwitcher}><TilTanlovchi /></div>

      {/* Hero бўлим — баланд */}
      <div style={st.hero} className="fade-in">
        <div style={st.logoQutisi}>
          <span style={st.logo}>🚕</span>
        </div>
        <h1 style={st.sarlavha}>{t('common.app')}</h1>
        <p style={st.izoh}>{t('home.tagline')}</p>
      </div>

      {/* Икки катта тугма */}
      <div style={st.tugmalar} className="slide-up">
        <button style={st.yolovchi} onClick={() => navigate('/yolovchi')}>
          <span style={st.ikon}>🧍</span>
          <div style={st.tugmaIchi}>
            <div style={st.tugmaSarlavha}>{t('home.passenger')}</div>
            <div style={st.tugmaIzoh}>{t('home.passengerSub')}</div>
          </div>
          <span style={st.strelka}>→</span>
        </button>

        <button style={st.haydovchi} onClick={() => navigate('/haydovchi')}>
          <span style={st.ikon}>🚗</span>
          <div style={st.tugmaIchi}>
            <div style={{ ...st.tugmaSarlavha, color: 'var(--oq)' }}>{t('home.driver')}</div>
            <div style={{ ...st.tugmaIzoh, color: 'rgba(255,255,255,.7)' }}>{t('home.driverSub')}</div>
          </div>
          <span style={{ ...st.strelka, color: 'var(--oq)' }}>→</span>
        </button>
      </div>

      {/* Бизнинг устунлик — Шаффоф адолат */}
      <div style={st.afzallik} className="fade-in">
        <div style={st.afzKarta}>
          <div style={st.afzIkon}>🌟</div>
          <div style={st.afzMatn}>
            <div style={st.afzSarlavha}>{t('home.uniqueTitle')}</div>
            <div style={st.afzIzoh}>{t('home.uniqueHint')}</div>
          </div>
        </div>
      </div>

      <div style={st.footer}>made with 🚕 in Toshkent</div>
    </div>
  );
}

const st = {
  sahifa: {
    position: 'relative',
    width: '100vw', maxWidth: 480,
    margin: '0 auto',
    minHeight: '100vh',
    display: 'flex', flexDirection: 'column',
    padding: 'var(--space-6) var(--space-5)',
    background: 'var(--sariq-surface)',
    overflow: 'hidden',
  },
  tilSwitcher: { position: 'absolute', top: 'var(--space-4)', right: 'var(--space-5)', zIndex: 10 },

  hero: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    paddingBottom: 'var(--space-7)',
    minHeight: 280,
  },
  logoQutisi: {
    width: 96, height: 96,
    borderRadius: 'var(--r-2xl)',
    background: 'var(--sariq)',
    boxShadow: 'var(--shadow-sariq)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 'var(--space-5)',
  },
  logo: { fontSize: 56, lineHeight: 1 },
  sarlavha: { fontSize: 40, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--qora)' },
  izoh: {
    fontSize: 16, color: 'var(--qora-faint)',
    marginTop: 'var(--space-2)', fontWeight: 500,
  },

  tugmalar: { display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' },

  yolovchi: {
    display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
    background: 'var(--sariq)', color: 'var(--qora)',
    padding: 'var(--space-5)', borderRadius: 'var(--r-xl)',
    textAlign: 'left', width: '100%',
    boxShadow: 'var(--shadow-sariq)',
    transition: 'transform var(--t-med), box-shadow var(--t-med)',
  },
  haydovchi: {
    display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
    background: 'var(--qora)', color: 'var(--oq)',
    padding: 'var(--space-5)', borderRadius: 'var(--r-xl)',
    textAlign: 'left', width: '100%',
    boxShadow: 'var(--shadow-3)',
    transition: 'transform var(--t-med), box-shadow var(--t-med)',
  },
  ikon: { fontSize: 36, lineHeight: 1, flexShrink: 0 },
  tugmaIchi: { flex: 1 },
  tugmaSarlavha: { fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em' },
  tugmaIzoh: { fontSize: 13, opacity: 0.72, marginTop: 2 },
  strelka: { fontSize: 22, fontWeight: 700, opacity: 0.55 },

  afzallik: { marginTop: 'var(--space-5)' },
  afzKarta: {
    display: 'flex', gap: 'var(--space-3)',
    background: 'var(--oq)',
    borderLeft: '4px solid var(--amber)',
    padding: 'var(--space-4)',
    borderRadius: 'var(--r-md)',
    boxShadow: 'var(--shadow-1)',
  },
  afzIkon: { fontSize: 22, flexShrink: 0, lineHeight: 1 },
  afzMatn: { display: 'flex', flexDirection: 'column', gap: 4 },
  afzSarlavha: { fontSize: 13, fontWeight: 800, color: 'var(--amber-dark)' },
  afzIzoh: { fontSize: 12, color: 'var(--qora-faint)', lineHeight: 1.45 },

  footer: {
    marginTop: 'var(--space-5)',
    textAlign: 'center',
    fontSize: 11,
    color: 'var(--neutral-400)',
  },
};
