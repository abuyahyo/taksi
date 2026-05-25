// Харита компоненти — манзилларни кўрсатади ва танлаш имконини беради.
// Икки режим: (1) тап билан нуқта қўйиш (onBosish), (2) Yandex Go услуби —
// марказда турғун пин, харита сурилади, марказ координатаси onMarkaz'га узатилади.
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet'нинг стандарт иконка муаммосини ҳал қилиш
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Бошланиш нуқтаси учун яшил иконка
const yashilIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'marker-boshlanish',
});

// Ҳайдовчи учун машина иконкаси (emoji + бирюза доира)
const haydovchiIcon = L.divIcon({
  className: 'haydovchi-marker',
  html: `<div style="
    width:44px;height:44px;border-radius:50%;
    background:#0E9384;display:flex;align-items:center;justify-content:center;
    font-size:24px;box-shadow:0 2px 8px rgba(0,0,0,.3);
    border:3px solid #fff;
  ">🚗</div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

// Харитани белгиланган нуқтага кўчириш
function HaritaMarkaz({ markaz }) {
  const map = useMap();
  useEffect(() => {
    if (markaz) map.setView(markaz, map.getZoom());
  }, [markaz, map]);
  return null;
}

// Дастурий равишда харитани кўчириш (қидирув/сақланган манзилга)
function UchishKuzat({ uchish }) {
  const map = useMap();
  useEffect(() => {
    if (uchish) map.setView(uchish, Math.max(map.getZoom(), 16));
  }, [uchish, map]);
  return null;
}

// Харита босилганда манзилни ушлаш (тап режими)
function BosishHodisasi({ onBosish }) {
  useMapEvents({
    click(e) {
      onBosish([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

// Yandex услуби — харита маркази ўзгарганда координатани узатиш
function MarkazKuzat({ onMarkaz }) {
  const map = useMapEvents({
    moveend() {
      const c = map.getCenter();
      onMarkaz([c.lat, c.lng]);
    },
  });
  // Дастлабки марказни ҳам бир марта узатамиз
  useEffect(() => {
    const c = map.getCenter();
    onMarkaz([c.lat, c.lng]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function Harita({
  markaz, boshlanish, tugash, haydovchi, onBosish,
  markazRejim = false, markazRang = '#0E9384', onMarkaz, uchish,
}) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer center={markaz} zoom={13} zoomControl={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap"
        />
        <HaritaMarkaz markaz={haydovchi || markaz} />
        {uchish && <UchishKuzat uchish={uchish} />}
        {onBosish && <BosishHodisasi onBosish={onBosish} />}
        {markazRejim && onMarkaz && <MarkazKuzat onMarkaz={onMarkaz} />}
        {boshlanish && <Marker position={boshlanish} icon={yashilIcon} />}
        {tugash && <Marker position={tugash} />}
        {haydovchi && <Marker position={haydovchi} icon={haydovchiIcon} />}
      </MapContainer>

      {/* Yandex услуби марказий пин — харита остида сурилади, пин турғун */}
      {markazRejim && (
        <div style={pinUslub.wrap}>
          <div style={{ ...pinUslub.pin, background: markazRang }} />
          <div style={pinUslub.soya} />
        </div>
      )}
    </div>
  );
}

// Марказий пин — экран марказида турғун (харита остида ҳаракатланади)
const pinUslub = {
  wrap: {
    position: 'absolute', left: '50%', top: '50%',
    transform: 'translate(-50%, -100%)',
    zIndex: 500, pointerEvents: 'none',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  pin: {
    width: 26, height: 26, borderRadius: '50% 50% 50% 0',
    transform: 'rotate(-45deg)',
    border: '3px solid #fff',
    boxShadow: '0 3px 8px rgba(0,0,0,.35)',
  },
  soya: {
    width: 10, height: 4, borderRadius: '50%',
    background: 'rgba(0,0,0,.25)', marginTop: 3,
  },
};
