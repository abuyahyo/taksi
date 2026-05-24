// Бошланғич саҳифа — рол танлаш
import { useNavigate } from 'react-router-dom';
import { useT, TilTanlovchi } from '../i18n';

export default function KirishSahifa() {
  const navigate = useNavigate();
  const { t } = useT();

  return (
    <div style={st.sahifa}>
      <div style={st.tilSwitcher}><TilTanlovchi /></div>
      <div style={st.logo}>🚕</div>
      <h1 style={st.sarlavha}>{t('common.app')}</h1>
      <p style={st.izoh}>{t('home.tagline')}</p>

      <div style={st.tugmalar}>
        <button style={st.yolovchi} onClick={() => navigate('/yolovchi')}>
          <span style={st.ikon}>🧍</span>
          <div>
            <div style={st.tugmaSarlavha}>{t('home.passenger')}</div>
            <div style={st.tugmaIzoh}>{t('home.passengerSub')}</div>
          </div>
        </button>

        <button style={st.haydovchi} onClick={() => navigate('/haydovchi')}>
          <span style={st.ikon}>🚗</span>
          <div>
            <div style={st.tugmaSarlavha}>{t('home.driver')}</div>
            <div style={st.tugmaIzoh}>{t('home.driverSub')}</div>
          </div>
        </button>
      </div>

      {/* Бизнинг устунлик — бошқа иловаларда йўқ */}
      <div style={st.afzallik}>
        <div style={st.afzKarta}>
          <div style={st.afzIkon}>🌟</div>
          <div>
            <div style={st.afzSarlavha}>{t('home.uniqueTitle')}</div>
            <div style={st.afzMatn}>{t('home.uniqueHint')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const st = {
  sahifa: { position: 'relative', width: '100vw', maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--oq)' },
  tilSwitcher: { position: 'absolute', top: 16, right: 16 },
  logo: { fontSize: 64, marginBottom: 8 },
  sarlavha: { fontSize: 36, fontWeight: 800 },
  izoh: { fontSize: 16, color: 'var(--kulrang)', marginBottom: 48 },
  tugmalar: { width: '100%', display: 'flex', flexDirection: 'column', gap: 16 },
  yolovchi: { display: 'flex', alignItems: 'center', gap: 16, background: 'var(--sariq)', padding: 20, borderRadius: 18, textAlign: 'left' },
  haydovchi: { display: 'flex', alignItems: 'center', gap: 16, background: 'var(--qora)', color: 'var(--oq)', padding: 20, borderRadius: 18, textAlign: 'left' },
  ikon: { fontSize: 32 },
  tugmaSarlavha: { fontSize: 18, fontWeight: 800 },
  tugmaIzoh: { fontSize: 13, opacity: 0.7 },
  afzallik: { width: '100%', marginTop: 24 },
  afzKarta: { display: 'flex', gap: 12, background: '#FEF3C7', borderLeft: '4px solid #F59E0B', padding: 14, borderRadius: 12 },
  afzIkon: { fontSize: 24, flexShrink: 0 },
  afzSarlavha: { fontSize: 13, fontWeight: 800, color: '#92400E' },
  afzMatn: { fontSize: 12, color: '#92400E', opacity: 0.85, marginTop: 4, lineHeight: 1.4 },
};
