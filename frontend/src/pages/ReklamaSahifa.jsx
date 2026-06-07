// Реклама кимошди саҳифаси (рекламачи) — кампания яратиш, очиқ кўтарилувчи
// кимошдида таклиф қилиш, ютганда тўлаш. Битта жой/ой — энг юқори таклиф ютади.
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useT } from '../i18n';
import { useToast } from '../components/Toast';
import Kirish from '../components/Kirish';
import Ikonka from '../components/Ikonka';

export default function ReklamaSahifa() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });
  if (!user) return <Kirish sarlavhaKey="reklama.loginTitle" onKirildi={setUser} />;
  return <Ichki />;
}

function Ichki() {
  const navigate = useNavigate();
  const { t } = useT();
  const toast = useToast();
  const [holat, setHolat] = useState(null); // { auksion, kampaniyalar, yutuqlar }
  const [yuk, setYuk] = useState(true);
  const [tanlangan, setTanlangan] = useState(null); // таклиф учун танланган кампания id
  const [taklif, setTaklif] = useState('');
  const [band, setBand] = useState(false);
  const [forma, setForma] = useState(null); // null | {sarlavha, rasm_url, havola}
  const [hozir, setHozir] = useState(() => Date.now());

  const yukla = () => api.get('/reklama/auksion').then(({ data }) => {
    setHolat(data);
    setYuk(false);
    // Дастлабки танланган кампания — биринчи тасдиқланган
    setTanlangan((eski) => eski || data.kampaniyalar.find((k) => k.holat === 'tasdiqlangan')?.id || null);
  }).catch(() => setYuk(false));

  useEffect(() => { yukla(); }, []);
  // Очиқ кимошди бўлса — ҳолатни даврий янгилаймиз (реал вақтга яқин) + таймер
  useEffect(() => {
    const t1 = setInterval(() => setHozir(Date.now()), 1000);
    const t2 = setInterval(yukla, 7000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  const a = holat?.auksion;
  const tasdiqlanganlar = (holat?.kampaniyalar || []).filter((k) => k.holat === 'tasdiqlangan');

  // Қолган вақт матни
  const qolganMatn = () => {
    if (!a) return '';
    const ms = new Date(a.tugash) - hozir;
    if (ms <= 0) return '0:00:00';
    const kun = Math.floor(ms / 86400000);
    const soat = Math.floor((ms % 86400000) / 3600000);
    const daq = Math.floor((ms % 3600000) / 60000);
    const sek = Math.floor((ms % 60000) / 1000);
    return kun > 0 ? `${kun} кун ${soat} соат` : `${soat}:${String(daq).padStart(2, '0')}:${String(sek).padStart(2, '0')}`;
  };

  // Ютуқ тўлов муддати — қанча қолгани (ўтган бўлса "тез орада ўтади")
  const tolovQolgan = (muddat) => {
    const ms = new Date(muddat) - hozir;
    if (ms <= 0) return t('reklama.paySoon');
    const soat = Math.floor(ms / 3600000);
    return soat > 0
      ? t('reklama.payLeftH', { n: soat })
      : t('reklama.payLeftM', { n: Math.max(1, Math.floor((ms % 3600000) / 60000)) });
  };

  const taklifQil = async () => {
    const summa = parseInt(taklif, 10);
    if (!tanlangan) { toast.error(t('reklama.needApproved')); return; }
    if (!Number.isFinite(summa) || summa <= 0) { toast.error(t('reklama.bidPh')); return; }
    setBand(true);
    try {
      await api.post('/reklama/taklif', { kampaniya_id: tanlangan, summa });
      toast.success(t('reklama.bidPlaced'));
      setTaklif('');
      yukla();
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    } finally { setBand(false); }
  };

  const kampaniyaYubor = async () => {
    const f = forma;
    if (!f?.sarlavha?.trim() || !f?.rasm_url?.trim() || !f?.havola?.trim()) { toast.error(t('reklama.formIncomplete')); return; }
    setBand(true);
    try {
      await api.post('/reklama/kampaniya', f);
      toast.success(t('reklama.campaignSent'));
      setForma(null);
      yukla();
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    } finally { setBand(false); }
  };

  // Ютуқни тўлаш — test/payme/click
  const tola = async (yutuq, tizim) => {
    setBand(true);
    try {
      if (tizim === 'test') {
        await api.post('/payment/test-pay', { reklamaId: yutuq.id });
        toast.success(t('reklama.paid'));
        yukla();
      } else {
        const { data } = await api.post('/payment/url', { reklamaId: yutuq.id, tizim, returnUrl: window.location.href });
        window.location.href = data.url;
      }
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    } finally { setBand(false); }
  };

  const holatBelgi = (h) => h === 'tasdiqlangan' ? t('reklama.statusApproved') : h === 'rad' ? t('reklama.statusRejected') : t('reklama.statusPending');
  const holatRang = (h) => h === 'tasdiqlangan' ? 'var(--accept)' : h === 'rad' ? 'var(--decline)' : 'var(--amber)';

  return (
    <div style={st.sahifa}>
      <div style={st.header}>
        <button style={st.orqa} className="press" onClick={() => navigate(-1)} aria-label={t('common.back')}><Ikonka nom="arrow-left" size={20} /></button>
        <h1 style={st.sarlavha}>{t('reklama.title')}</h1>
      </div>

      {yuk ? (
        <div style={st.markaz}><span className="spinner" /></div>
      ) : (
        <div style={st.tana}>
          {/* Ютуқлар — тўлаш керак */}
          {(holat?.yutuqlar || []).map((y) => (
            <div key={y.id} style={st.yutuq}>
              <div style={st.yutuqSarl}><Ikonka nom="check" size={16} /> {t('reklama.won')}</div>
              <div style={st.yutuqMatn}>{t('reklama.wonPay', { oy: y.oy, sum: Number(y.golib_summa).toLocaleString() })}</div>
              {y.tolov_muddati && (
                <div style={st.yutuqMuddat}>{tolovQolgan(y.tolov_muddati)}</div>
              )}
              <div style={st.tolovlar}>
                <button style={st.tolPayme} disabled={band} onClick={() => tola(y, 'payme')}>Payme</button>
                <button style={st.tolClick} disabled={band} onClick={() => tola(y, 'click')}>Click</button>
                <button style={st.tolTest} disabled={band} onClick={() => tola(y, 'test')}>{t('reklama.testPay')}</button>
              </div>
            </div>
          ))}

          {/* Кимошди картаси */}
          <div style={st.karta}>
            <div style={st.kartaSarl}>{t('reklama.auctionTitle')}</div>
            {a ? (
              <>
                <div style={st.oy}>{t('reklama.month', { oy: a.oy })}</div>
                <div style={st.narxBlok}>
                  <div>
                    <div style={st.narxLabel}>{t('reklama.current')}</div>
                    <div style={st.narx}>{a.joriy_narx > 0 ? `${Number(a.joriy_narx).toLocaleString()}` : t('reklama.noBids')}</div>
                  </div>
                  <div style={st.taymer}>
                    <div style={st.narxLabel}>{t('reklama.endsIn')}</div>
                    <div style={st.taymerRaqam}>{qolganMatn()}</div>
                  </div>
                </div>
                {a.joriy_narx > 0 && (
                  <div style={{ ...st.holatPil, background: a.yetakchimi ? 'rgba(6,193,103,0.15)' : 'rgba(225,25,0,0.12)', color: a.yetakchimi ? 'var(--accept)' : 'var(--decline)' }}>
                    {a.yetakchimi ? t('reklama.leading') : t('reklama.outbid')}
                  </div>
                )}

                {tasdiqlanganlar.length === 0 ? (
                  <div style={st.ogoh}>{t('reklama.needApproved')}</div>
                ) : (
                  <>
                    {tasdiqlanganlar.length > 1 && (
                      <select style={st.select} value={tanlangan || ''} onChange={(e) => setTanlangan(Number(e.target.value))}>
                        {tasdiqlanganlar.map((k) => <option key={k.id} value={k.id}>{k.sarlavha}</option>)}
                      </select>
                    )}
                    <div style={st.taklifQator}>
                      <input
                        style={st.input}
                        type="number"
                        inputMode="numeric"
                        value={taklif}
                        onChange={(e) => setTaklif(e.target.value)}
                        placeholder={`${t('reklama.minNext', { sum: Number(a.keyingi_min).toLocaleString() })}`}
                      />
                      <button style={st.taklifTugma} disabled={band} onClick={taklifQil}>{t('reklama.bid')}</button>
                    </div>
                    <div style={st.minIzoh}>{t('reklama.minNext', { sum: Number(a.keyingi_min).toLocaleString() })}</div>
                  </>
                )}
              </>
            ) : (
              <div style={st.ogoh}>{t('reklama.noAuction')}</div>
            )}
          </div>

          {/* Менинг кампаниялар */}
          <div style={st.bolimSarl}>
            <span>{t('reklama.myCampaigns')}</span>
            <button style={st.yangiTugma} onClick={() => setForma({ sarlavha: '', rasm_url: '', havola: '' })}>
              <Ikonka nom="plus" size={15} /> {t('reklama.newCampaign')}
            </button>
          </div>
          {(holat?.kampaniyalar || []).length === 0 && <div style={st.bosh}>{t('reklama.noCampaigns')}</div>}
          {(holat?.kampaniyalar || []).map((k) => (
            <div key={k.id} style={st.kampKarta}>
              <img src={k.rasm_url} alt={k.sarlavha} style={st.kampRasm} loading="lazy" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={st.kampSarl}>{k.sarlavha}</div>
                <div style={{ ...st.kampHolat, color: holatRang(k.holat) }}>{holatBelgi(k.holat)}</div>
                {k.holat === 'rad' && k.rad_sababi && <div style={st.radSabab}>{k.rad_sababi}</div>}
              </div>
            </div>
          ))}

          {/* Қандай ишлайди */}
          <div style={st.how}>
            <Ikonka nom="info" size={16} />
            <span>{t('reklama.how')}</span>
          </div>
        </div>
      )}

      {/* Кампания формаси */}
      {forma && (
        <div style={st.fon} onClick={() => setForma(null)}>
          <div style={st.modal} className="glass slide-up" onClick={(e) => e.stopPropagation()}>
            <div style={st.grabber} />
            <h3 style={st.modalSarl}>{t('reklama.newCampaign')}</h3>
            <input style={st.formInput} value={forma.sarlavha} maxLength={100} onChange={(e) => setForma({ ...forma, sarlavha: e.target.value })} placeholder={t('reklama.formTitle')} />
            <input style={st.formInput} value={forma.rasm_url} onChange={(e) => setForma({ ...forma, rasm_url: e.target.value })} placeholder={t('reklama.formImage')} />
            <input style={st.formInput} value={forma.havola} onChange={(e) => setForma({ ...forma, havola: e.target.value })} placeholder={t('reklama.formLink')} />
            {forma.rasm_url && /^https?:\/\//i.test(forma.rasm_url) && (
              <img src={forma.rasm_url} alt="" style={st.formPreview} />
            )}
            <button style={st.formYubor} disabled={band} onClick={kampaniyaYubor}>{t('reklama.submit')}</button>
            <div style={st.modIzoh}>{t('reklama.moderationNote')}</div>
          </div>
        </div>
      )}
    </div>
  );
}

const st = {
  sahifa: { minHeight: '100vh', background: 'var(--bg)', paddingBottom: 32 },
  header: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10 },
  orqa: { width: 44, height: 44, borderRadius: '50%', background: 'var(--fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--label)' },
  sarlavha: { fontSize: 20, fontWeight: 700 },
  markaz: { display: 'flex', justifyContent: 'center', padding: 60 },
  tana: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 },
  karta: { background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: 18, boxShadow: 'var(--shadow-1)' },
  kartaSarl: { fontSize: 13, fontWeight: 600, color: 'var(--secondary-label)', textTransform: 'uppercase', letterSpacing: '-0.08px', marginBottom: 4 },
  oy: { fontSize: 18, fontWeight: 700, marginBottom: 12 },
  narxBlok: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  narxLabel: { fontSize: 12, color: 'var(--secondary-label)' },
  narx: { fontSize: 28, fontWeight: 800, color: 'var(--tint)', marginTop: 2 },
  taymer: { textAlign: 'right' },
  taymerRaqam: { fontSize: 18, fontWeight: 700, marginTop: 2, fontVariantNumeric: 'tabular-nums' },
  holatPil: { padding: '8px 12px', borderRadius: 'var(--r-md)', fontSize: 14, fontWeight: 600, textAlign: 'center', marginBottom: 12 },
  select: { width: '100%', padding: 12, borderRadius: 'var(--r-md)', background: 'var(--fill)', border: 'none', fontSize: 15, color: 'var(--label)', marginBottom: 10 },
  taklifQator: { display: 'flex', gap: 10 },
  input: { flex: 1, background: 'var(--fill)', border: 'none', borderRadius: 'var(--r-md)', padding: '13px 16px', fontSize: 18, fontWeight: 700, color: 'var(--label)' },
  taklifTugma: { background: 'var(--ink)', color: '#fff', padding: '0 22px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 16 },
  minIzoh: { fontSize: 13, color: 'var(--secondary-label)', marginTop: 8 },
  ogoh: { fontSize: 14, color: 'var(--secondary-label)', textAlign: 'center', padding: '12px 0' },
  bolimSarl: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: 'var(--secondary-label)', textTransform: 'uppercase', letterSpacing: '-0.08px', marginTop: 6 },
  yangiTugma: { display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--tint-fill)', color: 'var(--tint)', padding: '7px 12px', borderRadius: 'var(--r-full)', fontWeight: 600, fontSize: 13, textTransform: 'none' },
  bosh: { fontSize: 14, color: 'var(--tertiary-label)', textAlign: 'center', padding: '8px 0' },
  kampKarta: { display: 'flex', gap: 12, alignItems: 'center', background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 10, boxShadow: 'var(--shadow-1)' },
  kampRasm: { width: 64, height: 48, borderRadius: 'var(--r-sm)', objectFit: 'cover', background: 'var(--fill)', flexShrink: 0 },
  kampSarl: { fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  kampHolat: { fontSize: 13, fontWeight: 600, marginTop: 2 },
  radSabab: { fontSize: 12, color: 'var(--secondary-label)', marginTop: 2 },
  yutuq: { background: 'rgba(6,193,103,0.10)', border: '1px solid rgba(6,193,103,0.3)', borderRadius: 'var(--r-lg)', padding: 14 },
  yutuqSarl: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--accept)', fontSize: 15 },
  yutuqMatn: { fontSize: 14, margin: '6px 0 4px' },
  yutuqMuddat: { fontSize: 13, fontWeight: 600, color: 'var(--amber)', marginBottom: 12 },
  tolovlar: { display: 'flex', gap: 8 },
  tolPayme: { flex: 1, background: '#00cccc', color: '#fff', padding: 11, borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 14 },
  tolClick: { flex: 1, background: '#0099ff', color: '#fff', padding: 11, borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 14 },
  tolTest: { flex: 1, background: 'var(--fill)', color: 'var(--label)', padding: 11, borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 14 },
  how: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: 'var(--secondary-label)', background: 'var(--fill)', padding: 12, borderRadius: 'var(--r-md)', marginTop: 4 },
  fon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 4000 },
  modal: { width: '100%', maxWidth: 420, borderRadius: 'var(--r-xl) var(--r-xl) 0 0', padding: '12px 22px 24px' },
  grabber: { width: 38, height: 5, borderRadius: 3, background: 'var(--neutral-300)', margin: '0 auto 14px' },
  modalSarl: { fontSize: 19, fontWeight: 700, marginBottom: 14, textAlign: 'center' },
  formInput: { width: '100%', background: 'var(--fill)', border: 'none', borderRadius: 'var(--r-md)', padding: '12px 14px', fontSize: 15, color: 'var(--label)', marginBottom: 10 },
  formPreview: { width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 'var(--r-md)', marginBottom: 10 },
  formYubor: { width: '100%', background: 'var(--tint)', color: '#fff', padding: 14, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 16 },
  modIzoh: { fontSize: 12, color: 'var(--tertiary-label)', textAlign: 'center', marginTop: 10 },
};
