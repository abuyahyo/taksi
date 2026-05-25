// Сафар ичидаги чат — йўловчи ↔ ҳайдовчи
import { useEffect, useRef, useState } from 'react';
import { api, socket } from '../services/api';
import { useT } from '../i18n';

export default function Chat({ rideId, meId, hamrohIsm, onClose }) {
  const { t } = useT();
  const [xabarlar, setXabarlar] = useState([]);
  const [matn, setMatn] = useState('');
  const royxatRef = useRef(null);

  useEffect(() => {
    if (!rideId) return;
    api.get(`/messages/${rideId}`)
      .then(({ data }) => setXabarlar(data))
      .catch(() => {});
    socket.emit('safarga_qoshil', { rideId });
  }, [rideId]);

  useEffect(() => {
    const tinglovchi = (x) => {
      if (Number(x.ride_id) !== Number(rideId)) return;
      setXabarlar((oldin) => [...oldin, x]);
    };
    socket.on('xabar_keldi', tinglovchi);
    return () => socket.off('xabar_keldi', tinglovchi);
  }, [rideId]);

  useEffect(() => {
    royxatRef.current?.scrollTo({ top: royxatRef.current.scrollHeight, behavior: 'smooth' });
  }, [xabarlar]);

  const yubor = () => {
    const m = matn.trim();
    if (!m) return;
    socket.emit('xabar_yuborish', { rideId, matn: m });
    setMatn('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      yubor();
    }
  };

  const vaqt = (v) => {
    try { return new Date(v).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  const sarlavha = hamrohIsm || t('chat.tripChat');

  return (
    <div style={st.fon} onClick={onClose}>
      <div style={st.panel} className="glass slide-up-modal" onClick={(e) => e.stopPropagation()}>
        <div style={st.header}>
          <div>
            <div style={st.sarlavha}>💬 {sarlavha}</div>
            <div style={st.izoh}>{t('chat.ride')} #{rideId}</div>
          </div>
          <button style={st.yopish} onClick={onClose}>✕</button>
        </div>

        <div ref={royxatRef} style={st.royxat}>
          {xabarlar.length === 0 ? (
            <div style={st.bosh}>{t('chat.empty')}</div>
          ) : (
            xabarlar.map((x) => {
              const ozim = Number(x.yuboruvchi_id) === Number(meId);
              return (
                <div key={x.id} style={{ ...st.qator, justifyContent: ozim ? 'flex-end' : 'flex-start' }}>
                  <div style={{ ...st.kopcha, ...(ozim ? st.kopchaOzim : st.kopchaBegona) }}>
                    {!ozim && <div style={st.yuboruvchi}>{x.yuboruvchi_ism}</div>}
                    <div style={st.matn}>{x.matn}</div>
                    <div style={st.vaqt}>{vaqt(x.vaqt)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Тез-жавоб шаблонлари — Yandex'ча */}
        <div style={st.shablonlar}>
          {[
            t('chat.qr1'),
            t('chat.qr2'),
            t('chat.qr3'),
            t('chat.qr4'),
            t('chat.qr5'),
          ].map((m, i) => (
            <button
              key={i}
              style={st.shablonTugma}
              onClick={() => {
                socket.emit('xabar_yuborish', { rideId, matn: m });
              }}
            >{m}</button>
          ))}
        </div>

        <div style={st.kiritish}>
          <input
            style={st.input}
            value={matn}
            onChange={(e) => setMatn(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('chat.placeholder')}
            autoFocus
          />
          <button style={{ ...st.yuborTugma, opacity: matn.trim() ? 1 : 0.5 }} disabled={!matn.trim()} onClick={yubor}>
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

const st = {
  fon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 3000 },
  panel: { width: '100%', maxWidth: 480, height: '85vh', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column' },
  header: { padding: 16, borderBottom: '1px solid var(--neutral-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sarlavha: { fontSize: 17, fontWeight: 800 },
  izoh: { fontSize: 12, color: 'var(--kulrang)', marginTop: 2 },
  yopish: { width: 36, height: 36, borderRadius: '50%', background: 'var(--och-kulrang)', fontSize: 18, fontWeight: 700 },
  royxat: { flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 },
  bosh: { textAlign: 'center', color: 'var(--kulrang)', padding: 40, fontSize: 14 },
  qator: { display: 'flex' },
  kopcha: { maxWidth: '75%', padding: '8px 12px', borderRadius: 16 },
  kopchaOzim: { background: 'var(--sariq)', color: 'var(--qora)' },
  kopchaBegona: { background: 'var(--och-kulrang)', color: 'var(--qora)' },
  yuboruvchi: { fontSize: 11, fontWeight: 700, color: 'var(--kulrang)', marginBottom: 2 },
  matn: { fontSize: 14, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  vaqt: { fontSize: 10, color: 'var(--kulrang)', textAlign: 'right', marginTop: 2 },
  shablonlar: { display: 'flex', gap: 6, padding: '8px 12px', overflowX: 'auto', borderTop: '1px solid var(--neutral-200)' },
  shablonTugma: { background: 'var(--neutral-100)', padding: '6px 12px', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, color: 'var(--qora-soft)' },
  kiritish: { display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--neutral-200)' },
  input: { flex: 1, padding: 12, borderRadius: 22, border: '1px solid var(--neutral-200)', fontSize: 15 },
  yuborTugma: { width: 44, height: 44, borderRadius: '50%', background: 'var(--sariq)', fontSize: 18, fontWeight: 800, color: 'var(--qora)' },
};
