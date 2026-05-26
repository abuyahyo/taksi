// Қайта ишлатиладиган bottom-sheet — iOS услубида бармоқ билан пастга
// тортиб ёпиш жести билан. Grabber'дан (юқори дастак) ушлаб тортилади;
// ичкаридаги контент эркин скролл бўлади. Етарли тортилса ёпилади, акс
// ҳолда орқага қайтади. Backdrop бармоқ ҳаракатига қараб хиралашади.
import { useRef, useState, useCallback } from 'react';
import { tebrat } from '../services/haptika';

const YOPISH_CHEGARA = 90; // px — шу масофадан кўп тортилса ёпилади

export default function Sheet({
  onYopish,
  zIndex = 3500,
  maxWidth = 480,
  panelStyle = {},
  panelClassName = 'glass',
  children,
}) {
  const [dy, setDy] = useState(0);          // жорий тортиш масофаси (px)
  const [tortilmoqda, setTortilmoqda] = useState(false);
  const [yopilmoqda, setYopilmoqda] = useState(false);
  const dastlabRef = useRef(0);

  const yop = useCallback(() => {
    setYopilmoqda(true);
    setDy(600);
    setTimeout(onYopish, 240);
  }, [onYopish]);

  const boshla = (e) => {
    dastlabRef.current = e.clientY;
    setTortilmoqda(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const harakat = (e) => {
    if (!tortilmoqda) return;
    const farq = e.clientY - dastlabRef.current;
    setDy(farq > 0 ? farq : farq * 0.25); // юқорига тортишга қаршилик
  };
  const tugat = () => {
    if (!tortilmoqda) return;
    setTortilmoqda(false);
    if (dy > YOPISH_CHEGARA) { tebrat(); yop(); }
    else setDy(0); // орқага қайтиш
  };

  // dy=0 ва тортилмаётганда inline transform бермаймиз — шунда CSS
  // slide-up-modal кириш анимацияси ишлайди.
  const transform = dy !== 0 ? `translateY(${dy}px)` : undefined;
  const xiralik = Math.max(0, 0.4 - dy / 1200);

  return (
    <div
      style={{ ...st.fon, zIndex, background: `rgba(0,0,0,${xiralik})` }}
      onClick={yop}
    >
      <div
        className={`${panelClassName} ${yopilmoqda || dy ? '' : 'slide-up-modal'}`}
        style={{
          ...st.panel,
          maxWidth,
          ...panelStyle,
          transform,
          transition: tortilmoqda ? 'none' : 'transform .24s var(--easing)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={st.dastak}
          onPointerDown={boshla}
          onPointerMove={harakat}
          onPointerUp={tugat}
          onPointerCancel={tugat}
        >
          <div style={st.grabber} />
        </div>
        {children}
      </div>
    </div>
  );
}

const st = {
  fon: {
    position: 'fixed', inset: 0, display: 'flex',
    alignItems: 'flex-end', justifyContent: 'center',
    backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
  },
  panel: {
    width: '100%', borderRadius: '14px 14px 0 0',
    maxHeight: '92vh', overflowY: 'auto',
    paddingBottom: 'env(safe-area-inset-bottom)',
    willChange: 'transform',
  },
  dastak: {
    padding: '8px 0 4px', cursor: 'grab',
    touchAction: 'none', flexShrink: 0,
  },
  grabber: { width: 36, height: 5, borderRadius: 3, background: 'var(--fill-strong)', margin: '0 auto' },
};
