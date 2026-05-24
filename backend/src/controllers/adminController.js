// Админ панели мантиғи — статистика, фойдаланувчилар, блоклаш
const { query } = require('../config/db');

// Умумий статистика
const statistika = async (req, res) => {
  try {
    const foydalanuvchilar = await query('SELECT COUNT(*) FROM users');
    const haydovchilar = await query("SELECT COUNT(*) FROM users WHERE rol = 'haydovchi'");
    const safarlar = await query('SELECT COUNT(*) FROM rides');
    const yakunlangan = await query("SELECT COUNT(*) FROM rides WHERE holat = 'yakunlandi'");
    const daromad = await query("SELECT COALESCE(SUM(kelishilgan_narx), 0) AS jami FROM rides WHERE holat = 'yakunlandi'");

    res.json({
      jami_foydalanuvchi: parseInt(foydalanuvchilar.rows[0].count),
      jami_haydovchi: parseInt(haydovchilar.rows[0].count),
      jami_safar: parseInt(safarlar.rows[0].count),
      yakunlangan_safar: parseInt(yakunlangan.rows[0].count),
      jami_daromad: parseInt(daromad.rows[0].jami),
    });
  } catch (err) {
    console.error('Статистика хатоси:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// Барча фойдаланувчилар рўйхати
const foydalanuvchilar = async (req, res) => {
  try {
    const natija = await query(
      `SELECT id, ism, telefon, rol, reyting, bloklangan, blok_sababi, yaratilgan
       FROM users ORDER BY yaratilgan DESC`
    );
    res.json(natija.rows);
  } catch (err) {
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// Фойдаланувчини блоклаш (шаффоф — сабаб мажбурий)
const bloklash = async (req, res) => {
  try {
    const { id } = req.params;
    const { sabab } = req.body;

    if (!sabab) {
      return res.status(400).json({ xato: 'Блоклаш сабабини кўрсатинг' });
    }

    await query(
      `UPDATE users SET bloklangan = TRUE, blok_sababi = $1, blok_vaqti = NOW() WHERE id = $2`,
      [sabab, id]
    );
    res.json({ xabar: 'Фойдаланувчи блокланди', sabab });
  } catch (err) {
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// Блокни ечиш
const blokniYechish = async (req, res) => {
  try {
    const { id } = req.params;
    await query(
      `UPDATE users SET bloklangan = FALSE, blok_sababi = NULL, blok_vaqti = NULL WHERE id = $1`,
      [id]
    );
    res.json({ xabar: 'Блок ечилди' });
  } catch (err) {
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// Сўнгги буюртмалар
const buyurtmalar = async (req, res) => {
  try {
    const natija = await query(
      `SELECT r.id, r.boshlanish_manzil, r.tugash_manzil, r.taklif_narx,
              r.kelishilgan_narx, r.holat, r.yaratilgan,
              m.ism AS mijoz_ism, h.ism AS haydovchi_ism
       FROM rides r
       LEFT JOIN users m ON r.mijoz_id = m.id
       LEFT JOIN users h ON r.haydovchi_id = h.id
       ORDER BY r.yaratilgan DESC LIMIT 50`
    );
    res.json(natija.rows);
  } catch (err) {
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

module.exports = { statistika, foydalanuvchilar, bloklash, blokniYechish, buyurtmalar };
