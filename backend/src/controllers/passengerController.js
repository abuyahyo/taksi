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

module.exports = { me, updateMe };
