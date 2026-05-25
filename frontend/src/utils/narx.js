// Тавсия нарх ҳисоби — соф мантиқ (компонентсиз, тест қилинадиган)
export const ASOSIY = 5000;    // базавий нарх
export const PER_KM = 2000;    // 1 км учун
export const MIN_NARX = 8000;  // энг кам тавсия

export function tavsiyaHisobi(masofa_km) {
  const km = Number(masofa_km) || 0;
  const hisobi = ASOSIY + Math.round(km * PER_KM);
  return Math.max(MIN_NARX, hisobi);
}
