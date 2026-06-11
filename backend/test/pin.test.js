const test = require('node:test');
const assert = require('node:assert');
const { pinYarat, pinTogri } = require('../src/utils/pin');

test('pinYarat — 4 хонали, 1000–9999 оралиғида', () => {
  for (let i = 0; i < 500; i++) {
    const p = pinYarat();
    assert.match(p, /^\d{4}$/);
    const n = Number(p);
    assert.ok(n >= 1000 && n <= 9999);
  }
});

test('pinYarat — четки random қийматлари', () => {
  assert.strictEqual(pinYarat(() => 0), '1000');
  assert.strictEqual(pinYarat(() => 0.99999), '9999');
});

test('pinTogri — мос PIN', () => {
  assert.ok(pinTogri('1234', '1234'));
  assert.ok(pinTogri(1234, '1234'));   // DB INTEGER бўлса ҳам
  assert.ok(pinTogri('1234', 1234));
});

test('pinTogri — нотўғри PIN', () => {
  assert.ok(!pinTogri('1234', '0000'));
  assert.ok(!pinTogri('1234', ''));
  assert.ok(!pinTogri('1234', null));
  assert.ok(!pinTogri('1234', undefined));
});

test('pinTogri — ҳақиқий PIN йўқ бўлса ўтказади (эски сафар)', () => {
  assert.ok(pinTogri(null, 'xohlagan'));
  assert.ok(pinTogri(undefined, ''));
  assert.ok(pinTogri('', '9999'));
});
