// Йўловчи профили — асосий маълумотлар, стат, сақланган манзиллар
const { query } = require('../config/db');

// GET /api/passenger/me
const me = async (req, res) => {
  try {
    const u = await query(
      `SELECT id, ism, telefon, rol, reyting,
              home_manzil, home_lat, home_lng,
              ish_manzil,  ish_lat,  ish_lng,
              yaratilgan
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (u.rows.length === 0) return res.status(404).json({ xato: 'Топилмади' });

    const stat = await query(
      `SELECT
         COUNT(*)                                       AS jami_safar,
         COUNT(*) FILTER (WHERE holat = 'yakunlandi')   AS yakunlangan,
         COALESCE(SUM(kelishilgan_narx) FILTER (WHERE holat = 'yakunlandi'), 0) AS jami_xarajat
       FROM rides
       WHERE mijoz_id = $1`,
      [req.user.id]
    );

    res.json({
      ...u.rows[0],
      stat: {
        jami_safar: parseInt(stat.rows[0].jami_safar, 10),
        yakunlangan: parseInt(stat.rows[0].yakunlangan, 10),
        jami_xarajat: parseInt(stat.rows[0].jami_xarajat, 10),
      },
    });
  } catch (err) {
    console.error('passenger me xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// PUT /api/passenger/me — исм ва сақланган манзилларни янгилаш
const updateMe = async (req, res) => {
  try {
    const { ism, home, ish } = req.body;
    // Исм бўлиши керак — бўш юбормайди
    const yangiIsm = (ism && typeof ism === 'string') ? ism.trim().slice(0, 100) : null;

    const aniqMan = (x) => (x && typeof x === 'object') ? {
      manzil: (typeof x.manzil === 'string') ? x.manzil.trim().slice(0, 200) || null : null,
      lat: x.lat != null ? Number(x.lat) : null,
      lng: x.lng != null ? Number(x.lng) : null,
    } : { manzil: null, lat: null, lng: null };

    const h = aniqMan(home);
    const i = aniqMan(ish);

    await query(
      `UPDATE users
          SET ism         = COALESCE($2, ism),
              home_manzil = $3, home_lat = $4, home_lng = $5,
              ish_manzil  = $6, ish_lat  = $7, ish_lng  = $8
        WHERE id = $1`,
      [req.user.id, yangiIsm, h.manzil, h.lat, h.lng, i.manzil, i.lat, i.lng]
    );

    return me(req, res); // янгиланган обектни қайтарамиз
  } catch (err) {
    console.error('passenger updateMe xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// GET /api/passenger/recent — сўнгги уникал манзиллар (тез-танлов учун)
const songgiManzillar = async (req, res) => {
  try {
    const r = await query(
      `SELECT DISTINCT ON (tugash_manzil) tugash_manzil AS manzil, yaratilgan
       FROM rides
       WHERE mijoz_id = $1 AND tugash_manzil IS NOT NULL
       ORDER BY tugash_manzil, yaratilgan DESC
       LIMIT 5`,
      [req.user.id]
    );
    // Энг кейинги ишлатилганлар олдинда
    const sort = r.rows.sort((a, b) => new Date(b.yaratilgan) - new Date(a.yaratilgan));
    res.json(sort);
  } catch (err) {
    console.error('passenger recent xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// GET /api/passenger/addresses — фойдаланувчи сақлаган ихтиёрий манзиллар
const manzillar = async (req, res) => {
  try {
    const r = await query(
      `SELECT id, nom, manzil, lat, lng FROM saqlangan_manzillar
        WHERE user_id = $1 ORDER BY yaratilgan DESC`,
      [req.user.id]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('passenger manzillar xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// POST /api/passenger/addresses — янги манзил сақлаш { nom, manzil, lat, lng }
const manzilQosh = async (req, res) => {
  try {
    const nom = (typeof req.body.nom === 'string') ? req.body.nom.trim().slice(0, 60) : '';
    const manzil = (typeof req.body.manzil === 'string') ? req.body.manzil.trim().slice(0, 200) : '';
    if (!nom || !manzil) return res.status(400).json({ xato: 'Ном ва манзил киритинг' });
    const lat = req.body.lat != null ? Number(req.body.lat) : null;
    const lng = req.body.lng != null ? Number(req.body.lng) : null;
    const r = await query(
      `INSERT INTO saqlangan_manzillar (user_id, nom, manzil, lat, lng)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, nom, manzil, lat, lng`,
      [req.user.id, nom, manzil, Number.isFinite(lat) ? lat : null, Number.isFinite(lng) ? lng : null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error('passenger manzilQosh xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// DELETE /api/passenger/addresses/:id — фақат ўз манзилини ўчира олади
const manzilOchir = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ xato: 'Нотўғри id' });
    const r = await query(
      `DELETE FROM saqlangan_manzillar WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ xato: 'Топилмади' });
    res.json({ ok: true });
  } catch (err) {
    console.error('passenger manzilOchir xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// GET /api/passenger/last-ride — сўнгги якунланган сафар (Uber услубида "Қайтариш" карточкаси учун)
const oxirgiSafar = async (req, res) => {
  try {
    const r = await query(
      `SELECT id, tugash_manzil, tugash_lat, tugash_lng,
              boshlanish_manzil, boshlanish_lat, boshlanish_lng,
              kelishilgan_narx, tarif, yakun_vaqti
       FROM rides
       WHERE mijoz_id = $1 AND holat = 'yakunlandi'
       ORDER BY yakun_vaqti DESC NULLS LAST
       LIMIT 1`,
      [req.user.id]
    );
    res.json(r.rows[0] || null);
  } catch (err) {
    console.error('passenger oxirgiSafar xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

module.exports = { me, updateMe, songgiManzillar, oxirgiSafar, manzillar, manzilQosh, manzilOchir };
