// Таклиф (referral) дастури учун тоза ёрдамчилар.
// Биз ҳайдовчилардан фоиз олмаймиз — ўсиш энг арзон канал: "дўстни таклиф қил".
// Таклиф қилинган ва қилувчи — иккаласи обуна кунлари бонусини олади.

// Чалкаш белгилар (0/O, 1/I/L) олиб ташланган алфавит — телефонда қайта теришга қулай.
const ALFAVIT = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// 6 белгили таклиф коди яратиш. randomFn — тест учун инжекция қилиниши мумкин.
function kodYarat(uzunlik = 6, randomFn = Math.random) {
  let kod = '';
  for (let i = 0; i < uzunlik; i++) {
    kod += ALFAVIT[Math.floor(randomFn() * ALFAVIT.length)];
  }
  return kod;
}

// Фойдаланувчи киритган кодни меъёрлаштириш (катта ҳарф, бўшлиқсиз).
// Алфавитга кирмайдиган белгилар (бўшлиқ, тире, чалкаш 0/O/1/I/L) ташланади.
function kodNormalize(xom) {
  if (typeof xom !== 'string') return '';
  return xom
    .toUpperCase()
    .split('')
    .filter((c) => ALFAVIT.includes(c))
    .join('')
    .slice(0, 12);
}

// Код яроқли форматдами (фақат алфавит белгилари, 4–10 узунлик)?
function kodToplami(kod) {
  if (typeof kod !== 'string') return false;
  if (kod.length < 4 || kod.length > 10) return false;
  return [...kod].every((c) => ALFAVIT.includes(c));
}

module.exports = { kodYarat, kodNormalize, kodToplami, ALFAVIT };
