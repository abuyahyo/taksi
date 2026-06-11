// Йўловчи севимли ҳайдовчи қўшади — уч хавфсиз йўл билан:
//  1) Код (QR) — 2-босқичдан;
//  2) Аниқ машина рақами — тўлиқ мос (қисман/исм бўйича излаб бўлмайди);
//  3) Олдинги ҳайдовчиларим — фақат ўзи сафар қилганлар (бегона эмас).
// Телефон рақами берилмайди — алоқа доим иловамизда.
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useT } from '../i18n';
import { useToast } from './Toast';
import Ikonka from './Ikonka';

export default function SevimliKodQosh({ boshlangichKod = '', onQoshildi, onYopish }) {
  const { t } = useT();
  const toast = useToast();
  const [kod, setKod] = useState(boshlangichKod.toUpperCase());
  const [topilgan, setTopilgan] = useState(null); // {haydovchi_id, ism, ...}
  const [qidirmoqda, setQidirmoqda] = useState(false);
  const [bandId, setBandId] = useState(null); // қўшилаётган haydovchi_id
  const [oldingilar, setOldingilar] = useState([]);

  const qidir = async (k = kod) => {
    const raw = String(k).trim();
    const tozaKod = raw.replace(/\s+/g, '').toUpperCase();
    if (tozaKod.length < 4) { toast.error(t('favcode.tooShort')); return; }
    setQidirmoqda(true);
    setTopilgan(null);
    try {
      let data;
      try {
        // Аввал код деб синаймиз
        ({ data } = await api.get(`/passenger/driver/${encodeURIComponent(tozaKod)}`));
      } catch (e1) {
        if (e1.response?.status !== 404) throw e1;
        // Топилмаса — машина рақами деб синаймиз
        ({ data } = await api.get(`/passenger/driver-by-plate/${encodeURIComponent(raw)}`));
      }
      setTopilgan(data);
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    } finally {
      setQidirmoqda(false);
    }
  };

  // QR deep-link билан очилганда — кодни дарров қидирамиз; ҳамда олдингиларни юклаймиз
  useEffect(() => {
    // Микротаскка кечиктирамиз — qidir бошида sync setState бор (set-state-in-effect)
    if (boshlangichKod && boshlangichKod.length >= 4) queueMicrotask(() => qidir(boshlangichKod));
    api.get('/passenger/past-drivers').then(({ data }) => setOldingilar(data)).catch(() => {});
    // Фақат mount'да — deep-link коди очилишда бир марта қидирилади
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Севимлига қўшиш — ҳар иккала манбадан (қидирув натижаси ёки олдинги рўйхат)
  const qosh = async (h) => {
    if (!h || bandId) return;
    setBandId(h.haydovchi_id);
    try {
      if (!h.sevimli) await api.post('/passenger/favorites', { haydovchi_id: h.haydovchi_id });
      toast.success(t('fav.added'));
      onQoshildi?.(h);
      onYopish?.();
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    } finally {
      setBandId(null);
    }
  };

  const mashinaMatn = (h) => [h.mashina_modeli, h.mashina_rangi, h.mashina_raqami].filter(Boolean).join(' · ');

  // Оддий render-функция (компонент ЭМАС) — render ичида компонент яратиш
  // ҳар сафар state'ни ўчирарди (react-hooks/static-components)
  const qatorChiz = (h, izoh) => (
    <div style={st.karta}>
      <div style={st.avatar}>{h.ism?.[0] || <Ikonka nom="user" size={20} />}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={st.ism}>{h.ism}</div>
        <div style={st.mashina}><Ikonka nom="star" size={12} /> {h.reyting}{izoh ? ` · ${izoh}` : ''}</div>
      </div>
      <button
        style={{ ...st.qoshTugma, ...(h.sevimli ? st.qoshTugmaSevimli : {}) }}
        onClick={() => qosh(h)}
        disabled={bandId === h.haydovchi_id || h.sevimli}
      >
        {h.sevimli ? <><Ikonka nom="check" size={15} /> {t('favcode.already')}</> : t('fav.add')}
      </button>
    </div>
  );

  return (
    <div style={st.fon} onClick={onYopish}>
      <div style={st.modal} className="glass slide-up" onClick={(e) => e.stopPropagation()}>
        <div style={st.grabber} />
        <h3 style={st.sarlavha}>{t('favcode.title')}</h3>
        <p style={st.izoh}>{t('favcode.hint')}</p>

        <div style={st.qator}>
          <input
            style={st.input}
            value={kod}
            onChange={(e) => setKod(e.target.value.toUpperCase().slice(0, 15))}
            onKeyDown={(e) => { if (e.key === 'Enter') qidir(); }}
            placeholder={t('favcode.placeholder')}
            autoCapitalize="characters"
          />
          <button style={st.qidirTugma} onClick={() => qidir()} disabled={qidirmoqda}>
            {qidirmoqda ? '…' : t('favcode.find')}
          </button>
        </div>

        {topilgan && <div style={{ marginBottom: 14 }}>{qatorChiz(topilgan, mashinaMatn(topilgan))}</div>}

        {/* Олдинги ҳайдовчилар — фақат ўзи сафар қилганлар */}
        <div style={st.pastSarlavha}>{t('favcode.past')}</div>
        {oldingilar.length === 0 ? (
          <div style={st.pastBosh}>{t('favcode.pastEmpty')}</div>
        ) : (
          <div style={st.pastRoyxat}>
            {oldingilar.map((h) => (
              <div key={h.haydovchi_id}>{qatorChiz(h, t('favcode.rides', { n: h.safar_soni }))}</div>
            ))}
          </div>
        )}

        <button style={st.yopishTugma} onClick={onYopish}>{t('common.close')}</button>
      </div>
    </div>
  );
}

const st = {
  fon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 4000, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' },
  modal: { width: '100%', maxWidth: 420, borderRadius: 'var(--r-xl) var(--r-xl) 0 0', padding: '12px 22px 24px', maxHeight: '88vh', overflowY: 'auto' },
  grabber: { width: 38, height: 5, borderRadius: 3, background: 'var(--neutral-300)', margin: '0 auto 14px' },
  sarlavha: { fontSize: 20, fontWeight: 700, marginBottom: 6, textAlign: 'center' },
  izoh: { fontSize: 14, color: 'var(--secondary-label)', marginBottom: 18, textAlign: 'center' },
  qator: { display: 'flex', gap: 10, marginBottom: 14 },
  input: { flex: 1, background: 'var(--fill)', border: 'none', borderRadius: 'var(--r-md)', padding: '13px 16px', fontSize: 18, fontWeight: 700, letterSpacing: 2, color: 'var(--label)', textTransform: 'uppercase', textAlign: 'center' },
  qidirTugma: { background: 'var(--tint)', color: 'var(--on-tint)', padding: '0 20px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 16 },
  karta: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--fill)', borderRadius: 'var(--r-lg)', padding: 12 },
  avatar: { width: 44, height: 44, borderRadius: '50%', background: 'var(--tint)', color: 'var(--on-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 600, flexShrink: 0 },
  ism: { fontSize: 16, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  mashina: { fontSize: 13, color: 'var(--secondary-label)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 },
  qoshTugma: { flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--tint)', color: 'var(--on-tint)', padding: '10px 14px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 14 },
  qoshTugmaSevimli: { background: 'var(--fill-strong)', color: 'var(--secondary-label)' },
  pastSarlavha: { fontSize: 13, fontWeight: 600, color: 'var(--secondary-label)', textTransform: 'uppercase', letterSpacing: '-0.08px', margin: '6px 0 10px' },
  pastBosh: { fontSize: 14, color: 'var(--tertiary-label)', textAlign: 'center', padding: '14px 0 18px' },
  pastRoyxat: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 },
  yopishTugma: { width: '100%', background: 'var(--fill)', color: 'var(--label)', padding: 14, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 16, marginTop: 10 },
};
