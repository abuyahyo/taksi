// Ҳайдовчи уланиш визарди — Uber услубида кўп қадамли онбординг.
// Шахсий → Гувоҳнома → Машина → Селфи + ариза. Ҳар қадамда профил автоматик сақланади
// (PUT /driver/profile) ва KYC ҳужжатлари ўрнига қўйилгач /driver/onboarding'дан
// янгиланган прогрессни ўқиймиз. Тасдиқлансa — driver саҳифасига қайтарамиз.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { useT, TilTanlovchi } from '../i18n';
import { TemaTanlovchi } from '../theme';
import Ikonka from '../components/Ikonka';
import Kirish from '../components/Kirish';
import KycHujjatlar from '../components/KycHujjatlar';

const BOSQICHLAR = [
  { kalit: 'shaxsiy', kyc: ['passport'],                       maydonlar: ['tugilgan_sana'] },
  { kalit: 'gpro',    kyc: ['license'],                        maydonlar: ['gpro_raqami', 'gpro_amal_qiladi'] },
  { kalit: 'mashina', kyc: ['mashina_old', 'mashina_plate'],   maydonlar: ['mashina_modeli', 'mashina_raqami', 'mashina_rangi', 'mashina_yili'] },
  { kalit: 'ariza',   kyc: ['selfie'],                         maydonlar: [] },
];

const sanaUchun = (s) => (s ? String(s).slice(0, 10) : '');

export default function HaydovchiUlanish() {
  const [user, setUser] = useState(() => {
    const s = localStorage.getItem('user');
    if (!s) return null;
    try {
      const u = JSON.parse(s);
      return u.rol === 'haydovchi' ? u : null;
    } catch { return null; }
  });
  if (!user) return <Kirish kerakliRol="haydovchi" sarlavhaKey="login.titleDriver" onKirildi={setUser} />;
  return <Ichki />;
}

