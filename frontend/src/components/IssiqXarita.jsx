// Иссиқ харита — ҳайдовчига буюртмалар зич жойларни кўрсатади
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import { api } from '../services/api';
import { useT } from '../i18n';
import { useTema } from '../theme';
import { parseLatLng } from '../utils/geo';
import Ikonka from './Ikonka';
import 'leaflet/dist/leaflet.css';

const TOSHKENT = [41.2995, 69.2401];
const PLITKA = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

function ToshkentMarkazi() {
  const map = useMap();
  useEffect(() => { map.setView(TOSHKENT, 12); }, [map]);
  return null;
}

export default function IssiqXarita({ onYopish }) {
  const { t } = useT();
  const { tema } = useTema();
  const [sahifalar, setSahifalar] = useState([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);

  const yukla = async () => {
    try {
      const { data } = await api.get('/heatmap');
      setSahifalar(data);
    } catch {/* тинч */}
    setYuklanmoqda(false);
  };

  useEffect(() => {
    yukla();
    const id = setInterval(yukla, 30000); // ҳар 30с янги маълумот
    return () => clearInterval(id);
  }, []);

  const faol = sahifalar.filter((r) => ['kutilmoqda', 'qabul_qilindi'].includes(r.holat)).length;
  const yakun = sahifalar.length - faol;

  return (
    <div style={st.fon} onClick={onYopish}>
      <div style={st.panel} onClick={(e) => e.stopPropagation()}>
        <div style={st.grabber} />
        <div style={st.header}>
          <div>
            <div style={st.sarlavha}>{t('heat.title')}</div>
            <div style={st.izoh}>{t('heat.hint')}</div>
          </div>
          <button style={st.yopish} onClick={onYopish}><Ikonka nom="x" size={16} /></button>
        </div>

        <div style={st.harita}>
          <MapContainer center={TOSHKENT} zoom={12} style={{ width: '100%', height: '100%' }} zoomControl={false}>
            <TileLayer
              url={tema === 'dark' ? PLITKA.dark : PLITKA.light}
              attribution='© OpenStreetMap © CARTO'
              subdomains="abcd"
              detectRetina
            />
            <ToshkentMarkazi />
            {sahifalar.map((r) => {
              const nuqta = parseLatLng(r.boshlanish_manzil);
              if (!nuqta) return null;
              const isFaol = ['kutilmoqda', 'qabul_qilindi'].includes(r.holat);
              return (
                <Circle
                  key={r.id}
                  center={nuqta}
                  radius={isFaol ? 220 : 140}
                  pathOptions={{
                    color: isFaol ? '#EF4444' : '#F59E0B',
                    fillColor: isFaol ? '#EF4444' : '#FACC15',
                    fillOpacity: isFaol ? 0.4 : 0.18,
                    weight: 1,
                  }}
                />
              );
            })}
          </MapContainer>
        </div>

        <div style={st.legenda}>
          <div style={st.legElem}>
            <span style={{ ...st.dot, background: 'var(--qizil)' }} />
            <span>{t('heat.pending')}: <b>{faol}</b></span>
          </div>
          <div style={st.legElem}>
            <span style={{ ...st.dot, background: 'var(--amber)' }} />
            <span>{t('heat.completed')}: <b>{yakun}</b></span>
          </div>
          {yuklanmoqda && <div className="spinner" style={st.refresh} />}
        </div>

        <div style={st.zerno}>{t('heat.refreshNote')}</div>
      </div>
    </div>
  );
}

const st = {
  fon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 3600, backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' },
  panel: { background: 'var(--surface-elevated)', width: '100%', maxWidth: 480, height: '90vh', borderRadius: '14px 14px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  grabber: { width: 36, height: 5, borderRadius: 3, background: 'var(--fill-strong)', margin: '6px auto 4px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 16px 12px', borderBottom: '0.5px solid var(--separator)' },
  sarlavha: { fontSize: 20, fontWeight: 600 },
  izoh: { fontSize: 13, color: 'var(--secondary-label)', marginTop: 2 },
  yopish: { width: 44, height: 44, borderRadius: '50%', background: 'var(--fill)', color: 'var(--secondary-label)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  harita: { flex: 1, position: 'relative' },
  legenda: { display: 'flex', gap: 16, alignItems: 'center', padding: '12px 16px', background: 'var(--surface)', borderTop: '0.5px solid var(--separator)', fontSize: 14, color: 'var(--label)' },
  legElem: { display: 'flex', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: '50%' },
  refresh: { marginLeft: 'auto', width: 18, height: 18, borderWidth: 2 },
  zerno: { padding: '8px 16px calc(8px + env(safe-area-inset-bottom))', fontSize: 13, color: 'var(--secondary-label)', textAlign: 'center', borderTop: '0.5px solid var(--separator)' },
};
