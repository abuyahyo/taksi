// Машина маълумотини бир қаторда кўрсатиш — "Cobalt оқ · 01 A 777 BA"
// (MashinaProfili'дан ажратилган — компонент файлида фақат компонент бўлсин,
// Fast Refresh тўғри ишлаши учун.)
export function mashinaMatn(profil) {
  if (!profil) return '';
  const { mashina_modeli, mashina_rangi, mashina_raqami } = profil;
  const ism = [mashina_modeli, mashina_rangi].filter(Boolean).join(' ');
  return [ism, mashina_raqami].filter(Boolean).join(' · ');
}
