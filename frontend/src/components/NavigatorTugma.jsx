// "Навигаторда очиш" — ҳайдовчи сафар йўлини Yandex ёки Google картада кузатади.
// Муҳим: бу — оддий deep link (URL), Google Maps JS API эмас. Billing/калит керак эмас,
// бепул. Мобилда https универсал линклар иловани очади, десктопда веб версия.
import { useState } from 'react';
import Ikonka from './Ikonka';
import { useT } from '../i18n';
import { tebrat, TEBRANISH } from '../services/haptika';

// Yandex Maps — жорий жойдан (~) кўрсатилган нуқтагача авто йўли
const yandexUrl = (lat, lng) => `https://yandex.com/maps/?rtext=~${lat},${lng}&rtt=auto`;
// Google Maps — манзилгача авто навигация (origin жорий жой)
const googleUrl = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

export default function NavigatorTugma({ koord, manzil }) {
  const { t } = useT();
  const [ochiq, setOchiq] = useState(false);
  if (!Array.isArray(koord) || koord.length !== 2) return null;
  const [lat, lng] = koord;

  const och = (url) => {
    tebrat(TEBRANISH.yengil);
    window.open(url, '_blank', 'noopener,noreferrer');
    setOchiq(false);
  };

  return (
    <>
      <button style={st.tugma} onClick={() => { tebrat(TEBRANISH.yengil); setOchiq(true); }}>
        <Ikonka nom="navigation" size={18} /> {t('nav.openInApp')}
      </button>

      {ochiq && (
        <div style={st.fon} onClick={() => setOchiq(false)}>
          <div style={st.list} onClick={(e) => e.stopPropagation()}>
            <div style={st.grabber} />
            <h3 style={st.sarlavha}>{t('nav.chooseApp')}</h3>
            {manzil && <p style={st.manzil}>{manzil}</p>}
            <button style={st.qator} onClick={() => och(yandexUrl(lat, lng))}>
              <Ikonka nom="navigation" size={20} /> {t('nav.yandex')}
            </button>
            <button style={st.qator} onClick={() => och(googleUrl(lat, lng))}>
              <Ikonka nom="pin" size={20} /> {t('nav.google')}
            </button>
            <button style={st.bekor} onClick={() => setOchiq(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}
    </>
  );
}

const st = {
  tugma: { width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--ink)', color: 'var(--on-tint)', padding: 13, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 15, marginTop: 10 },
  fon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' },
  list: { background: 'var(--surface-elevated)', width: '100%', maxWidth: 480, borderRadius: '14px 14px 0 0', padding: '8px 20px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' },
  grabber: { width: 36, height: 5, borderRadius: 3, background: 'var(--fill-strong)', margin: '0 auto 14px' },
  sarlavha: { fontSize: 20, fontWeight: 600, marginBottom: 4 },
  manzil: { fontSize: 14, color: 'var(--secondary-label)', marginBottom: 16 },
  qator: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--fill)', color: 'var(--label)', padding: 15, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 16, marginBottom: 10 },
  bekor: { width: '100%', background: 'transparent', padding: 12, color: 'var(--tint)', fontSize: 17, fontWeight: 400, marginTop: 4 },
};
