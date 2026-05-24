// Чат хабарлари — сафар ичидаги тарихни қайтариш
const { query } = require('../config/db');

const tarix = async (req, res) => {
  try {
    const { rideId } = req.params;
    // Фойдаланувчи бу сафар иштирокчисими?
    const ruxsat = await query(
      `SELECT 1 FROM rides WHERE id = $1 AND (mijoz_id = $2 OR haydovchi_id = $2 OR $3 = 'admin')`,
      [rideId, req.user.id, req.user.rol]
    );
    if (ruxsat.rows.length === 0) {
      return res.status(403).json({ xato: 'Бу чатга кириш ҳуқуқингиз йўқ' });
    }

    const r = await query(
      `SELECT m.id, m.matn, m.vaqt, m.yuboruvchi_id, u.ism AS yuboruvchi_ism
       FROM messages m
       LEFT JOIN users u ON u.id = m.yuboruvchi_id
       WHERE m.ride_id = $1
       ORDER BY m.vaqt ASC
       LIMIT 200`,
      [rideId]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('Чат тарих хатоси:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

module.exports = { tarix };
