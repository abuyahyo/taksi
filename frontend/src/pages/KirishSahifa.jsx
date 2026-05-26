// Бошланғич саҳифа — рол танлаш (iOS услуби)
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT, TilTanlovchi } from '../i18n';
import { TemaTanlovchi } from '../theme';
import Ikonka from '../components/Ikonka';
import { tgIchidami, tgTayyorla, tgAvtoKirish } from '../services/telegram';

export default function KirishSahifa() {
  const navigate = useNavigate();
  const { t } = useT();
  // Telegram Mini App ичида бўлсак — авто-кириб, рол саҳифасига ўтамиз
  const [tgYuklanmoqda, setTgYuklanmoqda] = useState(() => tgIchidami());

  useEffect(() => {
    if (!tgIchidami()) return;
    tgTayyorla();
    let bekor = false;
    tgAvtoKirish().then((user) => {
      if (bekor) return;
      if (user) navigate(user.rol === 'haydovchi' ? '/haydovchi' : '/yolovchi', { replace: true });
      else setTgYuklanmoqda(false); // кириш бўлмади — оддий саҳифа кўрсатамиз
    });
    return () => { bekor = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (tgYuklanmoqda) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: 'var(--bg)' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={st.sahifa}>
      <div style={st.topbar}><TemaTanlovchi /><TilTanlovchi /></div>

      {/* Hero — app icon */}
      <div style={st.hero} className="fade-in">
        <img src="/logo.png" alt="Manzil" style={st.appIcon} />
        <h1 style={st.appName}>{t('common.app')}</h1>
        <p style={st.tagline}>{t('home.tagline')}</p>
      </div>

      {/* Рол танлаш — grouped рўйхат */}
      <div style={st.section}>
        <button className="ios-row" onClick={() => navigate('/yolovchi')}>
          <span style={{ ...st.tile, background: 'var(--tint)' }}><Ikonka nom="passenger" size={18} /></span>
          <span className="ios-row-label">
            <div style={st.rowTitle}>{t('home.passenger')}</div>
            <div className="ios-row-sub">{t('home.passengerSub')}</div>
          </span>
          <span className="ios-chevron"><Ikonka nom="arrow-right" size={16} /></span>
        </button>
        <button className="ios-row" onClick={() => navigate('/haydovchi')}>
          <span style={{ ...st.tile, background: '#1C1C1E' }}><Ikonka nom="car" size={18} /></span>
          <span className="ios-row-label">
            <div style={st.rowTitle}>{t('home.driver')}</div>
            <div className="ios-row-sub">{t('home.driverSub')}</div>
          </span>
          <span className="ios-chevron"><Ikonka nom="arrow-right" size={16} /></span>
        </button>
      </div>

      {/* Устунликлар */}
      <div style={st.section}>
        <div className="ios-row">
          <span style={{ ...st.tile, background: 'var(--yashil)' }}><Ikonka nom="money" size={18} /></span>
          <span className="ios-row-label" style={st.featMatn}>{t('home.featPrice')}</span>
        </div>
        <div className="ios-row">
          <span style={{ ...st.tile, background: 'var(--kok)' }}><Ikonka nom="shield" size={18} /></span>
          <span className="ios-row-label" style={st.featMatn}>{t('home.featSafe')}</span>
        </div>
        <div className="ios-row">
          <span style={{ ...st.tile, background: 'var(--amber)' }}><Ikonka nom="receipt" size={18} /></span>
          <span className="ios-row-label" style={st.featMatn}>{t('home.featFair')}</span>
        </div>
      </div>

      <div style={st.footer}>{t('common.app')} · Toshkent</div>
    </div>
  );
}

const st = {
  sahifa: {
    position: 'relative',
    width: '100%', maxWidth: 480, margin: '0 auto',
    minHeight: '100dvh',
    display: 'flex', flexDirection: 'column',
    background: 'var(--bg)',
    paddingTop: 'calc(var(--space-4) + env(safe-area-inset-top))',
    paddingBottom: 'calc(var(--space-6) + env(safe-area-inset-bottom))',
  },
  topbar: {
    position: 'absolute',
    top: 'calc(var(--space-3) + env(safe-area-inset-top))', right: 'var(--space-4)',
    zIndex: 10, display: 'flex', alignItems: 'center', gap: 8,
  },

  hero: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    gap: 4, padding: 'var(--space-9) var(--space-5) var(--space-7)',
  },
  appIcon: {
    width: 96, height: 96, borderRadius: 22,
    boxShadow: 'var(--shadow-sariq)',
    objectFit: 'cover', display: 'block',
    marginBottom: 'var(--space-4)',
  },
  appName: { fontSize: 34, fontWeight: 700, letterSpacing: '0.37px', color: 'var(--label)' },
  tagline: { fontSize: 16, fontWeight: 400, color: 'var(--secondary-label)', maxWidth: 300, lineHeight: 1.35 },

  section: {
    background: 'var(--surface)',
    borderRadius: 'var(--r-md)',
    margin: '0 16px 22px',
    overflow: 'hidden',
  },
  tile: {
    width: 30, height: 30, borderRadius: 7, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
  },
  rowTitle: { fontSize: 17, fontWeight: 600, color: 'var(--label)' },
  featMatn: { fontSize: 15, fontWeight: 400, color: 'var(--label)', lineHeight: 1.3 },

  footer: {
    marginTop: 'auto', paddingTop: 'var(--space-6)', textAlign: 'center',
    fontSize: 13, color: 'var(--tertiary-label)',
  },
};
