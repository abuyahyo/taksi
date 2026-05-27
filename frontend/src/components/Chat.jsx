// Сафар ичидаги чат — йўловчи ↔ ҳайдовчи
import { useEffect, useRef, useState } from 'react';
import { api, socket } from '../services/api';
import { useT } from '../i18n';
import Ikonka from './Ikonka';
import Sheet from './Sheet';

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
    <Sheet onYopish={onClose} zIndex={3000} panelStyle={st.panel}>
        <div style={st.header}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={st.sarlavha}>{sarlavha}</div>
            <div style={st.izoh}>{t('chat.ride')} #{rideId}</div>
          </div>
          <button style={st.yopish} onClick={onClose}><Ikonka nom="x" size={16} /></button>
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

        {/* Тез-жавоб шаблонлари */}
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
          <button style={{ ...st.yuborTugma, opacity: matn.trim() ? 1 : 0.4 }} disabled={!matn.trim()} onClick={yubor}>
            <Ikonka nom="send" size={20} />
          </button>
        </div>
    </Sheet>
  );
}

const st = {
  panel: { height: '85vh', maxHeight: 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 },
  header: { position: 'relative', padding: '8px 16px 12px', borderBottom: '0.5px solid var(--separator)', display: 'flex', alignItems: 'center' },
  sarlavha: { fontSize: 17, fontWeight: 600, color: 'var(--label)' },
  izoh: { fontSize: 12, color: 'var(--secondary-label)', marginTop: 1 },
  yopish: { position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: '50%', background: 'var(--fill)', color: 'var(--secondary-label)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  royxat: { flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 4 },
  bosh: { textAlign: 'center', color: 'var(--secondary-label)', padding: 40, fontSize: 15 },
  qator: { display: 'flex' },
  kopcha: { maxWidth: '75%', padding: '7px 13px', borderRadius: 18 },
  kopchaOzim: { background: 'var(--tint)', color: '#fff' },
  kopchaBegona: { background: 'var(--fill)', color: 'var(--label)' },
  yuboruvchi: { fontSize: 11, fontWeight: 600, color: 'var(--secondary-label)', marginBottom: 2 },
  matn: { fontSize: 16, lineHeight: 1.35, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  vaqt: { fontSize: 10, opacity: 0.6, textAlign: 'right', marginTop: 2 },
  shablonlar: { display: 'flex', gap: 6, padding: '8px 12px', overflowX: 'auto', borderTop: '0.5px solid var(--separator)' },
  shablonTugma: { background: 'var(--fill)', padding: '7px 14px', borderRadius: 'var(--r-full)', fontSize: 14, fontWeight: 400, whiteSpace: 'nowrap', flexShrink: 0, color: 'var(--tint)' },
  kiritish: { display: 'flex', gap: 8, padding: '10px 12px calc(10px + env(safe-area-inset-bottom))', borderTop: '0.5px solid var(--separator)', alignItems: 'center' },
  input: { flex: 1, padding: '10px 16px', borderRadius: 'var(--r-full)', border: 'none', background: 'var(--fill)', color: 'var(--label)', fontSize: 16 },
  yuborTugma: { width: 38, height: 38, borderRadius: '50%', background: 'var(--tint)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
};
