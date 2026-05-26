// Telegram бот хабарномалари — web push билан ёнма-ён ишлайди.
// Telegram'да кирган фойдаланувчиларга (users.telegram_id бор) бот орқали
// хабар юборамиз: илова ёпиқ бўлса ҳам Telegram'да билдиришнома келади.
// Токен фақат env'дан ўқилади; созланмаса жим ўчиқ туради.
const { query } = require('../config/db');

// Оддий матн юборамиз (parse_mode ЙЎҚ) — исм/манзил/чат матнида HTML белгилар
// бўлса ҳам хавфсиз (инъекция/бузилиш йўқ).
async function yubor(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId || !text) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
  } catch (err) {
    console.error('Telegram bot yubor xato:', err.message);
  }
}

// Битта фойдаланувчига (telegram_id бўлса). Fire-and-forget.
async function botFoydalanuvchiga(userId, text) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !userId) return;
  try {
    const r = await query('SELECT telegram_id FROM users WHERE id = $1', [userId]);
    const tgId = r.rows[0]?.telegram_id;
    if (tgId) yubor(String(tgId), text);
  } catch (err) {
    console.error('botFoydalanuvchiga xato:', err.message);
  }
}

// Рол бўйича (масалан барча ҳайдовчилар) — telegram_id борларга.
async function botRolga(rol, text) {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  try {
    const r = await query(
      'SELECT telegram_id FROM users WHERE rol = $1 AND telegram_id IS NOT NULL AND bloklangan IS NOT TRUE',
      [rol]
    );
    r.rows.forEach((row) => yubor(String(row.telegram_id), text));
  } catch (err) {
    console.error('botRolga xato:', err.message);
  }
}

module.exports = { yubor, botFoydalanuvchiga, botRolga };
