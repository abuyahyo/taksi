// Кичик харита превью — буюртма картасида йўл (бошланиш → манзил)
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Кичик яшил/қизил нуқталар — divIcon билан (расмлар керак эмас)
const dotIcon = (color) => L.divIcon({
  className: 'preview-dot',
  html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});
const yashilDot = dotIcon('#16A34A');
const qizilDot  = dotIcon('#EF4444');

function FitBounds({ nuqtalar }) {
  const map = useMap();
  useEffect(() => {
    if (nuqtalar.length >= 2) {
      map.fitBounds(L.latLngBounds(nuqtalar), { padding: [16, 16] });
    }
  }, [nuqtalar, map]);
  return null;
}

// "41.2995, 69.2401" → [41.2995, 69.2401]; нотўғри бўлса null
export function parseLatLng(s) {
  if (!s || typeof s !== 'string') return null;
  const m = s.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lat, lng];
}

export default function HaritaPreview({ boshlanish, tugash, height = 110 }) {
  if (!boshlanish || !tugash) return null;
  return (
    <div style={{ height, borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
      <MapContainer
        center={boshlanish}
        zoom={13}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={boshlanish} icon={yashilDot} />
        <Marker position={tugash} icon={qizilDot} />
        <Polyline positions={[boshlanish, tugash]} pathOptions={{ color: '#0E9384', weight: 4, opacity: 0.9 }} />
        <FitBounds nuqtalar={[boshlanish, tugash]} />
      </MapContainer>
    </div>
  );
}
