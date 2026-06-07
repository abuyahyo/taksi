// Сервислар саҳифаси — мавжуд хизматлар (буюртма оқимига йўналтиради)
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n';
import Ikonka from '../components/Ikonka';
import Pastki from '../components/Pastki';

export default function XizmatlarSahifa() {
  const navigate = useNavigate();
  const { t } = useT();

  // Барча хизмат буюртма оқимига (/yolovchi) олиб боради; query орқали тариф/режа олдиндан танланади
  // matn — иконка ранги (--tint/--ink каби B&W фонида матн контрасти учун --on-tint)
  const xizmatlar = [
    { kalit: 'taxi',     ikon: 'taxi',    yol: '/yolovchi',                rang: 'var(--tint)',   matn: 'var(--on-tint)', belgi: null },
    { kalit: 'komfort',  ikon: 'car',     yol: '/yolovchi?tarif=komfort',  rang: 'var(--kok)',    matn: '#fff',           belgi: null },
    { kalit: 'dostavka', ikon: 'receipt', yol: '/yolovchi?tarif=dostavka', rang: 'var(--amber)',  matn: '#fff',           belgi: t('xizmat.badgeNew') },
    { kalit: 'schedule', ikon: 'clock',   yol: '/yolovchi?reja=1',         rang: 'var(--yashil)', matn: '#fff',           belgi: null },
    { kalit: 'reklama',  ikon: 'flame',   yol: '/reklama',                 rang: 'var(--ink)',    matn: 'var(--on-tint)', belgi: t('xizmat.badgeNew') },
  ];

  return (
    <div style={st.sahifa}>
      <div style={st.kontent}>
        <h1 style={st.sarlavha}>{t('xizmat.title')}</h1>
        <p style={st.tagline}>{t('xizmat.subtitle')}</p>

        <div style={st.grid}>
          {xizmatlar.map((x) => (
            <button key={x.kalit} style={st.karta} className="press" onClick={() => navigate(x.yol)}>
              {x.belgi && <span style={st.belgi}>{x.belgi}</span>}
              <span style={{ ...st.kartaIkon, background: x.rang, color: x.matn }}><Ikonka nom={x.ikon} size={26} /></span>
              <span style={st.kartaNom}>{t(`xizmat.${x.kalit}`)}</span>
              <span style={st.kartaIzoh}>{t(`xizmat.${x.kalit}Sub`)}</span>
            </button>
          ))}
        </div>

        <div style={st.eslatma}>
          <Ikonka nom="info" size={16} />
          <span>{t('xizmat.note')}</span>
        </div>
      </div>

      <Pastki faol="xizmat" />
    </div>
  );
}

const st = {
  sahifa: { width: '100%', maxWidth: 480, margin: '0 auto', minHeight: '100dvh', background: 'var(--bg)' },
  kontent: { padding: 'calc(16px + env(safe-area-inset-top)) 16px calc(220px + env(safe-area-inset-bottom))' },
  sarlavha: { fontSize: 32, fontWeight: 700, letterSpacing: '0.37px', color: 'var(--label)', margin: '8px 4px 2px' },
  tagline: { fontSize: 15, color: 'var(--secondary-label)', margin: '0 4px 20px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  karta: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, background: 'var(--surface)', padding: 16, borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-1)', textAlign: 'left', minHeight: 132 },
  kartaIkon: { width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  kartaNom: { fontSize: 17, fontWeight: 600, color: 'var(--label)', marginTop: 'auto' },
  kartaIzoh: { fontSize: 13, color: 'var(--secondary-label)', lineHeight: 1.3 },
  belgi: { position: 'absolute', top: 12, right: 12, background: 'var(--tint-fill)', color: 'var(--tint)', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--r-full)' },
  eslatma: { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--fill)', color: 'var(--secondary-label)', padding: 14, borderRadius: 'var(--r-md)', marginTop: 16, fontSize: 14, lineHeight: 1.35 },
};
