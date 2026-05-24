// Ҳайдовчи статистикаси — бугунги даромад ва сафар сони
const { query } = require('../config/db');

const stats = async (req, res) => {
  try {
    const natija = await query(
      `SELECT
         COALESCE(SUM(kelishilgan_narx), 0) AS daromad,
         COUNT(*)                            AS safar
       FROM rides
       WHERE haydovchi_id = $1
         AND holat = 'yakunlandi'
         AND yakun_vaqti >= CURRENT_DATE
         AND yakun_vaqti <  CURRENT_DATE + INTERVAL '1 day'`,
      [req.user.id]
    );
    res.json({
      daromad: parseInt(natija.rows[0].daromad, 10),
      safar:   parseInt(natija.rows[0].safar, 10),
    });
  } catch (err) {
    console.error('Driver stats хатоси:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

module.exports = { stats };
