const test = require('node:test');
const assert = require('node:assert');
const { googleClaimlarYaroqli } = require('../src/utils/google');

const CID = '123-abc.apps.googleusercontent.com';
const kelajak = Math.floor(Date.now() / 1000) + 3600;

test('тўғри claim → яроқли', () => {
  assert.strictEqual(googleClaimlarYaroqli({
    iss: 'https://accounts.google.com', aud: CID, email_verified: true, exp: kelajak,
  }, CID).ok, true);
});

test('бошқа aud (client_id) → рад', () => {
  const r = googleClaimlarYaroqli({
    iss: 'accounts.google.com', aud: 'boshqa.apps.googleusercontent.com', email_verified: true, exp: kelajak,
  }, CID);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.sabab, 'aud_mos_emas');
});

test('email тасдиқланмаган → рад', () => {
  const r = googleClaimlarYaroqli({
    iss: 'accounts.google.com', aud: CID, email_verified: false, exp: kelajak,
  }, CID);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.sabab, 'email_tasdiqlanmagan');
});

test('эскирган exp → рад', () => {
  const r = googleClaimlarYaroqli({
    iss: 'accounts.google.com', aud: CID, email_verified: 'true', exp: Math.floor(Date.now() / 1000) - 10,
  }, CID);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.sabab, 'token_muddati_tugagan');
});

test('нотўғри iss → рад', () => {
  const r = googleClaimlarYaroqli({
    iss: 'evil.com', aud: CID, email_verified: true, exp: kelajak,
  }, CID);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.sabab, 'iss_notugri');
});
