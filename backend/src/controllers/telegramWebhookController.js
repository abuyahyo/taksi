// Telegram бот webhook — локация, буйруқлар ва KYC расмларини қабул қилади.
// Webhook'ни setWebhook орқали secret_token билан рўйхатдан ўтказинг.
const path = require('path');
const { query } = require('../config/db');
const { yubor, botWebAppTugma, tgFaylYukla } = require('./telegramBotController');
const { kycYoz, KYC_DIR } = require('./kycController');

// Telegram update'дан локацияни ажратиб олиш — соф функция (тест учун).
function lokatsiyaOl(update) {
  const msg = update?.message || update?.edited_message;
  if (!msg) return null;
  const loc = msg.location || msg.venue?.location;
  if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return null;
  return { chatId: msg.chat?.id, lat: loc.latitude, lng: loc.longitude };
}

// Mini App базавий URL (охирги / сиз)
function miniBase() {
  const b = process.env.MINIAPP_URL;
  return b ? b.replace(/\/$/, '') : null;
}

// Локация → буюртма тугмаси
async function lokatsiyaIshle(loc) {
  const base = miniBase();
  if (!base) return;
  const url = `${base}/?dest_lat=${loc.lat}&dest_lng=${loc.lng}`;
  await botWebAppTugma(loc.chatId, '📍 Манзил қабул қилинди. Қуйидаги тугма орқали Manzil’да буюртма беринг:', '🚕 Manzil’да буюртма', url);
}

// telegram_id бўйича фойдаланувчи
async function userTop(chatId) {
  try {
    const r = await query(
      `SELECT id, rol, home_lat, home_lng, ish_lat, ish_lng FROM users WHERE telegram_id = $1`,
      [String(chatId)]
    );
    return r.rows[0] || null;
  } catch (err) { console.error('userTop xato:', err.message); return null; }
}

// Сақланган манзилга (уй/иш) тез буюртма тугмаси
async function tezManzil(chatId, tur) {
  const base = miniBase();
  if (!base) return;
  const u = await userTop(chatId);
  const lat = tur === 'uy' ? u?.home_lat : u?.ish_lat;
  const lng = tur === 'uy' ? u?.home_lng : u?.ish_lng;
  if (lat == null || lng == null) {
    await yubor(chatId, 'Бу манзил сақланмаган. Иловада Профил → ' + (tur === 'uy' ? 'уй' : 'иш') + ' манзилини белгиланг.');
    return;
  }
  const url = `${base}/?dest_lat=${lat}&dest_lng=${lng}`;
  await botWebAppTugma(chatId, (tur === 'uy' ? '🏠 Уй' : '💼 Иш') + ' манзилига буюртма:', '🚕 Manzil’да буюртma', url);
}

// Матн буйруқларини ишлаш
async function komandaIshle(text, chatId) {
  const base = miniBase();
  const buyruq = text.split(/\s+/)[0].replace(/@.*$/, '').toLowerCase();
  switch (buyruq) {
    case '/start':
    case '/buyurtma':
    case '/tarix':
    case '/obuna':
      if (base) await botWebAppTugma(chatId, 'Manzil — иловани очинг:', '🚕 Иловани очиш', `${base}/`);
      else await yubor(chatId, 'Илова ҳозир созланмоқда.');
      break;
    case '/uy': await tezManzil(chatId, 'uy'); break;
    case '/ish': await tezManzil(chatId, 'ish'); break;
    case '/yordam':
      await yubor(chatId, 'Manzil ёрдами:\n• /buyurtma — такси чақириш\n• /uy, /ish — сақланган манзилга буюртма\n• /tarix — сафарлар\n• /obuna — ҳайдовчи обунаси\n\nСавол бўлса шу ботга ёзинг.');
      break;
    default:
      await yubor(chatId, 'Номаълум буйруқ. Мавжуд: /buyurtma /uy /ish /tarix /obuna /yordam');
  }
}

// KYC расми (ҳайдовчи паспорт/селфи юборади, изоҳ билан)
async function rasmIshle(msg, chatId) {
  const u = await userTop(chatId);
  if (!u) { await yubor(chatId, 'Аввал иловага киринг (Menu тугмаси).'); return; }
  if (u.rol !== 'haydovchi') return; // фақат ҳайдовчи KYC юклайди — бошқага жим
  const cap = String(msg.caption || '').toLowerCase();
  let turi = null;
  if (/passport|паспорт|pasport/.test(cap)) turi = 'passport';
  else if (/selfie|селфи|selfi/.test(cap)) turi = 'selfie';
  if (!turi) {
    await yubor(chatId, 'Расмни изоҳ (caption) билан юборинг: "passport" ёки "selfie".');
    return;
  }
  const photo = msg.photo[msg.photo.length - 1]; // энг катта ўлчам
  const faylNomi = `${u.id}_${turi}_${Date.now()}.jpg`;
  const ok = await tgFaylYukla(photo.file_id, path.join(KYC_DIR, faylNomi));
  if (!ok) { await yubor(chatId, 'Расмни юклаб бўлмади, қайта уриниб кўринг.'); return; }
  await kycYoz(u.id, turi, faylNomi);
  await yubor(chatId, (turi === 'passport' ? 'Паспорт' : 'Селфи') + ' қабул қилинди ✅. Админ текширади.');
}

const webhook = async (req, res) => {
  const kutilgan = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (kutilgan && req.headers['x-telegram-bot-api-secret-token'] !== kutilgan) {
    return res.sendStatus(401);
  }
  res.sendStatus(200); // Telegram'га дарров жавоб

  try {
    const update = req.body;
    const msg = update?.message || update?.edited_message;
    const chatId = msg?.chat?.id;
    if (!chatId) return;

    const loc = lokatsiyaOl(update);
    if (loc) { await lokatsiyaIshle(loc); return; }

    if (Array.isArray(msg.photo) && msg.photo.length) { await rasmIshle(msg, chatId); return; }

    const text = String(msg.text || '').trim();
    if (text.startsWith('/')) { await komandaIshle(text, chatId); return; }
  } catch (err) {
    console.error('telegram webhook xato:', err.message);
  }
};

module.exports = { webhook, lokatsiyaOl };
