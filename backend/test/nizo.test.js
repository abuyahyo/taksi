const test = require('node:test');
const assert = require('node:assert');
const { nizoYaroqli, NIZO_OYNA_SOAT } = require('../src/utils/nizo');

const hozir = new Date('2026-06-11T12:00:00Z');
const yangiSafar = {
  holat: 'yakunlandi', mijoz_id: 1, haydovchi_id: 2,
  yakun_vaqti: new Date('2026-06-11T10:00:00Z'), // 2 соат олдин
};

test('тугаган сафар, иштирокчи, муддат ичида → яроқли', () => {
  const r = nizoYaroqli(yangiSafar, 1, 'narx', false, hozir);
  assert.ok(r.ok);
});

test('бекор қилинган сафар учун ҳам мумкин', () => {
  const r = nizoYaroqli({ ...yangiSafar, holat: 'bekor_qilindi' }, 2, 'kelmadi', false, hozir);
  assert.ok(r.ok);
});

test('сафар топилмаса 404', () => {
  assert.strictEqual(nizoYaroqli(null, 1, 'narx', false, hozir).kod, 404);
});

test('иштирокчи бўлмаган фойдаланувчи 403', () => {
  const r = nizoYaroqli(yangiSafar, 99, 'narx', false, hozir);
  assert.strictEqual(r.kod, 403);
});

test('нотўғри тур 400', () => {
  const r = nizoYaroqli(yangiSafar, 1, 'allaqachon', false, hozir);
  assert.strictEqual(r.kod, 400);
});

test('тугамаган сафар 400', () => {
  const r = nizoYaroqli({ ...yangiSafar, holat: 'yolda' }, 1, 'narx', false, hozir);
  assert.strictEqual(r.kod, 400);
});

test('очиқ шикоят бор бўлса 409', () => {
  const r = nizoYaroqli(yangiSafar, 1, 'narx', true, hozir);
  assert.strictEqual(r.kod, 409);
});

test('муддат ўтган бўлса 400', () => {
  const eski = {
    ...yangiSafar,
    yakun_vaqti: new Date(hozir.getTime() - (NIZO_OYNA_SOAT + 1) * 36e5),
  };
  const r = nizoYaroqli(eski, 1, 'narx', false, hozir);
  assert.strictEqual(r.kod, 400);
});

test('якун вақти йўқ бўлса яратилиш вақтига таянади', () => {
  const r = nizoYaroqli(
    { holat: 'bekor_qilindi', mijoz_id: 1, haydovchi_id: 2, yaratilgan: new Date('2026-06-11T11:00:00Z') },
    1, 'narx', false, hozir
  );
  assert.ok(r.ok);
});
