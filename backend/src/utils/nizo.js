// Низо (dispute) — йўловчи ёки ҳайдовчи тугаган/бекор қилинган сафар юзасидан
// расмий шикоят киритади, админ кўриб ҳал қилади. Шаффофлик тамойили (3-банд):
// ҳал қилишда админ изоҳи мажбурий, фойдаланувчи натижани кўради.

// Шикоят киритиш мумкин бўлган муддат (соат). Буюм қолди (48с) билан мос.
const NIZO_OYNA_SOAT = 72;

// Рухсат этилган шикоят турлари — фронтенд танлови билан мос.
const NIZO_TURLARI = ['narx', 'xavfsizlik', 'xizmat', 'kelmadi', 'yolgon_keldi', 'boshqa'];

// Шикоят киритиш яроқлими? Тоза функция — DB'дан олинган далилларни текширади.
//   ride      = { holat, yakun_vaqti|yaratilgan, mijoz_id, haydovchi_id }
//   userId    = шикоят қилувчи
//   tur       = шикоят тури
//   mavjudOchiq = шу сафар бўйича шу фойдаланувчидан очиқ шикоят бор-йўқлиги (boolean)
//   hozir     = жорий вақт (Date) — тест учун инжекция
function nizoYaroqli(ride, userId, tur, mavjudOchiq, hozir = new Date()) {
  if (!ride) return { ok: false, xato: 'Сафар топилмади', kod: 404 };
  // Фақат сафар иштирокчиси
  if (userId !== ride.mijoz_id && userId !== ride.haydovchi_id) {
    return { ok: false, xato: 'Бу сафар сизники эмас', kod: 403 };
  }
  if (!NIZO_TURLARI.includes(tur)) {
    return { ok: false, xato: 'Шикоят турини танланг', kod: 400 };
  }
  if (!['yakunlandi', 'bekor_qilindi'].includes(ride.holat)) {
    return { ok: false, xato: 'Фақат тугаган ёки бекор қилинган сафар учун', kod: 400 };
  }
  if (mavjudOchiq) {
    return { ok: false, xato: 'Бу сафар бўйича очиқ шикоятингиз бор', kod: 409 };
  }
  // Муддат текшируви — якун/яратилиш вақтидан NIZO_OYNA_SOAT ўтган бўлса кеч
  const asos = ride.yakun_vaqti || ride.yaratilgan;
  if (asos) {
    const farqSoat = (hozir.getTime() - new Date(asos).getTime()) / 36e5;
    if (farqSoat > NIZO_OYNA_SOAT) {
      return { ok: false, xato: `Шикоят муддати ўтган (${NIZO_OYNA_SOAT} соат)`, kod: 400 };
    }
  }
  return { ok: true };
}

module.exports = { nizoYaroqli, NIZO_OYNA_SOAT, NIZO_TURLARI };
