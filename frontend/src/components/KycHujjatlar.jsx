// KYC — ҳайдовчи ҳужжатларини юклаш ва тасдиқ ҳолатини кўриш.
// Маxфий расмлар authenticated endpoint орқали blob сифатида олинади.
import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { rasmKichiklashtir } from '../utils/rasm';
import { useToast } from './Toast';
import { useT } from '../i18n';
import Ikonka from './Ikonka';

const TURLAR = ['passport', 'selfie'];

// Маxфий ҳужжат расми — токен билан blob олиб кўрсатамиз (<img src> токен юбора олмайди)
export function KycRasm({ hujjatId, style }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let url;
    let bekor = false;
    api.get(`/driver/hujjat/${hujjatId}/fayl`, { responseType: 'blob' })
      .then(({ data }) => {
        if (bekor) return;
        url = URL.createObjectURL(data);
        setSrc(url);
      })
      .catch(() => {});
    return () => { bekor = true; if (url) URL.revokeObjectURL(url); };
  }, [hujjatId]);
  if (!src) return <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--fill)', color: 'var(--tertiary-label)' }}><Ikonka nom="receipt" size={20} /></div>;
  return <img src={src} alt="" style={{ ...style, objectFit: 'cover' }} />;
}

export default function KycHujjatlar() {
  const { t } = useT();
  const toast = useToast();
  const [malumot, setMalumot] = useState(null);
  const [yuklanmoqda, setYuklanmoqda] = useState('');
  const inputRef = useRef({});

  const yukla = () => api.get('/driver/hujjatlar').then(({ data }) => setMalumot(data)).catch(() => {});
  useEffect(() => { yukla(); }, []);

  const tanla = (turi) => () => inputRef.current[turi]?.click();

  const ozgardi = (turi) => async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setYuklanmoqda(turi);
    try {
      const kichik = await rasmKichiklashtir(file);
      const fd = new FormData();
      fd.append('turi', turi);
      fd.append('fayl', kichik);
      await api.post('/driver/hujjat', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await yukla();
      toast.success(t('common.save'));
    } catch (err) {
      toast.error(err.response?.data?.xato || t('kyc.fileErr'));
    } finally {
      setYuklanmoqda('');
    }
  };

  if (!malumot) return null;
  const { hujjatlar = [], tasdiqlangan, tasdiq_holati, rad_sababi } = malumot;
  const topib = (turi) => hujjatlar.find((h) => h.turi === turi);

  return (
    <div style={st.wrap}>
      <div style={st.sarlavha}>{t('kyc.title')}</div>

      {/* Умумий ҳолат банери */}
      {tasdiqlangan ? (
        <div style={{ ...st.baner, ...st.banerYashil }}><Ikonka nom="check" size={15} /> {t('kyc.approved')}</div>
      ) : tasdiq_holati === 'kutilmoqda' ? (
        <div style={{ ...st.baner, ...st.banerAmber }}><Ikonka nom="clock" size={15} /> {t('kyc.pending')}</div>
      ) : tasdiq_holati === 'rad' ? (
        <div style={{ ...st.baner, ...st.banerQizil }}>{t('kyc.rejected')}{rad_sababi ? `: ${rad_sababi}` : ''}</div>
      ) : (
        <div style={st.hint}>{t('kyc.hint')}</div>
      )}

      {TURLAR.map((turi) => {
        const h = topib(turi);
        const band = yuklanmoqda === turi;
        return (
          <div key={turi} style={st.qator}>
            {h ? <KycRasm hujjatId={h.id} style={st.rasm} /> : <div style={{ ...st.rasm, ...st.rasmBosh }}><Ikonka nom="receipt" size={20} /></div>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={st.turNomi}>{t(`kyc.${turi}`)}</div>
              {h && <div style={{ ...st.chip, ...chipRang(h.holat) }}>{t(`kyc.st.${h.holat}`)}</div>}
              {h?.holat === 'rad' && h.rad_sababi && <div style={st.radSabab}>{h.rad_sababi}</div>}
            </div>
            <button style={st.tugma} onClick={tanla(turi)} disabled={band}>
              {band ? t('kyc.uploading') : h ? t('kyc.replace') : t('kyc.upload')}
            </button>
            <input
              ref={(el) => (inputRef.current[turi] = el)}
              type="file"
              accept="image/*"
              capture={turi === 'selfie' ? 'user' : 'environment'}
              style={{ display: 'none' }}
              onChange={ozgardi(turi)}
            />
          </div>
        );
      })}
    </div>
  );
}

function chipRang(holat) {
  if (holat === 'tasdiqlandi') return { background: 'rgba(52,199,89,0.16)', color: 'var(--yashil)' };
  if (holat === 'rad') return { background: 'rgba(255,59,48,0.14)', color: 'var(--qizil)' };
  return { background: 'rgba(255,149,0,0.16)', color: 'var(--amber)' };
}

const st = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20, paddingTop: 18, borderTop: '0.5px solid var(--separator)' },
  sarlavha: { fontSize: 13, fontWeight: 400, color: 'var(--secondary-label)', textTransform: 'uppercase', letterSpacing: '-0.08px', paddingLeft: 4 },
  baner: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 12px', borderRadius: 'var(--r-md)', fontSize: 13, fontWeight: 500, lineHeight: 1.4 },
  banerYashil: { background: 'rgba(52,199,89,0.14)', color: 'var(--yashil)' },
  banerAmber: { background: 'rgba(255,149,0,0.14)', color: 'var(--amber)' },
  banerQizil: { background: 'rgba(255,59,48,0.12)', color: 'var(--qizil)' },
  hint: { fontSize: 13, color: 'var(--secondary-label)', padding: '0 4px' },
  qator: { display: 'flex', alignItems: 'center', gap: 12 },
  rasm: { width: 52, height: 52, borderRadius: 'var(--r-md)', flexShrink: 0 },
  rasmBosh: { display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--fill)', color: 'var(--tertiary-label)' },
  turNomi: { fontSize: 15, fontWeight: 500 },
  chip: { display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--r-full)', marginTop: 4 },
  radSabab: { fontSize: 12, color: 'var(--qizil)', marginTop: 3 },
  tugma: { background: 'var(--fill)', color: 'var(--tint)', padding: '9px 14px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 14, flexShrink: 0 },
};
