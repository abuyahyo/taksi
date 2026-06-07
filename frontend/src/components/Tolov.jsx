// Тўлов модали — Payme, Click ёки тест
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useT } from '../i18n';
import Ikonka from './Ikonka';
import Sheet from './Sheet';
import { tebrat, TEBRANISH } from '../services/haptika';

export default function Tolov({ rideId, summa, onYopish, onTolandi }) {
  const { t, til } = useT();
  const [holat, setHolat] = useState(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [xato, setXato] = useState('');

  useEffect(() => {
    if (!rideId) return;
    api.get(`/payment/status/${rideId}`).then(({ data }) => setHolat(data)).catch(() => {});
  }, [rideId]);

  const allaqachonTolangan = holat && holat.holat === 'tolandi';

  const tashqigaOch = async (tizim) => {
    setYuborilmoqda(true);
    setXato('');
    try {
      const { data } = await api.post('/payment/url', {
        rideId, tizim, til, returnUrl: window.location.origin,
      });
      window.open(data.url, '_blank');
      // Foydalanuvchi qaytib kelganda holat'ni qayta yuklaymiz
      setTimeout(() => api.get(`/payment/status/${rideId}`).then(({ data: d }) => setHolat(d)).catch(() => {}), 1000);
    } catch (err) {
      setXato(err.response?.data?.xato || t('common.error'));
    }
    setYuborilmoqda(false);
  };

  const testTola = async () => {
    setYuborilmoqda(true);
    setXato('');
    try {
      await api.post('/payment/test-pay', { rideId });
      const { data } = await api.get(`/payment/status/${rideId}`);
      setHolat(data);
      tebrat(TEBRANISH.muvaffaqiyat);
      onTolandi?.();
      setTimeout(onYopish, 1200);
    } catch (err) {
      setXato(err.response?.data?.xato || t('common.error'));
    }
    setYuborilmoqda(false);
  };

  return (
    <Sheet onYopish={onYopish} zIndex={3800} panelStyle={{ padding: '0 20px 20px' }}>
        <div style={st.header}>
          <div style={st.sarlavha}>{t('pay.title')}</div>
          <button style={st.yopish} onClick={onYopish}><Ikonka nom="x" size={16} /></button>
        </div>

        <div style={st.summaQutisi}>
          <div style={st.summaLabel}>{t('pay.amount')}</div>
          <div style={st.summaRaqam}>{Number(summa).toLocaleString()} сўм</div>
        </div>

        {allaqachonTolangan ? (
          <div style={st.tolanganBelgi}>{t('pay.alreadyPaid')}</div>
        ) : (
          <div style={st.tugmalar}>
            <button
              style={st.payme}
              disabled={yuborilmoqda}
              onClick={() => tashqigaOch('payme')}
            >{t('pay.payme')}</button>
            <button
              style={st.click}
              disabled={yuborilmoqda}
              onClick={() => tashqigaOch('click')}
            >{t('pay.click')}</button>
            <div style={st.ajratgich} />
            <button
              style={st.test}
              disabled={yuborilmoqda}
              onClick={testTola}
            >{t('pay.test')}</button>
            <div style={st.testHint}>{t('pay.testHint')}</div>
          </div>
        )}

        {xato && <div style={st.xato}>{xato}</div>}
        <button style={st.bekor} onClick={onYopish}>{t('common.close')}</button>
    </Sheet>
  );
}

const st = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  sarlavha: { fontSize: 20, fontWeight: 600 },
  yopish: { width: 44, height: 44, borderRadius: '50%', background: 'var(--fill)', color: 'var(--secondary-label)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  summaQutisi: { background: 'var(--fill)', padding: 18, borderRadius: 'var(--r-lg)', textAlign: 'center', marginBottom: 18 },
  summaLabel: { fontSize: 13, color: 'var(--secondary-label)' },
  summaRaqam: { fontSize: 34, fontWeight: 700, marginTop: 4, letterSpacing: '0.36px' },
  tolanganBelgi: { textAlign: 'center', padding: 18, background: 'rgba(52,199,89,0.14)', color: 'var(--yashil)', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, marginBottom: 14 },
  tugmalar: { display: 'flex', flexDirection: 'column', gap: 10 },
  payme: { background: 'var(--payme)', color: '#fff', padding: 15, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 17 },
  click: { background: 'var(--click)', color: '#fff', padding: 15, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 17 },
  ajratgich: { height: '0.5px', background: 'var(--separator)', margin: '6px 0' },
  test: { background: 'var(--fill)', color: 'var(--label)', padding: 14, borderRadius: 'var(--r-lg)', fontWeight: 500, fontSize: 15 },
  testHint: { fontSize: 13, color: 'var(--secondary-label)', textAlign: 'center', marginTop: -2 },
  xato: { color: 'var(--qizil)', fontSize: 14, textAlign: 'center', marginTop: 12 },
  bekor: { width: '100%', background: 'transparent', padding: 12, color: 'var(--tint)', fontSize: 17, fontWeight: 400, marginTop: 12 },
};
