// Ҳайдовчи обуна модали — пакетлар + жорий ҳолат
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useT } from '../i18n';
import { useToast } from './Toast';
import Ikonka from './Ikonka';

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
        <div style={st.grabber} />
        <div style={st.header}>
          <div style={st.sarlavha}>{t('sub.title')}</div>
          <button style={st.yopish} onClick={onYopish}><Ikonka nom="x" size={16} /></button>
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
                <Ikonka nom="alert" size={16} /> {t('sub.expired')}
              </div>
            )}

            {/* Бизнинг афзаллик */}
            <div style={st.afzallik}>
              <div style={st.afzSarlavha}>{t('sub.whyTitle')}</div>
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
  fon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 3700, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' },
  modal: { width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', borderRadius: '14px 14px 0 0', padding: '8px 20px 20px' },
  grabber: { width: 36, height: 5, borderRadius: 3, background: 'var(--fill-strong)', margin: '0 auto 12px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sarlavha: { fontSize: 20, fontWeight: 600 },
  yopish: { width: 30, height: 30, borderRadius: '50%', background: 'var(--fill)', color: 'var(--secondary-label)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  bosh: { textAlign: 'center', padding: 40, color: 'var(--secondary-label)' },
  joriy: { background: 'var(--tint-fill)', padding: 14, borderRadius: 'var(--r-md)', marginBottom: 14 },
  joriyLabel: { fontSize: 13, color: 'var(--secondary-label)', fontWeight: 500 },
  joriyKun: { fontSize: 24, fontWeight: 700, color: 'var(--tint)', marginTop: 4 },
  tugagan: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,59,48,0.12)', padding: 14, borderRadius: 'var(--r-md)', marginBottom: 14, color: 'var(--qizil)', fontWeight: 500, fontSize: 15 },
  afzallik: { background: 'rgba(255,149,0,0.12)', padding: 14, borderRadius: 'var(--r-md)', marginBottom: 16 },
  afzSarlavha: { fontSize: 15, fontWeight: 600, color: 'var(--amber)' },
  afzIzoh: { fontSize: 13, color: 'var(--amber)', opacity: 0.9, marginTop: 4, lineHeight: 1.4 },
  paketlar: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  paket: { background: 'var(--surface)', padding: 14, borderRadius: 'var(--r-md)', textAlign: 'left', border: '0.5px solid var(--separator)' },
  paketTavsiya: { border: '2px solid var(--tint)' },
  paketYuqori: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  paketIsm: { fontSize: 14, fontWeight: 600, color: 'var(--label)' },
  tavsiyaBelgi: { background: 'var(--tint)', color: '#fff', padding: '2px 7px', borderRadius: 'var(--r-full)', fontSize: 9, fontWeight: 600 },
  paketNarx: { fontSize: 20, fontWeight: 700, color: 'var(--label)' },
  paketSom: { fontSize: 12, fontWeight: 400, color: 'var(--secondary-label)' },
  paketKun: { fontSize: 13, color: 'var(--secondary-label)', marginTop: 2 },
};
