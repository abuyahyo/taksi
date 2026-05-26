// Тўлов оғистрол: URL яратиш + демо учун "тўлангандек белгилаш"
const { query } = require('../config/db');
const { paymeCheckoutUrl } = require('./paymeController');
const { clickCheckoutUrl } = require('./clickController');
const { obunaFaollashtir } = require('./subscriptionController');

// Тўлов нишонини (сафар ёки обуна) аниқлаб, эгалик ва суммани текширади.
// Қайтаради: { rideId|obunaId, summaSum } ёки { xato, kod }.
async function nishonniTekshir({ rideId, obunaId }, user) {
  if (obunaId) {
    const o = await query(`SELECT id, user_id, summa, holat FROM obunalar WHERE id = $1`, [obunaId]);
    if (o.rows.length === 0) return { xato: 'Обуна топилмади', kod: 404 };
    const ob = o.rows[0];
    if (ob.user_id !== user.id && user.rol !== 'admin') return { xato: 'Бу обуна сизники эмас', kod: 403 };
    if (ob.holat === 'faol') return { xato: 'Обуна аллақачон фаол', kod: 400 };
    if (!ob.summa) return { xato: 'Обуна нархи нотўғри', kod: 400 };
    return { obunaId: ob.id, summaSum: ob.summa };
  }
  const ride = await query(`SELECT id, mijoz_id, kelishilgan_narx FROM rides WHERE id = $1`, [rideId]);
  if (ride.rows.length === 0) return { xato: 'Сафар топилмади', kod: 404 };
  const r = ride.rows[0];
  if (r.mijoz_id !== user.id && user.rol !== 'admin') return { xato: 'Бу сафар сизники эмас', kod: 403 };
  if (!r.kelishilgan_narx) return { xato: 'Сафар нархи белгиланмаган', kod: 400 };
  return { rideId: r.id, summaSum: r.kelishilgan_narx };
}

// POST /api/payment/url  body: { rideId | obunaId, tizim: 'payme' | 'click', returnUrl?, til? }
const checkoutUrl = async (req, res) => {
  try {
    const { rideId, obunaId, tizim, returnUrl, til } = req.body;
    if ((!rideId && !obunaId) || !['payme', 'click'].includes(tizim)) {
      return res.status(400).json({ xato: 'Нотўғри параметр' });
    }
    const n = await nishonniTekshir({ rideId, obunaId }, req.user);
    if (n.xato) return res.status(n.kod).json({ xato: n.xato });

    const ozgaruvchilar = { rideId: n.rideId, obunaId: n.obunaId, summaSum: n.summaSum, returnUrl, til };
    const url = tizim === 'payme' ? paymeCheckoutUrl(ozgaruvchilar) : clickCheckoutUrl(ozgaruvchilar);
    res.json({ url, tizim, summa: n.summaSum });
  } catch (err) {
    console.error('checkoutUrl xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// POST /api/payment/test-pay  — реал merchant калитсиз синов учун
// Сафарни 'tolandi' ҳолатига ўтказади ва транзакция ёзади
const testPay = async (req, res) => {
  try {
    // Тест тўлови — фақат аниқ тест режимда. Акс ҳолда фойдаланувчи ўз
    // сафарини реал тўловсиз "тўланган" қилиб қўйиши мумкин эди (fail-closed).
    if (process.env.PAYMENT_TEST_MODE !== '1') {
      return res.status(403).json({ xato: 'Тест тўлови ўчирилган' });
    }
    const { rideId, obunaId } = req.body;
    const n = await nishonniTekshir({ rideId, obunaId }, req.user);
    if (n.xato) return res.status(n.kod).json({ xato: n.xato });

    const vaqt = Date.now();
    const belgi = n.obunaId ? `obuna-${n.obunaId}` : `ride-${n.rideId}`;
    await query(
      `INSERT INTO transactions (ride_id, obuna_id, tizim, tashqi_id, summa, holat, yaratilgan_vaqt, amalga_oshgan_vaqt)
       VALUES ($1, $2, 'test', $3, $4, 'tolandi', $5, $5)`,
      [n.rideId || null, n.obunaId || null, `test-${belgi}-${vaqt}`, n.summaSum * 100, vaqt]
    );
    // Обуна тўлови — дарҳол фаоллаштирамиз
    if (n.obunaId) await obunaFaollashtir(n.obunaId);
    res.json({ ok: true, summa: n.summaSum });
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
