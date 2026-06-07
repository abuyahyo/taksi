// Сафар тарихи — фойдаланувчи мижоз ёки ҳайдовчи сифатида қилган сафарлар
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Kirish from '../components/Kirish';
import Pastki from '../components/Pastki';
import { SkeletKarta } from '../components/Skelet';
import { useT } from '../i18n';
import Ikonka from '../components/Ikonka';
import BuyumQoldi from '../components/BuyumQoldi';

export default function SafarTarixi() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); }
    catch { return null; }
  });

  if (!user) return (
    <div style={st.sahifa}>
      <Kirish sarlavhaKey="login.titleHistory" onKirildi={setUser} />
      <Pastki faol="tarix" />
    </div>
  );

  return <Ichki user={user} onOrqaga={() => navigate('/yolovchi')} onChiqish={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); }} />;
}

function Ichki({ user, onOrqaga, onChiqish }) {
  const { t } = useT();
  const [rides, setRides] = useState(null);
  const [xato, setXato] = useState('');
  const [topilmalar, setTopilmalar] = useState({}); // ride_id → топилма сўрови
  const [modalRide, setModalRide] = useState(null); // {ride, topilma} — очиқ ойна

  useEffect(() => {
    api.get('/rides/me')
      .then(({ data }) => setRides(data))
      .catch((err) => {
        if (err.response?.status === 401) onChiqish();
        else setXato(err.response?.data?.xato || t('common.error'));
      });
    api.get('/topilma')
      // yangilangan DESC келади — teskari қилиб энг янгиси картада қолсин
      .then(({ data }) => setTopilmalar(Object.fromEntries(data.slice().reverse().map((x) => [x.ride_id, x]))))
      .catch(() => {});
  }, []);

  // Буюм-сўров ойнаси ўзгариш қайтарганда рўйхатни янгилаймиз
  const topilmaYangilandi = (tp) => setTopilmalar((oldin) => ({ ...oldin, [tp.ride_id]: tp }));

  // "Буюм қолди" сўрови мумкинми (йўловчи, тугаган, ҳайдовчили, 48 соат ичида)
  const buyumMumkinmi = (r, menMijoz) => {
    if (!menMijoz || r.holat !== 'yakunlandi' || !r.haydovchi_id) return false;
    const asos = r.yakun_vaqti || r.qabul_vaqti || r.yaratilgan;
    return asos && (Date.now() - new Date(asos).getTime()) / 3600000 <= 48;
  };

  const sana = (v) => {
    if (!v) return '';
    const d = new Date(v);
    return d.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const holatBelgi = (h) => {
    const ranglar = {
      yakunlandi: st.holatYashil,
      qabul_qilindi: st.holatKok,
      kutilmoqda: st.holatSariq,
      bekor_qilindi: st.holatKulrang,
    };
    return { matn: t(`hist.status.${h}`) !== `hist.status.${h}` ? t(`hist.status.${h}`) : h, ...(ranglar[h] || st.holatKulrang) };
  };

  return (
    <div style={st.sahifa}>
      <div style={st.header}>
        <button style={st.orqaga} onClick={onOrqaga}><Ikonka nom="arrow-left" size={18} /></button>
        <div style={st.sarlavha}>{t('hist.title')}</div>
        <button style={st.chiqish} onClick={onChiqish}>{t('common.exit')}</button>
      </div>

      <div style={st.kontent}>
        {xato && <div style={st.xato}>{xato}</div>}

        {rides == null ? (
          <div style={st.royxat}>
            {[0, 1, 2, 3].map((i) => <SkeletKarta key={i} />)}
          </div>
        ) : rides.length === 0 ? (
          <div style={st.bosh}>
            <div style={st.boshIkon}><Ikonka nom="taxi" size={34} /></div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 12, color: 'var(--label)' }}>{t('hist.empty')}</div>
            <div style={{ fontSize: 15, color: 'var(--secondary-label)', marginTop: 6 }}>{t('hist.emptyHint')}</div>
          </div>
        ) : (
          <div style={st.royxat} className="royxat-anim">
            {rides.map((r) => {
              const menMijoz = Number(r.mijoz_id) === Number(user.id);
              const hamroh = menMijoz ? (r.haydovchi_ism || '—') : (r.mijoz_ism || t('hist.guest'));
              const hamrohBelgi = menMijoz ? 'car' : 'passenger';
              const h = holatBelgi(r.holat);
              return (
                <div key={r.id} style={st.karta}>
                  <div style={st.kartaYuqori}>
                    <div style={st.kartaSarlavha}>#{r.id} · {sana(r.yaratilgan)}</div>
                    <span style={{ ...st.holatBelgi, background: h.bg, color: h.fg }}>{h.matn}</span>
                  </div>
                  <div style={st.yol}>
                    <span style={{ ...st.nuqta, background: 'var(--yashil)' }} />
                    <span style={st.yolMatn}>{r.boshlanish_manzil || '—'}</span>
                  </div>
                  <div style={st.chiziq} />
                  <div style={st.yol}>
                    <span style={{ ...st.nuqta, background: 'var(--qizil)' }} />
                    <span style={st.yolMatn}>{r.tugash_manzil || '—'}</span>
                  </div>
                  <div style={st.kartaPast}>
                    <div style={st.hamroh}><Ikonka nom={hamrohBelgi} size={14} /> {hamroh}</div>
                    <div style={st.narx}>
                      {r.kelishilgan_narx
                        ? Number(r.kelishilgan_narx).toLocaleString()
                        : r.taklif_narx ? `~${Number(r.taklif_narx).toLocaleString()}` : '—'}
                    </div>
                  </div>
                  {(() => {
                    const tp = topilmalar[r.id];
                    const ochiq = tp && ['soraldi', 'topildi', 'kelishildi'].includes(tp.holat);
                    if (ochiq) return (
                      <button style={st.buyumTugma} onClick={() => setModalRide({ ride: r, topilma: tp })}>
                        <Ikonka nom="chat" size={15} /> {t('lost.openRequest')}
                      </button>
                    );
                    // Ёпиқ сўров бўлса ҳам йўловчи янги сўров бера олади (нотўғри бекор қилган бўлса)
                    if (buyumMumkinmi(r, menMijoz)) return (
                      <button style={st.buyumTugma} onClick={() => setModalRide({ ride: r, topilma: null })}>
                        <Ikonka nom="alert" size={15} /> {t('lost.leftItem')}
                      </button>
                    );
                    if (tp) return (
                      <button style={st.buyumTugma} onClick={() => setModalRide({ ride: r, topilma: tp })}>
                        <Ikonka nom="check" size={15} /> {t('lost.viewRequest')}
                      </button>
                    );
                    return null;
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Pastki faol="tarix" />

      {modalRide && (() => {
        const menMijoz = Number(modalRide.ride.mijoz_id) === Number(user.id);
        const hamroh = menMijoz ? (modalRide.ride.haydovchi_ism || '—') : (modalRide.ride.mijoz_ism || t('hist.guest'));
        return (
          <BuyumQoldi
            ride={modalRide.ride}
            topilma={modalRide.topilma}
            menMijoz={menMijoz}
            meId={user.id}
            hamrohIsm={hamroh}
            onYopish={() => setModalRide(null)}
            onYangilandi={topilmaYangilandi}
          />
        );
      })()}
    </div>
  );
}

const st = {
  sahifa: { width: '100%', maxWidth: 720, margin: '0 auto', minHeight: '100dvh', background: 'var(--bg)', paddingBottom: 'env(safe-area-inset-bottom)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', paddingTop: 'calc(10px + env(safe-area-inset-top))', background: 'var(--material-bar)', backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)', borderBottom: '0.5px solid var(--separator)', gap: 12, position: 'sticky', top: 0, zIndex: 50 },
  orqaga: { width: 44, height: 44, borderRadius: '50%', background: 'var(--fill)', color: 'var(--tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sarlavha: { flex: 1, fontWeight: 600, fontSize: 17, textAlign: 'center', color: 'var(--label)' },
  chiqish: { background: 'transparent', color: 'var(--tint)', padding: '6px 8px', fontSize: 15, fontWeight: 400 },
  kontent: { padding: '16px 16px calc(220px + env(safe-area-inset-bottom))' },
  xato: { background: 'rgba(255,59,48,0.12)', color: 'var(--qizil)', padding: 12, borderRadius: 'var(--r-md)', marginBottom: 12, fontSize: 14 },
  bosh: { textAlign: 'center', padding: 60, color: 'var(--secondary-label)' },
  boshIkon: { display: 'inline-flex', color: 'var(--tertiary-label)' },
  royxat: { display: 'flex', flexDirection: 'column', gap: 10 },
  karta: { background: 'var(--surface)', padding: 16, borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-1)' },
  kartaYuqori: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  kartaSarlavha: { fontWeight: 400, fontSize: 13, color: 'var(--secondary-label)' },
  holatBelgi: { padding: '3px 10px', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 600 },
  holatYashil: { bg: 'rgba(52,199,89,0.16)', fg: 'var(--yashil)' },
  holatKok:    { bg: 'rgba(0,122,255,0.14)', fg: 'var(--kok)' },
  holatSariq:  { bg: 'rgba(255,149,0,0.16)', fg: 'var(--amber)' },
  holatKulrang:{ bg: 'var(--fill)', fg: 'var(--secondary-label)' },
  yol: { display: 'flex', alignItems: 'center', gap: 10 },
  nuqta: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  chiziq: { width: 2, height: 14, background: 'var(--separator)', marginLeft: 4 },
  yolMatn: { fontSize: 15, fontWeight: 400 },
  kartaPast: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '0.5px solid var(--separator)' },
  hamroh: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 14, color: 'var(--secondary-label)' },
  narx: { fontSize: 16, fontWeight: 700 },
  buyumTugma: { width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, padding: 10, borderRadius: 'var(--r-md)', background: 'var(--fill)', color: 'var(--tint)', fontSize: 14, fontWeight: 600 },
};
