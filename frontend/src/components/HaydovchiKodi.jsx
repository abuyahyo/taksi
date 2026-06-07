// Ҳайдовчи QR коди — йўловчи скан қилиб ёки кодни киритиб севимлига қўшади.
// QR deep-link сақлайди: телефон камераси билан очилса илова йўловчи саҳифасини
// очиб ҳайдовчини олдиндан танлайди (?haydovchi=<kod>).
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useT } from '../i18n';
import { useToast } from './Toast';
import Ikonka from './Ikonka';

export default function HaydovchiKodi({ onYopish }) {
  const { t } = useT();
  const toast = useToast();
  const [kod, setKod] = useState(null);
  const [qr, setQr] = useState(null);
  const [xato, setXato] = useState('');

  useEffect(() => {
    let bekor = false;
    api.get('/driver/code')
      .then(async ({ data }) => {
        if (bekor) return;
        setKod(data.kod);
        const havola = `${window.location.origin}/yolovchi?haydovchi=${data.kod}`;
        try {
          const QR = (await import('qrcode')).default;
          const url = await QR.toDataURL(havola, { width: 240, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
          if (!bekor) setQr(url);
        } catch { /* QR чизилмаса — код барибир кўрсатилади */ }
      })
      .catch((err) => { if (!bekor) setXato(err.response?.data?.xato || t('common.error')); });
    return () => { bekor = true; };
  }, []);

  const havola = kod ? `${window.location.origin}/yolovchi?haydovchi=${kod}` : '';

  const ulash = async () => {
    if (!kod) return;
    const matn = t('drvcode.shareText', { kod, havola });
    try {
      if (navigator.share) await navigator.share({ title: t('drvcode.title'), text: matn });
      else { await navigator.clipboard.writeText(matn); toast.success(t('common.copied')); }
    } catch { /* фойдаланувчи бекор қилди */ }
  };

  const kodNusxa = async () => {
    if (!kod) return;
    try { await navigator.clipboard.writeText(kod); toast.success(t('common.copied')); } catch { /* */ }
  };

  return (
    <div style={st.fon} onClick={onYopish}>
      <div style={st.modal} className="glass slide-up" onClick={(e) => e.stopPropagation()}>
        <div style={st.grabber} />
        <h3 style={st.sarlavha}>{t('drvcode.title')}</h3>
        <p style={st.izoh}>{t('drvcode.hint')}</p>

        {xato ? (
          <div style={st.xato}>{xato}</div>
        ) : !kod ? (
          <div style={st.yuk}>{t('common.loading')}</div>
        ) : (
          <>
            <div style={st.qrWrap}>
              {qr ? <img src={qr} alt="QR" style={st.qr} /> : <div style={st.qrBosh}><Ikonka nom="car" size={40} /></div>}
            </div>
            <button style={st.kodQutu} onClick={kodNusxa} title={t('common.copy')}>
              {kod.split('').map((c, i) => <span key={i} style={st.kodXona}>{c}</span>)}
            </button>
            <div style={st.tugmalar}>
              <button style={st.ulashTugma} onClick={ulash}><Ikonka nom="share" size={16} /> {t('common.share')}</button>
              <button style={st.yopishTugma} onClick={onYopish}>{t('common.close')}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const st = {
  fon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 4000, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' },
  modal: { width: '100%', maxWidth: 420, borderRadius: 'var(--r-xl) var(--r-xl) 0 0', padding: '12px 22px 28px', textAlign: 'center' },
  grabber: { width: 38, height: 5, borderRadius: 3, background: 'var(--neutral-300)', margin: '0 auto 14px' },
  sarlavha: { fontSize: 20, fontWeight: 700, marginBottom: 6 },
  izoh: { fontSize: 14, color: 'var(--secondary-label)', marginBottom: 18 },
  qrWrap: { display: 'inline-flex', padding: 12, background: '#fff', borderRadius: 'var(--r-lg)', marginBottom: 16 },
  qr: { display: 'block', width: 220, height: 220 },
  qrBosh: { width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tint)' },
  kodQutu: { display: 'inline-flex', gap: 8, justifyContent: 'center', background: 'transparent', marginBottom: 18, cursor: 'pointer' },
  kodXona: { width: 38, height: 48, borderRadius: 'var(--r-md)', background: 'var(--fill)', color: 'var(--tint)', fontSize: 26, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: 0 },
  tugmalar: { display: 'flex', gap: 10 },
  ulashTugma: { flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: 'var(--tint)', color: '#fff', padding: 14, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 16 },
  yopishTugma: { flex: 1, background: 'var(--fill)', color: 'var(--label)', padding: 14, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 16 },
  yuk: { padding: 40, color: 'var(--secondary-label)' },
  xato: { padding: 24, color: 'var(--qizil)', fontSize: 15 },
};
