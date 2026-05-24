// Фойдаланувчининг ўз сафарлари — мижоз ёки ҳайдовчи сифатида
const { query } = require('../config/db');

const meniki = async (req, res) => {
  try {
    const r = await query(
      `SELECT
         r.id, r.holat,
         r.boshlanish_manzil, r.tugash_manzil,
         r.masofa_km, r.taklif_narx, r.kelishilgan_narx,
         r.yaratilgan, r.qabul_vaqti, r.yakun_vaqti,
         r.mijoz_id, r.haydovchi_id,
         m.ism AS mijoz_ism,
         h.ism AS haydovchi_ism
       FROM rides r
       LEFT JOIN users m ON r.mijoz_id = m.id
       LEFT JOIN users h ON r.haydovchi_id = h.id
       WHERE r.mijoz_id = $1 OR r.haydovchi_id = $1
       ORDER BY r.yaratilgan DESC
       LIMIT 100`,
      [req.user.id]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('Сафар тарихи хатоси:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

module.exports = { meniki };
