const test = require('node:test');
const assert = require('node:assert');
const { kutishHaqiHisobla } = require('../src/utils/kutishHaqi');

test('бепул муддат ичида ҳақ йўқ', () => {
  assert.strictEqual(kutishHaqiHisobla(0), 0);
  assert.strictEqual(kutishHaqiHisobla(2.5), 0);
  assert.strictEqual(kutishHaqiHisobla(3), 0);
});

test('тўла бўлмаган дақиқа учун ҳақ олинмайди (floor)', () => {
  assert.strictEqual(kutishHaqiHisobla(3.5), 0);  // floor(0.5) = 0
  assert.strictEqual(kutishHaqiHisobla(5.9), 1000); // floor(2.9) = 2 → 1000
});

test('тўла пуллик дақиқалар тўғри ҳисобланади', () => {
  assert.strictEqual(kutishHaqiHisobla(4), 500);
  assert.strictEqual(kutishHaqiHisobla(8), 2500); // 5 пуллик дақ
});

test('нотўғри қиймат → 0', () => {
  assert.strictEqual(kutishHaqiHisobla('xato'), 0);
  assert.strictEqual(kutishHaqiHisobla(undefined), 0);
  assert.strictEqual(kutishHaqiHisobla(NaN), 0);
});
