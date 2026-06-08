// Тўлов оғистрол: URL яратиш + демо учун "тўлангандек белгилаш"
const { query } = require('../config/db');
const { paymeCheckoutUrl } = require('./paymeController');
const { clickCheckoutUrl } = require('./clickController');
const { obunaFaollashtir } = require('./subscriptionController');
const { reklamaFaollashtir } = require('./reklamaController');

// Тўлов нишонини (сафар, обуна ёки реклама) аниқлаб, эгалик ва суммани текширади.
// Қайтаради: { rideId|obunaId|reklamaId, summaSum } ёки { xato, kod }.
async function nishonniTekshir({ rideId, obunaId, reklamaId }, user) {
  if (reklamaId) {
    const a = await query(
      `SELECT a.id, a.golib_summa, a.tolandi, k.user_id
         FROM reklama_auksionlar a JOIN reklama_kampaniyalar k ON k.id = a.golib_kampaniya_id
        WHERE a.id = $1`,
      [reklamaId]
    );
    if (a.rows.length === 0) return { xato: 'Кимошди ютуғи топилмади', kod: 404 };
    const r = a.rows[0];
    if (r.user_id !== user.id && user.rol !== 'admin') return { xato: 'Бу ютуқ сизники эмас', kod: 403 };
    if (r.tolandi) return { xato: 'Аллақачон тўланган', kod: 400 };
    if (!r.golib_summa) return { xato: 'Ютуқ нархи нотўғри', kod: 400 };
    return { reklamaId: r.id, summaSum: r.golib_summa };
  }
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
    const { rideId, obunaId, reklamaId, tizim, returnUrl, til } = req.body;
    if ((!rideId && !obunaId && !reklamaId) || !['payme', 'click'].includes(tizim)) {
      return res.status(400).json({ xato: 'Нотўғри параметр' });
    }
    const n = await nishonniTekshir({ rideId, obunaId, reklamaId }, req.user);
    if (n.xato) return res.status(n.kod).json({ xato: n.xato });

    const ozgaruvchilar = { rideId: n.rideId, obunaId: n.obunaId, reklamaId: n.reklamaId, summaSum: n.summaSum, returnUrl, til };
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
    const { rideId, obunaId, reklamaId } = req.body;
    const n = await nishonniTekshir({ rideId, obunaId, reklamaId }, req.user);
    if (n.xato) return res.status(n.kod).json({ xato: n.xato });

    const vaqt = Date.now();
    const belgi = n.reklamaId ? `reklama-${n.reklamaId}` : n.obunaId ? `obuna-${n.obunaId}` : `ride-${n.rideId}`;
    await query(
      `INSERT INTO transactions (ride_id, obuna_id, reklama_id, tizim, tashqi_id, summa, holat, yaratilgan_vaqt, amalga_oshgan_vaqt)
       VALUES ($1, $2, $3, 'test', $4, $5, 'tolandi', $6, $6)`,
      [n.rideId || null, n.obunaId || null, n.reklamaId || null, `test-${belgi}-${vaqt}`, n.summaSum * 100, vaqt]
    );
    // Обуна/реклама тўлови — дарҳол фаоллаштирамиз
    if (n.obunaId) await obunaFaollashtir(n.obunaId);
    if (n.reklamaId) await reklamaFaollashtir(n.reklamaId);
    res.json({ ok: true, summa: n.summaSum });
  } catch (err) {
    console.error('testPay xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// GET /api/payment/status/:rideId  — сафарнинг тўлов ҳолати
const status = async (req, res) => {
  try {
    const rideId = parseInt(req.params.rideId, 10);
    if (!Number.isInteger(rideId)) return res.status(400).json({ xato: 'Нотўғри ид' });
    // Фақат сафар эгаси (мижоз/ҳайдовчи) ёки админ кўра олади —
    // бошқа фойдаланувчи бировнинг тўлов маълумотини сўра олмасин.
    const ride = await query('SELECT mijoz_id, haydovchi_id FROM rides WHERE id = $1', [rideId]);
    if (ride.rows.length === 0) return res.status(404).json({ xato: 'Сафар топилмади' });
    const { mijoz_id, haydovchi_id } = ride.rows[0];
    if (req.user.rol !== 'admin' && req.user.id !== mijoz_id && req.user.id !== haydovchi_id) {
      return res.status(403).json({ xato: 'Рухсат йўқ' });
    }
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
