// Тўлов оғистрол: URL яратиш + демо учун "тўлангандек белгилаш"
const { query } = require('../config/db');
const { paymeCheckoutUrl } = require('./paymeController');
const { clickCheckoutUrl } = require('./clickController');

// POST /api/payment/url  body: { rideId, tizim: 'payme' | 'click', returnUrl?, til? }
const checkoutUrl = async (req, res) => {
  try {
    const { rideId, tizim, returnUrl, til } = req.body;
    if (!rideId || !['payme', 'click'].includes(tizim)) {
      return res.status(400).json({ xato: 'Нотўғри параметр' });
    }
    const ride = await query(`SELECT id, mijoz_id, kelishilgan_narx FROM rides WHERE id = $1`, [rideId]);
    if (ride.rows.length === 0) {
      return res.status(404).json({ xato: 'Сафар топилмади' });
    }
    const r = ride.rows[0];
    // Аутентификация: фақат шу сафарнинг мижози URL ола олади
    if (req.user.id !== r.mijoz_id && req.user.rol !== 'admin') {
      return res.status(403).json({ xato: 'Бу сафар сизники эмас' });
    }
    if (!r.kelishilgan_narx) {
      return res.status(400).json({ xato: 'Сафар нархи белгиланмаган' });
    }
    const ozgaruvchilar = { rideId: r.id, summaSum: r.kelishilgan_narx, returnUrl, til };
    const url = tizim === 'payme' ? paymeCheckoutUrl(ozgaruvchilar) : clickCheckoutUrl(ozgaruvchilar);
    res.json({ url, tizim, summa: r.kelishilgan_narx });
  } catch (err) {
    console.error('checkoutUrl xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// POST /api/payment/test-pay  — реал merchant калитсиз синов учун
// Сафарни 'tolandi' ҳолатига ўтказади ва транзакция ёзади
const testPay = async (req, res) => {
  try {
    const { rideId } = req.body;
    const ride = await query(`SELECT id, mijoz_id, kelishilgan_narx FROM rides WHERE id = $1`, [rideId]);
    if (ride.rows.length === 0) return res.status(404).json({ xato: 'Сафар топилмади' });
    const r = ride.rows[0];
    if (req.user.id !== r.mijoz_id && req.user.rol !== 'admin') {
      return res.status(403).json({ xato: 'Бу сафар сизники эмас' });
    }
    if (!r.kelishilgan_narx) return res.status(400).json({ xato: 'Нарх белгиланмаган' });

    const vaqt = Date.now();
    await query(
      `INSERT INTO transactions (ride_id, tizim, tashqi_id, summa, holat, yaratilgan_vaqt, amalga_oshgan_vaqt)
       VALUES ($1, 'test', $2, $3, 'tolandi', $4, $4)`,
      [r.id, `test-${r.id}-${vaqt}`, r.kelishilgan_narx * 100, vaqt]
    );
    res.json({ ok: true, summa: r.kelishilgan_narx });
  } catch (err) {
    console.error('testPay xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// GET /api/payment/status/:rideId  — сафарнинг тўлов ҳолати
const status = async (req, res) => {
  try {
    const { rideId } = req.params;
    const r = await query(
      `SELECT id, tizim, summa, holat, yaratilgan FROM transactions WHERE ride_id = $1 ORDER BY id DESC LIMIT 1`,
      [rideId]
    );
    res.json(r.rows[0] || null);
  } catch (err) {
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

module.exports = { checkoutUrl, testPay, status };
