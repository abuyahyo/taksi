// Ҳайдовчи статистикаси ва машина профили
const { query } = require('../config/db');

// Машина профили — модел, рақам, ранг
const profile = async (req, res) => {
  try {
    const r = await query(
      `SELECT u.ism, u.telefon, u.reyting,
              d.mashina_modeli, d.mashina_raqami, d.mashina_rangi
       FROM users u LEFT JOIN drivers d ON d.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(r.rows[0] || {});
  } catch (err) {
    console.error('Driver profile xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { mashina_modeli, mashina_raqami, mashina_rangi } = req.body;
    const trim = (s) => (typeof s === 'string' ? s.trim().slice(0, 100) : null);
    const modeli = trim(mashina_modeli);
    const raqami = trim(mashina_raqami);
    const rangi  = trim(mashina_rangi);

    const upd = await query(
      `UPDATE drivers SET mashina_modeli = $2, mashina_raqami = $3, mashina_rangi = $4
       WHERE user_id = $1`,
      [req.user.id, modeli, raqami, rangi]
    );
    if (upd.rowCount === 0) {
      // Регистрда drivers ёзилмаган бўлса яратамиз
      await query(
        `INSERT INTO drivers (user_id, mashina_modeli, mashina_raqami, mashina_rangi)
         VALUES ($1, $2, $3, $4)`,
        [req.user.id, modeli, raqami, rangi]
      );
    }
    res.json({ ok: true, mashina_modeli: modeli, mashina_raqami: raqami, mashina_rangi: rangi });
  } catch (err) {
    console.error('Driver profile update xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

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

module.exports = { stats, profile, updateProfile };
