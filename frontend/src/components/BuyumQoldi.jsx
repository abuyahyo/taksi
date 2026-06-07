// "Буюм қолди" — таксида қолган буюмни тўлов эвазига қайтариш ойнаси.
// inDrive услуби: йўловчи нарх таклиф қилади, ҳайдовчи рози бўлади ёки ўз нархини
// беради (савдо). Тўлов нақд, шахсан. Чат орқали жойни мувофиқлаштиришади.
import { useState } from 'react';
import Sheet from './Sheet';
import Chat from './Chat';
import Ikonka from './Ikonka';
import { api } from '../services/api';
import { useToast } from './Toast';
import { useT } from '../i18n';
import { tebrat, TEBRANISH } from '../services/haptika';

const QADAM = 1000;

export default function BuyumQoldi({ ride, topilma, menMijoz, meId, hamrohIsm, onYopish, onYangilandi }) {
  const { t } = useT();
  const toast = useToast();
  const [tp, setTp] = useState(topilma || null);
  const [tavsif, setTavsif] = useState('');
  const [narx, setNarx] = useState(tp?.taklif_narx || 10000);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [chatOchiq, setChatOchiq] = useState(false);
  const [savdoOchiq, setSavdoOchiq] = useState(false); // қарши таклиф киритиш кўриниши

  const menRol = menMijoz ? 'mijoz' : 'haydovchi';

  const sora = async (fn) => {
    setYuklanmoqda(true);
    try {
      const { data } = await fn();
      setTp(data);
      onYangilandi?.(data);
      return data;
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
      return null;
    } finally {
      setYuklanmoqda(false);
    }
  };

  const yarat = async () => {
    if (!tavsif.trim()) { toast.error(t('lost.descNeeded')); return; }
    tebrat(TEBRANISH.muvaffaqiyat);
    const d = await sora(() => api.post('/topilma', { ride_id: ride.id, tavsif: tavsif.trim(), narx }));
    if (d) toast.success(t('lost.sent'));
  };

  const javobBer = (topildi) => { tebrat(TEBRANISH.yengil); sora(() => api.post(`/topilma/${tp.id}/javob`, { topildi })); };
  const narxYubor = async () => {
    tebrat(TEBRANISH.muvaffaqiyat);
    const d = await sora(() => api.post(`/topilma/${tp.id}/narx`, { narx }));
    if (d) setSavdoOchiq(false);
  };
  const kelish = () => { tebrat(TEBRANISH.muvaffaqiyat); sora(() => api.post(`/topilma/${tp.id}/kelishildi`)); };
  const qaytar = () => { tebrat(TEBRANISH.muvaffaqiyat); sora(() => api.post(`/topilma/${tp.id}/qaytarildi`)); };
  const bekorQil = async () => {
    const d = await sora(() => api.post(`/topilma/${tp.id}/bekor`));
    if (d) onYopish();
  };

  // Нарх степпери
  const stepper = (
    <div style={st.narxBox}>
      <button style={st.narxTugma} onClick={() => setNarx((n) => Math.max(0, n - QADAM))}><Ikonka nom="minus" size={20} /></button>
      <div style={st.narxRaqam}>{Number(narx).toLocaleString()}</div>
      <button style={st.narxTugma} onClick={() => setNarx((n) => n + QADAM)}><Ikonka nom="plus" size={20} /></button>
    </div>
  );

  // Ҳолат пилюласи
  const holatMatn = tp && {
    soraldi: t('lost.statusAsked'),
    topildi: t('lost.statusFound'),
    topilmadi: t('lost.statusNotFound'),
    kelishildi: t('lost.statusAgreed'),
    qaytarildi: t('lost.statusReturned'),
    bekor: t('lost.statusCancelled'),
  }[tp.holat];

  return (
    <>
      <Sheet onYopish={onYopish} panelClassName="" panelStyle={st.panel}>
        <div style={st.kontent}>
          <h3 style={st.sarlavha}><Ikonka nom="taxi" size={20} /> {t('lost.title')}</h3>
          <p style={st.yol}>{ride.boshlanish_manzil} → {ride.tugash_manzil}</p>

          {!tp ? (
            // ── ЯРАТИШ (йўловчи) ──
            <>
              <p style={st.izoh}>{t('lost.intro')}</p>
              <textarea
                style={st.textarea}
                value={tavsif}
                onChange={(e) => setTavsif(e.target.value.slice(0, 500))}
                placeholder={t('lost.descPlaceholder')}
                rows={3}
                autoFocus
              />
              <label style={st.label}>{t('lost.offerLabel')}</label>
              {stepper}
              <button style={st.asosiy} disabled={yuklanmoqda} onClick={yarat}>{t('lost.sendRequest')}</button>
              <button style={st.bekor} onClick={onYopish}>{t('common.cancel')}</button>
            </>
          ) : (
            // ── САВДО / ҲОЛАТ ──
            <>
              <div style={st.holatQator}>
                <span style={st.holatPill}>{holatMatn}</span>
              </div>
              <div style={st.tavsifKarta}>{tp.tavsif}</div>

              {/* Жорий нарх */}
              {['topildi', 'kelishildi'].includes(tp.holat) && (
                <div style={st.narxKorsat}>
                  <span style={st.narxLabel}>{tp.holat === 'kelishildi' ? t('lost.agreedPrice') : t('lost.currentOffer')}</span>
                  <span style={st.narxKatta}>{Number(tp.kelishilgan_narx || tp.taklif_narx).toLocaleString()} {t('wait.sum')}</span>
                </div>
              )}

              {/* soraldi — ҳайдовчи жавоб беради */}
              {tp.holat === 'soraldi' && !menMijoz && (
                <>
                  <p style={st.izoh}>{t('lost.driverFoundQ')}</p>
                  <button style={st.accept} disabled={yuklanmoqda} onClick={() => javobBer(true)}>{t('lost.iFound')}</button>
                  <button style={st.decline} disabled={yuklanmoqda} onClick={() => javobBer(false)}>{t('lost.notFound')}</button>
                </>
              )}
              {tp.holat === 'soraldi' && menMijoz && (
                <p style={st.izoh}>{t('lost.waitingDriver')}</p>
              )}

              {/* topildi — савдо */}
              {tp.holat === 'topildi' && (
                <>
                  {tp.taklif_kim === menRol ? (
                    <p style={st.izoh}>{t('lost.waitingOther')}</p>
                  ) : (
                    <button style={st.accept} disabled={yuklanmoqda} onClick={kelish}>
                      {t('lost.agreeFor', { narx: Number(tp.taklif_narx).toLocaleString() })}
                    </button>
                  )}
                  {!savdoOchiq ? (
                    <button style={st.ikkilamchi} onClick={() => { setNarx(tp.taklif_narx); setSavdoOchiq(true); }}>{t('lost.counterOffer')}</button>
                  ) : (
                    <>
                      {stepper}
                      <button style={st.asosiy} disabled={yuklanmoqda} onClick={narxYubor}>{t('lost.sendOffer')}</button>
                      <button style={st.bekor} onClick={() => setSavdoOchiq(false)}>{t('common.cancel')}</button>
                    </>
                  )}
                </>
              )}

              {/* kelishildi — етказиш ва тасдиқ */}
              {tp.holat === 'kelishildi' && (
                <>
                  <p style={st.izoh}>{t('lost.cashHint')}</p>
                  {menMijoz ? (
                    <button style={st.accept} disabled={yuklanmoqda} onClick={qaytar}>{t('lost.iReceived')}</button>
                  ) : (
                    <p style={st.izoh}>{t('lost.waitingReceipt')}</p>
                  )}
                </>
              )}

              {/* Чат — ёпилмаган барча ҳолатларда */}
              {['topildi', 'kelishildi', 'soraldi'].includes(tp.holat) && (
                <button style={st.ikkilamchi} onClick={() => setChatOchiq(true)}>
                  <Ikonka nom="chat" size={18} /> {t('chat.tripChat')}
                </button>
              )}

              {/* Бекор — ёпилмаган ҳолатларда */}
              {['soraldi', 'topildi', 'kelishildi'].includes(tp.holat) && (
                <button style={st.bekor} onClick={bekorQil}>{t('lost.cancelRequest')}</button>
              )}
              {['qaytarildi', 'topilmadi', 'bekor'].includes(tp.holat) && (
                <button style={st.bekor} onClick={onYopish}>{t('common.close')}</button>
              )}
            </>
          )}
        </div>
      </Sheet>

      {chatOchiq && tp && (
        <Chat rideId={tp.ride_id} meId={meId} hamrohIsm={hamrohIsm} onClose={() => setChatOchiq(false)} />
      )}
    </>
  );
}

