const test = require('node:test');
const assert = require('node:assert');
const { kodYarat, kodNormalize, kodToplami, ALFAVIT } = require('../src/utils/referral');

test('kodYarat — берилган узунликда, фақат алфавит белгилари', () => {
  for (let i = 0; i < 200; i++) {
    const k = kodYarat();
    assert.strictEqual(k.length, 6);
    assert.ok([...k].every((c) => ALFAVIT.includes(c)), `алфавитдан ташқари белги: ${k}`);
  }
  assert.strictEqual(kodYarat(8).length, 8);
});

test('kodYarat — инжекция қилинган random билан детерминик', () => {
  const k = kodYarat(4, () => 0); // ҳар доим биринчи белги
  assert.strictEqual(k, ALFAVIT[0].repeat(4));
});

test('kodNormalize — катта ҳарф, бўшлиқ/тире/чалкаш белгилар ташланади', () => {
  assert.strictEqual(kodNormalize(' ab-cd '), 'ABCD');
  assert.strictEqual(kodNormalize('a1b2'), 'AB2');   // 1 алфавитда йўқ, 2 бор
  assert.strictEqual(kodNormalize('OIL0'), '');       // ҳаммаси чалкаш — ташланади
  assert.strictEqual(kodNormalize(null), '');
  assert.strictEqual(kodNormalize(12345), '');
});

test('kodToplami — формат текшируви', () => {
  assert.ok(kodToplami('ABCD'));
  assert.ok(kodToplami('ABC234'));
  assert.ok(!kodToplami('ABC'));      // жуда қисқа
  assert.ok(!kodToplami('ABCDEFGHIJK')); // жуда узун
  assert.ok(!kodToplami('abcd'));     // кичик ҳарф алфавитда йўқ
  assert.ok(!kodToplami('AB1D'));     // 1 алфавитда йўқ
  assert.ok(!kodToplami(''));
});
