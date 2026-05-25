// Геолокация соф ёрдамчилари (компонентсиз, тест қилинадиган)

// "lat, lng" сатрини [lat, lng] га айлантиради. Нотўғри бўлса null.
export function parseLatLng(s) {
  if (!s || typeof s !== 'string') return null;
  const m = s.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lat, lng];
}

// Икки нуқта орасидаги масофа (км, бир хона аниқлик), Haversine.
// Нуқталардан бири йўқ бўлса 0.
export function masofaKm(boshlanish, tugash) {
  if (!boshlanish || !tugash) return 0;
  const [lat1, lng1] = boshlanish;
  const [lat2, lng2] = tugash;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}
