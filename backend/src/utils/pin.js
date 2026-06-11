// Машина PIN-коди — йўловчи тўғри машинага тушганини текширади ("келди" алдашига
// қарши, 6-банд). Тоза мантиқ — socketHandler "йўлга чиқдик"да ишлатади.

// 4 хонали PIN яратиш (1000–9999). randomFn — тест учун инжекция.
function pinYarat(randomFn = Math.random) {
  return String(Math.floor(1000 + randomFn() * 9000));
}

// Киритилган PIN ҳақиқийга мосми? Ҳақиқий PIN йўқ бўлса (эски сафар) — ўтказамиз.
// Иккаласи стрингга келтирилади (DB INTEGER ёки VARCHAR бўлиши мумкин).
function pinTogri(haqiqiy, kiritilgan) {
  if (haqiqiy === null || haqiqiy === undefined || haqiqiy === '') return true;
  return String(kiritilgan ?? '') === String(haqiqiy);
}

module.exports = { pinYarat, pinTogri };
