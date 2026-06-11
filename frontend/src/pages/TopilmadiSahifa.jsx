// 404 — нотўғри манзилда бўш экран ўрнига чиройли фолбэк
import { Link } from 'react-router-dom';
import { useT } from '../i18n';
import Ikonka from '../components/Ikonka';

export default function TopilmadiSahifa() {
  const { t } = useT();
  return (
    <div style={st.sahifa}>
      <div style={st.ikon}><Ikonka nom="search" size={40} /></div>
      <h1 style={st.kod}>404</h1>
      <p style={st.matn}>{t('notfound.text')}</p>
      <Link to="/" style={st.tugma}>{t('notfound.home')}</Link>
    </div>
  );
}

const st = {
  sahifa: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: 'var(--bg)', padding: 24, textAlign: 'center' },
  ikon: { color: 'var(--tertiary-label)', marginBottom: 12 },
  kod: { fontSize: 44, fontWeight: 700, color: 'var(--label)', marginBottom: 8 },
  matn: { fontSize: 16, color: 'var(--secondary-label)', marginBottom: 24 },
  tugma: { display: 'inline-block', background: 'var(--tint)', color: 'var(--on-tint)', padding: '14px 28px', borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 16, textDecoration: 'none' },
};
