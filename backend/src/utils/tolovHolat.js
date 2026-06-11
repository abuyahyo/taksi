// Тўлов мувофиқлаштируви (reconciliation) — тоза мантиқ.
// Payme/Click webhook'и ёки тармоқ узилиши сабаб тўлов билан обуна ҳолати
// номувофиқ қолиши мумкин. Бу функция номувофиқликни таснифлайди — DB'сиз
// текширилади, контроллер фақат натижани қўллайди.

// tx    = { holat: 'kutilmoqda'|'tolandi'|'bekor', obuna_id }
// obuna = { holat: 'kutilmoqda'|'faol'|'tugagan'|'bekor', tugash_sana } | null
//
// Қайтаради:
//   'ok'              — мос (тўланган → фаол, ёки тўланмаган → фаол эмас)
//   'faollashtirilmagan' — тўлов тушган, лекин обуна фаоллашмаган (бизнинг хато; тузатиш керак)
//   'tolovsiz_faol'   — обуна фаол, лекин тўлов йўқ/бекор (текшириш керак)
//   'etim_tolov'      — тўлов бор, боғланган обуна йўқ (orphan)
function obunaTolovHolati(tx, obuna) {
  if (!tx) return 'ok';
  if (!obuna) {
    return tx.holat === 'tolandi' ? 'etim_tolov' : 'ok';
  }
  const tolandi = tx.holat === 'tolandi';
  const faol = obuna.holat === 'faol';

  if (tolandi && !faol) return 'faollashtirilmagan';
  if (!tolandi && faol) return 'tolovsiz_faol';
  return 'ok';
}

// Номувофиқликни автомат тузатиш мумкинми? Фақат 'faollashtirilmagan' хавфсиз
// автомат тузатилади (тўлов аниқ тушган) — қолгани админ кўригини талаб қилади.
function avtoTuzatish(holat) {
  return holat === 'faollashtirilmagan';
}

module.exports = { obunaTolovHolati, avtoTuzatish };
