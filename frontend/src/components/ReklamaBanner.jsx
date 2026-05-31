// Йўловчи бош экрани реклама баннери — ой кимошди ғолибининг баннери.
// PUBLIC endpoint (меҳмонлар ҳам кўради). Реклама эканлиги очиқ белгиланади (ҳалол).
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useT } from '../i18n';

export default function ReklamaBanner() {
  const { t } = useT();
  const [reklama, setReklama] = useState(null);
  const [yopildi, setYopildi] = useState(false);

  useEffect(() => {
    let bekor = false;
    api.get('/reklama/faol').then(({ data }) => { if (!bekor) setReklama(data); }).catch(() => {});
    return () => { bekor = true; };
  }, []);

  if (!reklama || yopildi) return null;

  return (
    <a
      href={reklama.havola}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      style={st.banner}
      className="press"
    >
      <img src={reklama.rasm_url} alt={reklama.sarlavha} style={st.rasm} loading="lazy" />
      <div style={st.qatlam}>
        <span style={st.belgi}>{t('reklama.label')}</span>
        <span style={st.sarlavha}>{reklama.sarlavha}</span>
      </div>
      <button
        type="button"
        style={st.yopish}
        aria-label={t('common.close')}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setYopildi(true); }}
      >×</button>
    </a>
  );
}

const st = {
  banner: { position: 'relative', display: 'block', width: '100%', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 12, background: 'var(--fill)', textDecoration: 'none', aspectRatio: '4 / 1', minHeight: 72 },
  rasm: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  qatlam: { position: 'absolute', left: 0, bottom: 0, right: 0, padding: '10px 12px', background: 'linear-gradient(transparent, rgba(0,0,0,0.55))', display: 'flex', flexDirection: 'column', gap: 3 },
  belgi: { alignSelf: 'flex-start', fontSize: 10, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.45)', padding: '1px 6px', borderRadius: 'var(--r-full)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  sarlavha: { fontSize: 15, fontWeight: 700, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)' },
  yopish: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 16, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
};
