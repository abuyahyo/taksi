// Сафарни улашиш — қисқа калит ёрдамида оила/дўст кузата олади
const crypto = require('crypto');
const { query } = require('../config/db');

function kalitYarat() {
  return crypto.randomBytes(6).toString('base64url'); // ~8 ҳарф
}

// POST /api/rides/:id/share — фойдаланувчи ўз сафари учун улашиш яратади
const yarat = async (req, res) => {
  try {
    const { id: rideId } = req.params;
    const ride = await query(`SELECT mijoz_id FROM rides WHERE id = $1`, [rideId]);
    if (ride.rows.length === 0) return res.status(404).json({ xato: 'Сафар топилмади' });
    if (ride.rows[0].mijoz_id !== req.user.id && req.user.rol !== 'admin') {
      return res.status(403).json({ xato: 'Бу сафар сизники эмас' });
    }
    // Мавжуд тугамаган улашиш бўлса — уни қайтарамиз
    const mavjud = await query(
      `SELECT kalit FROM ride_shares WHERE ride_id = $1 AND tugaydigan > NOW() ORDER BY id DESC LIMIT 1`,
      [rideId]
    );
    if (mavjud.rows[0]) {
      return res.json({ kalit: mavjud.rows[0].kalit, yangi: false });
    }
    const kalit = kalitYarat();
    await query(
      `INSERT INTO ride_shares (ride_id, kalit, yaratuvchi_id) VALUES ($1, $2, $3)`,
      [rideId, kalit, req.user.id]
    );
    res.json({ kalit, yangi: true });
  } catch (err) {
    console.error('share yarat xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// GET /api/share/:kalit — оммавий — улашилган сафар маълумоти
const koʻr = async (req, res) => {
  try {
    const { kalit } = req.params;
    const r = await query(
      `SELECT s.ride_id, s.tugaydigan,
              r.holat, r.boshlanish_manzil, r.tugash_manzil,
              r.kelishilgan_narx, r.taklif_narx, r.masofa_km,
              m.ism AS mijoz_ism,
              h.ism AS haydovchi_ism, h.reyting AS haydovchi_reyting,
              d.mashina_modeli, d.mashina_raqami, d.mashina_rangi, d.tasdiqlangan
       FROM ride_shares s
       JOIN rides r ON r.id = s.ride_id
       LEFT JOIN users m ON r.mijoz_id = m.id
       LEFT JOIN users h ON r.haydovchi_id = h.id
       LEFT JOIN drivers d ON d.user_id = h.id
       WHERE s.kalit = $1`,
      [kalit]
    );
    if (r.rows.length === 0) return res.status(404).json({ xato: 'Топилмади' });
    const x = r.rows[0];
    if (new Date(x.tugaydigan) < new Date()) {
      return res.status(410).json({ xato: 'Улашиш муддати тугаган' });
    }
    res.json(x);
  } catch (err) {
    console.error('share koʻr xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

module.exports = { yarat, koʻr };
