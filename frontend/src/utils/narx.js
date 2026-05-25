// Тавсия нарх ҳисоби — соф мантиқ (компонентсиз, тест қилинадиган)
export const ASOSIY = 5000;    // базавий нарх
export const PER_KM = 2000;    // 1 км учун
export const MIN_NARX = 8000;  // энг кам тавсия

// Тариф класслари — Yandex услуби, лекин нарх inDrive (тавсия) бўйича.
// Коэффициент тавсия нархни оширади/камайтиради; ҳайдовчи барибир рози бўлади ёки ўз нархини беради.
export const TARIFLAR = [
  { kod: 'ekonom',   koeff: 1.0, ikon: 'car' },
  { kod: 'komfort',  koeff: 1.3, ikon: 'taxi' },
  { kod: 'dostavka', koeff: 0.9, ikon: 'receipt' },
];

export const TARIF_KODLAR = TARIFLAR.map((x) => x.kod);

export function tarifKoeff(tarif) {
  const t = TARIFLAR.find((x) => x.kod === tarif);
  return t ? t.koeff : 1.0;
}

export function tavsiyaHisobi(masofa_km, tarif = 'ekonom') {
  const km = Number(masofa_km) || 0;
  const hisobi = (ASOSIY + Math.round(km * PER_KM)) * tarifKoeff(tarif);
  return Math.max(MIN_NARX, Math.round(hisobi / 500) * 500);
}
