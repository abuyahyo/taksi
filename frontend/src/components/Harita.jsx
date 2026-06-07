// Харита компоненти — манзилларни кўрсатади ва танлаш имконини беради.
// Икки режим: (1) тап билан нуқта қўйиш (onBosish), (2) Yandex Go услуби —
// марказда турғун пин, харита сурилади, марказ координатаси onMarkaz'га узатилади.
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTema } from '../theme';

// CARTO тинч векторли-кўриниш плиткалари (карта/билинг талаб қилмайди — бепул).
// Ёруғ: Voyager (тоза, йўллар ажралиб туради). Тунги: Dark Matter.
// Бу Uber/Bolt/Yandex'нинг «премиум» харита ҳиссини беради — оддий OSM эмас.
const PLITKA = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

// Leaflet'нинг стандарт иконка муаммосини ҳал қилиш
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Брендланган пин (SVG teardrop) — қора бошланиш, қизил борар манзил (Uber-style B&W)
const pinSvg = (rang) => `<svg width="30" height="40" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 0C5.37 0 0 5.37 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.37 18.63 0 12 0z" fill="${rang}" stroke="#fff" stroke-width="2"/>
  <circle cx="12" cy="12" r="4.5" fill="#fff"/>
</svg>`;
const boshlanishIcon = L.divIcon({ className: 'brand-pin', html: pinSvg('#000000'), iconSize: [30, 40], iconAnchor: [15, 40] });
const tugashIcon = L.divIcon({ className: 'brand-pin', html: pinSvg('#E11900'), iconSize: [30, 40], iconAnchor: [15, 40] });
// Оралиқ тўхташ — кичик қора доира (бренд = қора)
const oraliqIcon = L.divIcon({
  className: 'oraliq-pin',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#000000;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
});

