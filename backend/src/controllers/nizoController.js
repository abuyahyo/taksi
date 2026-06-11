// Низо (dispute) — тугаган/бекор қилинган сафар юзасидан расмий шикоят.
// Рақобатчиларда низо ҳал қилиш йўли йўқ эди; бизда шаффоф: ҳайдовчи/йўловчи
// шикоят киритади, админ кўриб изоҳ билан ҳал қилади (изоҳ мажбурий — 3-банд).
const { query } = require('../config/db');
const { nizoYaroqli, NIZO_TURLARI } = require('../utils/nizo');

// POST /api/nizo  body: { rideId, tur, matn }
const yarat = async (req, res) => {
  try {
    const rideId = parseInt(req.body.rideId, 10);
    const tur = String(req.body.tur || '');
    const matn = typeof req.body.matn === 'string' ? req.body.matn.trim() : '';
    if (!Number.isInteger(rideId)) return res.status(400).json({ xato: 'Нотўғри сафар' });
    if (matn.length < 5) return res.status(400).json({ xato: 'Шикоятни батафсилроқ ёзинг' });

    const ride = await query(
      `SELECT mijoz_id, haydovchi_id, holat, yakun_vaqti, yaratilgan FROM rides WHERE id = $1`,
      [rideId]
    );
    const r = ride.rows[0];

    // Шу сафар бўйича шу фойдаланувчидан очиқ шикоят борми?
    const ochiq = await query(
      `SELECT 1 FROM nizolar WHERE ride_id = $1 AND shikoyatchi_id = $2 AND holat IN ('ochiq', 'korildi')`,
      [rideId, req.user.id]
    );

    const tekshir = nizoYaroqli(r, req.user.id, tur, ochiq.rows.length > 0);
    if (!tekshir.ok) return res.status(tekshir.kod).json({ xato: tekshir.xato });

    // Иккинчи томон (кимга қарши)
    const qarshiId = req.user.id === r.mijoz_id ? r.haydovchi_id : r.mijoz_id;

    const ins = await query(
      `INSERT INTO nizolar (ride_id, shikoyatchi_id, qarshi_id, tur, matn)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, holat, yaratilgan`,
      [rideId, req.user.id, qarshiId || null, tur, matn.slice(0, 1000)]
    );
    res.status(201).json({ ok: true, nizo: ins.rows[0] });
  } catch (err) {
    console.error('nizo yarat xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// GET /api/nizo/meniki — фойдаланувчининг шикоятлари (натижаси билан, шаффоф)
const meniki = async (req, res) => {
  try {
    const r = await query(
      `SELECT n.id, n.ride_id, n.tur, n.matn, n.holat, n.admin_javob, n.yaratilgan, n.hal_vaqti
         FROM nizolar n
        WHERE n.shikoyatchi_id = $1
        ORDER BY n.yaratilgan DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('nizo meniki xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// ===== Админ =====

// GET /api/admin/nizolar?holat=ochiq
const adminRoyxat = async (req, res) => {
  try {
    const holat = req.query.holat;
    const shartlar = [];
    const qiymat = [];
    if (holat && ['ochiq', 'korildi', 'hal', 'rad'].includes(holat)) {
      qiymat.push(holat);
      shartlar.push(`n.holat = $${qiymat.length}`);
    }
    const where = shartlar.length ? `WHERE ${shartlar.join(' AND ')}` : '';
    const r = await query(
      `SELECT n.id, n.ride_id, n.tur, n.matn, n.holat, n.admin_javob, n.yaratilgan, n.hal_vaqti,
              s.ism AS shikoyatchi_ism, s.id AS shikoyatchi_id,
              q.ism AS qarshi_ism, q.id AS qarshi_id,
              r.boshlanish_manzil, r.tugash_manzil, r.kelishilgan_narx, r.holat AS safar_holat
         FROM nizolar n
         LEFT JOIN users s ON s.id = n.shikoyatchi_id
         LEFT JOIN users q ON q.id = n.qarshi_id
         LEFT JOIN rides r ON r.id = n.ride_id
         ${where}
         ORDER BY (n.holat IN ('ochiq','korildi')) DESC, n.yaratilgan DESC
         LIMIT 100`,
      qiymat
    );
    res.json(r.rows);
  } catch (err) {
    console.error('admin nizolar xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// POST /api/admin/nizo/:id/hal  body: { javob, holat }
// holat: 'hal' (шикоят асосли) ёки 'rad' (асоссиз). Изоҳ МАЖБУРИЙ — шаффофлик.
const adminHal = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const javob = typeof req.body.javob === 'string' ? req.body.javob.trim() : '';
    const holat = req.body.holat === 'rad' ? 'rad' : 'hal';
    if (!Number.isInteger(id)) return res.status(400).json({ xato: 'Нотўғри ид' });
    if (javob.length < 3) return res.status(400).json({ xato: 'Ҳал қилиш изоҳини ёзинг' });

    const r = await query(
      `UPDATE nizolar
          SET holat = $2, admin_javob = $3, hal_qilgan_id = $4, hal_vaqti = NOW()
        WHERE id = $1 AND holat IN ('ochiq', 'korildi')
        RETURNING id, holat`,
      [id, holat, javob.slice(0, 1000), req.user.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ xato: 'Шикоят топилмади ёки аллақачон ҳал қилинган' });
    res.json({ ok: true, nizo: r.rows[0] });
  } catch (err) {
    console.error('admin nizo hal xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

module.exports = { yarat, meniki, adminRoyxat, adminHal, NIZO_TURLARI };
