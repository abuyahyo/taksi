// Web Push — браузер/илова ёпиқ бўлса ҳам билдиришнома (Service Worker + VAPID)
const webpush = require('web-push');
const { query } = require('../config/db');

const PUBLIC = process.env.VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@safar.taksi';

// VAPID калитлари бўлса ёқамиз — бўлмаса push жим ўчиқ туради (илова ишлайверади)
let yoqilgan = false;
if (PUBLIC && PRIVATE) {
  try {
    webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
    yoqilgan = true;
    console.log('🔔 Web Push ёқилди');
  } catch (err) {
    console.error('Web Push созланмади:', err.message);
  }
} else {
  console.log("🔕 Web Push созланмаган (VAPID калитлари йўқ)");
}

// GET /api/push/vapid — frontend public калитни олади (махфий эмас)
function vapidPublic(req, res) {
  res.json({ publicKey: yoqilgan ? PUBLIC : null });
}

// POST /api/push/subscribe — обунани сақлаймиз (auth)
async function subscribe(req, res) {
  try {
    const { endpoint, keys } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ xato: 'Нотўғри обуна' });
    }
    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE
         SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
      [req.user.id, endpoint, keys.p256dh, keys.auth]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('push subscribe xato:', err.message);
    res.status(500).json({ xato: 'Сақланмади' });
  }
}

// POST /api/push/unsubscribe — обунани ўчирамиз (auth)
async function unsubscribe(req, res) {
  try {
    const { endpoint } = req.body || {};
    if (endpoint) await query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [endpoint]);
    res.json({ ok: true });
  } catch (err) {
    console.error('push unsubscribe xato:', err.message);
    res.status(500).json({ xato: 'Ўчирилмади' });
  }
}

// Ички — битта обунага юбориш; эскирган (404/410) бўлса ўчирамиз
async function bittaga(sub, payloadStr) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payloadStr
    );
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      await query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [sub.endpoint]).catch(() => {});
    }
  }
}

// Битта фойдаланувчининг барча қурилмаларига push (fire-and-forget)
async function yuborFoydalanuvchiga(userId, payload) {
  if (!yoqilgan || !userId) return;
  try {
    const r = await query(
      `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`,
      [userId]
    );
    const s = JSON.stringify(payload);
    await Promise.all(r.rows.map((sub) => bittaga(sub, s)));
  } catch (err) {
    console.error('push yubor xato:', err.message);
  }
}

// Роль бўйича push (масалан барча ҳайдовчилар ёки админлар)
async function yuborRolga(rol, payload) {
  if (!yoqilgan) return;
  try {
    const r = await query(
      `SELECT ps.endpoint, ps.p256dh, ps.auth
         FROM push_subscriptions ps JOIN users u ON u.id = ps.user_id
        WHERE u.rol = $1`,
      [rol]
    );
    const s = JSON.stringify(payload);
    await Promise.all(r.rows.map((sub) => bittaga(sub, s)));
  } catch (err) {
    console.error('push rol xato:', err.message);
  }
}

module.exports = { vapidPublic, subscribe, unsubscribe, yuborFoydalanuvchiga, yuborRolga };
