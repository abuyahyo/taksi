// Йўл ҳисоблаш — OSRM (OpenStreetMap роутинг, бепул) орқали реал йўл масофаси,
// вақти (ETA) ва йўл чизиғи. OSRM ишламаса — Haversine захира ҳисоби.
// Карта (банк) талаб қилмайди — стратегияга мос (Google Maps мумкин эмас).

const OSRM = (process.env.OSRM_URL || 'https://router.project-osrm.org').replace(/\/+$/, '');
const SHAHAR_TEZLIK = 22; // км/соат — захира ETA учун шаҳар ўртача тезлиги

const xotira = new Map(); // 'lat,lng;...' → { vaqt, natija }
const TTL = 5 * 60 * 1000; // 5 дақиқа

// Haversine — икки нуқта орасидаги тўғри чизиқ масофаси (км)
function haversineKm([lat1, lng1], [lat2, lng2]) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// "lat,lng;lat,lng;..." → [[lat,lng], ...] (нотўғри нуқталар ташланади)
function nuqtalarniAjrat(koord) {
  return String(koord || '')
    .split(';')
    .map((p) => p.split(',').map((n) => parseFloat(n)))
    .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng) &&
      Math.abs(lat) <= 90 && Math.abs(lng) <= 180);
}

// Захира: OSRM ишламаганда тўғри чизиқ масофа + тахминий вақт
function zaxiraHisob(nuqtalar) {
  let km = 0;
  for (let i = 0; i < nuqtalar.length - 1; i++) km += haversineKm(nuqtalar[i], nuqtalar[i + 1]);
  return {
    masofa_km: Math.round(km * 10) / 10,
    davomiylik_min: Math.max(1, Math.round((km / SHAHAR_TEZLIK) * 60)),
    yol_chizigi: nuqtalar, // тўғри чизиқ — реал йўл йўқ
    taxminiy: true,        // фронтенд буни "≈" билан кўрсатиши учун
  };
}

const yol = async (req, res) => {
  try {
    const nuqtalar = nuqtalarniAjrat(req.query.koord);
    if (nuqtalar.length < 2) return res.status(400).json({ xato: 'Камида 2 нуқта керак' });
    if (nuqtalar.length > 12) nuqtalar.length = 12; // суиистеъмолни чеклаш

    const kalit = nuqtalar.map(([a, b]) => `${a.toFixed(5)},${b.toFixed(5)}`).join(';');
    const eski = xotira.get(kalit);
    if (eski && Date.now() - eski.vaqt < TTL) return res.json(eski.natija);

    // OSRM lng,lat тартибини талаб қилади
    const koordStr = nuqtalar.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const url = `${OSRM}/route/v1/driving/${koordStr}?overview=full&geometries=geojson`;

    let natija;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Manzil/1.0 (https://github.com/abuyahyo/taksi)' },
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const data = r.ok ? await r.json() : null;
      const route = data?.routes?.[0];
      if (route && route.geometry?.coordinates?.length) {
        natija = {
          masofa_km: Math.round((route.distance / 1000) * 10) / 10,
          davomiylik_min: Math.max(1, Math.round(route.duration / 60)),
          // GeoJSON [lng,lat] → Leaflet [lat,lng]
          yol_chizigi: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
          taxminiy: false,
        };
      }
    } catch (e) {
      // OSRM узилди/таймаут — захирага ўтамиз
    }

    if (!natija) natija = zaxiraHisob(nuqtalar);

    xotira.set(kalit, { vaqt: Date.now(), natija });
    if (xotira.size > 200) {
      [...xotira.entries()].sort((a, b) => a[1].vaqt - b[1].vaqt).slice(0, 50)
        .forEach(([k]) => xotira.delete(k));
    }
    res.json(natija);
  } catch (err) {
    console.error('route xato:', err.message);
    res.status(500).json({ xato: 'Йўл ҳисобланмади' });
  }
};

module.exports = { yol };
