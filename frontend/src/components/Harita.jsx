// Харита компоненти — манзилларни кўрсатади ва танлаш имконини беради.
// Икки режим: (1) тап билан нуқта қўйиш (onBosish), (2) Yandex Go услуби —
// марказда турғун пин, харита сурилади, марказ координатаси onMarkaz'га узатилади.
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from 'react-leaflet';
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

// Брендланган пин (SVG teardrop) — бирюза бошланиш, қизил борар манзил
const pinSvg = (rang) => `<svg width="30" height="40" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 0C5.37 0 0 5.37 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.37 18.63 0 12 0z" fill="${rang}" stroke="#fff" stroke-width="2"/>
  <circle cx="12" cy="12" r="4.5" fill="#fff"/>
</svg>`;
const boshlanishIcon = L.divIcon({ className: 'brand-pin', html: pinSvg('#0E9384'), iconSize: [30, 40], iconAnchor: [15, 40] });
const tugashIcon = L.divIcon({ className: 'brand-pin', html: pinSvg('#EF4444'), iconSize: [30, 40], iconAnchor: [15, 40] });
// Оралиқ тўхташ — кичик бирюза доира
const oraliqIcon = L.divIcon({
  className: 'oraliq-pin',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#0E9384;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
});

// Ҳайдовчи учун машина иконкаси (SVG + бирюза доира)
const haydovchiIcon = L.divIcon({
  className: 'haydovchi-marker',
  html: `<div style="
    width:42px;height:42px;border-radius:50%;
    background:#0E9384;display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 8px rgba(0,0,0,.3);border:3px solid #fff;
  "><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11l1.8-4.6A2 2 0 0 1 8.7 5h6.6a2 2 0 0 1 1.9 1.4L19 11"/><path d="M4 11h16a1 1 0 0 1 1 1v4H3v-4a1 1 0 0 1 1-1z"/><circle cx="7.5" cy="16.5" r="1.6"/><circle cx="16.5" cy="16.5" r="1.6"/></svg></div>`,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
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
  markazRejim = false, markazRang = '#0E9384', onMarkaz, uchish, yol,
}) {
  // Кўп манзил: yol = [бошланиш, ...оралиқлар]. 2+ нуқта бўлса йўлни шу бўйича чизамиз.
  const koplik = Array.isArray(yol) && yol.length >= 2;
  const oraliqlar = koplik ? yol.slice(1, -1) : [];
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
        {/* Йўл чизиғи — кўп манзил бўлса барча нуқталар орқали, акс ҳолда pickup ↔ манзил */}
        {koplik ? (
          <Polyline positions={yol} pathOptions={{ color: '#0E9384', weight: 4, opacity: 0.85 }} />
        ) : boshlanish && tugash && (
          <Polyline positions={[boshlanish, tugash]} pathOptions={{ color: '#0E9384', weight: 4, opacity: 0.85 }} />
        )}
        {/* Оралиқ тўхташ маркерлари */}
        {oraliqlar.map((nuqta, i) => <Marker key={`or-${i}`} position={nuqta} icon={oraliqIcon} />)}
        {/* Ҳайдовчи → pickup (пунктир) — ҳайдовчи йўлда бўлганда */}
        {haydovchi && boshlanish && (
          <Polyline positions={[haydovchi, boshlanish]} pathOptions={{ color: '#0E9384', weight: 3, opacity: 0.55, dashArray: '6 8' }} />
        )}
        {boshlanish && <Marker position={boshlanish} icon={boshlanishIcon} />}
        {tugash && <Marker position={tugash} icon={tugashIcon} />}
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
