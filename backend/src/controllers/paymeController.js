// Payme Merchant API — JSON-RPC протоколи
// Payme сервери шу манзилга сўров юборади, биз жавоб берамиз
const { query } = require('../config/db');
const { obunaFaollashtir } = require('./subscriptionController');
const { reklamaFaollashtir } = require('./reklamaController');
require('dotenv').config();

// Тўлов нишони account'дан: реклама (ac.reklama_id), обуна (ac.obuna_id) ёки сафар (ac.ride_id)
function nishon(account) {
  const a = account || {};
  if (a.reklama_id) return { tur: 'reklama', id: parseInt(a.reklama_id, 10) };
  if (a.obuna_id) return { tur: 'obuna', id: parseInt(a.obuna_id, 10) };
  if (a.ride_id) return { tur: 'ride', id: parseInt(a.ride_id, 10) };
  return null;
}

// Payme хато кодлари (расмий)
const XATO = {
  TRANZAKSIYA_TOPILMADI: -31003,
  NOTOGRI_SUMMA: -31001,
  BAJARIB_BOLMAYDI: -31008,
  BUYURTMA_TOPILMADI: -31050,
};

// Транзакция ҳолатлари (Payme стандарти)
const HOLAT = { YARATILDI: 1, TOLANDI: 2, BEKOR: -1, BEKOR_TOLANGANDAN: -2 };

// Ҳар бир метод учун жавоб ёрдамчилари
const xatoJavob = (id, code, message) => ({ id, error: { code, message } });
const muvaffaqiyat = (id, result) => ({ id, result });

// Нишон бўйича тўлов мумкинлигини текширади (амалга оширилмайди).
// Қайтаради: { kerakli } (тийинда) ёки { xato: kod, xabar }.
// checkPerform ва create иккаласи шу битта текширувни ишлатади (Payme протоколи
// CreateTransaction'да ҳам айни текширувни такрорлашни талаб қилади).
async function nishonTekshir(n, amount) {
  let kerakli; // тийинда
  if (n.tur === 'ride') {
    const ride = await query('SELECT kelishilgan_narx, holat FROM rides WHERE id = $1', [n.id]);
    if (ride.rows.length === 0) return { xato: XATO.BUYURTMA_TOPILMADI, xabar: 'Буюртма топилмади' };
    if (ride.rows[0].holat === 'bekor_qilindi') return { xato: XATO.BAJARIB_BOLMAYDI, xabar: 'Сафар бекор қилинган' };
    kerakli = Math.round(Number(ride.rows[0].kelishilgan_narx) * 100);
  } else if (n.tur === 'obuna') {
    const ob = await query('SELECT summa, holat FROM obunalar WHERE id = $1', [n.id]);
    if (ob.rows.length === 0) return { xato: XATO.BUYURTMA_TOPILMADI, xabar: 'Обуна топилмади' };
    if (ob.rows[0].holat === 'faol') return { xato: XATO.BAJARIB_BOLMAYDI, xabar: 'Обуна аллақачон фаол' };
    kerakli = Math.round(Number(ob.rows[0].summa) * 100);
  } else {
    const a = await query('SELECT golib_summa, tolandi FROM reklama_auksionlar WHERE id = $1', [n.id]);
    if (a.rows.length === 0 || !a.rows[0].golib_summa) return { xato: XATO.BUYURTMA_TOPILMADI, xabar: 'Кимошди ютуғи топилмади' };
    if (a.rows[0].tolandi) return { xato: XATO.BAJARIB_BOLMAYDI, xabar: 'Аллақачон тўланган' };
    kerakli = Math.round(Number(a.rows[0].golib_summa) * 100);
  }
  // Сумма тўғрими? (тийинда, бутун сонда солиштирамиз)
  if (Number(amount) !== kerakli) {
    return { xato: XATO.NOTOGRI_SUMMA, xabar: 'Сумма нотўғри' };
  }
  // Аллақачон тўланганми?
  const ustun = n.tur === 'ride' ? 'ride_id' : n.tur === 'obuna' ? 'obuna_id' : 'reklama_id';
  const tolangan = await query(
    `SELECT 1 FROM transactions WHERE ${ustun} = $1 AND holat = 'tolandi' LIMIT 1`,
    [n.id]
  );
  if (tolangan.rows.length) {
    return { xato: XATO.BAJARIB_BOLMAYDI, xabar: 'Аллақачон тўланган' };
  }
  return { kerakli };
}

