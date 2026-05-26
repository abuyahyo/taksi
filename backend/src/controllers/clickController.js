// Click Merchant API — Prepare + Complete (2 босқич, имзо текшируви билан)
const crypto = require('crypto');
const { query } = require('../config/db');
const { obunaFaollashtir } = require('./subscriptionController');
require('dotenv').config();

// Тўлов нишони merchant_trans_id'дан: обуна ('sub-N') ёки сафар (рақам = ride id)
function nishon(merchantTransId) {
  const s = String(merchantTransId || '');
  if (s.startsWith('sub-')) return { tur: 'obuna', id: parseInt(s.slice(4), 10) };
  return { tur: 'ride', id: parseInt(s, 10) };
}

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
  const secret = process.env.CLICK_SECRET;
  // Дефолт/бўш сир — фақат аниқ тест режимда ўтказамиз. Акс ҳолда рад этамиз
  // (fail-closed): 'test_secret' репозиторийда очиқ, у билан имзо сохталаштирилмасин.
  if (!secret || secret === 'test_secret') {
    return process.env.PAYMENT_TEST_MODE === '1';
  }
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

  const n = nishon(b.merchant_trans_id);
  let kerakliSum; // сўмда
  if (n.tur === 'ride') {
    const ride = await query('SELECT kelishilgan_narx, holat FROM rides WHERE id = $1', [n.id]);
    if (ride.rows.length === 0) return res.json({ error: XATO.BUYURTMA_TOPILMADI, error_note: 'Буюртма топилмади' });
    if (ride.rows[0].holat === 'bekor_qilindi') return res.json({ error: XATO.BEKOR_QILINGAN, error_note: 'Сафар бекор қилинган' });
    kerakliSum = Number(ride.rows[0].kelishilgan_narx);
  } else {
    const ob = await query('SELECT summa, holat FROM obunalar WHERE id = $1', [n.id]);
    if (ob.rows.length === 0) return res.json({ error: XATO.BUYURTMA_TOPILMADI, error_note: 'Обуна топилмади' });
    if (ob.rows[0].holat === 'faol') return res.json({ error: XATO.BEKOR_QILINGAN, error_note: 'Обуна аллақачон фаол' });
    kerakliSum = Number(ob.rows[0].summa);
  }
  // Сумма мос келиши шарт (Click сўм бирлигида юборади)
  if (!kerakliSum || Math.round(Number(b.amount)) !== kerakliSum) {
    return res.json({ error: XATO.SUMMA_XATO, error_note: 'Сумма нотўғри' });
  }
  // Икки марта тўловни тўсамиз
  const ustun = n.tur === 'ride' ? 'ride_id' : 'obuna_id';
  const tolangan = await query(
    `SELECT 1 FROM transactions WHERE ${ustun} = $1 AND holat = 'tolandi' LIMIT 1`,
    [n.id]
  );
  if (tolangan.rows.length) {
    return res.json({ error: XATO.ALLAQACHON_TOLANGAN, error_note: 'Аллақачон тўланган' });
  }

  // Транзакция яратамиз
  const natija = await query(
    `INSERT INTO transactions (ride_id, obuna_id, tizim, tashqi_id, summa, holat)
     VALUES ($1, $2, 'click', $3, $4, 'kutilmoqda') RETURNING id`,
    [n.tur === 'ride' ? n.id : null, n.tur === 'obuna' ? n.id : null, b.click_trans_id, Math.round(b.amount * 100)]
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
  // Нишонга қараб: сафарни тўланган деб белгилаймиз ёки обунани фаоллаштирамиз
  if (tx.rows[0].ride_id) await query(`UPDATE rides SET holat = 'yakunlandi' WHERE id = $1`, [tx.rows[0].ride_id]);
  if (tx.rows[0].obuna_id) await obunaFaollashtir(tx.rows[0].obuna_id);

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
function clickCheckoutUrl({ rideId, obunaId, summaSum, returnUrl }) {
  const serviceId = process.env.CLICK_SERVICE_ID || 'test_service_id';
  const merchantId = process.env.CLICK_MERCHANT_ID || 'test_merchant_id';
  const params = new URLSearchParams({
    service_id: serviceId,
    merchant_id: merchantId,
    amount: String(summaSum),
    transaction_param: obunaId ? `sub-${obunaId}` : String(rideId),
  });
  if (returnUrl) params.set('return_url', returnUrl);
  return `https://my.click.uz/services/pay?${params.toString()}`;
}

module.exports = { prepare, complete, clickCheckoutUrl, imzoTekshir };
