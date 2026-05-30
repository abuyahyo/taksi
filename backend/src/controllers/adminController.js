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
      `SELECT u.id, u.ism, u.telefon, u.rol, u.reyting, u.bloklangan, u.blok_sababi, u.yaratilgan,
              COALESCE(d.tasdiqlangan, FALSE) AS tasdiqlangan,
              COALESCE(d.tasdiq_holati, 'yangi') AS tasdiq_holati,
              (SELECT COUNT(*) FROM driver_hujjatlar dh WHERE dh.user_id = u.id) AS hujjat_soni
       FROM users u
       LEFT JOIN drivers d ON d.user_id = u.id
       ORDER BY u.yaratilgan DESC`
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

// Ҳайдовчини тасдиқлаш / тасдиқни бекор қилиш (ишончли ҳайдовчи белгиси)
const tasdiqlash = async (req, res) => {
  try {
    const { id } = req.params;
    const r = await query(
      `UPDATE drivers SET tasdiqlangan = TRUE, tasdiq_holati = 'tasdiqlandi', rad_sababi = NULL WHERE user_id = $1`,
      [id]
    );
    if (r.rowCount === 0) return res.status(404).json({ xato: 'Ҳайдовчи топилмади' });
    await query(`UPDATE driver_hujjatlar SET holat = 'tasdiqlandi', rad_sababi = NULL WHERE user_id = $1`, [id]);
    res.json({ xabar: 'Ҳайдовчи тасдиқланди' });
  } catch (err) {
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

const tasdiqBekor = async (req, res) => {
  try {
    const { id } = req.params;
    await query(`UPDATE drivers SET tasdiqlangan = FALSE, tasdiq_holati = 'kutilmoqda' WHERE user_id = $1`, [id]);
    res.json({ xabar: 'Тасдиқ бекор қилинди' });
  } catch (err) {
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// Ҳайдовчи ҳужжатлари рўйхати + профил маълумоти (админ ҳужжатни маълумотга солиштириши учун)
const hujjatlar = async (req, res) => {
  try {
    const { userId } = req.params;
    const h = await query(
      `SELECT id, turi, holat, rad_sababi, yuklangan
       FROM driver_hujjatlar WHERE user_id = $1 ORDER BY turi`,
      [userId]
    );
    const d = await query(
      `SELECT COALESCE(tasdiqlangan, FALSE) AS tasdiqlangan,
              COALESCE(tasdiq_holati, 'yangi') AS tasdiq_holati,
              rad_sababi,
              mashina_modeli, mashina_raqami, mashina_rangi, mashina_yili,
              tugilgan_sana, gpro_raqami, gpro_amal_qiladi
       FROM drivers WHERE user_id = $1`,
      [userId]
    );
    const u = await query(`SELECT ism, telefon FROM users WHERE id = $1`, [userId]);
    const profil = d.rows[0] || {};
    res.json({
      hujjatlar: h.rows,
      tasdiqlangan:  profil.tasdiqlangan || false,
      tasdiq_holati: profil.tasdiq_holati || 'yangi',
      rad_sababi:    profil.rad_sababi || null,
      profil: {
        ism: u.rows[0]?.ism, telefon: u.rows[0]?.telefon,
        mashina_modeli: profil.mashina_modeli, mashina_raqami: profil.mashina_raqami,
        mashina_rangi: profil.mashina_rangi,   mashina_yili: profil.mashina_yili,
        tugilgan_sana: profil.tugilgan_sana,
        gpro_raqami: profil.gpro_raqami,       gpro_amal_qiladi: profil.gpro_amal_qiladi,
      },
    });
  } catch (err) {
    console.error('admin hujjatlar xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// Тасдиқ кутилаётган ҳайдовчилар очерети — янги аризалар тез топилсин
const kycOcheret = async (_req, res) => {
  try {
    const r = await query(
      `SELECT u.id, u.ism, u.telefon, u.yaratilgan,
              d.tasdiq_holati, d.rad_sababi,
              d.mashina_modeli, d.mashina_raqami, d.mashina_yili,
              d.gpro_raqami, d.gpro_amal_qiladi, d.tugilgan_sana,
              (SELECT COUNT(*) FROM driver_hujjatlar dh WHERE dh.user_id = u.id) AS hujjat_soni
       FROM users u JOIN drivers d ON d.user_id = u.id
       WHERE u.rol = 'haydovchi'
         AND COALESCE(d.tasdiqlangan, FALSE) = FALSE
         AND COALESCE(d.tasdiq_holati, 'yangi') IN ('kutilmoqda', 'rad')
       ORDER BY (d.tasdiq_holati = 'kutilmoqda') DESC, u.yaratilgan DESC`
    );
    res.json(r.rows);
  } catch (err) {
    console.error('admin kycOcheret xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// Ҳужжатни рад этиш — сабаб МАЖБУРИЙ (шаффоф блоклаш тамойили). Ҳайдовчи сабабни кўради.
const hujjatRad = async (req, res) => {
  try {
    const { id } = req.params;
    const sabab = typeof req.body.sabab === 'string' ? req.body.sabab.trim() : '';
    if (!sabab) return res.status(400).json({ xato: 'Рад этиш сабабини кўрсатинг' });

    const r = await query(
      `UPDATE driver_hujjatlar SET holat = 'rad', rad_sababi = $2 WHERE id = $1 RETURNING user_id`,
      [id, sabab.slice(0, 300)]
    );
    if (r.rowCount === 0) return res.status(404).json({ xato: 'Ҳужжат топилмади' });

    // Ҳайдовчи умумий ҳолати "рад" — у сабабни кўриб қайта юклайди
    await query(
      `UPDATE drivers SET tasdiqlangan = FALSE, tasdiq_holati = 'rad', rad_sababi = $2 WHERE user_id = $1`,
      [r.rows[0].user_id, sabab.slice(0, 300)]
    );
    res.json({ xabar: 'Ҳужжат рад этилди', sabab });
  } catch (err) {
    console.error('admin hujjatRad xato:', err.message);
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

module.exports = { statistika, foydalanuvchilar, bloklash, blokniYechish, buyurtmalar, tasdiqlash, tasdiqBekor, hujjatlar, hujjatRad, kycOcheret };
