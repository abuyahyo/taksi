// Пастки навигация — Uber услуби 4 таб (Главная / Сервисы / Действие / Аккаунт)
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n';
import Ikonka from './Ikonka';

const TABLAR = [
  { kalit: 'home',    yol: '/yolovchi',  ikon: 'home',    label: 'nav.home' },
  { kalit: 'xizmat',  yol: '/xizmatlar', ikon: 'grid',    label: 'nav.services' },
  { kalit: 'tarix',   yol: '/tarix',     ikon: 'receipt', label: 'nav.activity' },
  { kalit: 'akkaunt', yol: '/akkaunt',   ikon: 'user',    label: 'nav.account' },
];

export default function Pastki({ faol }) {
  const navigate = useNavigate();
  const { t } = useT();
  return (
    <nav style={st.bar} className="glass">
      {TABLAR.map((tb) => {
        const on = faol === tb.kalit;
        return (
          <button
            key={tb.kalit}
            style={{ ...st.tugma, color: on ? 'var(--tint)' : 'var(--secondary-label)' }}
            className="press"
            onClick={() => { if (!on) navigate(tb.yol); }}
            aria-current={on ? 'page' : undefined}
          >
            <Ikonka nom={tb.ikon} size={23} />
            <span style={{ ...st.label, fontWeight: on ? 700 : 500 }}>{t(tb.label)}</span>
          </button>
        );
      })}
    </nav>
  );
}

const st = {
  bar: {
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1300,
    maxWidth: 480, margin: '0 auto', display: 'flex',
    borderTop: '0.5px solid var(--separator)',
    padding: '9px 8px calc(9px + env(safe-area-inset-bottom))',
  },
  tugma: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '5px 0', background: 'transparent' },
  label: { fontSize: 11, letterSpacing: '-0.1px' },
};
