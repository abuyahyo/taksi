// Харита компоненти — манзилларни кўрсатади ва танлаш имконини беради
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

// Харитани белгиланган нуқтага кўчириш
function HaritaMarkaz({ markaz }) {
  const map = useMap();
  useEffect(() => {
    if (markaz) map.setView(markaz, map.getZoom());
  }, [markaz, map]);
  return null;
}

// Харита босилганда манзилни ушлаш
function BosishHodisasi({ onBosish }) {
  useMapEvents({
    click(e) {
      onBosish([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function Harita({ markaz, boshlanish, tugash, onBosish }) {
  return (
    <MapContainer center={markaz} zoom={13} zoomControl={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap"
      />
      <HaritaMarkaz markaz={markaz} />
      <BosishHodisasi onBosish={onBosish} />
      {boshlanish && <Marker position={boshlanish} icon={yashilIcon} />}
      {tugash && <Marker position={tugash} />}
    </MapContainer>
  );
}
