// Йўловчи ҳайдовчи кодини киритиб (ёки QR deep-link орқали олдиндан тўлдирилган)
// уни топади ва севимлига қўшади. Кейин тўғридан-тўғри чақириш мумкин бўлади.
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
  const [bandQosh, setBandQosh] = useState(false);

  const qidir = async (k = kod) => {
    const tozaKod = String(k).trim().toUpperCase();
    if (tozaKod.length < 4) { toast.error(t('favcode.tooShort')); return; }
    setQidirmoqda(true);
    setTopilgan(null);
    try {
      const { data } = await api.get(`/passenger/driver/${encodeURIComponent(tozaKod)}`);
      setTopilgan(data);
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    } finally {
      setQidirmoqda(false);
    }
  };

  // QR deep-link билан очилганда — кодни дарров қидирамиз
  useEffect(() => {
    if (boshlangichKod && boshlangichKod.length >= 4) qidir(boshlangichKod);
  }, []);

  const qosh = async () => {
    if (!topilgan || bandQosh) return;
    setBandQosh(true);
    try {
      if (!topilgan.sevimli) {
        await api.post('/passenger/favorites', { haydovchi_id: topilgan.haydovchi_id });
      }
      toast.success(t('fav.added'));
      onQoshildi?.(topilgan);
      onYopish?.();
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    } finally {
      setBandQosh(false);
    }
  };

  const mashina = topilgan
    ? [topilgan.mashina_modeli, topilgan.mashina_rangi, topilgan.mashina_raqami].filter(Boolean).join(' · ')
    : '';

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
            onChange={(e) => setKod(e.target.value.toUpperCase().slice(0, 8))}
            onKeyDown={(e) => { if (e.key === 'Enter') qidir(); }}
            placeholder={t('favcode.placeholder')}
            autoCapitalize="characters"
            autoFocus
          />
          <button style={st.qidirTugma} onClick={() => qidir()} disabled={qidirmoqda}>
            {qidirmoqda ? '…' : t('favcode.find')}
          </button>
        </div>

        {topilgan && (
          <div style={st.karta}>
            <div style={st.avatar}>{topilgan.ism?.[0] || <Ikonka nom="user" size={20} />}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={st.ism}>{topilgan.ism}</div>
              <div style={st.mashina}>
                <Ikonka nom="star" size={12} /> {topilgan.reyting}{mashina ? ` · ${mashina}` : ''}
              </div>
            </div>
            <button style={{ ...st.qoshTugma, ...(topilgan.sevimli ? st.qoshTugmaSevimli : {}) }} onClick={qosh} disabled={bandQosh}>
              {topilgan.sevimli ? <><Ikonka nom="check" size={15} /> {t('favcode.already')}</> : t('fav.add')}
            </button>
          </div>
        )}

        <button style={st.yopishTugma} onClick={onYopish}>{t('common.close')}</button>
      </div>
    </div>
  );
}

const st = {
  fon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 4000, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' },
  modal: { width: '100%', maxWidth: 420, borderRadius: 'var(--r-xl) var(--r-xl) 0 0', padding: '12px 22px 24px' },
  grabber: { width: 38, height: 5, borderRadius: 3, background: 'var(--neutral-300)', margin: '0 auto 14px' },
  sarlavha: { fontSize: 20, fontWeight: 700, marginBottom: 6, textAlign: 'center' },
  izoh: { fontSize: 14, color: 'var(--secondary-label)', marginBottom: 18, textAlign: 'center' },
  qator: { display: 'flex', gap: 10, marginBottom: 14 },
  input: { flex: 1, background: 'var(--fill)', border: 'none', borderRadius: 'var(--r-md)', padding: '13px 16px', fontSize: 20, fontWeight: 700, letterSpacing: 3, color: 'var(--label)', textTransform: 'uppercase', textAlign: 'center' },
  qidirTugma: { background: 'var(--tint)', color: '#fff', padding: '0 20px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 16 },
  karta: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--fill)', borderRadius: 'var(--r-lg)', padding: 12, marginBottom: 14 },
  avatar: { width: 44, height: 44, borderRadius: '50%', background: 'var(--tint)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 600, flexShrink: 0 },
  ism: { fontSize: 16, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  mashina: { fontSize: 13, color: 'var(--secondary-label)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 },
  qoshTugma: { flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--tint)', color: '#fff', padding: '10px 14px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 14 },
  qoshTugmaSevimli: { background: 'var(--fill-strong)', color: 'var(--secondary-label)' },
  yopishTugma: { width: '100%', background: 'var(--fill)', color: 'var(--label)', padding: 14, borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: 16 },
};
