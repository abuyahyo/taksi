// Кичик харита превью — буюртма картасида йўл (бошланиш → манзил)
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTema } from '../theme';

const PLITKA = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

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
export default function HaritaPreview({ boshlanish, tugash, height = 110 }) {
  const { tema } = useTema();
  if (!boshlanish || !tugash) return null;
  return (
    <div style={{ height, borderRadius: 'var(--r-md)', overflow: 'hidden', border: '0.5px solid var(--separator)' }}>
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
        <TileLayer
          url={tema === 'dark' ? PLITKA.dark : PLITKA.light}
          subdomains="abcd"
          detectRetina
        />
        <Marker position={boshlanish} icon={yashilDot} />
        <Marker position={tugash} icon={qizilDot} />
        <Polyline positions={[boshlanish, tugash]} pathOptions={{ color: '#0E9384', weight: 4, opacity: 0.9 }} />
        <FitBounds nuqtalar={[boshlanish, tugash]} />
      </MapContainer>
    </div>
  );
}
