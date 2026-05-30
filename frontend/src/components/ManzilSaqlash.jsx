// Манзил сақлаш sheet — Uber услубида.
// turi: 'home' | 'ish' | 'custom'
//   - home/ish: ном қулф ("Уй"/"Иш"), PUT /passenger/me билан сақланади
//   - custom: ном эркин, POST /passenger/addresses билан сақланади
// Манзил: ManzilQidirish орқали қидириб ёки "Жорий жойим" (GPS+reverse) орқали.
import { useState } from 'react';
import { api } from '../services/api';
import { useT } from '../i18n';
import { useToast } from './Toast';
import Sheet from './Sheet';
import ManzilQidirish from './ManzilQidirish';
import Ikonka from './Ikonka';

export default function ManzilSaqlash({ turi = 'custom', tahrirla = null, profil = null, onYopish, onSaqlandi }) {
  const { t, til } = useT();
  const toast = useToast();
  const qulf = turi === 'home' || turi === 'ish';
  const [nom, setNom] = useState(tahrirla?.nom || (turi === 'home' ? t('prof.useHome') : turi === 'ish' ? t('prof.useWork') : ''));
  const [manzil, setManzil] = useState(tahrirla?.manzil || '');
  const [koord, setKoord] = useState(tahrirla?.lat != null && tahrirla?.lng != null ? [Number(tahrirla.lat), Number(tahrirla.lng)] : null);
  const [gpsYuk, setGpsYuk] = useState(false);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);

  const tanlangan = (koor, mz) => { setKoord(koor); setManzil(mz); };

  const gpsdanOl = () => {
    if (!('geolocation' in navigator)) {
      toast.error(t('drv.gpsDenied'));
      return;
    }
    setGpsYuk(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        try {
          const { data } = await api.get(`/geocode/reverse?lat=${lat}&lng=${lng}&til=${til}`);
          setKoord([lat, lng]);
          setManzil(data.manzil || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } catch {
          setKoord([lat, lng]);
          setManzil(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
        setGpsYuk(false);
      },
      () => { toast.error(t('drv.gpsDenied')); setGpsYuk(false); },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const saqla = async () => {
    if (!nom.trim() || !manzil.trim() || !koord) return;
    setSaqlanmoqda(true);
    try {
      if (turi === 'home' || turi === 'ish') {
        const yangi = { manzil: manzil.trim().slice(0, 200), lat: koord[0], lng: koord[1] };
        const eski = (k, l) => ({ manzil: profil?.[k] || null, lat: profil?.[l + '_lat'], lng: profil?.[l + '_lng'] });
        const body = {
          ism: profil?.ism,
          home: turi === 'home' ? yangi : eski('home_manzil', 'home'),
          ish:  turi === 'ish'  ? yangi : eski('ish_manzil', 'ish'),
        };
        const { data } = await api.put('/passenger/me', body);
        onSaqlandi?.(data);
      } else {
        const { data } = await api.post('/passenger/addresses', {
          nom: nom.trim().slice(0, 60),
          manzil: manzil.trim().slice(0, 200),
          lat: koord[0], lng: koord[1],
        });
        onSaqlandi?.(data);
      }
      toast.success(t('common.save'));
      onYopish?.();
    } catch (err) {
      toast.error(err.response?.data?.xato || t('common.error'));
    }
    setSaqlanmoqda(false);
  };

  const sarlavha = turi === 'home' ? t('addr.titleHome')
    : turi === 'ish' ? t('addr.titleWork')
    : tahrirla ? t('addr.titleEdit')
    : t('addr.titleAdd');

  return (
    <Sheet onYopish={onYopish} zIndex={3600} panelStyle={{ padding: '0 20px 20px', maxHeight: '88vh' }}>
      <div style={st.header}>
        <div style={st.sarlavha}>{sarlavha}</div>
        <button style={st.yopish} onClick={onYopish} aria-label={t('common.close')}><Ikonka nom="x" size={16} /></button>
      </div>

      {/* Ном — қулф бўлмаса эркин ёзилади */}
      <div style={st.label}>{t('addr.nameLabel')}</div>
      <input
        style={{ ...st.input, opacity: qulf ? 0.7 : 1 }}
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        placeholder={t('addr.namePh')}
        readOnly={qulf}
        maxLength={60}
      />

      {/* Манзил қидируви — танлангач паст таркибда кўрсатилади */}
      <div style={{ ...st.label, marginTop: 14 }}>{t('addr.addrLabel')}</div>
      <ManzilQidirish onTanlandi={tanlangan} placeholder={t('geo.searchPlaceholder')} />

      <button type="button" style={st.gps} onClick={gpsdanOl} disabled={gpsYuk}>
        {gpsYuk ? <span className="spinner" style={st.spin} /> : <Ikonka nom="locate" size={16} />}
        <span>{t('addr.useGps')}</span>
      </button>

      {manzil && (
        <div style={st.tanlangan}>
          <Ikonka nom="pin" size={16} />
          <span style={st.tanlanganMatn}>{manzil}</span>
        </div>
      )}

      <button
        type="button"
        style={{ ...st.saqla, opacity: (!nom.trim() || !manzil || !koord || saqlanmoqda) ? 0.5 : 1 }}
        onClick={saqla}
        disabled={!nom.trim() || !manzil || !koord || saqlanmoqda}
      >
        {saqlanmoqda ? t('common.wait') : t('common.save')}
      </button>
    </Sheet>
  );
}

const st = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0 16px', borderBottom: '0.5px solid var(--separator)', marginBottom: 16 },
  sarlavha: { fontSize: 20, fontWeight: 600, color: 'var(--label)' },
  yopish: { width: 30, height: 30, borderRadius: '50%', background: 'var(--fill)', color: 'var(--secondary-label)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, fontWeight: 500, color: 'var(--secondary-label)', textTransform: 'uppercase', letterSpacing: '-0.08px', paddingLeft: 4, marginBottom: 6 },
  input: { width: '100%', padding: 14, borderRadius: 'var(--r-md)', border: 'none', background: 'var(--fill)', color: 'var(--label)', fontSize: 17 },
  gps: { display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'var(--tint-fill)', color: 'var(--tint)', fontSize: 14, fontWeight: 600 },
  spin: { width: 14, height: 14, borderWidth: 2 },
  tanlangan: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', marginTop: 12, borderRadius: 'var(--r-md)', background: 'rgba(52,199,89,0.10)', color: 'var(--yashil)', fontSize: 14 },
  tanlanganMatn: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  saqla: { width: '100%', marginTop: 18, padding: 15, borderRadius: 'var(--r-lg)', background: 'var(--tint)', color: '#fff', fontWeight: 600, fontSize: 17 },
};
