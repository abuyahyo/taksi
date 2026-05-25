// Сафарни оила/дўст билан улашиш модали
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useT } from '../i18n';
import Ikonka from './Ikonka';

export default function Ulashish({ rideId, onYopish }) {
  const { t } = useT();
  const [link, setLink] = useState('');
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xato, setXato] = useState('');
  const [koʻchirildi, setKoʻchirildi] = useState(false);

  useEffect(() => {
    if (!rideId) return;
    api.post(`/rides/${rideId}/share`)
      .then(({ data }) => {
        const u = `${window.location.origin}/k/${data.kalit}`;
        setLink(u);
        setYuklanmoqda(false);
      })
      .catch((err) => { setXato(err.response?.data?.xato || t('common.error')); setYuklanmoqda(false); });
  }, [rideId]);

  const koʻchir = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setKoʻchirildi(true);
      setTimeout(() => setKoʻchirildi(false), 1500);
    } catch {/* айрим брауzерлар clipboard'ни рад этади */}
  };

  // Tashqi appga yuborish — deep links
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(t('share.tgMatn'))}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(t('share.waMatn') + '\n' + link)}`;

  return (
    <div style={st.fon} onClick={onYopish}>
      <div style={st.modal} className="glass slide-up-modal" onClick={(e) => e.stopPropagation()}>
        <div style={st.grabber} />
        <div style={st.header}>
          <div style={st.sarlavha}>{t('share.title')}</div>
          <button style={st.yopish} onClick={onYopish}><Ikonka nom="x" size={16} /></button>
        </div>

        <div style={st.izoh}>{t('share.description')}</div>

        {yuklanmoqda ? (
          <div style={st.bosh}>{t('common.loading')}</div>
        ) : xato ? (
          <div style={st.xato}>{xato}</div>
        ) : (
          <>
            <div style={st.linkQator}>
              <input style={st.linkInput} readOnly value={link} onClick={(e) => e.target.select()} />
              <button style={st.koʻchirTugma} onClick={koʻchir}>
                {koʻchirildi ? <Ikonka nom="check" size={16} /> : t('share.copy')}
              </button>
            </div>

            <div style={st.deepLinks}>
              <a href={tgUrl} target="_blank" rel="noreferrer" style={{ ...st.tashqi, background: '#229ED9' }}>
                Telegram
              </a>
              <a href={waUrl} target="_blank" rel="noreferrer" style={{ ...st.tashqi, background: '#25D366' }}>
                WhatsApp
              </a>
            </div>

            <div style={st.muddat}>{t('share.expires')}</div>
          </>
        )}

        <button style={st.bekor} onClick={onYopish}>{t('common.close')}</button>
      </div>
    </div>
  );
}

const st = {
  fon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 3700, padding: 0, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' },
  modal: { width: '100%', maxWidth: 480, borderRadius: '14px 14px 0 0', padding: '8px 20px 20px' },
  grabber: { width: 36, height: 5, borderRadius: 3, background: 'var(--fill-strong)', margin: '0 auto 12px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sarlavha: { fontSize: 20, fontWeight: 600 },
  yopish: { width: 30, height: 30, borderRadius: '50%', background: 'var(--fill)', color: 'var(--secondary-label)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  izoh: { fontSize: 15, color: 'var(--secondary-label)', marginBottom: 16, lineHeight: 1.4 },
  bosh: { textAlign: 'center', padding: 30, color: 'var(--secondary-label)' },
  xato: { color: 'var(--qizil)', padding: 14, textAlign: 'center' },
  linkQator: { display: 'flex', gap: 8, marginBottom: 14 },
  linkInput: { flex: 1, padding: 12, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--fill)', color: 'var(--label)', fontSize: 13, fontFamily: 'ui-monospace, monospace', overflow: 'hidden', textOverflow: 'ellipsis' },
  koʻchirTugma: { background: 'var(--tint)', color: '#fff', padding: '10px 16px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, minWidth: 84, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  deepLinks: { display: 'flex', gap: 10, marginBottom: 14 },
  tashqi: { flex: 1, color: '#fff', padding: 13, borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textAlign: 'center', textDecoration: 'none' },
  muddat: { fontSize: 13, color: 'var(--secondary-label)', textAlign: 'center' },
  bekor: { width: '100%', background: 'transparent', padding: 12, color: 'var(--tint)', fontSize: 17, fontWeight: 400, marginTop: 8 },
};
