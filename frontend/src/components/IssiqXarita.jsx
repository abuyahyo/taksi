// Иссиқ харита — ҳайдовчига буюртмалар зич жойларни кўрсатади
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import { api } from '../services/api';
import { useT } from '../i18n';
import { parseLatLng } from './HaritaPreview';
import 'leaflet/dist/leaflet.css';

const TOSHKENT = [41.2995, 69.2401];

function ToshkentMarkazi() {
  const map = useMap();
  useEffect(() => { map.setView(TOSHKENT, 12); }, [map]);
  return null;
}

export default function IssiqXarita({ onYopish }) {
  const { t } = useT();
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
        <div style={st.header}>
          <div>
            <div style={st.sarlavha}>🔥 {t('heat.title')}</div>
            <div style={st.izoh}>{t('heat.hint')}</div>
          </div>
          <button style={st.yopish} onClick={onYopish}>✕</button>
        </div>

        <div style={st.harita}>
          <MapContainer center={TOSHKENT} zoom={12} style={{ width: '100%', height: '100%' }} zoomControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
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
            <span style={{ ...st.dot, background: '#EF4444' }} />
            <span>{t('heat.pending')}: <b>{faol}</b></span>
          </div>
          <div style={st.legElem}>
            <span style={{ ...st.dot, background: '#FACC15' }} />
            <span>{t('heat.completed')}: <b>{yakun}</b></span>
          </div>
          {yuklanmoqda && <div style={st.refresh}>⏳</div>}
        </div>

        <div style={st.zerno}>{t('heat.refreshNote')}</div>
      </div>
    </div>
  );
}

const st = {
  fon: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 3600 },
  panel: { background: 'var(--oq)', width: '100%', maxWidth: 480, height: '90vh', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, borderBottom: '1px solid var(--neutral-200)' },
  sarlavha: { fontSize: 18, fontWeight: 800 },
  izoh: { fontSize: 12, color: 'var(--kulrang)', marginTop: 2 },
  yopish: { width: 36, height: 36, borderRadius: '50%', background: 'var(--och-kulrang)', fontSize: 16 },
  harita: { flex: 1, position: 'relative' },
  legenda: { display: 'flex', gap: 16, alignItems: 'center', padding: '10px 16px', background: 'var(--oq)', borderTop: '1px solid var(--neutral-200)', fontSize: 13 },
  legElem: { display: 'flex', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: '50%' },
  refresh: { marginLeft: 'auto', fontSize: 14 },
  zerno: { padding: '8px 16px', fontSize: 11, color: 'var(--kulrang)', textAlign: 'center', borderTop: '1px solid var(--neutral-200)' },
};
