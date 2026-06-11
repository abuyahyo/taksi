// Шикоят (низо) ойнаси — тугаган/бекор қилинган сафар юзасидан расмий шикоят.
// Рақобатчиларда низо ҳал қилиш йўли йўқ эди; бизда шаффоф: фойдаланувчи
// шикоят киритади, админ кўриб изоҳ билан ҳал қилади, натижани шу ерда кўради.
import { useState } from 'react';
import Sheet from './Sheet';
import Ikonka from './Ikonka';
import { api } from '../services/api';
import { useToast } from './Toast';
import { useT } from '../i18n';
import { tebrat, TEBRANISH } from '../services/haptika';

const TURLAR = ['narx', 'xizmat', 'kelmadi', 'yolgon_keldi', 'xavfsizlik', 'boshqa'];

export default function Shikoyat({ ride, mavjud, onYopish, onYuborildi }) {
  const { t } = useT();
  const toast = useToast();
  const [tur, setTur] = useState('xizmat');
  const [matn, setMatn] = useState('');
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  // Аллақачон шикоят бор бўлса — ҳолатини кўрсатамиз (шаффофлик)
  if (mavjud) {
    const holatMatn = {
      ochiq: t('dispute.statusOchiq'), korildi: t('dispute.statusOchiq'),
      hal: t('dispute.statusHal'), rad: t('dispute.statusRad'),
    }[mavjud.holat] || mavjud.holat;
    const hal = mavjud.holat === 'hal' || mavjud.holat === 'rad';
    return (
      <Sheet onYopish={onYopish} panelClassName="" panelStyle={st.panel}>
        <div style={st.sarlavha}><Ikonka nom="alert" size={20} /> {t('dispute.existing')}</div>
        <div style={{ ...st.holatPill, ...(hal ? st.pillHal : st.pillOchiq) }}>{holatMatn}</div>
        <div style={st.matnKoinot}>{mavjud.matn}</div>
        {mavjud.admin_javob && (
          <div style={st.javobBox}>
            <div style={st.javobSarlavha}>{t('dispute.adminJavob')}</div>
            <div>{mavjud.admin_javob}</div>
          </div>
        )}
        <button style={st.bekor} onClick={onYopish}>{t('common.close')}</button>
      </Sheet>
    );
  }

  const yubor = async () => {
    if (matn.trim().length < 5) { toast.error(t('dispute.tooShort')); return; }
    setYuklanmoqda(true);
    try {
      const { data } = await api.post('/nizo', { rideId: ride.id, tur, matn: matn.trim() });
      tebrat(TEBRANISH.muvaffaqiyat);
      toast.success(t('dispute.sent'));
      onYuborildi?.(data.nizo);
      onYopish();
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    } finally {
      setYuklanmoqda(false);
    }
  };

  return (
    <Sheet onYopish={onYopish} panelClassName="" panelStyle={st.panel}>
      <div style={st.sarlavha}><Ikonka nom="alert" size={20} /> {t('dispute.title')}</div>
      <div style={st.intro}>{t('dispute.intro')}</div>

      <div style={st.label}>{t('dispute.type')}</div>
      <div style={st.turlar}>
        {TURLAR.map((tr) => (
          <button key={tr} style={{ ...st.turTugma, ...(tur === tr ? st.turFaol : {}) }} onClick={() => setTur(tr)}>
            {t(`dispute.type.${tr}`)}
          </button>
        ))}
      </div>

      <div style={st.label}>{t('dispute.matn')}</div>
      <textarea
        style={st.textarea}
        rows={4}
        maxLength={1000}
        placeholder={t('dispute.matnPlaceholder')}
        value={matn}
        onChange={(e) => setMatn(e.target.value)}
      />

      <button style={{ ...st.yubor, opacity: yuklanmoqda ? 0.6 : 1 }} disabled={yuklanmoqda} onClick={yubor}>
        {t('dispute.send')}
      </button>
      <button style={st.bekor} onClick={onYopish}>{t('common.close')}</button>
    </Sheet>
  );
}

const st = {
  panel: { background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '8px 18px calc(20px + env(safe-area-inset-bottom))', maxHeight: '88dvh', overflowY: 'auto' },
  sarlavha: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700, color: 'var(--label)', margin: '6px 0 4px' },
  intro: { fontSize: 14, color: 'var(--secondary-label)', marginBottom: 16, lineHeight: 1.4 },
  label: { fontSize: 13, fontWeight: 600, color: 'var(--secondary-label)', margin: '12px 0 8px' },
  turlar: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  turTugma: { padding: '8px 14px', borderRadius: 'var(--r-full)', background: 'var(--fill)', color: 'var(--label)', fontSize: 14, fontWeight: 500, border: '1px solid transparent' },
  turFaol: { background: 'var(--tint)', color: 'var(--bg)', borderColor: 'var(--tint)' },
  textarea: { width: '100%', padding: 12, borderRadius: 'var(--r-md)', background: 'var(--fill)', color: 'var(--label)', fontSize: 15, border: '1px solid var(--separator)', resize: 'vertical', fontFamily: 'inherit' },
  yubor: { width: '100%', marginTop: 18, padding: 14, borderRadius: 'var(--r-md)', background: 'var(--tint)', color: 'var(--bg)', fontSize: 16, fontWeight: 700 },
  bekor: { width: '100%', marginTop: 8, padding: 12, borderRadius: 'var(--r-md)', background: 'transparent', color: 'var(--secondary-label)', fontSize: 15, fontWeight: 500 },
  holatPill: { display: 'inline-block', padding: '5px 14px', borderRadius: 'var(--r-full)', fontSize: 13, fontWeight: 700, marginBottom: 14 },
  pillOchiq: { background: 'rgba(255,149,0,0.16)', color: 'var(--amber)' },
  pillHal: { background: 'rgba(52,199,89,0.16)', color: 'var(--yashil)' },
  matnKoinot: { fontSize: 15, color: 'var(--label)', background: 'var(--fill)', padding: 12, borderRadius: 'var(--r-md)', marginBottom: 12, whiteSpace: 'pre-wrap' },
  javobBox: { fontSize: 15, color: 'var(--label)', background: 'rgba(0,122,255,0.08)', padding: 12, borderRadius: 'var(--r-md)', marginBottom: 12 },
  javobSarlavha: { fontSize: 12, fontWeight: 700, color: 'var(--kok)', marginBottom: 4 },
};
