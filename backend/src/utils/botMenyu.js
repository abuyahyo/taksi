// Bot menyu (web_app) тугмаси автo-яngilash — cloudflared URL ҳар restart'да
// ўзгaради, шу сабaб ҳaр session'да барча фойдаланувчилар учун Telegram
// `setChatMenuButton`'ни чaқирaмиз. Базада telegram_id бўлгaн фойдaлaнувчилaргa.
//
// BotFather'да ўрнaтилгaн default menu button per-chat overrideда устун келмaйди,
// шу сaбaб per-chat (chat_id бeрилгaн) ҳолaтдa чaқирaмиз.
const { query } = require('../config/db');

async function chatUchunMenyuOrnatish(chatId, url, token) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: Number(chatId),
        menu_button: { type: 'web_app', text: 'Manzil', web_app: { url } },
      }),
    });
    const j = await r.json();
    return j?.ok === true;
  } catch (err) {
    console.error(`Menyu тугмa ${chatId} учун хатo:`, err.message);
    return false;
  }
}

// Барча `telegram_id` бoр фoйдaлaнувчилaр учун чaқирaмиз. Бoт тoкeни ёки URL
// бўш бўлсa жим қaйтaмиз. Қaйтaради: {yangilandi, jami}.
async function botMenyuTugmaBarchaUchun(url) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !url) return { yangilandi: 0, jami: 0, sabab: 'parametr' };

  const r = await query(
    "SELECT telegram_id FROM users WHERE telegram_id IS NOT NULL AND bloklangan IS NOT TRUE"
  );
  let n = 0;
  for (const row of r.rows) {
    if (await chatUchunMenyuOrnatish(row.telegram_id, url, token)) n++;
  }

  // Bot default'и ҳaм (BotFather'да ўрнатилмaгaн янги фoйдaлaнувчилaр учун)
  try {
    await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: { type: 'web_app', text: 'Manzil', web_app: { url } },
      }),
    });
  } catch { /* default муҳим эмaс */ }

  console.log(`Bot менйю URL яngilandi: ${n}/${r.rows.length} фoйдaлaнувчи учун (${url})`);
  return { yangilandi: n, jami: r.rows.length };
}

module.exports = { botMenyuTugmaBarchaUchun };