// 1. CheckPerformTransaction — тўлов мумкинми текшириш
async function checkPerform(params, id) {
  const n = nishon(params.account);
  if (!n) return xatoJavob(id, XATO.BUYURTMA_TOPILMADI, 'Буюртма топилмади');
  const t = await nishonTekshir(n, params.amount);
  if (t.xato) return xatoJavob(id, t.xato, t.xabar);
  return muvaffaqiyat(id, { allow: true });
}

// 2. CreateTransaction — транзакция яратиш
async function create(params, id) {
  const mavjud = await query('SELECT * FROM transactions WHERE tashqi_id = $1', [params.id]);

  if (mavjud.rows.length > 0) {
    const t = mavjud.rows[0];
    return muvaffaqiyat(id, {
      create_time: parseInt(t.yaratilgan_vaqt),
      transaction: String(t.id),
      state: HOLAT.YARATILDI,
    });
  }

  const n = nishon(params.account);
  if (!n) return xatoJavob(id, XATO.BUYURTMA_TOPILMADI, 'Буюртма топилмади');
  // CheckPerform текширувини такрорлаймиз — нотўғри сумма ёки аллақачон фаол/тўланган
  // нишонга транзакция яратилмасин (Payme протоколи талаби, сохта тўловдан ҳимоя).
  const tek = await nishonTekshir(n, params.amount);
  if (tek.xato) return xatoJavob(id, tek.xato, tek.xabar);
  const vaqt = Date.now();
  const natija = await query(
    `INSERT INTO transactions (ride_id, obuna_id, reklama_id, tizim, tashqi_id, summa, holat, yaratilgan_vaqt)
     VALUES ($1, $2, $3, 'payme', $4, $5, 'kutilmoqda', $6) RETURNING id`,
    [n.tur === 'ride' ? n.id : null, n.tur === 'obuna' ? n.id : null, n.tur === 'reklama' ? n.id : null, params.id, params.amount, vaqt]
  );

  return muvaffaqiyat(id, {
    create_time: vaqt,
    transaction: String(natija.rows[0].id),
    state: HOLAT.YARATILDI,
  });
}

// 3. PerformTransaction — тўловни амалга ошириш
async function perform(params, id) {
  const tx = await query('SELECT * FROM transactions WHERE tashqi_id = $1', [params.id]);
  if (tx.rows.length === 0) {
    return xatoJavob(id, XATO.TRANZAKSIYA_TOPILMADI, 'Транзакция топилмади');
  }

  const t = tx.rows[0];
  if (t.holat === 'tolandi') {
    return muvaffaqiyat(id, {
      transaction: String(t.id),
      perform_time: parseInt(t.amalga_oshgan_vaqt),
      state: HOLAT.TOLANDI,
    });
  }

  // Аввал нишонни фаоллаштирамиз (ҳаммаси идемпотент), СЎНГ транзакцияни 'tolandi'
  // белгилаймиз. Шу тартибда — фаоллашиш узилса транзакция 'kutilmoqda' қолади ва
  // Payme қайта уринганда фаоллашиш такрорланади. Акс тартибда 'tolandi' бўлиб қолиб,
  // обуна фаоллашмай қоларди (қайта уринишда erta return бўлиб ўтиб кетарди).
  if (t.ride_id) await query(`UPDATE rides SET holat = 'yakunlandi' WHERE id = $1`, [t.ride_id]);
  if (t.obuna_id) await obunaFaollashtir(t.obuna_id);
  if (t.reklama_id) await reklamaFaollashtir(t.reklama_id);
  const vaqt = Date.now();
  await query(`UPDATE transactions SET holat = 'tolandi', amalga_oshgan_vaqt = $1 WHERE id = $2`, [vaqt, t.id]);

  return muvaffaqiyat(id, { transaction: String(t.id), perform_time: vaqt, state: HOLAT.TOLANDI });
}

