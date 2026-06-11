const test = require('node:test');
const assert = require('node:assert');
const { reytingChorasi, MIN_BAHO_SONI, OGOH_CHEGARA, BLOK_CHEGARA } = require('../src/utils/reyting');

test('етарли баҳо йўқ бўлса чора кўрилмайди', () => {
  assert.strictEqual(reytingChorasi(1.0, MIN_BAHO_SONI - 1).chora, 'yoq');
  assert.strictEqual(reytingChorasi(2.0, 0).chora, 'yoq');
});

test('яхши рейтинг → чора йўқ', () => {
  assert.strictEqual(reytingChorasi(4.8, 50).chora, 'yoq');
  assert.strictEqual(reytingChorasi(OGOH_CHEGARA, 10).chora, 'yoq'); // айнан чегара — ҳали огоҳ эмас
});

test('огоҳлантириш оралиғи', () => {
  const r = reytingChorasi(3.5, 10);
  assert.strictEqual(r.chora, 'ogoh');
  assert.ok(r.sabab.includes('3.5'));
});

test('блок чегарасидан паст → блок (шаффоф сабаб)', () => {
  const r = reytingChorasi(2.4, 8);
  assert.strictEqual(r.chora, 'blok');
  assert.ok(r.sabab && r.sabab.length > 0);
});

test('айнан блок чегараси → огоҳ (паст эмас)', () => {
  assert.strictEqual(reytingChorasi(BLOK_CHEGARA, 10).chora, 'ogoh');
});

test('нотўғри қиймат → чора йўқ', () => {
  assert.strictEqual(reytingChorasi('xato', 10).chora, 'yoq');
  assert.strictEqual(reytingChorasi(NaN, 10).chora, 'yoq');
  assert.strictEqual(reytingChorasi(3, 'koʻp').chora, 'yoq');
});
