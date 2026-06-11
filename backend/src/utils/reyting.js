// Ҳайдовчи рейтинги оқибати — сифат назорати. Рақобатчиларда "паст ҳайдовчи
// оқибатсиз қолади" муаммоси бор; биз шаффоф чора кўрамиз (3 ва 6-банд).
//
// Чора фақат етарли баҳо тўплангач кўрилади (битта ёмон баҳо ҳайдовчини
// блокламасин — адолат). Блок — шаффоф (сабаб ёзилади, ҳайдовчи кўради).

// Чегаралар
const MIN_BAHO_SONI = 5;     // шунча баҳодан кейингина чора кўрамиз
const OGOH_CHEGARA = 4.0;    // бундан паст → огоҳлантириш
const BLOK_CHEGARA = 3.0;    // бундан паст → автомат блок (шаффоф сабаб билан)

// reyting (0–5), baholarSoni (int) → { chora: 'yoq'|'ogoh'|'blok', sabab }
function reytingChorasi(reyting, baholarSoni) {
  const r = Number(reyting);
  const n = Number(baholarSoni);
  if (!Number.isFinite(r) || !Number.isFinite(n) || n < MIN_BAHO_SONI) {
    return { chora: 'yoq', sabab: null };
  }
  if (r < BLOK_CHEGARA) {
    return {
      chora: 'blok',
      sabab: `Рейтинг жуда паст (${r.toFixed(1)}/5, ${n} баҳо). ` +
        'Хизмат сифатини яхшилаб, қайта кўриб чиқиш учун қўллаб-қувватлашга ёзинг.',
    };
  }
  if (r < OGOH_CHEGARA) {
    return {
      chora: 'ogoh',
      sabab: `Рейтингингиз пасайди (${r.toFixed(1)}/5). Сифатни яхшиланг — ` +
        `${BLOK_CHEGARA.toFixed(1)} дан пастга тушса ҳисоб вақтинча тўхтатилади.`,
    };
  }
  return { chora: 'yoq', sabab: null };
}

module.exports = { reytingChorasi, MIN_BAHO_SONI, OGOH_CHEGARA, BLOK_CHEGARA };
