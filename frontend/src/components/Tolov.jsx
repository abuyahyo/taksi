// Тўлов модали — Payme, Click ёки тест
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useT } from '../i18n';

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
      onTolandi?.();
      setTimeout(onYopish, 1200);
    } catch (err) {
      setXato(err.response?.data?.xato || t('common.error'));
    }
    setYuborilmoqda(false);
  };

  return (
    <div style={st.fon} onClick={onYopish}>
      <div style={st.modal} className="glass slide-up-modal" onClick={(e) => e.stopPropagation()}>
        <div style={st.header}>
          <div style={st.sarlavha}>💳 {t('pay.title')}</div>
          <button style={st.yopish} onClick={onYopish}>✕</button>
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
              style={{ ...st.payme, opacity: yuborilmoqda ? 0.5 : 1 }}
              disabled={yuborilmoqda}
              onClick={() => tashqigaOch('payme')}
            >{t('pay.payme')}</button>
            <button
              style={{ ...st.click, opacity: yuborilmoqda ? 0.5 : 1 }}
              disabled={yuborilmoqda}
              onClick={() => tashqigaOch('click')}
            >{t('pay.click')}</button>
            <div style={st.ajratgich} />
            <button
              style={{ ...st.test, opacity: yuborilmoqda ? 0.5 : 1 }}
              disabled={yuborilmoqda}
              onClick={testTola}
            >{t('pay.test')}</button>
            <div style={st.testHint}>{t('pay.testHint')}</div>
          </div>
        )}

        {xato && <div style={st.xato}>{xato}</div>}
        <button style={st.bekor} onClick={onYopish}>{t('common.close')}</button>
      </div>
    </div>
  );
}

const st = {
  fon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 3800, padding: 0 },
  modal: { width: '100%', maxWidth: 480, borderRadius: '24px 24px 0 0', padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sarlavha: { fontSize: 19, fontWeight: 800 },
  yopish: { width: 36, height: 36, borderRadius: '50%', background: 'var(--och-kulrang)', fontSize: 16 },
  summaQutisi: { background: 'var(--och-kulrang)', padding: 18, borderRadius: 14, textAlign: 'center', marginBottom: 18 },
  summaLabel: { fontSize: 13, color: 'var(--kulrang)' },
  summaRaqam: { fontSize: 32, fontWeight: 800, marginTop: 4 },
  tolanganBelgi: { textAlign: 'center', padding: 18, background: '#DCFCE7', color: '#16A34A', borderRadius: 12, fontWeight: 700, fontSize: 15, marginBottom: 14 },
  tugmalar: { display: 'flex', flexDirection: 'column', gap: 10 },
  payme: { background: '#00C2A6', color: 'var(--oq)', padding: 16, borderRadius: 14, fontWeight: 800, fontSize: 16 },
  click: { background: '#1E40AF', color: 'var(--oq)', padding: 16, borderRadius: 14, fontWeight: 800, fontSize: 16 },
  ajratgich: { height: 1, background: '#E5E7EB', margin: '6px 0' },
  test: { background: 'var(--sariq)', color: 'var(--qora)', padding: 14, borderRadius: 14, fontWeight: 700, fontSize: 14 },
  testHint: { fontSize: 11, color: 'var(--kulrang)', textAlign: 'center', marginTop: -4 },
  xato: { color: 'var(--qizil)', fontSize: 13, textAlign: 'center', marginTop: 12 },
  bekor: { width: '100%', background: 'transparent', padding: 12, color: 'var(--kulrang)', fontSize: 14, marginTop: 12 },
};
