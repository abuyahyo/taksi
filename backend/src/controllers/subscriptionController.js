// Обуна тизими — биз ҳайдовчилардан фоиз олмаймиз, фақат обуна
const { query } = require('../config/db');

// Пакетлар — ягона ҳақиқат манбаи. Кейинроқ DB'га ўтказиш мумкин.
const PAKETLAR = {
  trial:    { kun: 7,   summa: 0,       label: 'Бепул синов' },
  kunlik:   { kun: 1,   summa: 10000 },
  haftalik: { kun: 7,   summa: 50000 },
  oylik:    { kun: 30,  summa: 150000 },
  yillik:   { kun: 365, summa: 1200000 },
};

// Фойдаланувчининг фаол обунасини оламиз
async function faolObuna(userId) {
  const r = await query(
    `SELECT * FROM obunalar
     WHERE user_id = $1 AND tugash_sana > NOW() AND holat = 'faol'
     ORDER BY tugash_sana DESC LIMIT 1`,
    [userId]
  );
  return r.rows[0] || null;
}

// GET /api/driver/subscription
const holatim = async (req, res) => {
  try {
    let faol = await faolObuna(req.user.id);

    // Ҳеч обуна йўқ + ҳеч қачон trial олмаган → автомат trial бер
    if (!faol) {
      const eski = await query(
        `SELECT 1 FROM obunalar WHERE user_id = $1 LIMIT 1`,
        [req.user.id]
      );
      if (eski.rows.length === 0) {
        const r = await query(
          `INSERT INTO obunalar (user_id, turi, summa, tugash_sana)
           VALUES ($1, 'trial', 0, NOW() + INTERVAL '7 days') RETURNING *`,
          [req.user.id]
        );
        faol = r.rows[0];
      }
    }

    // Тарих
    const tarix = await query(
      `SELECT id, turi, summa, boshlanish_sana, tugash_sana, holat
       FROM obunalar WHERE user_id = $1
       ORDER BY boshlanish_sana DESC LIMIT 20`,
      [req.user.id]
    );

    res.json({
      faol,
      tarix: tarix.rows,
      paketlar: PAKETLAR,
    });
  } catch (err) {
    console.error('subscription holatim xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// POST /api/driver/subscription/buy { turi }
const sotibOlish = async (req, res) => {
  try {
    const { turi } = req.body;
    const paket = PAKETLAR[turi];
    if (!paket || turi === 'trial') {
      return res.status(400).json({ xato: 'Нотўғри пакет' });
    }

    // Фаол обуна бўлса — узайтирамиз; йўқ бўлса янгисини яратамиз
    const faol = await faolObuna(req.user.id);
    let yangi;
    if (faol) {
      // Қолган кунлар сақланади, янги муддат уни узайтиради
      const r = await query(
        `UPDATE obunalar
            SET tugash_sana = GREATEST(tugash_sana, NOW()) + ($2 || ' days')::INTERVAL,
                summa = summa + $3
          WHERE id = $1
          RETURNING *`,
        [faol.id, paket.kun, paket.summa]
      );
      yangi = r.rows[0];
    } else {
      const r = await query(
        `INSERT INTO obunalar (user_id, turi, summa, tugash_sana)
         VALUES ($1, $2, $3, NOW() + ($4 || ' days')::INTERVAL)
         RETURNING *`,
        [req.user.id, turi, paket.summa, paket.kun]
      );
      yangi = r.rows[0];
    }

    res.json({ ok: true, obuna: yangi });
  } catch (err) {
    console.error('subscription buy xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// Бошқа модуллар учун — обуна фаоллигини текшириш
async function obunaFaolmi(userId) {
  const o = await faolObuna(userId);
  return !!o;
}

module.exports = { holatim, sotibOlish, faolObuna, obunaFaolmi, PAKETLAR };
