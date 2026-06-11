// Улашилган сафар саҳифаси — login керак эмас, /k/:kalit URL'да очилади
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { socket } from '../services/api';
import Harita from '../components/Harita';
import HaritaPreview from '../components/HaritaPreview';
import { parseLatLng } from '../utils/geo';
import { useT } from '../i18n';
import SozlamalarTugma from '../components/SozlamalarTugma';
import Ikonka from '../components/Ikonka';

const TOSHKENT = [41.2995, 69.2401];

export default function UlashilganSahifa() {
  const { kalit } = useParams();
  const { t } = useT();
  const [safar, setSafar] = useState(null);
  const [haydovchiNuqta, setHaydovchiNuqta] = useState(null);
  const [holat, setHolat] = useState(null);
  const [xato, setXato] = useState('');

  // Сафар маълумотини юклаймиз
  useEffect(() => {
    if (!kalit) return;
    axios.get(`/api/share/${kalit}`)
      .then(({ data }) => setSafar(data))
      .catch((err) => setXato(err.response?.data?.xato || t('common.error')));
    // t фақат хато матнида — тил алмашганда сафарни қайта юклашга ҳожат йўқ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kalit]);

  // Socket — реал вақт GPS ва ҳолат ўзгариши
  useEffect(() => {
    if (!kalit) return;
    if (!socket.connected) socket.connect();
    socket.emit('share_qoshil', { kalit });

    const onGps = (d) => {
      if (d.lat != null && d.lng != null) setHaydovchiNuqta([d.lat, d.lng]);
    };
    const onHolat = (d) => {
      setHolat(d.holat);
      if (d.holat === 'yakunlandi') {
        // Маълумотни қайтадан юклаймиз
        axios.get(`/api/share/${kalit}`).then(({ data }) => setSafar(data)).catch(() => {});
      }
    };
    socket.on('haydovchi_joylashuvi', onGps);
    socket.on('holat_yangilandi', onHolat);
    return () => {
      socket.off('haydovchi_joylashuvi', onGps);
      socket.off('holat_yangilandi', onHolat);
    };
  }, [kalit]);

  if (xato) {
    return (
      <div style={st.xatoFon}>
        <div style={st.xatoKarta}>
          <div style={{ display: 'inline-flex', color: 'var(--amber)' }}><Ikonka nom="alert" size={40} /></div>
          <div style={st.xatoMatn}>{xato}</div>
        </div>
      </div>
    );
  }

  if (!safar) {
    return <div style={st.bosh}>{t('common.loading')}</div>;
  }

  const boshlanish = parseLatLng(safar.boshlanish_manzil);
  const tugash = parseLatLng(safar.tugash_manzil);
  const ҳozirgi = holat || safar.holat;

  return (
    <div style={st.sahifa}>
      <div style={st.harita}>
        <Harita markaz={haydovchiNuqta || boshlanish || TOSHKENT}
          boshlanish={boshlanish} tugash={tugash} haydovchi={haydovchiNuqta} />
      </div>

      <div style={st.logo} className="glass-tugma"><Ikonka nom="taxi" size={17} /> Manzil</div>
      <div style={st.tilWrap}><SozlamalarTugma /></div>

      <div style={st.panel}>
        <div style={st.sarlavhaBolimi}>
          <div style={st.sarlavha}>{t('share.viewerTitle')}</div>
          <div style={st.izoh}>{t('share.tracking', { ism: safar.mijoz_ism || '—' })}</div>
        </div>

        <div style={st.holatBelgi}>
          {ҳozirgi === 'yakunlandi' ? t('hist.status.yakunlandi') :
           ҳozirgi === 'qabul_qilindi' ? t('share.statusInRide') :
           t('share.statusPending')}
        </div>

        {safar.haydovchi_ism && (
          <div style={st.haydovchi}>
            <div style={st.avatar}>{safar.haydovchi_ism[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={st.hIsm}>
                {safar.haydovchi_ism}
                {safar.tasdiqlangan && <span style={st.tasdiqBelgi} title={t('verify.badge')}>✓</span>}
                {' '}<Ikonka nom="star" size={13} /> {safar.haydovchi_reyting || '5.0'}
              </div>
              {(safar.mashina_modeli || safar.mashina_raqami) && (
                <div style={st.hMashina}>
                  {[safar.mashina_modeli, safar.mashina_rangi].filter(Boolean).join(' ')}
                  {safar.mashina_raqami ? ` · ${safar.mashina_raqami}` : ''}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={st.yollarMini}>
          <HaritaPreview boshlanish={boshlanish} tugash={tugash} height={88} />
        </div>

        <div style={st.narxQator}>
          <span>{t('pass.distance')}: {safar.masofa_km || '—'} км</span>
          <span style={st.narxRaqam}>
            {safar.kelishilgan_narx
              ? `${Number(safar.kelishilgan_narx).toLocaleString()} сўм`
              : safar.taklif_narx ? `~${Number(safar.taklif_narx).toLocaleString()}` : '—'}
          </span>
        </div>

        <div style={st.kuzatishMatn}>
          {haydovchiNuqta ? t('pass.gpsLive') : t('pass.gpsWait')}
        </div>
      </div>
    </div>
  );
}

const st = {
  sahifa: { position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' },
  harita: { position: 'absolute', inset: 0 },
  logo: { position: 'absolute', top: 'calc(16px + env(safe-area-inset-top))', left: 16, zIndex: 1000, display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--tint)', padding: '7px 14px', borderRadius: 'var(--r-full)', fontWeight: 600, fontSize: 15 },
  tilWrap: { position: 'absolute', top: 'calc(16px + env(safe-area-inset-top))', right: 16, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 8 },
  panel: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000, maxWidth: 480, margin: '0 auto', background: 'var(--surface-elevated)', borderRadius: '14px 14px 0 0', padding: '20px 20px calc(20px + env(safe-area-inset-bottom))', boxShadow: '0 -1px 0 var(--separator)', maxHeight: '65vh', overflowY: 'auto' },
  sarlavhaBolimi: { marginBottom: 14 },
  sarlavha: { fontSize: 20, fontWeight: 700 },
  izoh: { fontSize: 14, color: 'var(--secondary-label)', marginTop: 2 },
  holatBelgi: { padding: 11, background: 'var(--fill)', borderRadius: 'var(--r-md)', textAlign: 'center', fontWeight: 600, fontSize: 15, marginBottom: 14 },
  haydovchi: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--fill)', padding: 12, borderRadius: 'var(--r-md)', marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: '50%', background: 'var(--tint)', color: 'var(--on-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 18, flexShrink: 0 },
  hIsm: { display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', fontWeight: 600, fontSize: 16 },
  tasdiqBelgi: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', background: 'var(--tint)', color: 'var(--on-tint)', fontSize: 10, fontWeight: 700, marginLeft: 4 },
  hMashina: { fontSize: 13, color: 'var(--secondary-label)', marginTop: 1 },
  yollarMini: { marginBottom: 12, borderRadius: 'var(--r-md)', overflow: 'hidden' },
  narxQator: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', fontSize: 15, color: 'var(--secondary-label)' },
  narxRaqam: { fontSize: 18, fontWeight: 700, color: 'var(--label)' },
  kuzatishMatn: { textAlign: 'center', fontSize: 13, color: 'var(--secondary-label)', marginTop: 10 },
  bosh: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--secondary-label)', background: 'var(--bg)' },
  xatoFon: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' },
  xatoKarta: { background: 'var(--surface)', padding: 32, borderRadius: 'var(--r-xl)', textAlign: 'center', maxWidth: 360 },
  xatoMatn: { fontSize: 15, marginTop: 12, color: 'var(--secondary-label)' },
};
