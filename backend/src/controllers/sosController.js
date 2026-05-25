// Admin учун SOS сигналлар — кўриш ва қабул қилиш
const { query } = require('../config/db');

// GET /api/admin/sos — қабул қилинмаганлар + сўнгги 24 соат тарихи
const royxat = async (_req, res) => {
  try {
    const r = await query(
      `SELECT s.id, s.ride_id, s.lat, s.lng, s.matn, s.qabul_qilindi, s.vaqt, s.rol,
              u.ism AS yuboruvchi_ism, u.telefon AS yuboruvchi_telefon
       FROM sos_signals s
       LEFT JOIN users u ON u.id = s.yuboruvchi_id
       WHERE s.qabul_qilindi = FALSE OR s.vaqt > NOW() - INTERVAL '24 hours'
       ORDER BY s.qabul_qilindi ASC, s.vaqt DESC
       LIMIT 100`
    );
    res.json(r.rows);
  } catch (err) {
    console.error('sos royxat xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// POST /api/admin/sos/:id/qabul — админ бу сигналга кўрсатма берди
const qabul = async (req, res) => {
  try {
    const { id } = req.params;
    await query(
      `UPDATE sos_signals SET qabul_qilindi = TRUE, qabul_qilgan_id = $2, qabul_vaqti = NOW() WHERE id = $1`,
      [id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('sos qabul xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

module.exports = { royxat, qabul };
