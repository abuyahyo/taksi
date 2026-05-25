// Сафарни оила/дўст билан улашиш модали
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useT } from '../i18n';

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
      <div style={st.modal} className="slide-up-modal" onClick={(e) => e.stopPropagation()}>
        <div style={st.header}>
          <div style={st.sarlavha}>🆘 {t('share.title')}</div>
          <button style={st.yopish} onClick={onYopish}>✕</button>
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
                {koʻchirildi ? '✓' : t('share.copy')}
              </button>
            </div>

            <div style={st.deepLinks}>
              <a href={tgUrl} target="_blank" rel="noreferrer" style={{ ...st.tashqi, background: '#229ED9' }}>
                📨 Telegram
              </a>
              <a href={waUrl} target="_blank" rel="noreferrer" style={{ ...st.tashqi, background: '#25D366' }}>
                💬 WhatsApp
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
  fon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 3700, padding: 0 },
  modal: { background: 'var(--oq)', width: '100%', maxWidth: 480, borderRadius: '24px 24px 0 0', padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sarlavha: { fontSize: 19, fontWeight: 800 },
  yopish: { width: 36, height: 36, borderRadius: '50%', background: 'var(--och-kulrang)', fontSize: 16 },
  izoh: { fontSize: 14, color: 'var(--kulrang)', marginBottom: 16 },
  bosh: { textAlign: 'center', padding: 30, color: 'var(--kulrang)' },
  xato: { color: 'var(--qizil)', padding: 14, textAlign: 'center' },
  linkQator: { display: 'flex', gap: 8, marginBottom: 14 },
  linkInput: { flex: 1, padding: 12, borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' },
  koʻchirTugma: { background: 'var(--qora)', color: 'var(--oq)', padding: '10px 16px', borderRadius: 10, fontWeight: 800, fontSize: 13, minWidth: 84 },
  deepLinks: { display: 'flex', gap: 10, marginBottom: 14 },
  tashqi: { flex: 1, color: 'var(--oq)', padding: 12, borderRadius: 12, fontWeight: 700, fontSize: 14, textAlign: 'center', textDecoration: 'none' },
  muddat: { fontSize: 12, color: 'var(--kulrang)', textAlign: 'center' },
  bekor: { width: '100%', background: 'transparent', padding: 12, color: 'var(--kulrang)', fontSize: 14, marginTop: 8 },
};
