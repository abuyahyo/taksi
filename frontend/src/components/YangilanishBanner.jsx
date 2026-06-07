// PWA: янги версия тайёр бўлганда — кичик баннер кўрсатамиз
import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useT } from '../i18n';
import Ikonka from './Ikonka';

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
    <div style={st.banner} className="glass">
      <span style={st.matn}>{t('pwa.newVersion')}</span>
      <button
        style={st.tugma}
        onClick={() => updateServiceWorker(true)}
      >{t('pwa.update')}</button>
      <button
        style={st.yopish}
        onClick={() => { setKoʻrinmoqda(false); setYangilanishKerak(false); }}
        aria-label="close"
      ><Ikonka nom="x" size={15} /></button>
    </div>
  );
}

const st = {
  banner: {
    position: 'fixed', bottom: 16, left: 16, right: 16,
    color: 'var(--label)',
    padding: '12px 12px 12px 16px', borderRadius: 'var(--r-xl)',
    display: 'flex', alignItems: 'center', gap: 10,
    zIndex: 5000, boxShadow: 'var(--shadow-3)',
    maxWidth: 460, margin: '0 auto',
  },
  matn: { flex: 1, fontSize: 15, fontWeight: 500 },
  tugma: { background: 'var(--ink)', color: 'var(--on-tint)', padding: '8px 16px', borderRadius: 'var(--r-full)', fontWeight: 600, fontSize: 14 },
  yopish: { background: 'var(--fill)', color: 'var(--secondary-label)', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
};
