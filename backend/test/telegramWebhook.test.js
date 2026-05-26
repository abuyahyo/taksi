const test = require('node:test');
const assert = require('node:assert');
const { lokatsiyaOl } = require('../src/controllers/telegramWebhookController');

test('location хабаридан координата ажратилади', () => {
  const r = lokatsiyaOl({ message: { chat: { id: 555 }, location: { latitude: 41.31, longitude: 69.24 } } });
  assert.deepStrictEqual(r, { chatId: 555, lat: 41.31, lng: 69.24 });
});

test('venue (жой) хабаридан ҳам координата ажратилади', () => {
  const r = lokatsiyaOl({ message: { chat: { id: 7 }, venue: { location: { latitude: 1.5, longitude: 2.5 }, title: 'X' } } });
  assert.deepStrictEqual(r, { chatId: 7, lat: 1.5, lng: 2.5 });
});

test('локациясиз хабар → null', () => {
  assert.strictEqual(lokatsiyaOl({ message: { chat: { id: 1 }, text: 'salom' } }), null);
});

test('бўш/нотўғри update → null', () => {
  assert.strictEqual(lokatsiyaOl({}), null);
  assert.strictEqual(lokatsiyaOl(null), null);
  assert.strictEqual(lokatsiyaOl({ message: { location: { latitude: 'x', longitude: 2 } } }), null);
});
