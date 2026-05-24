// Баҳолаш модали — сафар тугагач кўрсатилади
import { useState } from 'react';
import { socket } from '../services/api';
import { useT } from '../i18n';

export default function Baholash({ rideId, kimni, ism, onYopish }) {
  const { t } = useT();
  const [ball, setBall] = useState(0);
  const [izoh, setIzoh] = useState('');
  const [yuborildi, setYuborildi] = useState(false);

  const yubor = () => {
    if (!ball) return;
    socket.emit('baholash', { rideId, ball, izoh: izoh.trim() || null });
    setYuborildi(true);
    setTimeout(onYopish, 1100);
  };

  const sarlavhaMatn = kimni === 'driver' ? t('rate.titleDriver') : t('rate.titlePassenger');

  return (
    <div style={st.fon}>
      <div style={st.modal}>
        {yuborildi ? (
          <div style={st.tugadi}>
            <div style={{ fontSize: 56 }}>🎉</div>
            <div style={st.taktSarl}>{t('rate.ackTitle')}</div>
            <div style={st.taktIzoh}>{t('rate.ackBody')}</div>
          </div>
        ) : (
          <>
            <div style={st.avatar}>{(ism || '?')[0]}</div>
            <div style={st.sarlavha}>{sarlavhaMatn}</div>
            <div style={st.ism}>{ism || '—'}</div>

            <div style={st.yulduzlar}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  style={{ ...st.yulduz, color: n <= ball ? '#FACC15' : '#E5E7EB' }}
                  onClick={() => setBall(n)}
                  aria-label={`${n}`}
                >★</button>
              ))}
            </div>

            <textarea
              style={st.izoh}
              placeholder={t('rate.commentPh')}
              maxLength={300}
              value={izoh}
              onChange={(e) => setIzoh(e.target.value)}
            />

            <button
              style={{ ...st.tugma, opacity: ball ? 1 : 0.4 }}
              disabled={!ball}
              onClick={yubor}
            >
              {t('rate.submit')}
            </button>
            <button style={st.otkaz} onClick={onYopish}>{t('common.skip')}</button>
          </>
        )}
      </div>
    </div>
  );
}

const st = {
  fon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: 16 },
  modal: { background: 'var(--oq)', width: '100%', maxWidth: 380, borderRadius: 20, padding: 28, textAlign: 'center' },
  avatar: { width: 64, height: 64, borderRadius: '50%', background: 'var(--sariq)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800 },
  sarlavha: { fontSize: 18, fontWeight: 700, color: 'var(--kulrang)' },
  ism: { fontSize: 22, fontWeight: 800, marginTop: 4, marginBottom: 20 },
  yulduzlar: { display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16 },
  yulduz: { width: 44, height: 44, fontSize: 36, background: 'transparent', padding: 0, lineHeight: 1 },
  izoh: { width: '100%', padding: 12, borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 14, fontFamily: 'inherit', minHeight: 70, resize: 'vertical', marginBottom: 14 },
  tugma: { width: '100%', background: 'var(--sariq)', padding: 14, borderRadius: 12, fontWeight: 800, fontSize: 15 },
  otkaz: { width: '100%', background: 'transparent', padding: 12, color: 'var(--kulrang)', fontSize: 14, marginTop: 4 },
  tugadi: { padding: 30 },
  taktSarl: { fontSize: 22, fontWeight: 800, marginTop: 12 },
  taktIzoh: { fontSize: 14, color: 'var(--kulrang)', marginTop: 6 },
};
