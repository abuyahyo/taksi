// Манзил қидируви — OpenStreetMap Nominatim API орқали (бепул)
// Сиёсати: 1 req/sec, User-Agent мажбурий. Шу учун кэш ишлатамиз.

const xotira = new Map(); // 'q|til' → { vaqt, natija }
const TTL = 5 * 60 * 1000; // 5 дақиқа

const qidir = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json([]);

    const tilParam = String(req.query.til || 'uz');
    const til = tilParam === 'ru' ? 'ru' : (tilParam === 'uz-latn' ? 'uz' : 'uz');

    const kalit = `${q.toLowerCase()}|${til}`;
    const eski = xotira.get(kalit);
    if (eski && Date.now() - eski.vaqt < TTL) {
      return res.json(eski.natija);
    }

    // Мамлакат чекови — env билан. Дефолт 'uz' (Тошкент фокуси).
    // Бўш ёки '*' → бутун дунё (глобал режим).
    const mamlakatlar = process.env.GEOCODE_COUNTRIES ?? 'uz';
    const ccParam = (mamlakatlar && mamlakatlar !== '*') ? `&countrycodes=${encodeURIComponent(mamlakatlar)}` : '';
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6${ccParam}&accept-language=${til}`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Manzil/1.0 (https://github.com/abuyahyo/taksi)' },
    });
    if (!r.ok) return res.json([]);

    const data = await r.json();
    const natija = (data || []).map((x) => ({
      manzil: x.display_name,
      lat: parseFloat(x.lat),
      lng: parseFloat(x.lon),
      tur:  x.type,
    })).filter((x) => !isNaN(x.lat) && !isNaN(x.lng));

    xotira.set(kalit, { vaqt: Date.now(), natija });
    // Кэш катталашмасин — 200дан ошса эскисини тозалаймиз
    if (xotira.size > 200) {
      const eskilar = [...xotira.entries()].sort((a, b) => a[1].vaqt - b[1].vaqt).slice(0, 50);
      eskilar.forEach(([k]) => xotira.delete(k));
    }
    res.json(natija);
  } catch (err) {
    console.error('geocode xato:', err.message);
    res.status(500).json({ xato: 'Қидирув хатоси' });
  }
};

// Тескари геокод — координатадан манзил (харита маркази учун)
const teskari = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.json({ manzil: '' });

    const tilParam = String(req.query.til || 'uz');
    const til = tilParam === 'ru' ? 'ru' : 'uz';

    const kalit = `r|${lat.toFixed(4)}|${lng.toFixed(4)}|${til}`;
    const eski = xotira.get(kalit);
    if (eski && Date.now() - eski.vaqt < TTL) return res.json(eski.natija);

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=${til}&zoom=18`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Manzil/1.0 (https://github.com/abuyahyo/taksi)' } });
    if (!r.ok) return res.json({ manzil: '' });

    const data = await r.json();
    const natija = { manzil: data.display_name || '', lat, lng };
    xotira.set(kalit, { vaqt: Date.now(), natija });
    res.json(natija);
  } catch (err) {
    console.error('reverse geocode xato:', err.message);
    res.json({ manzil: '' });
  }
};

module.exports = { qidir, teskari };
