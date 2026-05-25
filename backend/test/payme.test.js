const test = require('node:test');
const assert = require('node:assert');

process.env.PAYME_KEY = 'realkey';
delete process.env.PAYMENT_TEST_MODE;
const { authTekshir } = require('../src/controllers/paymeController');

function req(authHeader) {
  return { headers: authHeader ? { authorization: authHeader } : {} };
}
function basic(user, pass) {
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

test('тўғри Basic auth (Paycom:KEY) қабул қилинади', () => {
  assert.strictEqual(authTekshir(req(basic('Paycom', 'realkey'))), true);
});

test('нотўғри парол рад этилади', () => {
  assert.strictEqual(authTekshir(req(basic('Paycom', 'xato'))), false);
});

test('нотўғри логин рад этилади', () => {
  assert.strictEqual(authTekshir(req(basic('Boshqa', 'realkey'))), false);
});

test('Authorization header йўқ → рад', () => {
  assert.strictEqual(authTekshir(req(null)), false);
});

test('дефолт калит + тест режим ўчиқ → рад (fail-closed)', () => {
  process.env.PAYME_KEY = 'test_payme_key';
  delete process.env.PAYMENT_TEST_MODE;
  assert.strictEqual(authTekshir(req(basic('Paycom', 'test_payme_key'))), false);
  process.env.PAYME_KEY = 'realkey';
});

test('дефолт калит + тест режим ёқиқ → ўтказилади', () => {
  process.env.PAYME_KEY = 'test_payme_key';
  process.env.PAYMENT_TEST_MODE = '1';
  assert.strictEqual(authTekshir(req({})), true);
  process.env.PAYME_KEY = 'realkey';
  delete process.env.PAYMENT_TEST_MODE;
});
