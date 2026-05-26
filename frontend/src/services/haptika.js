// Енгил ҳаптик акс-садо — қўллаб-қувватланса (Android/Chrome) тебратади.
// iOS Safari `navigator.vibrate`'ни қўлламайди — у ерда жим ўтади (хато бермайди).
export function tebrat(naqsh = TEBRANISH.yengil) {
  try { navigator.vibrate?.(naqsh); } catch { /* қўллаб-қувватланмайди */ }
}

export const TEBRANISH = {
  yengil:        10,            // оддий тугма босиш
  muvaffaqiyat:  [12, 40, 12],  // тасдиқ / таклиф қабули / тўлов
  ogohlantirish: [30, 70, 30],  // SOS / хато
};
