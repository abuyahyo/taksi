// SOS шошилинч тугма + тасдиқ диалог
import { useState } from 'react';
import { socket } from '../services/api';
import { useT } from '../i18n';
import { useToast } from './Toast';
import Ikonka from './Ikonka';

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
        <span style={st.icon}><Ikonka nom="sos" size={kichik ? 20 : 16} /></span>
        {!kichik && <span style={st.label}>{t('sos.button')}</span>}
      </button>

      {tasdiqOchiq && (
        <div style={st.fon} onClick={() => !yuborilmoqda && setTasdiqOchiq(false)}>
          <div style={st.modal} className="glass slide-up" onClick={(e) => e.stopPropagation()}>
            <div style={st.bigIcon}><Ikonka nom="shield-alert" size={40} /></div>
            <div style={st.sarlavha}>{t('sos.confirmTitle')}</div>
            <div style={st.izoh}>{t('sos.confirmHint')}</div>

            <button
              style={{ ...st.qattiqTugma, opacity: yuborilmoqda ? 0.5 : 1 }}
              onClick={yubor}
              disabled={yuborilmoqda}
            >
              {yuborilmoqda ? t('common.wait') : t('sos.send')}
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
    background: 'var(--qizil)', color: '#fff',
    padding: '13px 16px', borderRadius: 'var(--r-lg)',
    fontWeight: 600, fontSize: 15,
  },
  kichikTugma: {
    background: 'var(--qizil)', color: '#fff',
    width: 44, height: 44, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  icon: { display: 'inline-flex' },
  label: { fontWeight: 600 },

  fon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, padding: 40, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' },
  modal: { width: '100%', maxWidth: 340, borderRadius: 'var(--r-xl)', padding: 24, textAlign: 'center' },
  bigIcon: { display: 'inline-flex', color: 'var(--qizil)', marginBottom: 10 },
  sarlavha: { fontSize: 20, fontWeight: 600, marginBottom: 8, color: 'var(--label)' },
  izoh: { fontSize: 15, color: 'var(--secondary-label)', marginBottom: 22, lineHeight: 1.4 },
  qattiqTugma: { width: '100%', background: 'var(--qizil)', color: '#fff', padding: 15, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 17, marginBottom: 8 },
  bekorTugma: { width: '100%', background: 'transparent', padding: 12, color: 'var(--tint)', fontSize: 17, fontWeight: 400 },
};