const st = {
  panel: { background: 'var(--surface-elevated)' },
  kontent: { padding: '0 20px calc(20px + env(safe-area-inset-bottom))' },
  sarlavha: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 20, fontWeight: 600, marginBottom: 6 },
  yol: { fontSize: 14, color: 'var(--secondary-label)', marginBottom: 14 },
  izoh: { fontSize: 15, color: 'var(--secondary-label)', margin: '12px 0', lineHeight: 1.4 },
  textarea: { width: '100%', padding: 14, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--fill)', color: 'var(--label)', fontSize: 16, resize: 'none', fontFamily: 'inherit', marginBottom: 14 },
  label: { display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--secondary-label)', marginBottom: 8 },
  narxBox: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--fill)', padding: 14, borderRadius: 'var(--r-lg)', marginBottom: 14 },
  narxTugma: { width: 44, height: 44, borderRadius: '50%', background: 'var(--surface)', color: 'var(--tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-1)' },
  narxRaqam: { fontSize: 30, fontWeight: 700, letterSpacing: '0.3px' },
  holatQator: { marginBottom: 12 },
  holatPill: { display: 'inline-block', padding: '4px 12px', borderRadius: 'var(--r-full)', background: 'var(--tint-fill)', color: 'var(--tint)', fontSize: 13, fontWeight: 600 },
  tavsifKarta: { background: 'var(--fill)', padding: 14, borderRadius: 'var(--r-md)', fontSize: 15, color: 'var(--label)', marginBottom: 14, lineHeight: 1.4 },
  narxKorsat: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--tint-fill)', borderRadius: 'var(--r-md)', marginBottom: 14 },
  narxLabel: { fontSize: 14, color: 'var(--secondary-label)' },
  narxKatta: { fontSize: 22, fontWeight: 700, color: 'var(--tint)' },
  asosiy: { width: '100%', background: 'var(--ink)', color: 'var(--on-tint)', padding: 15, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 17, marginBottom: 8 },
  accept: { width: '100%', background: 'var(--accept)', color: '#fff', padding: 15, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 17, marginBottom: 8 },
  decline: { width: '100%', background: 'transparent', color: 'var(--decline)', padding: 13, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 15, marginBottom: 8 },
  ikkilamchi: { width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--fill)', color: 'var(--tint)', padding: 13, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 15, marginBottom: 8 },
  bekor: { width: '100%', background: 'transparent', padding: 12, color: 'var(--tint)', fontSize: 16, fontWeight: 400, marginTop: 2 },
};
