const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { initDataTekshir } = require('../src/utils/telegram');

const BOT_TOKEN = '123456:TEST_TOKEN_abc';

// Telegram алгоритми бўйича ҳақиқий imzo ясаб берадиган ёрдамчи
function initDataYasa(fields, botToken = BOT_TOKEN) {
  const params = new URLSearchParams(fields);
  const dataCheckString = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

const hozir = Math.floor(Date.now() / 1000);
const userObj = JSON.stringify({ id: 777, first_name: 'Бахтиёр', last_name: 'Алиев', username: 'baxa' });

test('тўғри imzo қабул қилинади ва user қайтарилади', () => {
  const initData = initDataYasa({ user: userObj, auth_date: String(hozir), query_id: 'AAA' });
  const r = initDataTekshir(initData, BOT_TOKEN);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.user.id, 777);
  assert.strictEqual(r.user.username, 'baxa');
});

test('нотўғри imzo рад этилади', () => {
  let initData = initDataYasa({ user: userObj, auth_date: String(hozir) });
  initData = initData.replace(/hash=[a-f0-9]+/, 'hash=deadbeef');
  assert.strictEqual(initDataTekshir(initData, BOT_TOKEN).ok, false);
});

test('бошқа бот токени билан ясалган imzo рад этилади', () => {
  const initData = initDataYasa({ user: userObj, auth_date: String(hozir) }, 'boshqa:token');
  assert.strictEqual(initDataTekshir(initData, BOT_TOKEN).ok, false);
});

test('hash йўқ → рад', () => {
  assert.strictEqual(initDataTekshir('user=' + encodeURIComponent(userObj), BOT_TOKEN).ok, false);
});

test('бот токени бўш → рад', () => {
  const initData = initDataYasa({ user: userObj, auth_date: String(hozir) });
  assert.strictEqual(initDataTekshir(initData, '').ok, false);
});

test('эскирган auth_date рад этилади', () => {
  const eski = hozir - 100000; // ~27 соат олдин
  const initData = initDataYasa({ user: userObj, auth_date: String(eski) });
  const r = initDataTekshir(initData, BOT_TOKEN, 86400);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.sabab, 'eskirgan');
});

// Telegram'га садоқатли initData ясаш: data_check_string DECODED қийматлардан
// (калит бўйича сорт), узатишда ҳар қиймат encodeURIComponent билан. `raw` рўйхатидаги
// калитларнинг қиймати ХОМ қолдирилади (Telegram base64'да `+` хом юбориши симуляцияси).
function telegramYasa(fields, raw = []) {
  const dcs = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const hash = crypto.createHmac('sha256', secret).update(dcs).digest('hex');
  const parts = Object.entries(fields).map(([k, v]) =>
    raw.includes(k) ? `${k}=${v}` : `${k}=${encodeURIComponent(v)}`);
  parts.push(`hash=${hash}`);
  return parts.join('&');
}

test('бўш жойли исм (Telegram %20 билан) қабул қилинади', () => {
  const u = JSON.stringify({ id: 5, first_name: 'Ali Vali', last_name: "O'g'li" });
  const initData = telegramYasa({ user: u, auth_date: String(hozir), query_id: 'AAA' });
  const r = initDataTekshir(initData, BOT_TOKEN);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.user.id, 5);
});

test('хом + ли base64 query_id (Telegram юбориши мумкин) HMAC ни бузмайди', () => {
  // Бу — асосий регрессия: URLSearchParams `+` ни бўш жойга айлантириб 401 берарди.
  const initData = telegramYasa(
    { user: userObj, auth_date: String(hozir), query_id: 'AAH+xy/z' },
    ['query_id']
  );
  const r = initDataTekshir(initData, BOT_TOKEN);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.user.id, 777);
});

test('signature майдони data-check дан чиқарилади (имзо ўзгармайди)', () => {
  let initData = telegramYasa({ user: userObj, auth_date: String(hozir), query_id: 'AAA' });
  initData += '&signature=ZWQyNTUxOV9kdW1teQ';
  assert.strictEqual(initDataTekshir(initData, BOT_TOKEN).ok, true);
});
