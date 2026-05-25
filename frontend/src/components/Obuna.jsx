// 💳 Ҳайдовчи обуна модали — пакетлар + жорий ҳолат
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useT } from '../i18n';
import { useToast } from './Toast';

export default function Obuna({ onYopish, onYangilandi }) {
  const { t } = useT();
  const toast = useToast();
  const [holat, setHolat] = useState(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [sotibOlinmoqda, setSotibOlinmoqda] = useState(null);

  const yukla = async () => {
    try {
      const { data } = await api.get('/driver/subscription');
      setHolat(data);
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    }
    setYuklanmoqda(false);
  };
  useEffect(() => { yukla(); }, []);

  const sotibOl = async (turi) => {
    setSotibOlinmoqda(turi);
    try {
      const { data } = await api.post('/driver/subscription/buy', { turi });
      toast.success(t('sub.bought'));
      setHolat((h) => h ? { ...h, faol: data.obuna } : h);
      onYangilandi?.(data.obuna);
      yukla();
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    }
    setSotibOlinmoqda(null);
  };

  const qolganKun = (sana) => {
    if (!sana) return 0;
    const diff = new Date(sana) - new Date();
    return Math.max(0, Math.ceil(diff / 86400000));
  };

  const turi2matn = {
    trial:    t('sub.trial'),
    kunlik:   t('sub.daily'),
    haftalik: t('sub.weekly'),
    oylik:    t('sub.monthly'),
    yillik:   t('sub.yearly'),
  };

  return (
    <div style={st.fon} onClick={onYopish}>
      <div style={st.modal} className="glass slide-up-modal" onClick={(e) => e.stopPropagation()}>
        <div style={st.header}>
          <div style={st.sarlavha}>💳 {t('sub.title')}</div>
          <button style={st.yopish} onClick={onYopish}>✕</button>
        </div>

        {yuklanmoqda ? (
          <div style={st.bosh}>{t('common.loading')}</div>
        ) : (
          <>
            {/* Жорий обуна */}
            {holat?.faol ? (
              <div style={st.joriy}>
                <div style={st.joriyLabel}>{t('sub.current')}: {turi2matn[holat.faol.turi]}</div>
                <div style={st.joriyKun}>{qolganKun(holat.faol.tugash_sana)} {t('sub.daysLeft')}</div>
              </div>
            ) : (
              <div style={st.tugagan}>
                ⚠️ {t('sub.expired')}
              </div>
            )}

            {/* Бизнинг афзаллик */}
            <div style={st.afzallik}>
              <div style={st.afzSarlavha}>🌟 {t('sub.whyTitle')}</div>
              <div style={st.afzIzoh}>{t('sub.whyHint')}</div>
            </div>

            {/* Пакетлар */}
            <div style={st.paketlar}>
              {['kunlik', 'haftalik', 'oylik', 'yillik'].map((turi) => {
                const p = holat?.paketlar?.[turi];
                if (!p) return null;
                const tavsiya = turi === 'oylik';
                return (
                  <button
                    key={turi}
                    style={{ ...st.paket, ...(tavsiya ? st.paketTavsiya : {}) }}
                    onClick={() => sotibOl(turi)}
                    disabled={sotibOlinmoqda === turi}
                  >
                    <div style={st.paketYuqori}>
                      <span style={st.paketIsm}>{turi2matn[turi]}</span>
                      {tavsiya && <span style={st.tavsiyaBelgi}>{t('sub.recommended')}</span>}
                    </div>
                    <div style={st.paketNarx}>{p.summa.toLocaleString()} <span style={st.paketSom}>{t('wait.sum')}</span></div>
                    <div style={st.paketKun}>{p.kun} {t('sub.days')}</div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const st = {
  fon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 3700 },
  modal: { width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', borderRadius: '24px 24px 0 0', padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sarlavha: { fontSize: 19, fontWeight: 800 },
  yopish: { width: 36, height: 36, borderRadius: '50%', background: 'var(--neutral-100)', fontSize: 16 },
  bosh: { textAlign: 'center', padding: 40, color: 'var(--kulrang)' },
  joriy: { background: 'var(--asosiy-surface)', borderLeft: '4px solid var(--asosiy)', padding: 14, borderRadius: 12, marginBottom: 14 },
  joriyLabel: { fontSize: 13, color: 'var(--qora-faint)', fontWeight: 600 },
  joriyKun: { fontSize: 24, fontWeight: 800, color: 'var(--asosiy-dark)', marginTop: 4 },
  tugagan: { background: '#FEE2E2', borderLeft: '4px solid #DC2626', padding: 14, borderRadius: 12, marginBottom: 14, color: '#7F1D1D', fontWeight: 700, fontSize: 14 },
  afzallik: { background: 'var(--amber-light)', padding: 12, borderRadius: 12, marginBottom: 16, borderLeft: '4px solid var(--amber)' },
  afzSarlavha: { fontSize: 13, fontWeight: 800, color: 'var(--amber-dark)' },
  afzIzoh: { fontSize: 12, color: 'var(--amber-dark)', opacity: 0.85, marginTop: 4, lineHeight: 1.45 },
  paketlar: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  paket: { background: 'var(--oq)', padding: 14, borderRadius: 14, textAlign: 'left', border: '1px solid var(--neutral-200)', boxShadow: 'var(--shadow-1)' },
  paketTavsiya: { borderColor: 'var(--asosiy)', boxShadow: 'var(--shadow-sariq)' },
  paketYuqori: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  paketIsm: { fontSize: 13, fontWeight: 700, color: 'var(--qora)' },
  tavsiyaBelgi: { background: 'var(--sariq)', color: 'var(--oq)', padding: '2px 6px', borderRadius: 6, fontSize: 9, fontWeight: 800 },
  paketNarx: { fontSize: 19, fontWeight: 800, color: 'var(--qora)' },
  paketSom: { fontSize: 11, fontWeight: 600, color: 'var(--kulrang)' },
  paketKun: { fontSize: 12, color: 'var(--kulrang)', marginTop: 2 },
};
