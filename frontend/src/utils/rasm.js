// Расмни юклашдан олдин кичиклаштириш — мобил трафик ва дискни тежаш учун.
// Хато бўлса асл файлни қайтаради (юклаш барибир ишласин).
export async function rasmKichiklashtir(file, maxOlcham = 1280, sifat = 0.8) {
  if (!file || !file.type?.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const nisbat = Math.min(1, maxOlcham / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * nisbat);
    const h = Math.round(bitmap.height * nisbat);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', sifat));
    if (!blob) return file;
    return new File([blob], (file.name || 'hujjat').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