// Ҳайдовчи машинаси — юқоридан кўриниш (top-down), йўналишга қараб айланади.
// Леафлет маркер ичидаги `.mashina-aylan` элементи rotate бўлади.
const mashinaIcon = L.divIcon({
  className: 'mashina-marker',
  html: `<div class="mashina-aylan" style="transition:transform .45s ease-out;will-change:transform;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35))">
    <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <rect x="11" y="6" width="14" height="24" rx="6.5" fill="#000000" stroke="#fff" stroke-width="2.2"/>
      <path d="M13.5 12 C15 10.5 21 10.5 22.5 12 L21.5 15.5 L14.5 15.5 Z" fill="#fff" opacity="0.9"/>
      <rect x="14" y="23" width="8" height="3.5" rx="1.5" fill="#fff" opacity="0.7"/>
    </svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Икки нуқта орасидаги азимут (0=шимол, соат бўйлаб), top-down иконка айланиши учун.
function burchakHisobla(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLon = rad(b.lng - a.lng);
  const lat1 = rad(a.lat), lat2 = rad(b.lat);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Силлиқ ҳаракатланувчи ҳайдовчи маркери — янги GPS нуқтаси келганда сакрамайди,
// rAF билан ~0.9с давомида интерполяция қилади + йўналишга қараб бурилади.
function HaydovchiMarker({ joylashuv }) {
  const map = useMap();
  const markerRef = useRef(null);
  const rafRef = useRef(null);
  const holatRef = useRef({ lat: null, lng: null });

  useEffect(() => {
    // Сафар тугади / жойлашув йўқ — маркерни олиб ташлаймиз
    if (!joylashuv) {
      cancelAnimationFrame(rafRef.current);
      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
      holatRef.current = { lat: null, lng: null };
      return;
    }
    const [lat, lng] = joylashuv;
    // Биринчи марта — дарров қўямиз, анимация йўқ
    if (!markerRef.current) {
      holatRef.current = { lat, lng };
      markerRef.current = L.marker([lat, lng], { icon: mashinaIcon, interactive: false, zIndexOffset: 1000 }).addTo(map);
      return;
    }
    // Жорий кўрсатилаётган нуқтадан янги нуқтага силлиқ ўтиш
    const boshla = { ...holatRef.current };
    const tugat = { lat, lng };
    const burchak = burchakHisobla(boshla, tugat);
    const el = markerRef.current.getElement();
    const ichki = el && el.querySelector('.mashina-aylan');
    if (ichki) ichki.style.transform = `rotate(${burchak}deg)`;

    const davom = 900;
    const t0 = performance.now();
    cancelAnimationFrame(rafRef.current);
    const qadam = (hozir) => {
      const p = Math.min(1, (hozir - t0) / davom);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOutQuad
      const cLat = boshla.lat + (tugat.lat - boshla.lat) * e;
      const cLng = boshla.lng + (tugat.lng - boshla.lng) * e;
      if (markerRef.current) markerRef.current.setLatLng([cLat, cLng]);
      holatRef.current = { lat: cLat, lng: cLng };
      if (p < 1) rafRef.current = requestAnimationFrame(qadam);
    };
    rafRef.current = requestAnimationFrame(qadam);
  }, [joylashuv, map]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    if (markerRef.current) markerRef.current.remove();
  }, []);

  return null;
}

// Харитани белгиланган нуқтага кўчириш — машина силлиқ сурилганда фон ҳам
// силлиқ эргашсин (сакраш ўрнига panTo анимацияси). Жуда кичик GPS «шовқини»
// учун ҳаракат қилмаймиз.
function HaritaMarkaz({ markaz }) {
  const map = useMap();
  useEffect(() => {
    if (!markaz) return;
    const hozir = map.getCenter();
    const farq = map.distance(hozir, markaz); // метр
    if (farq < 8) return;
    if (farq > 1500) map.setView(markaz, map.getZoom()); // узоқ сакраш — дарров
    else map.panTo(markaz, { animate: true, duration: 0.9, easeLinearity: 0.5 });
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
  markazRejim = false, markazRang = '#000000', onMarkaz, uchish, yol, yolChizigi,
}) {
  // Кўп манзил: yol = [бошланиш, ...оралиқлар]. 2+ нуқта бўлса йўлни шу бўйича чизамиз.
  const koplik = Array.isArray(yol) && yol.length >= 2;
  const oraliqlar = koplik ? yol.slice(1, -1) : [];
  // yolChizigi — OSRM реал йўл геометрияси ([lat,lng] нуқталар). Бўлса тўғри чизиқ ўрнига шуни чизамиз.
  const realYol = Array.isArray(yolChizigi) && yolChizigi.length >= 2 ? yolChizigi : null;
  const { tema } = useTema();
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer center={markaz} zoom={13} zoomControl={false}>
        <TileLayer
          url={tema === 'dark' ? PLITKA.dark : PLITKA.light}
          attribution='© OpenStreetMap © CARTO'
          subdomains="abcd"
          detectRetina
        />
        <HaritaMarkaz markaz={haydovchi || markaz} />
        {uchish && <UchishKuzat uchish={uchish} />}
        {onBosish && <BosishHodisasi onBosish={onBosish} />}
        {markazRejim && onMarkaz && <MarkazKuzat onMarkaz={onMarkaz} />}
        {/* Йўл чизиғи — реал йўл (OSRM) бўлса шу бўйича, акс ҳолда тўғри чизиқ */}
        {realYol ? (
          <Polyline positions={realYol} pathOptions={{ color: '#000000', weight: 5, opacity: 0.9 }} />
        ) : koplik ? (
          <Polyline positions={yol} pathOptions={{ color: '#000000', weight: 4, opacity: 0.85 }} />
        ) : boshlanish && tugash && (
          <Polyline positions={[boshlanish, tugash]} pathOptions={{ color: '#000000', weight: 4, opacity: 0.85 }} />
        )}
        {/* Оралиқ тўхташ маркерлари */}
        {oraliqlar.map((nuqta, i) => <Marker key={`or-${i}`} position={nuqta} icon={oraliqIcon} />)}
        {/* Ҳайдовчи → pickup (пунктир) — ҳайдовчи йўлда бўлганда */}
        {haydovchi && boshlanish && (
          <Polyline positions={[haydovchi, boshlanish]} pathOptions={{ color: '#000000', weight: 3, opacity: 0.55, dashArray: '6 8' }} />
        )}
        {boshlanish && <Marker position={boshlanish} icon={boshlanishIcon} />}
        {tugash && <Marker position={tugash} icon={tugashIcon} />}
        <HaydovchiMarker joylashuv={haydovchi} />
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
