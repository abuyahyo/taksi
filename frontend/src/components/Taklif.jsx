// Таклиф (referral) — "дўстни таклиф қил" блоки. Ҳайдовчи обуна экранида кўради.
// Кодини улашади; дўсти пуллик обуна олса — иккаласига бонус обуна кунлари.
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useT } from '../i18n';
import { useToast } from './Toast';
import Ikonka from './Ikonka';

export default function Taklif() {
  const { t } = useT();
  const toast = useToast();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/driver/referral').then(({ data }) => setData(data)).catch(() => {});
  }, []);

  if (!data) return null;

  const ulashMatn = t('taklif.shareText', { kod: data.kod });

  const nusxa = async () => {
    try {
      await navigator.clipboard.writeText(data.kod);
      toast.success(t('taklif.copied'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const ulash = async () => {
    if (navigator.share) {
      try { await navigator.share({ text: ulashMatn }); } catch { /* бекор қилинди */ }
    } else {
      nusxa();
    }
  };

  return (
    <div style={st.box}>
      <div style={st.sarlavha}><Ikonka nom="gift" size={18} /> {t('taklif.title')}</div>
      <div style={st.intro}>{t('taklif.intro', { kun: data.bonus_kelganga })}</div>

      <div style={st.label}>{t('taklif.code')}</div>
      <div style={st.kodQator}>
        <div style={st.kod} onClick={nusxa} title={t('taklif.copy')}>{data.kod}</div>
        <button style={st.ulashTugma} onClick={ulash}><Ikonka nom="share" size={16} /> {t('taklif.share')}</button>
      </div>

      <div style={st.statlar}>
        <div style={st.stat}>
          <div style={st.statRaqam}>{data.bonus_olingan || 0}</div>
          <div style={st.statIzoh}>{t('taklif.invited')}</div>
        </div>
        <div style={st.stat}>
          <div style={st.statRaqam}>{data.kutilmoqda || 0}</div>
          <div style={st.statIzoh}>{t('taklif.pending')}</div>
        </div>
        <div style={st.stat}>
          <div style={st.statRaqam}>{data.jami_bonus_kun || 0}</div>
          <div style={st.statIzoh}>{t('taklif.earned')}</div>
        </div>
      </div>
    </div>
  );
}

const st = {
  box: { background: 'var(--fill)', borderRadius: 'var(--r-lg)', padding: 16, marginTop: 16 },
  sarlavha: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, color: 'var(--label)' },
  intro: { fontSize: 13, color: 'var(--secondary-label)', marginTop: 6, lineHeight: 1.4 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--secondary-label)', margin: '14px 0 6px' },
  kodQator: { display: 'flex', alignItems: 'center', gap: 8 },
  kod: { flex: 1, fontFamily: 'monospace', fontSize: 22, fontWeight: 700, letterSpacing: 3, color: 'var(--label)', background: 'var(--surface)', padding: '10px 14px', borderRadius: 'var(--r-md)', cursor: 'pointer', textAlign: 'center' },
  ulashTugma: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 44, borderRadius: 'var(--r-md)', background: 'var(--tint)', color: 'var(--bg)', fontSize: 14, fontWeight: 700, flexShrink: 0 },
  statlar: { display: 'flex', gap: 10, marginTop: 16 },
  stat: { flex: 1, textAlign: 'center', background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: '10px 4px' },
  statRaqam: { fontSize: 20, fontWeight: 800, color: 'var(--label)' },
  statIzoh: { fontSize: 11, color: 'var(--secondary-label)', marginTop: 2 },
};
