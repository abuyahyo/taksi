// 🆘 SOS шошилинч тугма + тасдиқ диалог
import { useState } from 'react';
import { socket } from '../services/api';
import { useT } from '../i18n';
import { useToast } from './Toast';

export default function SOS({ rideId, kichik }) {
  const { t } = useT();
  const toast = useToast();
  const [tasdiqOchiq, setTasdiqOchiq] = useState(false);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  const yubor = () => {
    setYuborilmoqda(true);
    const yuborSignal = (lat, lng) => {
      socket.emit('sos_yuborildi', { rideId, lat, lng, matn: null });
      socket.once('sos_qabul_qilindi', () => {
        toast.success(t('sos.sent'), { muddat: 5000 });
        setYuborilmoqda(false);
        setTasdiqOchiq(false);
      });
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => yuborSignal(pos.coords.latitude, pos.coords.longitude),
        ()    => yuborSignal(null, null),
        { timeout: 4000, enableHighAccuracy: true }
      );
    } else {
      yuborSignal(null, null);
    }
  };

  return (
    <>
      <button
        style={kichik ? st.kichikTugma : st.tugma}
        onClick={() => setTasdiqOchiq(true)}
        aria-label="SOS"
      >
        <span style={st.icon}>🆘</span>
        {!kichik && <span style={st.label}>{t('sos.button')}</span>}
      </button>

      {tasdiqOchiq && (
        <div style={st.fon} onClick={() => !yuborilmoqda && setTasdiqOchiq(false)}>
          <div style={st.modal} className="glass slide-up" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 56, textAlign: 'center', marginBottom: 8 }}>🆘</div>
            <div style={st.sarlavha}>{t('sos.confirmTitle')}</div>
            <div style={st.izoh}>{t('sos.confirmHint')}</div>

            <button
              style={{ ...st.qattiqTugma, opacity: yuborilmoqda ? 0.5 : 1 }}
              onClick={yubor}
              disabled={yuborilmoqda}
            >
              {yuborilmoqda ? t('common.wait') : `🆘 ${t('sos.send')}`}
            </button>
            <button
              style={st.bekorTugma}
              onClick={() => setTasdiqOchiq(false)}
              disabled={yuborilmoqda}
            >{t('common.cancel')}</button>
          </div>
        </div>
      )}
    </>
  );
}

const st = {
  tugma: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    background: '#DC2626', color: '#fff',
    padding: '12px 16px', borderRadius: 'var(--r-md)',
    fontWeight: 800, fontSize: 14,
    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
  },
  kichikTugma: {
    background: '#DC2626', color: '#fff',
    width: 44, height: 44, borderRadius: '50%',
    fontSize: 18, boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 16 },
  label: { fontWeight: 800 },

  fon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, padding: 16 },
  modal: { width: '100%', maxWidth: 380, borderRadius: 20, padding: 28, textAlign: 'center' },
  sarlavha: { fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#7F1D1D' },
  izoh: { fontSize: 14, color: 'var(--qora-faint)', marginBottom: 24, lineHeight: 1.5 },
  qattiqTugma: { width: '100%', background: '#DC2626', color: '#fff', padding: 16, borderRadius: 14, fontWeight: 800, fontSize: 16, marginBottom: 10 },
  bekorTugma: { width: '100%', background: 'transparent', padding: 12, color: 'var(--kulrang)', fontSize: 14 },
};
