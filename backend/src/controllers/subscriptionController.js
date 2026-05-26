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
// Обунани БЕПУЛ бермаймиз — кутилаётган (pending) обуна яратиб, унинг id'сини
// қайтарамиз. Фойдаланувчи Payme/Click орқали тўлайди, webhook тасдиқлагач
// obunaFaollashtir() уни фаоллаштиради. Тўловсиз обуна берилмайди.
const sotibOlish = async (req, res) => {
  try {
    const { turi } = req.body;
    const paket = PAKETLAR[turi];
    if (!paket || turi === 'trial') {
      return res.status(400).json({ xato: 'Нотўғри пакет' });
    }

    // Шу тур учун аввалдан кутилаётган обуна бўлса — қайта ишлатамиз (қатор спамини тўсиш)
    const mavjud = await query(
      `SELECT id FROM obunalar WHERE user_id = $1 AND turi = $2 AND holat = 'kutilmoqda'
       ORDER BY id DESC LIMIT 1`,
      [req.user.id, turi]
    );
    let obunaId;
    if (mavjud.rows[0]) {
      obunaId = mavjud.rows[0].id;
    } else {
      // tugash_sana NOT NULL — вақтинча тўлдирамиз, фаоллашганда қайта ҳисобланади.
      const r = await query(
        `INSERT INTO obunalar (user_id, turi, summa, tugash_sana, holat)
         VALUES ($1, $2, $3, NOW() + ($4 || ' days')::INTERVAL, 'kutilmoqda')
         RETURNING id`,
        [req.user.id, turi, paket.summa, paket.kun]
      );
      obunaId = r.rows[0].id;
    }

    res.json({ ok: true, obunaId, turi, summa: paket.summa });
  } catch (err) {
    console.error('subscription buy xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// Тўлов тасдиқлангач — кутилаётган обунани фаоллаштириш (webhook/test-pay чақиради).
// Идемпотент: фаол бўлса қайта ишламайди. Мавжуд фаол муддат устига қўшамиз (stacking).
async function obunaFaollashtir(obunaId) {
  const r = await query(`SELECT user_id, turi, holat FROM obunalar WHERE id = $1`, [obunaId]);
  const o = r.rows[0];
  if (!o) return false;
  if (o.holat === 'faol') return true; // аллақачон фаол
  const paket = PAKETLAR[o.turi];
  const kun = paket?.kun || 0;
  await query(
    `UPDATE obunalar
        SET holat = 'faol', boshlanish_sana = NOW(),
            tugash_sana = GREATEST(
              COALESCE((SELECT MAX(tugash_sana) FROM obunalar
                        WHERE user_id = $2 AND holat = 'faol' AND tugash_sana > NOW()), NOW()),
              NOW()
            ) + ($3 || ' days')::INTERVAL
      WHERE id = $1`,
    [obunaId, o.user_id, kun]
  );
  return true;
}

// Бошқа модуллар учун — обуна фаоллигини текшириш
async function obunaFaolmi(userId) {
  const o = await faolObuna(userId);
  return !!o;
}

module.exports = { holatim, sotibOlish, faolObuna, obunaFaolmi, obunaFaollashtir, PAKETLAR };
