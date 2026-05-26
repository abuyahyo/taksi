// Telegram бот хабарномалари — web push билан ёнма-ён ишлайди.
// Telegram'да кирган фойдаланувчиларга (users.telegram_id бор) бот орқали
// хабар юборамиз: илова ёпиқ бўлса ҳам Telegram'да билдиришнома келади.
// Токен фақат env'дан ўқилади; созланмаса жим ўчиқ туради.
const fs = require('fs');
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

// Web App тугмали хабар — фойдаланувчи босса Mini App шу URL билan очилади.
async function botWebAppTugma(chatId, text, tugmaMatn, url) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId || !url) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: { inline_keyboard: [[{ text: tugmaMatn, web_app: { url } }]] },
      }),
    });
  } catch (err) {
    console.error('botWebAppTugma xato:', err.message);
  }
}

// Telegram файлини юклаб дискка сақлаш (getFile → download). Макс 6МБ.
async function tgFaylYukla(fileId, dest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !fileId) return false;
  try {
    const r1 = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const j = await r1.json();
    const fp = j?.result?.file_path;
    if (!fp) return false;
    const r2 = await fetch(`https://api.telegram.org/file/bot${token}/${fp}`);
    if (!r2.ok) return false;
    const buf = Buffer.from(await r2.arrayBuffer());
    if (buf.length > 6 * 1024 * 1024) return false; // 6МБ чек
    await fs.promises.writeFile(dest, buf);
    return true;
  } catch (err) {
    console.error('tgFaylYukla xato:', err.message);
    return false;
  }
}

// Бот буйруқлари менюсини ўрнатиш (бир марта, сервер кўтарилганда).
async function komandalarOrnat() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'buyurtma', description: 'Такси буюртма қилиш' },
          { command: 'uy', description: 'Уй манзилига буюртма' },
          { command: 'ish', description: 'Иш манзилига буюртма' },
          { command: 'tarix', description: 'Сафарлар тарихи' },
          { command: 'obuna', description: 'Обуна (ҳайдовчилар учун)' },
          { command: 'yordam', description: 'Ёрдам' },
        ],
      }),
    });
  } catch (err) {
    console.error('komandalarOrnat xato:', err.message);
  }
}

module.exports = { yubor, botFoydalanuvchiga, botRolga, botWebAppTugma, tgFaylYukla, komandalarOrnat };
