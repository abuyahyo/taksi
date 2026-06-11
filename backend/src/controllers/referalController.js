// Таклиф (referral) дастури — "дўстни таклиф қил" ўсиш канали.
// Биз фоиз олмаймиз → бонус ҳам обуна кунлари. Таклиф қилинган ҳайдовчи биринчи
// ПУЛЛИК обунани фаоллаштирса, иккала томон бонус кун олади.
const { query } = require('../config/db');
const { kodYarat, kodNormalize, kodToplami } = require('../utils/referral');

// Бонус кунлар
const BONUS_TAKLIFCHIGA = 7;  // кодини берган
const BONUS_KELGANGA = 7;     // кодни ишлатган

// Фойдаланувчига уникал таклиф коди бериш (йўқ бўлса). Коллизия бўлса қайта уринади.
async function kodTaminla(userId) {
  const bor = await query('SELECT referral_kodi FROM users WHERE id = $1', [userId]);
  if (bor.rows[0]?.referral_kodi) return bor.rows[0].referral_kodi;

  for (let urinish = 0; urinish < 8; urinish++) {
    const kod = kodYarat();
    try {
      const r = await query(
        `UPDATE users SET referral_kodi = $2 WHERE id = $1 AND referral_kodi IS NULL RETURNING referral_kodi`,
        [userId, kod]
      );
      if (r.rows[0]) return r.rows[0].referral_kodi;
      // Параллел сўров кодни ўрнатган бўлиши мумкин — қайта ўқиймиз
      const q = await query('SELECT referral_kodi FROM users WHERE id = $1', [userId]);
      if (q.rows[0]?.referral_kodi) return q.rows[0].referral_kodi;
    } catch (e) {
      if (e.code !== '23505') throw e; // UNIQUE коллизия эмас бўлса — қайта чиқарамиз
    }
  }
  throw new Error('Таклиф коди яратилмади');
}

// Рўйхатдан ўтишда: киритилган код орқали таклиф боғлашни ёзамиз (бонус ҳали эмас).
// Бонус фақат янги фойдаланувчи ПУЛЛИК обуна фаоллаштиргач берилади.
// Қайтаради: { ok, taklifchi_id } ёки { ok: false, sabab }.
async function taklifBoglash(yangiUserId, xomKod) {
  const kod = kodNormalize(xomKod);
  if (!kodToplami(kod)) return { ok: false, sabab: 'kod_format' };

  const t = await query('SELECT id FROM users WHERE referral_kodi = $1', [kod]);
  const taklifchi = t.rows[0];
  if (!taklifchi) return { ok: false, sabab: 'kod_topilmadi' };
  if (taklifchi.id === yangiUserId) return { ok: false, sabab: 'ozini' };

  // users.taklif_qilgan_id + referallar ёзуви (бир фойдаланувчи — бир таклиф)
  try {
    await query(
      `UPDATE users SET taklif_qilgan_id = $2 WHERE id = $1 AND taklif_qilgan_id IS NULL`,
      [yangiUserId, taklifchi.id]
    );
    await query(
      `INSERT INTO referallar (taklif_qilgan_id, taklif_qilingan_id, bonus_kun)
       VALUES ($1, $2, $3) ON CONFLICT (taklif_qilingan_id) DO NOTHING`,
      [taklifchi.id, yangiUserId, BONUS_TAKLIFCHIGA]
    );
    return { ok: true, taklifchi_id: taklifchi.id };
  } catch (e) {
    console.error('taklifBoglash xato:', e.message);
    return { ok: false, sabab: 'xato' };
  }
}

// Бонус бериш — таклиф қилинган user ПУЛЛИК обуна фаоллаштиргач (idempotent).
// subscriptionController.obunaFaollashtir() лазий чақиради.
async function taklifBonusBer(yangiUserId) {
  const { obunaKunQosh } = require('./subscriptionController');
  // Кутилаётган таклифни топамиз ва атомар 'berildi'га ўтказамиз (қайта берилмасин)
  const r = await query(
    `UPDATE referallar SET holat = 'berildi', bonus_vaqti = NOW()
       WHERE taklif_qilingan_id = $1 AND holat = 'kutilmoqda'
       RETURNING taklif_qilgan_id, taklif_qilingan_id, bonus_kun`,
    [yangiUserId]
  );
  if (!r.rows[0]) return false; // таклиф йўқ ёки аллақачон берилган
  const { taklif_qilgan_id } = r.rows[0];
  await obunaKunQosh(taklif_qilgan_id, BONUS_TAKLIFCHIGA, 'bonus');
  await obunaKunQosh(yangiUserId, BONUS_KELGANGA, 'bonus');
  console.log(`🎁 Таклиф бонуси: ${taklif_qilgan_id} ↔ ${yangiUserId} (+${BONUS_TAKLIFCHIGA}/+${BONUS_KELGANGA} кун)`);
  return true;
}

// GET /api/driver/referral — ўз кодим + статистика
const meningKodim = async (req, res) => {
  try {
    const kod = await kodTaminla(req.user.id);
    const stat = await query(
      `SELECT
         COUNT(*) FILTER (WHERE holat = 'berildi')     AS bonus_olingan,
         COUNT(*) FILTER (WHERE holat = 'kutilmoqda')  AS kutilmoqda,
         COALESCE(SUM(bonus_kun) FILTER (WHERE holat = 'berildi'), 0) AS jami_bonus_kun
       FROM referallar WHERE taklif_qilgan_id = $1`,
      [req.user.id]
    );
    res.json({
      kod,
      bonus_taklifchiga: BONUS_TAKLIFCHIGA,
      bonus_kelganga: BONUS_KELGANGA,
      ...stat.rows[0],
    });
  } catch (err) {
    console.error('meningKodim xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

module.exports = {
  kodTaminla, taklifBoglash, taklifBonusBer, meningKodim,
  BONUS_TAKLIFCHIGA, BONUS_KELGANGA,
};
