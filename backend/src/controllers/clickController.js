// Click Merchant API — Prepare + Complete (2 босқич, имзо текшируви билан)
const crypto = require('crypto');
const { query } = require('../config/db');
require('dotenv').config();

// Click хато кодлари (расмий)
const XATO = {
  MUVAFFAQIYAT: 0,
  IMZO_XATO: -1,
  SUMMA_XATO: -2,
  BUYURTMA_TOPILMADI: -5,
  ALLAQACHON_TOLANGAN: -4,
  BEKOR_QILINGAN: -9,
};

// Click имзосини текшириш (MD5)
function imzoTekshir(body, bosqich) {
  const secret = process.env.CLICK_SECRET || 'test_secret';
  let satr;
  if (bosqich === 'prepare') {
    satr = `${body.click_trans_id}${body.service_id}${secret}${body.merchant_trans_id}${body.amount}${body.action}${body.sign_time}`;
  } else {
    satr = `${body.click_trans_id}${body.service_id}${secret}${body.merchant_trans_id}${body.merchant_prepare_id}${body.amount}${body.action}${body.sign_time}`;
  }
  const hisoblangan = crypto.createHash('md5').update(satr).digest('hex');
  return hisoblangan === body.sign_string;
}

// 1. PREPARE — тўловни тайёрлаш
const prepare = async (req, res) => {
  const b = req.body;

  if (!imzoTekshir(b, 'prepare')) {
    return res.json({ error: XATO.IMZO_XATO, error_note: 'Имзо нотўғри' });
  }

  const ride = await query('SELECT * FROM rides WHERE id = $1', [b.merchant_trans_id]);
  if (ride.rows.length === 0) {
    return res.json({ error: XATO.BUYURTMA_TOPILMADI, error_note: 'Буюртма топилмади' });
  }

  // Транзакция яратамиз
  const natija = await query(
    `INSERT INTO transactions (ride_id, tizim, tashqi_id, summa, holat)
     VALUES ($1, 'click', $2, $3, 'kutilmoqda') RETURNING id`,
    [b.merchant_trans_id, b.click_trans_id, Math.round(b.amount * 100)]
  );

  res.json({
    error: XATO.MUVAFFAQIYAT,
    error_note: 'Муваффақият',
    click_trans_id: b.click_trans_id,
    merchant_trans_id: b.merchant_trans_id,
    merchant_prepare_id: natija.rows[0].id,
  });
};

// 2. COMPLETE — тўловни якунлаш
const complete = async (req, res) => {
  const b = req.body;

  if (!imzoTekshir(b, 'complete')) {
    return res.json({ error: XATO.IMZO_XATO, error_note: 'Имзо нотўғри' });
  }

  const tx = await query('SELECT * FROM transactions WHERE id = $1', [b.merchant_prepare_id]);
  if (tx.rows.length === 0) {
    return res.json({ error: XATO.BUYURTMA_TOPILMADI, error_note: 'Транзакция топилмади' });
  }

  // Click бекор қилганми?
  if (b.error < 0) {
    await query(`UPDATE transactions SET holat = 'bekor' WHERE id = $1`, [b.merchant_prepare_id]);
    return res.json({ error: XATO.BEKOR_QILINGAN, error_note: 'Тўлов бекор қилинди' });
  }

  // Тўловни якунлаймиз
  await query(`UPDATE transactions SET holat = 'tolandi' WHERE id = $1`, [b.merchant_prepare_id]);
  await query(`UPDATE rides SET holat = 'yakunlandi' WHERE id = $1`, [tx.rows[0].ride_id]);

  res.json({
    error: XATO.MUVAFFAQIYAT,
    error_note: 'Муваффақият',
    click_trans_id: b.click_trans_id,
    merchant_trans_id: b.merchant_trans_id,
    merchant_confirm_id: b.merchant_prepare_id,
  });
};

// Click checkout URL яратиш
//   format: https://my.click.uz/services/pay?service_id=X&merchant_id=Y&amount=Z&transaction_param=N&return_url=R
function clickCheckoutUrl({ rideId, summaSum, returnUrl }) {
  const serviceId = process.env.CLICK_SERVICE_ID || 'test_service_id';
  const merchantId = process.env.CLICK_MERCHANT_ID || 'test_merchant_id';
  const params = new URLSearchParams({
    service_id: serviceId,
    merchant_id: merchantId,
    amount: String(summaSum),
    transaction_param: String(rideId),
  });
  if (returnUrl) params.set('return_url', returnUrl);
  return `https://my.click.uz/services/pay?${params.toString()}`;
}

module.exports = { prepare, complete, clickCheckoutUrl };