function Ichki() {
  const navigate = useNavigate();
  const { t } = useT();
  const toast = useToast();
  const [bosqich, setBosqich] = useState(0);
  const [profil, setProfil] = useState({
    mashina_modeli: '', mashina_raqami: '', mashina_rangi: '', mashina_yili: '',
    tugilgan_sana: '', gpro_raqami: '', gpro_amal_qiladi: '',
  });
  const [onb, setOnb] = useState(null);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);

  const yukla = async () => {
    try {
      const [p, o] = await Promise.all([
        api.get('/driver/profile'),
        api.get('/driver/onboarding'),
      ]);
      setProfil({
        mashina_modeli: p.data.mashina_modeli || '',
        mashina_raqami: p.data.mashina_raqami || '',
        mashina_rangi:  p.data.mashina_rangi  || '',
        mashina_yili:   p.data.mashina_yili ? String(p.data.mashina_yili) : '',
        tugilgan_sana:    sanaUchun(p.data.tugilgan_sana),
        gpro_raqami:      p.data.gpro_raqami || '',
        gpro_amal_qiladi: sanaUchun(p.data.gpro_amal_qiladi),
      });
      setOnb(o.data);
      // Аллақачон тасдиқланган бўлса — кутиб ўтиришнинг ҳожати йўқ
      if (o.data.tasdiqlangan) navigate('/haydovchi', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    }
    setYuklanmoqda(false);
  };
  useEffect(() => { yukla(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const ozgartir = (k) => (e) => setProfil({ ...profil, [k]: e.target.value });

  const profilSaqla = async () => {
    setSaqlanmoqda(true);
    try {
      await api.put('/driver/profile', profil);
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
      setSaqlanmoqda(false);
      return false;
    }
    setSaqlanmoqda(false);
    return true;
  };

  const oxirgiBosqich = bosqich === BOSQICHLAR.length - 1;
  const joriy = BOSQICHLAR[bosqich];
  const onbBosqich = onb?.bosqichlar?.[bosqich];
  const bosqichTugadi = !!onbBosqich?.tugadi;

  const keyingi = async () => {
    if (joriy.maydonlar.length > 0) {
      const ok = await profilSaqla();
      if (!ok) return;
    }
    // Якуний рейтинг — onboarding'ни янгилаб, кейинги қадамга
    await yukla();
    if (oxirgiBosqich) {
      navigate('/haydovchi', { replace: true });
      return;
    }
    setBosqich((b) => Math.min(BOSQICHLAR.length - 1, b + 1));
  };

  const orqaga = () => {
    if (bosqich === 0) { navigate('/haydovchi'); return; }
    setBosqich((b) => Math.max(0, b - 1));
  };

  if (yuklanmoqda || !onb) {
    return <div style={st.bosh}><div className="spinner" /></div>;
  }

  const foiz = onb.foiz || 0;
  const radSabab = onb.tasdiq_holati === 'rad' ? (onb.rad_sababi || t('onb.statusRejected')) : null;

  return (
    <div style={st.fon}>
      <div style={st.topbar}>
        <button style={st.yopish} onClick={() => navigate('/haydovchi')} aria-label={t('common.close')}><Ikonka nom="x" size={18} /></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TemaTanlovchi /><TilTanlovchi />
        </div>
      </div>

      <div style={st.sarlavhaWrap}>
        <h1 style={st.sarlavha}>{t('onb.title')}</h1>
        <div style={st.intro}>{t('onb.intro')}</div>
      </div>

      {/* Прогресс — Uber услубида */}
      <div style={st.progressWrap}>
        <div style={st.progressTrack}>
          <div style={{ ...st.progressBar, width: `${foiz}%` }} />
        </div>
        <div style={st.progressMatn}>
          {t('onb.step', { n: bosqich + 1, jami: BOSQICHLAR.length })} · {foiz}%
        </div>
      </div>

      {/* Ҳолат банери — рад этилган бўлса сабаб */}
      {radSabab && (
        <div style={st.radBaner}>
          <Ikonka nom="alert" size={16} /> {t('onb.statusRejected')}: {radSabab}
        </div>
      )}
      {onb.tasdiq_holati === 'kutilmoqda' && foiz === 100 && (
        <div style={st.kutBaner}>
          <Ikonka nom="clock" size={16} /> {t('onb.statusPending')}
        </div>
      )}

      <div style={st.qadamlar}>
        {BOSQICHLAR.map((b, i) => {
          const tugadi = !!onb.bosqichlar?.[i]?.tugadi;
          const faol = i === bosqich;
          return (
            <button
              key={b.kalit}
              type="button"
              style={{ ...st.qadamChip, ...(faol ? st.qadamChipFaol : tugadi ? st.qadamChipTugadi : null) }}
              onClick={() => setBosqich(i)}
            >
              {tugadi ? <Ikonka nom="check" size={12} /> : i + 1}
              <span style={{ marginLeft: 6 }}>{t(`onb.s.${b.kalit}`)}</span>
            </button>
          );
        })}
      </div>

      <div style={st.tana}>
        <div style={st.bosqichSarlavha}>{t(`onb.s.${joriy.kalit}`)}</div>
        <div style={st.bosqichHint}>{t(`onb.s.${joriy.kalit}Hint`)}</div>

        {/* Майдонлар (қадам тури бўйича) */}
        {joriy.kalit === 'shaxsiy' && (
          <label style={st.label}>
            <span style={st.labelMatn}>{t('onb.f.dob')}</span>
            <input style={st.input} type="date" value={profil.tugilgan_sana} onChange={ozgartir('tugilgan_sana')} required />
          </label>
        )}
        {joriy.kalit === 'gpro' && (
          <>
            <label style={st.label}>
              <span style={st.labelMatn}>{t('onb.f.licenseNum')}</span>
              <input style={st.input} placeholder={t('onb.f.licenseNumPh')} value={profil.gpro_raqami} onChange={ozgartir('gpro_raqami')} required />
            </label>
            <label style={st.label}>
              <span style={st.labelMatn}>{t('onb.f.licenseExp')}</span>
              <input style={st.input} type="date" value={profil.gpro_amal_qiladi} onChange={ozgartir('gpro_amal_qiladi')} required />
            </label>
          </>
        )}
        {joriy.kalit === 'mashina' && (
          <>
            <label style={st.label}>
              <span style={st.labelMatn}>{t('car.model')}</span>
              <input style={st.input} placeholder={t('car.modelPh')} value={profil.mashina_modeli} onChange={ozgartir('mashina_modeli')} required />
            </label>
            <label style={st.label}>
              <span style={st.labelMatn}>{t('car.plate')}</span>
              <input style={st.input} placeholder={t('car.platePh')} value={profil.mashina_raqami} onChange={ozgartir('mashina_raqami')} required />
            </label>
            <label style={st.label}>
              <span style={st.labelMatn}>{t('car.color')}</span>
              <input style={st.input} placeholder={t('car.colorPh')} value={profil.mashina_rangi} onChange={ozgartir('mashina_rangi')} required />
            </label>
            <label style={st.label}>
              <span style={st.labelMatn}>{t('onb.f.carYear')}</span>
              <input style={st.input} type="number" placeholder={t('onb.f.carYearPh')} value={profil.mashina_yili} onChange={ozgartir('mashina_yili')} required />
            </label>
          </>
        )}

        {/* KYC ҳужжат(лар)и — мос ҳужжат турлари */}
        <KycHujjatlar turlar={joriy.kyc} kompakt onYangilandi={yukla} />
      </div>

      <div style={st.action}>
        <button type="button" style={st.btnIkkilamchi} onClick={orqaga} disabled={saqlanmoqda}>
          {t('onb.back')}
        </button>
        <button
          type="button"
          className="ios-btn--ink"
          style={{ ...st.btnAsosiy, opacity: (saqlanmoqda || !bosqichTugadi) ? 0.5 : 1 }}
          onClick={keyingi}
          disabled={saqlanmoqda || !bosqichTugadi}
        >
          {saqlanmoqda ? t('common.wait') : (oxirgiBosqich ? t('onb.submit') : t('onb.next'))}
        </button>
      </div>
    </div>
  );
}

const st = {
  bosh: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: 'var(--bg)' },
  fon: {
    width: '100%', maxWidth: 480, margin: '0 auto',
    minHeight: '100dvh', display: 'flex', flexDirection: 'column',
    background: 'var(--bg)',
    paddingTop: 'calc(var(--space-3) + env(safe-area-inset-top))',
    paddingBottom: 'calc(var(--space-6) + env(safe-area-inset-bottom))',
  },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 var(--space-4)' },
  yopish: { width: 32, height: 32, borderRadius: '50%', background: 'var(--fill)', color: 'var(--label)', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  sarlavhaWrap: { padding: 'var(--space-5) var(--space-4) var(--space-3)' },
  sarlavha: { fontSize: 28, fontWeight: 700, letterSpacing: '0.36px', color: 'var(--label)' },
  intro: { fontSize: 14, color: 'var(--secondary-label)', marginTop: 6, lineHeight: 1.4 },

  progressWrap: { padding: '0 var(--space-4) var(--space-3)' },
  progressTrack: { height: 4, borderRadius: 999, background: 'var(--fill)', overflow: 'hidden' },
  progressBar: { height: '100%', background: 'var(--accept)', transition: 'width 0.3s ease' },
  progressMatn: { fontSize: 12, color: 'var(--secondary-label)', marginTop: 6, fontWeight: 500 },

  radBaner: { display: 'flex', alignItems: 'center', gap: 8, margin: '0 var(--space-4) var(--space-3)', padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'rgba(255,59,48,0.1)', color: 'var(--qizil)', fontSize: 13, lineHeight: 1.4 },
  kutBaner: { display: 'flex', alignItems: 'center', gap: 8, margin: '0 var(--space-4) var(--space-3)', padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'rgba(255,149,0,0.14)', color: 'var(--amber)', fontSize: 13, lineHeight: 1.4 },

  qadamlar: { display: 'flex', gap: 6, padding: '0 var(--space-4) var(--space-2)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  qadamChip: {
    display: 'inline-flex', alignItems: 'center', flexShrink: 0,
    padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
    background: 'var(--fill)', color: 'var(--secondary-label)',
  },
  qadamChipFaol: { background: 'var(--tint-fill)', color: 'var(--tint)' },
  qadamChipTugadi: { background: 'rgba(52,199,89,0.16)', color: 'var(--yashil)' },

  tana: {
    padding: 'var(--space-4)',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  bosqichSarlavha: { fontSize: 20, fontWeight: 600, color: 'var(--label)' },
  bosqichHint: { fontSize: 14, color: 'var(--secondary-label)', marginBottom: 6, lineHeight: 1.35 },

  label: { display: 'flex', flexDirection: 'column', gap: 6 },
  labelMatn: { fontSize: 12, fontWeight: 500, color: 'var(--secondary-label)', textTransform: 'uppercase', letterSpacing: '-0.08px', paddingLeft: 4 },
  input: { padding: 14, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--fill)', color: 'var(--label)', fontSize: 17 },

  action: {
    marginTop: 'auto',
    display: 'flex', gap: 10,
    padding: 'var(--space-4)',
    position: 'sticky', bottom: 0,
    background: 'linear-gradient(to top, var(--bg) 60%, transparent)',
  },
  btnIkkilamchi: { flex: 1, padding: 15, borderRadius: 'var(--r-lg)', background: 'var(--fill)', color: 'var(--label)', fontWeight: 600, fontSize: 16 },
  btnAsosiy:     { flex: 2, padding: 15, borderRadius: 'var(--r-lg)', color: '#fff', fontWeight: 600, fontSize: 16 },
};
