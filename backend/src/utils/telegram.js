// Telegram Mini App — initData'ни текшириш (HMAC-SHA256).
// Telegram WebApp фронтендда window.Telegram.WebApp.initData беради; биз уни
// бот токени билан текширамиз — сохталаштириб бўлмайди.
// Ҳужжат: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
const crypto = require('crypto');

// Қайтаради: { ok:true, user, auth_date } ёки { ok:false, sabab }.
function initDataTekshir(initData, botToken, maxAgeSec = 86400) {
  if (!initData || !botToken) return { ok: false, sabab: 'parametr' };

  // initData'ни ҚЎЛДА парс қиламиз. `URLSearchParams` `+` белгисини бўш жойга
  // айлантиради (application/x-www-form-urlencoded семантикаси), Telegram эса
  // RFC 3986 ишлатади. base64 майдонлар (query_id, signature) хом `+` сақласа,
  // URLSearchParams data_check_string'ни бузиб HMAC мос келмай қоларди.
  // `decodeURIComponent` `+`'ни сақлайди — Telegram сервери билан бир хил.
  const juftliklar = [];
  let hash = null;
  let authDate = 0;
  let userRaw = null;
  for (const qism of initData.split('&')) {
    if (!qism) continue;
    const tengIdx = qism.indexOf('=');
    if (tengIdx === -1) continue;
    const kalit = qism.slice(0, tengIdx);
    const xom = qism.slice(tengIdx + 1);
    let qiymat;
    try { qiymat = decodeURIComponent(xom); } catch { qiymat = xom; }
    if (kalit === 'hash') { hash = qiymat; continue; }
    if (kalit === 'signature') continue; // Ed25519 имзо — data-check'дан чиқарилади
    if (kalit === 'auth_date') authDate = parseInt(qiymat || '0', 10);
    if (kalit === 'user') userRaw = qiymat;
    juftliklar.push([kalit, qiymat]);
  }
  if (!hash) return { ok: false, sabab: 'hash_yoq' };

  // data_check_string — КАЛИТ бўйича сорт (қиймат эмас), "key=value" \n билан
  const dataCheckString = juftliklar
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
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
  if (maxAgeSec > 0 && authDate > 0 && (Date.now() / 1000 - authDate) > maxAgeSec) {
    return { ok: false, sabab: 'eskirgan' };
  }

  let user = null;
  if (userRaw) { try { user = JSON.parse(userRaw); } catch { /* user йўқ — мумкин */ } }

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
