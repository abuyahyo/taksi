// Икки нуқта орасидаги масофа (метрда) — Haversine формуласи
export function masofaMetr(nuqta1, nuqta2) {
  if (!nuqta1 || !nuqta2) return Infinity;
  const [lat1, lng1] = nuqta1;
  const [lat2, lng2] = nuqta2;
  const R = 6371000; // Ер радиуси, метр
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Километрда (1 хона аниқлик)
export function masofaKm(nuqta1, nuqta2) {
  return (masofaMetr(nuqta1, nuqta2) / 1000).toFixed(1);
}
