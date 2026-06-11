const test = require('node:test');
const assert = require('node:assert');
const { obunaTolovHolati, avtoTuzatish } = require('../src/utils/tolovHolat');

test('тўланган + фаол → ok', () => {
  assert.strictEqual(obunaTolovHolati({ holat: 'tolandi' }, { holat: 'faol' }), 'ok');
});

test('тўланмаган + фаол эмас → ok', () => {
  assert.strictEqual(obunaTolovHolati({ holat: 'kutilmoqda' }, { holat: 'kutilmoqda' }), 'ok');
});

test('тўлов тушган, обуна фаоллашмаган → faollashtirilmagan', () => {
  assert.strictEqual(obunaTolovHolati({ holat: 'tolandi' }, { holat: 'kutilmoqda' }), 'faollashtirilmagan');
});

test('обуна фаол, тўлов йўқ/бекор → tolovsiz_faol', () => {
  assert.strictEqual(obunaTolovHolati({ holat: 'bekor' }, { holat: 'faol' }), 'tolovsiz_faol');
});

test('тўлов бор, обуна йўқ → etim_tolov', () => {
  assert.strictEqual(obunaTolovHolati({ holat: 'tolandi' }, null), 'etim_tolov');
});

test('тўловсиз, обуна йўқ → ok', () => {
  assert.strictEqual(obunaTolovHolati({ holat: 'kutilmoqda' }, null), 'ok');
  assert.strictEqual(obunaTolovHolati(null, null), 'ok');
});

test('фақат faollashtirilmagan автомат тузатилади', () => {
  assert.ok(avtoTuzatish('faollashtirilmagan'));
  assert.ok(!avtoTuzatish('tolovsiz_faol'));
  assert.ok(!avtoTuzatish('etim_tolov'));
  assert.ok(!avtoTuzatish('ok'));
});
