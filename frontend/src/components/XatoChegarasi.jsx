// Error Boundary — рендердаги кутилмаган хато бутун иловани "оқ экран"га
// айлантирмасин. Ўрнига чиройли хабар ва қайта юклаш тугмаси кўрсатамиз.
import { Component } from 'react';

// Крах экрани матни (3 тилда — i18n контекстисиз ишлаши керак)
const MATN = {
  uz:      { sarlavha: 'Хатолик юз берди', izoh: 'Иловада кутилмаган хатолик. Қайта юкланг.', tugma: 'Қайта юклаш' },
  'uz-latn': { sarlavha: 'Xatolik yuz berdi', izoh: 'Ilovada kutilmagan xatolik. Qayta yuklang.', tugma: 'Qayta yuklash' },
  ru:      { sarlavha: 'Произошла ошибка', izoh: 'Неожиданная ошибка в приложении. Перезагрузите.', tugma: 'Перезагрузить' },
};

export default class XatoChegarasi extends Component {
  constructor(props) {
    super(props);
    this.state = { xato: false };
  }

  static getDerivedStateFromError() {
    return { xato: true };
  }

  componentDidCatch(error, info) {
    console.error('XatoChegarasi:', error, info?.componentStack);
  }

  render() {
    if (!this.state.xato) return this.props.children;

    let til = 'uz';
    try { til = localStorage.getItem('til') || 'uz'; } catch { /* */ }
    const m = MATN[til] || MATN.uz;

    return (
      <div style={st.fon}>
        <div style={st.ikon}>⚠️</div>
        <h1 style={st.sarlavha}>{m.sarlavha}</h1>
        <p style={st.izoh}>{m.izoh}</p>
        <button style={st.tugma} onClick={() => window.location.reload()}>{m.tugma}</button>
      </div>
    );
  }
}

const st = {
  fon: { minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, background: 'var(--bg, #fff)', color: 'var(--label, #111)' },
  ikon: { fontSize: 48, marginBottom: 12 },
  sarlavha: { fontSize: 22, fontWeight: 700, marginBottom: 8 },
  izoh: { fontSize: 15, color: 'var(--secondary-label, #666)', maxWidth: 320, marginBottom: 24, lineHeight: 1.4 },
  tugma: { background: 'var(--tint, #000000)', color: '#fff', padding: '14px 28px', borderRadius: 14, fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer' },
};
