// Бошланғич саҳифа — рол танлаш (намуна учун соддалаштирилган)
import { useNavigate } from 'react-router-dom';

export default function KirishSahifa() {
  const navigate = useNavigate();

  return (
    <div style={st.sahifa}>
      <div style={st.logo}>🚕</div>
      <h1 style={st.sarlavha}>Tez Taxi</h1>
      <p style={st.izoh}>Нархни ўзингиз белгиланг</p>

      <div style={st.tugmalar}>
        <button style={st.yolovchi} onClick={() => navigate('/yolovchi')}>
          <span style={st.ikon}>🧍</span>
          <div>
            <div style={st.tugmaSarlavha}>Йўловчиман</div>
            <div style={st.tugmaIzoh}>Сафар буюртма қиламан</div>
          </div>
        </button>

        <button style={st.haydovchi} onClick={() => navigate('/haydovchi')}>
          <span style={st.ikon}>🚗</span>
          <div>
            <div style={st.tugmaSarlavha}>Ҳайдовчиман</div>
            <div style={st.tugmaIzoh}>Буюртма оламан</div>
          </div>
        </button>
      </div>
    </div>
  );
}

const st = {
  sahifa: { width: '100vw', maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--oq)' },
  logo: { fontSize: 64, marginBottom: 8 },
  sarlavha: { fontSize: 36, fontWeight: 800 },
  izoh: { fontSize: 16, color: 'var(--kulrang)', marginBottom: 48 },
  tugmalar: { width: '100%', display: 'flex', flexDirection: 'column', gap: 16 },
  yolovchi: { display: 'flex', alignItems: 'center', gap: 16, background: 'var(--sariq)', padding: 20, borderRadius: 18, textAlign: 'left' },
  haydovchi: { display: 'flex', alignItems: 'center', gap: 16, background: 'var(--qora)', color: 'var(--oq)', padding: 20, borderRadius: 18, textAlign: 'left' },
  ikon: { fontSize: 32 },
  tugmaSarlavha: { fontSize: 18, fontWeight: 800 },
  tugmaIzoh: { fontSize: 13, opacity: 0.7 },
};
