// Ҳайдовчи даромад панели — бугун/ҳафта/ой/жами кесими, сўнгги 7 кун устунли
// графиги, рейтинг ва сафар ўртачаси. Маълумот /driver/daromad'дан олинади.
// Bottom-sheet ичида очилади.
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useT } from '../i18n';
import Sheet from './Sheet';
import Ikonka from './Ikonka';
import Skelet from './Skelet';

export default function DaromadPaneli({ onYopish }) {
  const { t } = useT();
  const [malumot, setMalumot] = useState(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [davr, setDavr] = useState('bugun'); // bugun | hafta | oy | jami

  useEffect(() => {
    let bekor = false;
    (async () => {
      try {
        const { data } = await api.get('/driver/daromad');
        if (!bekor) setMalumot(data);
      } catch {
        if (!bekor) setMalumot(null);
      } finally {
        if (!bekor) setYuklanmoqda(false);
      }
    })();
    return () => { bekor = true; };
  }, []);

  const son = (n) => (Number(n) || 0).toLocaleString();
  const joriy = malumot?.[davr] || { daromad: 0, safar: 0 };
  const ortacha = joriy.safar > 0 ? Math.round(joriy.daromad / joriy.safar) : 0;
  const kunlik = malumot?.kunlik || [];
  const engKatta = Math.max(1, ...kunlik.map((k) => k.daromad));
  const HAFTA_KUN = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh']; // 0=Якшанба

  const davrlar = [
    { k: 'bugun', n: t('drv.today') },
    { k: 'hafta', n: t('drv.week') },
    { k: 'oy',    n: t('drv.month') },
    { k: 'jami',  n: t('drv.allTime') },
  ];

  return (
    <Sheet onYopish={onYopish} panelClassName="" panelStyle={st.panel}>
      <div style={st.sarlavhaQator}>
        <Ikonka nom="card" size={20} />
        <span style={st.sarlavha}>{t('drv.incomePanel')}</span>
      </div>

      {yuklanmoqda ? (
        <div style={{ padding: '8px 0' }}><Skelet qator={4} balandlik={44} /></div>
      ) : (
        <>
          {/* Давр танлагич */}
          <div style={st.tablar}>
            {davrlar.map((d) => (
              <button
                key={d.k}
                onClick={() => setDavr(d.k)}
                style={{ ...st.tab, ...(davr === d.k ? st.tabFaol : {}) }}
              >
                {d.n}
              </button>
            ))}
          </div>

          {/* Танланган давр катта рақами */}
          <div style={st.bigKarta}>
            <div style={st.bigRaqam}>{son(joriy.daromad)} <span style={st.som}>{t('wait.sum')}</span></div>
            <div style={st.bigQator}>
              <span><b>{joriy.safar}</b> {t('drv.rides')}</span>
              <span style={st.nuqta}>·</span>
              <span>{t('drv.avgPerRide')}: <b>{son(ortacha)}</b></span>
            </div>
          </div>

          {/* Рейтинг + жами сафар */}
          <div style={st.qoshimcha}>
            <div style={st.qoshKarta}>
              <Ikonka nom="star" size={16} />
              <span style={st.qoshRaqam}>{(Number(malumot?.reyting) || 5).toFixed(1)}</span>
              <span style={st.qoshMatn}>{t('drv.rating')}</span>
            </div>
            <div style={st.qoshKarta}>
              <Ikonka nom="road" size={16} />
              <span style={st.qoshRaqam}>{malumot?.jami?.safar || 0}</span>
              <span style={st.qoshMatn}>{t('drv.allTime')}</span>
            </div>
          </div>

          {/* Сўнгги 7 кун — устунли график */}
          <div style={st.grafikSarlavha}>{t('drv.last7days')}</div>
          {kunlik.every((k) => k.daromad === 0) ? (
            <div style={st.bosh}>{t('drv.noData')}</div>
          ) : (
            <div style={st.grafik}>
              {kunlik.map((k) => {
                const baland = Math.round((k.daromad / engKatta) * 100);
                const kun = new Date(k.kun + 'T00:00:00');
                const bugunmi = k.kun === kunlik[kunlik.length - 1].kun;
                return (
                  <div key={k.kun} style={st.ustunQutu} title={`${son(k.daromad)} ${t('wait.sum')} · ${k.safar} ${t('drv.rides')}`}>
                    <div style={st.ustunFon}>
                      <div style={{ ...st.ustun, height: `${Math.max(baland, k.daromad > 0 ? 6 : 0)}%`, background: bugunmi ? 'var(--tint)' : 'var(--tint-fill)' }} />
                    </div>
                    <span style={st.ustunYorliq}>{HAFTA_KUN[kun.getDay()]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}

const st = {
  panel: { background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '8px 18px 28px' },
  sarlavhaQator: { display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 14px' },
  sarlavha: { fontSize: 18, fontWeight: 700, color: 'var(--label)' },
  tablar: { display: 'flex', gap: 6, background: 'var(--fill)', padding: 4, borderRadius: 'var(--r-full)', marginBottom: 14 },
  tab: { flex: 1, border: 'none', background: 'transparent', color: 'var(--secondary-label)', padding: '8px 0', borderRadius: 'var(--r-full)', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  tabFaol: { background: 'var(--surface)', color: 'var(--label)', boxShadow: 'var(--shadow-1)' },
  bigKarta: { textAlign: 'center', padding: '6px 0 16px' },
  bigRaqam: { fontSize: 36, fontWeight: 800, color: 'var(--tint)', letterSpacing: '0.3px' },
  som: { fontSize: 16, fontWeight: 400, color: 'var(--secondary-label)' },
  bigQator: { display: 'flex', justifyContent: 'center', gap: 8, marginTop: 6, fontSize: 13, color: 'var(--secondary-label)' },
  nuqta: { opacity: 0.5 },
  qoshimcha: { display: 'flex', gap: 10, marginBottom: 18 },
  qoshKarta: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '12px 0', background: 'var(--fill)', borderRadius: 'var(--r-md)' },
  qoshRaqam: { fontSize: 20, fontWeight: 700, color: 'var(--label)' },
  qoshMatn: { fontSize: 12, color: 'var(--secondary-label)' },
  grafikSarlavha: { fontSize: 14, fontWeight: 600, color: 'var(--label)', marginBottom: 10 },
  grafik: { display: 'flex', alignItems: 'flex-end', gap: 8, height: 130 },
  ustunQutu: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' },
  ustunFon: { flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  ustun: { width: '70%', maxWidth: 30, borderRadius: '6px 6px 0 0', minHeight: 0, transition: 'height 0.3s' },
  ustunYorliq: { fontSize: 11, color: 'var(--tertiary-label)', fontWeight: 500 },
  bosh: { textAlign: 'center', padding: '28px 0', color: 'var(--secondary-label)', fontSize: 14 },
};
