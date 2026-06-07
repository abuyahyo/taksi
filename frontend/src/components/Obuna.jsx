// Ҳайдовчи обуна модали — пакетлар + жорий ҳолат
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useT } from '../i18n';
import { useToast } from './Toast';
import Ikonka from './Ikonka';
import Sheet from './Sheet';

export default function Obuna({ onYopish, onYangilandi }) {
  const { t, til } = useT();
  const toast = useToast();
  const [holat, setHolat] = useState(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [sotibOlinmoqda, setSotibOlinmoqda] = useState(null);
  // Тўлов босқичи — пакет танлангач кутилаётган обуна + тўлов усуллари
  const [tolov, setTolov] = useState(null);       // { obunaId, turi, summa }
  const [tolovYubor, setTolovYubor] = useState(false);

  const yukla = async () => {
    try {
      const { data } = await api.get('/driver/subscription');
      setHolat(data);
      return data;
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    } finally {
      setYuklanmoqda(false);
    }
  };
  useEffect(() => { yukla(); }, []);

  // Пакет танлаш — обуна БЕРИЛМАЙДИ, фақат кутилаётган обуна яратилади. Сўнг тўлов.
  const sotibOl = async (turi) => {
    setSotibOlinmoqda(turi);
    try {
      const { data } = await api.post('/driver/subscription/buy', { turi });
      setTolov({ obunaId: data.obunaId, turi, summa: data.summa });
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    }
    setSotibOlinmoqda(null);
  };

  // Payme/Click — ташқи тўлов саҳифасини очамиз; қайтгач обуна ҳолатини текширамиз
  const tashqiTola = async (tizim) => {
    setTolovYubor(true);
    try {
      const { data } = await api.post('/payment/url', {
        obunaId: tolov.obunaId, tizim, til, returnUrl: window.location.origin,
      });
      window.open(data.url, '_blank');
      setTimeout(async () => {
        const yangi = await yukla();
        if (yangi?.faol) { toast.success(t('sub.bought')); onYangilandi?.(yangi.faol); setTolov(null); }
      }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    }
    setTolovYubor(false);
  };

  // Синов тўлови — фақат сервер тест режимида ишлайди
  const testTola = async () => {
    setTolovYubor(true);
    try {
      await api.post('/payment/test-pay', { obunaId: tolov.obunaId });
      const yangi = await yukla();
      toast.success(t('sub.bought'));
      onYangilandi?.(yangi?.faol);
      setTolov(null);
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    }
    setTolovYubor(false);
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
    <Sheet onYopish={onYopish} zIndex={3700} panelStyle={{ padding: '0 20px 20px' }}>
        <div style={st.header}>
          <div style={st.sarlavha}>{t('sub.title')}</div>
          <button style={st.yopish} onClick={onYopish}><Ikonka nom="x" size={16} /></button>
        </div>

        {yuklanmoqda ? (
          <div style={st.bosh}>{t('common.loading')}</div>
        ) : tolov ? (
          /* Тўлов босқичи — танланган пакет учун */
          <>
            <div style={st.summaQutisi}>
              <div style={st.summaLabel}>{turi2matn[tolov.turi]} · {t('pay.amount')}</div>
              <div style={st.summaRaqam}>{Number(tolov.summa).toLocaleString()} {t('wait.sum')}</div>
            </div>
            <div style={st.tolovTugmalar}>
              <button style={st.payme} disabled={tolovYubor} onClick={() => tashqiTola('payme')}>{t('pay.payme')}</button>
              <button style={st.click} disabled={tolovYubor} onClick={() => tashqiTola('click')}>{t('pay.click')}</button>
              <div style={st.ajratgich} />
              <button style={st.test} disabled={tolovYubor} onClick={testTola}>{t('pay.test')}</button>
              <div style={st.testHint}>{t('pay.testHint')}</div>
            </div>
            <button style={st.orqaga} onClick={() => setTolov(null)}>{t('common.back')}</button>
          </>
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
                    <div style={tavsiya ? st.paketNarxTavsiya : st.paketNarx}>{p.summa.toLocaleString()} <span style={st.paketSom}>{t('wait.sum')}</span></div>
                    <div style={st.paketKun}>{p.kun} {t('sub.days')}</div>
                  </button>
                );
              })}
            </div>
          </>
        )}
    </Sheet>
  );
}

const st = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  sarlavha: { fontSize: 20, fontWeight: 600 },
  yopish: { width: 44, height: 44, borderRadius: '50%', background: 'var(--fill)', color: 'var(--secondary-label)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
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
  paketTavsiya: { border: '2px solid var(--tint)', background: 'var(--tint-fill)' },
  paketYuqori: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  paketIsm: { fontSize: 14, fontWeight: 600, color: 'var(--label)' },
  tavsiyaBelgi: { background: 'var(--tint)', color: '#fff', padding: '3px 8px', borderRadius: 'var(--r-full)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2px' },
  paketNarx: { fontSize: 20, fontWeight: 700, color: 'var(--label)' },
  paketNarxTavsiya: { fontSize: 24, fontWeight: 700, color: 'var(--tint)' },
  paketSom: { fontSize: 12, fontWeight: 400, color: 'var(--secondary-label)' },
  paketKun: { fontSize: 13, color: 'var(--secondary-label)', marginTop: 2 },
  // Тўлов босқичи
  summaQutisi: { background: 'var(--fill)', padding: 18, borderRadius: 'var(--r-lg)', textAlign: 'center', marginBottom: 18 },
  summaLabel: { fontSize: 13, color: 'var(--secondary-label)' },
  summaRaqam: { fontSize: 32, fontWeight: 700, marginTop: 4 },
  tolovTugmalar: { display: 'flex', flexDirection: 'column', gap: 10 },
  payme: { background: 'var(--payme)', color: '#fff', padding: 15, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 17 },
  click: { background: 'var(--click)', color: '#fff', padding: 15, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 17 },
  ajratgich: { height: '0.5px', background: 'var(--separator)', margin: '6px 0' },
  test: { background: 'var(--fill)', color: 'var(--label)', padding: 14, borderRadius: 'var(--r-lg)', fontWeight: 500, fontSize: 15 },
  testHint: { fontSize: 13, color: 'var(--secondary-label)', textAlign: 'center', marginTop: -2 },
  orqaga: { width: '100%', background: 'transparent', padding: 12, color: 'var(--tint)', fontSize: 16, marginTop: 12 },
};
