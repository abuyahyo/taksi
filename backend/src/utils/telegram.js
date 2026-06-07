// Telegram Mini App — initData'ни текшириш (HMAC-SHA256).
// Telegram WebApp фронтендда window.Telegram.WebApp.initData беради; биз уни
// бот токени билан текширамиз — сохталаштириб бўлмайди.
// Ҳужжат: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
const crypto = require('crypto');

// Қайтаради: { ok:true, user, auth_date } ёки { ok:false, sabab }.
function initDataTekshir(initData, botToken, maxAgeSec = 86400) {
  if (!initData || !botToken) return { ok: false, sabab: 'parametr' };

  let params;
  try { params = new URLSearchParams(initData); } catch { return { ok: false, sabab: 'parse' }; }

  const hash = params.get('hash');
  if (!hash) return { ok: false, sabab: 'hash_yoq' };

  // hash ва (янги Ed25519) signature data-check'дан чиқарилади
  params.delete('hash');
  params.delete('signature');

  // data_check_string — қолган майдонлар алифбо тартибида, "key=value" \n билан
  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hisob = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

  // доимий вақтли солиштириш (timing attack'дан ҳимоя)
  let teng = false;
  try {
    const a = Buffer.from(hisob, 'hex');
    const b = Buffer.from(hash, 'hex');
    teng = a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch { teng = false; }
  if (!teng) return { ok: false, sabab: 'imzo' };

  // Муддат текшируви (replay ҳимояси)
  const authDate = parseInt(params.get('auth_date') || '0', 10);
  if (maxAgeSec > 0 && authDate > 0 && (Date.now() / 1000 - authDate) > maxAgeSec) {
    return { ok: false, sabab: 'eskirgan' };
  }

  let user = null;
  const uRaw = params.get('user');
  if (uRaw) { try { user = JSON.parse(uRaw); } catch { /* user йўқ — мумкин */ } }

  return { ok: true, user, auth_date: authDate };
}

// Telegram Login Widget — `data-onauth` callback'дан келган auth объектини текширади.
// Документация: https://core.telegram.org/widgets/login#checking-authorization
// Мини App'дан фарқли: secret = SHA256(bot_token) (HMAC эмас, оддий SHA-256).
// Майдонлар: id, first_name, last_name, username, photo_url, auth_date, hash.
function widgetTekshir(authData, botToken, maxAgeSec = 86400) {
  if (!authData || typeof authData !== 'object' || !botToken) {
    return { ok: false, sabab: 'parametr' };
  }
  const hash = authData.hash;
  if (!hash || typeof hash !== 'string') return { ok: false, sabab: 'hash_yoq' };

  const dataCheckString = Object.keys(authData)
    .filter((k) => k !== 'hash' && authData[k] != null)
    .sort()
    .map((k) => `${k}=${authData[k]}`)
    .join('\n');

  const secret = crypto.createHash('sha256').update(botToken).digest();
  const hisob = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

  let teng = false;
  try {
    const a = Buffer.from(hisob, 'hex');
    const b = Buffer.from(hash, 'hex');
    teng = a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch { teng = false; }
  if (!teng) return { ok: false, sabab: 'imzo' };

  const authDate = parseInt(authData.auth_date || '0', 10);
  if (maxAgeSec > 0 && authDate > 0 && (Date.now() / 1000 - authDate) > maxAgeSec) {
    return { ok: false, sabab: 'eskirgan' };
  }

  return {
    ok: true,
    user: {
      id: authData.id,
      first_name: authData.first_name,
      last_name: authData.last_name,
      username: authData.username,
      photo_url: authData.photo_url,
    },
    auth_date: authDate,
  };
}

module.exports = { initDataTekshir, widgetTekshir };