// 4. CancelTransaction — бекор қилиш
async function cancel(params, id) {
  const tx = await query('SELECT * FROM transactions WHERE tashqi_id = $1', [params.id]);
  if (tx.rows.length === 0) {
    return xatoJavob(id, XATO.TRANZAKSIYA_TOPILMADI, 'Транзакция топилмади');
  }

  const t = tx.rows[0];
  const vaqt = Date.now();
  const yangiHolat = t.holat === 'tolandi' ? HOLAT.BEKOR_TOLANGANDAN : HOLAT.BEKOR;
  await query(
    `UPDATE transactions SET holat = 'bekor', bekor_vaqti = $1, bekor_sababi = $2 WHERE id = $3`,
    [vaqt, params.reason, t.id]
  );

  return muvaffaqiyat(id, { transaction: String(t.id), cancel_time: vaqt, state: yangiHolat });
}

// 5. CheckTransaction — ҳолатни текшириш
async function check(params, id) {
  const tx = await query('SELECT * FROM transactions WHERE tashqi_id = $1', [params.id]);
  if (tx.rows.length === 0) {
    return xatoJavob(id, XATO.TRANZAKSIYA_TOPILMADI, 'Транзакция топилмади');
  }

  const t = tx.rows[0];
  let state = HOLAT.YARATILDI;
  if (t.holat === 'tolandi') state = HOLAT.TOLANDI;
  if (t.holat === 'bekor') state = t.amalga_oshgan_vaqt ? HOLAT.BEKOR_TOLANGANDAN : HOLAT.BEKOR;

  return muvaffaqiyat(id, {
    create_time: parseInt(t.yaratilgan_vaqt) || 0,
    perform_time: parseInt(t.amalga_oshgan_vaqt) || 0,
    cancel_time: parseInt(t.bekor_vaqti) || 0,
    transaction: String(t.id),
    state,
    reason: t.bekor_sababi || null,
  });
}

// Payme HTTP Basic Auth текшируви — Authorization: Basic base64("Paycom:KEY")
function authTekshir(req) {
  const kerakliKey = process.env.PAYME_KEY;
  // Дефолт/бўш калит — фақат аниқ тест режимда ўтказамиз. Акс ҳолда рад этамиз
  // (fail-closed): дефолт калит билан деплой қилинса тўлов сохталаштирилмасин.
  if (!kerakliKey || kerakliKey === 'test_payme_key') {
    return process.env.PAYMENT_TEST_MODE === '1';
  }
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return false;
  try {
    const dekod = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const [user, pass] = dekod.split(':');
    return user === 'Paycom' && pass === kerakliKey;
  } catch {
    return false;
  }
}

// Асосий webhook — Payme сўровларини методга йўналтиради
const paymeWebhook = async (req, res) => {
  const { method, params, id } = req.body || {};
  if (!authTekshir(req)) {
    return res.json(xatoJavob(id, -32504, 'Авторизация талаб қилинади'));
  }
  try {
    let javob;
    switch (method) {
      case 'CheckPerformTransaction': javob = await checkPerform(params, id); break;
      case 'CreateTransaction': javob = await create(params, id); break;
      case 'PerformTransaction': javob = await perform(params, id); break;
      case 'CancelTransaction': javob = await cancel(params, id); break;
      case 'CheckTransaction': javob = await check(params, id); break;
      default: javob = xatoJavob(id, -32601, 'Метод топилмади');
    }
    res.json(javob);
  } catch (err) {
    console.error('Payme хатоси:', err.message);
    res.json(xatoJavob(id, -32400, 'Сервер хатоси'));
  }
};

// Payme checkout URL яратиш — фойдаланувчи юборилиб тўловни киритади
//   format: https://checkout.paycom.uz/{base64(m=MERCHANT;ac.ride_id=N;a=AMOUNT_TIYIN;c=RETURN;l=LANG)}
function paymeCheckoutUrl({ rideId, obunaId, reklamaId, summaSum, returnUrl, til = 'uz' }) {
  const merchant = process.env.PAYME_ID || 'test_payme_id';
  const summa = summaSum * 100; // тийинда
  const account = reklamaId ? `ac.reklama_id=${reklamaId}` : obunaId ? `ac.obuna_id=${obunaId}` : `ac.ride_id=${rideId}`;
  const qismlar = [`m=${merchant}`, account, `a=${summa}`, `l=${til}`];
  if (returnUrl) qismlar.push(`c=${returnUrl}`);
  const param = qismlar.join(';');
  const base64 = Buffer.from(param, 'utf8').toString('base64');
  return `https://checkout.paycom.uz/${base64}`;
}

module.exports = { paymeWebhook, paymeCheckoutUrl, authTekshir };
