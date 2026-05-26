// Telegram бот webhook — фойдаланувчи ботга ЛОКАЦИЯ ташласа, унга Mini App'ни
// шу манзил билан очадиган тугма юборамиз ("локация → Manzil'да буюртма").
// Webhook'ни setWebhook орқали secret_token билан рўйхатдан ўтказинг.
const { botWebAppTugma } = require('./telegramBotController');

// Telegram update'дан локацияни ажратиб олиш — соф функция (тест учун).
function lokatsiyaOl(update) {
  const msg = update?.message || update?.edited_message;
  if (!msg) return null;
  const loc = msg.location || msg.venue?.location;
  if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return null;
  return { chatId: msg.chat?.id, lat: loc.latitude, lng: loc.longitude };
}

const webhook = async (req, res) => {
  // Secret token текшируви — фақат Telegram юбора олсин (setWebhook'да ўрнатилади)
  const kutilgan = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (kutilgan && req.headers['x-telegram-bot-api-secret-token'] !== kutilgan) {
    return res.sendStatus(401);
  }
  // Telegram'га дарров жавоб берамиз (акс ҳолда қайта-қайта юборади)
  res.sendStatus(200);

  try {
    const loc = lokatsiyaOl(req.body);
    if (!loc || !loc.chatId) return;
    const base = process.env.MINIAPP_URL;
    if (!base) return; // Mini App URL созланмаган — тугма ясаб бўлмайди
    const url = `${base.replace(/\/$/, '')}/?dest_lat=${loc.lat}&dest_lng=${loc.lng}`;
    await botWebAppTugma(
      loc.chatId,
      '📍 Манзил қабул қилинди. Қуйидаги тугма орқали Manzil’да буюртма беринг:',
      '🚕 Manzil’да буюртма',
      url
    );
  } catch (err) {
    console.error('telegram webhook xato:', err.message);
  }
};

module.exports = { webhook, lokatsiyaOl };
