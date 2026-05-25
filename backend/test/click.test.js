const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

// Реал сир ўрнатамиз (модул env'ни ҳар чақирувда ўқийди)
process.env.CLICK_SECRET = 'realsecret';
delete process.env.PAYMENT_TEST_MODE;
const { imzoTekshir } = require('../src/controllers/clickController');

function prepareImzo(body, secret) {
  const s = `${body.click_trans_id}${body.service_id}${secret}${body.merchant_trans_id}${body.amount}${body.action}${body.sign_time}`;
  return crypto.createHash('md5').update(s).digest('hex');
}

const asos = { click_trans_id: 't1', service_id: 's1', merchant_trans_id: 'm1', amount: '1000', action: '0', sign_time: '2026' };

test('тўғри имзо қабул қилинади', () => {
  const body = { ...asos };
  body.sign_string = prepareImzo(body, 'realsecret');
  assert.strictEqual(imzoTekshir(body, 'prepare'), true);
});

test('нотўғри имзо рад этилади', () => {
  const body = { ...asos, sign_string: 'notogri' };
  assert.strictEqual(imzoTekshir(body, 'prepare'), false);
});

test('бошқа сир билан ясалган имзо рад этилади', () => {
  const body = { ...asos };
  body.sign_string = prepareImzo(body, 'boshqasir');
  assert.strictEqual(imzoTekshir(body, 'prepare'), false);
});

test('дефолт сир + тест режим ўчиқ → рад (fail-closed)', () => {
  process.env.CLICK_SECRET = 'test_secret';
  delete process.env.PAYMENT_TEST_MODE;
  const body = { ...asos, sign_string: 'xohlagani' };
  assert.strictEqual(imzoTekshir(body, 'prepare'), false);
  process.env.CLICK_SECRET = 'realsecret';
});

test('дефолт сир + тест режим ёқиқ → ўтказилади', () => {
  process.env.CLICK_SECRET = 'test_secret';
  process.env.PAYMENT_TEST_MODE = '1';
  const body = { ...asos, sign_string: 'xohlagani' };
  assert.strictEqual(imzoTekshir(body, 'prepare'), true);
  process.env.CLICK_SECRET = 'realsecret';
  delete process.env.PAYMENT_TEST_MODE;
});
