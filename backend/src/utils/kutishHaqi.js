// Кутиш ҳақи ҳисоби — соф мантиқ (тест қилинадиган, DB'дан мустақил).
// Ҳайдовчи "етиб келдим" дегач кутиш бошланади: дастлабки даqiqалар бепул,
// кейин ҳар тўла дақиқа учун ҳақ. Фақат ТЎЛА пуллик дақиқалар ҳисобланади
// (йўловчи учун адолатли — floor).
const KUTISH_TEKIN_DAQ = 3;   // 3 дақиқа бепул кутиш
const KUTISH_NARX_DAQ = 500;  // кейин 500 сўм/дақиқа

// daqiqa — кутилган вақт (дақиқада, float бўлиши мумкин). Сўмда ҳақ қайтаради.
function kutishHaqiHisobla(daqiqa) {
  const d = Number(daqiqa);
  if (!Number.isFinite(d) || d <= KUTISH_TEKIN_DAQ) return 0;
  const pullikDaq = Math.floor(d - KUTISH_TEKIN_DAQ);
  return pullikDaq * KUTISH_NARX_DAQ;
}

module.exports = { KUTISH_TEKIN_DAQ, KUTISH_NARX_DAQ, kutishHaqiHisobla };
