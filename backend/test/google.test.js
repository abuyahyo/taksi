const test = require('node:test');
const assert = require('node:assert');
const { googleClaimlarYaroqli } = require('../src/utils/google');

const CID = '123-abc.apps.googleusercontent.com';
const kelajak = Math.floor(Date.now() / 1000) + 3600;

test('тўғри claim → яроқли', () => {
  assert.strictEqual(googleClaimlarYaroqli({
    iss: 'https://accounts.google.com', aud: CID, email_verified: true, exp: kelajak,
  }, CID), true);
});

test('бошқа aud (client_id) → рад', () => {
  assert.strictEqual(googleClaimlarYaroqli({
    iss: 'accounts.google.com', aud: 'boshqa.apps.googleusercontent.com', email_verified: true, exp: kelajak,
  }, CID), false);
});

test('email тасдиқланмаган → рад', () => {
  assert.strictEqual(googleClaimlarYaroqli({
    iss: 'accounts.google.com', aud: CID, email_verified: false, exp: kelajak,
  }, CID), false);
});

test('эскирган exp → рад', () => {
  assert.strictEqual(googleClaimlarYaroqli({
    iss: 'accounts.google.com', aud: CID, email_verified: 'true', exp: Math.floor(Date.now() / 1000) - 10,
  }, CID), false);
});

test('нотўғри iss → рад', () => {
  assert.strictEqual(googleClaimlarYaroqli({
    iss: 'evil.com', aud: CID, email_verified: true, exp: kelajak,
  }, CID), false);
});
