// Баҳолаш модали + чаёвой танлови
import { useState } from 'react';
import { socket } from '../services/api';
import { useT } from '../i18n';
import { useToast } from './Toast';
import Ikonka from './Ikonka';

export default function Baholash({ rideId, kimni, ism, narx, onYopish }) {
  const { t } = useT();
  const toast = useToast();
  const [ball, setBall] = useState(0);
  const [izoh, setIzoh] = useState('');
  const [chayovoy, setChayovoy] = useState(0); // фоиз
  const [yuborildi, setYuborildi] = useState(false);

  const taklif = [
    { foiz: 5,  belgi: '5%' },
    { foiz: 10, belgi: '10%' },
    { foiz: 15, belgi: '15%' },
  ];

  const chayovoySum = narx && chayovoy > 0 ? Math.round((Number(narx) * chayovoy) / 100) : 0;

  const yubor = () => {
    if (!ball) return;
    socket.emit('baholash', { rideId, ball, izoh: izoh.trim() || null });
    if (chayovoySum > 0) {
      socket.emit('chayovoy', { rideId, summa: chayovoySum });
      toast.success(t('tip.sent', { sum: chayovoySum.toLocaleString() }), { muddat: 4000 });
    }
    setYuborildi(true);
    setTimeout(onYopish, 1200);
  };

  const sarlavhaMatn = kimni === 'driver' ? t('rate.titleDriver') : t('rate.titlePassenger');
  const chayovoyKorinadimi = kimni === 'driver' && Number(narx) > 0;

  return (
    <div style={st.fon}>
      <div style={st.modal} className="glass slide-up">
        {yuborildi ? (
          <div style={st.tugadi}>
            <div style={st.tugadiIkon}><Ikonka nom="check" size={36} /></div>
            <div style={st.taktSarl}>{t('rate.ackTitle')}</div>
            <div style={st.taktIzoh}>{t('rate.ackBody')}</div>
          </div>
        ) : (
          <>
            <div style={st.avatar}>
              {ism ? ism[0] : <Ikonka nom="user" size={28} />}
            </div>
            <div style={st.sarlavha}>{sarlavhaMatn}</div>
            <div style={st.ism}>{ism || '—'}</div>

            <div style={st.yulduzlar}>
              {[1, 2, 3, 4, 5].map((n) => {
                const tanlangan = n <= ball;
                return (
                  <button
                    key={n}
                    style={{
                      ...st.yulduz,
                      color: tanlangan ? '#FFCC00' : 'var(--neutral-300)',
                      transform: tanlangan ? 'scale(1.08)' : 'scale(1)',
                      transition: 'transform 120ms, color 120ms',
                    }}
                    onClick={() => setBall(n)}
                    aria-label={`${n}`}
                    aria-pressed={tanlangan}
                  ><Ikonka nom="star" size={34} /></button>
                );
              })}
            </div>

            {/* Чаёвой танлови — фақат йўловчи ҳайдовчини баҳолашда */}
            {chayovoyKorinadimi && (
              <div style={st.chayovoyBolimi}>
                <div style={st.chayovoyLabel}>{t('tip.title')} <span style={st.chayovoyIxt}>{t('common.optional')}</span></div>
                <div style={st.chayovoyTaklif}>
                  <button
                    style={{ ...st.chayovoyTugma, ...(chayovoy === 0 ? st.chayovoyFaol : {}) }}
                    onClick={() => setChayovoy(0)}
                  >{t('tip.no')}</button>
                  {taklif.map((p) => (
                    <button
                      key={p.foiz}
                      style={{ ...st.chayovoyTugma, ...(chayovoy === p.foiz ? st.chayovoyFaol : {}) }}
                      onClick={() => setChayovoy(p.foiz)}
                    >{p.belgi}</button>
                  ))}
                </div>
                {chayovoySum > 0 && (
                  <div style={st.chayovoySum}>+{chayovoySum.toLocaleString()} {t('wait.sum')}</div>
                )}
              </div>
            )}

            <textarea
              style={st.izoh}
              placeholder={t('rate.commentPh')}
              maxLength={300}
              value={izoh}
              onChange={(e) => setIzoh(e.target.value)}
            />
            <div style={st.izohHisob}>{izoh.length}/300</div>

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
  fon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: 24, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' },
  modal: { width: '100%', maxWidth: 360, borderRadius: 'var(--r-xl)', padding: 24, textAlign: 'center' },
  avatar: { width: 64, height: 64, borderRadius: '50%', background: 'var(--tint)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 600, color: '#fff' },
  sarlavha: { fontSize: 15, fontWeight: 400, color: 'var(--secondary-label)' },
  ism: { fontSize: 22, fontWeight: 600, marginTop: 4, marginBottom: 20 },
  yulduzlar: { display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 18 },
  yulduz: { width: 44, height: 44, background: 'transparent', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  chayovoyBolimi: { background: 'var(--fill)', borderRadius: 'var(--r-md)', padding: 14, marginBottom: 14 },
  chayovoyLabel: { fontSize: 13, fontWeight: 400, color: 'var(--secondary-label)', textTransform: 'uppercase', letterSpacing: '-0.08px', marginBottom: 8, textAlign: 'left' },
  chayovoyTaklif: { display: 'flex', gap: 6 },
  chayovoyTugma: { flex: 1, padding: '9px 0', borderRadius: 'var(--r-sm)', background: 'var(--surface)', fontWeight: 600, fontSize: 15, color: 'var(--label)' },
  chayovoyFaol: { background: 'var(--tint)', color: '#fff' },
  chayovoySum: { marginTop: 8, fontSize: 14, fontWeight: 600, color: 'var(--tint)', textAlign: 'center' },
  izoh: { width: '100%', padding: 12, borderRadius: 'var(--r-md)', border: 'none', fontSize: 15, fontFamily: 'inherit', minHeight: 70, resize: 'vertical', marginBottom: 4, background: 'var(--fill)', color: 'var(--label)' },
  izohHisob: { fontSize: 12, color: 'var(--tertiary-label)', textAlign: 'right', marginBottom: 12 },
  chayovoyIxt: { fontWeight: 400, fontSize: 12, textTransform: 'none', color: 'var(--tertiary-label)' },
  tugma: { width: '100%', background: 'var(--tint)', padding: 16, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 17, color: '#fff' },
  otkaz: { width: '100%', background: 'transparent', padding: 12, color: 'var(--tint)', fontSize: 17, fontWeight: 400, marginTop: 4 },
  tugadi: { padding: 20 },
  tugadiIkon: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: 'rgba(52,199,89,0.16)', color: 'var(--yashil)', margin: '0 auto' },
  taktSarl: { fontSize: 22, fontWeight: 600, marginTop: 14 },
  taktIzoh: { fontSize: 15, color: 'var(--secondary-label)', marginTop: 6 },
};
