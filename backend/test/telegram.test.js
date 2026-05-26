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
