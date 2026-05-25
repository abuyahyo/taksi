// Улашилган сафар саҳифаси — login керак эмас, /k/:kalit URL'да очилади
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { socket } from '../services/api';
import Harita from '../components/Harita';
import HaritaPreview, { parseLatLng } from '../components/HaritaPreview';
import { useT, TilTanlovchi } from '../i18n';
import { TemaTanlovchi } from '../theme';

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
          <div style={{ fontSize: 48 }}>⚠️</div>
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

      <div style={st.logo}>🚕 Safar Taksi</div>
      <div style={st.tilWrap}><TemaTanlovchi /><TilTanlovchi /></div>

      <div style={st.panel}>
        <div style={st.sarlavhaBolimi}>
          <div style={st.sarlavha}>{t('share.viewerTitle')}</div>
          <div style={st.izoh}>{t('share.tracking', { ism: safar.mijoz_ism || '—' })}</div>
        </div>

        <div style={st.holatBelgi}>
          {ҳozirgi === 'yakunlandi' ? '✅ ' + t('hist.status.yakunlandi') :
           ҳozirgi === 'qabul_qilindi' ? '🚗 ' + t('share.statusInRide') :
           '⏳ ' + t('share.statusPending')}
        </div>

        {safar.haydovchi_ism && (
          <div style={st.haydovchi}>
            <div style={st.avatar}>{safar.haydovchi_ism[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={st.hIsm}>
                {safar.haydovchi_ism}
                {safar.tasdiqlangan && <span style={st.tasdiqBelgi} title={t('verify.badge')}>✓</span>}
                {' '}⭐ {safar.haydovchi_reyting || '5.0'}
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
  logo: { position: 'absolute', top: 16, left: 16, zIndex: 1000, background: 'var(--sariq)', padding: '8px 14px', borderRadius: 12, fontWeight: 800, fontSize: 16, boxShadow: 'var(--soya)' },
  tilWrap: { position: 'absolute', top: 16, right: 16, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 6 },
  panel: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000, background: 'var(--oq)', borderRadius: '24px 24px 0 0', padding: 20, boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', maxHeight: '65vh', overflowY: 'auto' },
  sarlavhaBolimi: { marginBottom: 12 },
  sarlavha: { fontSize: 18, fontWeight: 800 },
  izoh: { fontSize: 13, color: 'var(--kulrang)', marginTop: 2 },
  holatBelgi: { padding: 10, background: 'var(--och-kulrang)', borderRadius: 10, textAlign: 'center', fontWeight: 700, fontSize: 14, marginBottom: 14 },
  haydovchi: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--och-kulrang)', padding: 12, borderRadius: 14, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: '50%', background: 'var(--sariq)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 },
  hIsm: { fontWeight: 700, fontSize: 15 },
  tasdiqBelgi: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', background: 'var(--asosiy)', color: '#fff', fontSize: 10, fontWeight: 900, marginLeft: 5, verticalAlign: 'middle' },
  hMashina: { fontSize: 12, color: 'var(--kulrang)' },
  yollarMini: { marginBottom: 12 },
  narxQator: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', fontSize: 14, color: 'var(--kulrang)' },
  narxRaqam: { fontSize: 18, fontWeight: 800, color: 'var(--qora)' },
  kuzatishMatn: { textAlign: 'center', fontSize: 12, color: 'var(--kulrang)', marginTop: 10 },
  bosh: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--kulrang)' },
  xatoFon: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--och-kulrang)' },
  xatoKarta: { background: 'var(--oq)', padding: 32, borderRadius: 18, textAlign: 'center', maxWidth: 360 },
  xatoMatn: { fontSize: 15, marginTop: 12, color: 'var(--kulrang)' },
};
