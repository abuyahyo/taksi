// PWA: янги версия тайёр бўлганда — кичик баннер кўрсатамиз
import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useT } from '../i18n';

export default function YangilanishBanner() {
  const { t } = useT();
  const [koʻrinmoqda, setKoʻrinmoqda] = useState(false);

  const {
    needRefresh: [yangilanishKerak, setYangilanishKerak],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Соатига бир марта серверга қараб турамиз
      if (registration) {
        setInterval(() => registration.update(), 60 * 60 * 1000);
      }
    },
  });

  useEffect(() => {
    if (yangilanishKerak) setKoʻrinmoqda(true);
  }, [yangilanishKerak]);

  if (!koʻrinmoqda) return null;

  return (
    <div style={st.banner}>
      <span style={st.matn}>🆕 {t('pwa.newVersion')}</span>
      <button
        style={st.tugma}
        onClick={() => updateServiceWorker(true)}
      >{t('pwa.update')}</button>
      <button
        style={st.yopish}
        onClick={() => { setKoʻrinmoqda(false); setYangilanishKerak(false); }}
        aria-label="close"
      >✕</button>
    </div>
  );
}

const st = {
  banner: {
    position: 'fixed', bottom: 16, left: 16, right: 16,
    background: 'var(--qora)', color: 'var(--oq)',
    padding: '12px 14px', borderRadius: 14,
    display: 'flex', alignItems: 'center', gap: 10,
    zIndex: 5000, boxShadow: '0 4px 16px rgba(0,0,0,.3)',
    maxWidth: 460, margin: '0 auto',
  },
  matn: { flex: 1, fontSize: 14 },
  tugma: { background: 'var(--sariq)', color: 'var(--qora)', padding: '8px 14px', borderRadius: 10, fontWeight: 800, fontSize: 13 },
  yopish: { background: 'transparent', color: 'var(--oq)', width: 28, height: 28, borderRadius: '50%', opacity: 0.7, fontSize: 14 },
};
