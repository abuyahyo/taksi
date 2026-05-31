// Реклама кимошди — ҳар ой битта жой (йўловчи бош экрани баннери) очиқ кўтарилувчи
// кимошдида сотилади. Биз фоиз олмаймиз; обуна + реклама — даромад.
// Реклама ТЎЛОВСИЗ кўрсатилмайди: ғолиб Payme/Click тўлагач (reklamaFaollashtir) фаоллашади.
const { query } = require('../config/db');

const SNIPING_SOAT = 6; // охирги шунча соатда таклиф келса — кимошди узаяди

// Ой ёрлиғи + ёпилиш вақти (siljish=1 → келаси ой)
function oyHisob(siljish = 1) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + siljish, 1, 0, 0, 0);
  const oy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return { oy, tugash: d };
}

// Кимошдиларни текшириш: тугаганларни ёпиб ғолибни аниқлаймиз ва келаси ой
// учун очиқ кимошди мавжудлигини таъминлаймиз. Лозим — server.js setInterval'дан.
async function auksionlarniTekshir() {
  try {
    // 1) Тугаган очиқ кимошдиларни ёпамиз
    const tugagan = await query(
      `SELECT id, reserve_narx FROM reklama_auksionlar WHERE holat = 'ochiq' AND tugash <= NOW()`
    );
    for (const a of tugagan.rows) {
      // Reserve'дан паст таклифлар қабул қилинмаган (таклиф пайтида текширилган)
      const top = await query(
        `SELECT kampaniya_id, summa FROM reklama_takliflar
          WHERE auksion_id = $1 ORDER BY summa DESC, id ASC LIMIT 1`,
        [a.id]
      );
      if (top.rows[0]) {
        await query(
          `UPDATE reklama_auksionlar
              SET holat = 'yopilgan', golib_kampaniya_id = $2, golib_summa = $3
            WHERE id = $1`,
          [a.id, top.rows[0].kampaniya_id, top.rows[0].summa]
        );
      } else {
        await query(`UPDATE reklama_auksionlar SET holat = 'yopilgan' WHERE id = $1`, [a.id]);
      }
    }
    // 2) Келаси ой учун очиқ кимошди бўлсин
    const { oy, tugash } = oyHisob(1);
    await query(
      `INSERT INTO reklama_auksionlar (oy, tugash) VALUES ($1, $2) ON CONFLICT (oy) DO NOTHING`,
      [oy, tugash]
    );
  } catch (err) {
    console.error('auksionlarniTekshir xato:', err.message);
  }
}

// Жорий очиқ кимошди (текширувдан кейин)
async function joriyAuksion() {
  await auksionlarniTekshir();
  const r = await query(
    `SELECT * FROM reklama_auksionlar WHERE holat = 'ochiq' ORDER BY oy ASC LIMIT 1`
  );
  return r.rows[0] || null;
}

// Тўлов тасдиқлангач — ғолиб баннерини фаоллаштириш (test-pay/webhook чақиради). Идемпотент.
async function reklamaFaollashtir(auksionId) {
  const r = await query(`SELECT golib_kampaniya_id, tolandi FROM reklama_auksionlar WHERE id = $1`, [auksionId]);
  const a = r.rows[0];
  if (!a || !a.golib_kampaniya_id) return false;
  if (a.tolandi) return true;
  await query(`UPDATE reklama_auksionlar SET tolandi = TRUE WHERE id = $1`, [auksionId]);
  return true;
}

// GET /api/reklama/faol — жорий ой фаол баннери (PUBLIC — меҳмонлар ҳам кўради)
const faolBanner = async (req, res) => {
  try {
    await auksionlarniTekshir();
    const r = await query(
      `SELECT k.id, k.sarlavha, k.rasm_url, k.havola
         FROM reklama_auksionlar a
         JOIN reklama_kampaniyalar k ON k.id = a.golib_kampaniya_id
        WHERE a.oy = to_char(NOW(), 'YYYY-MM') AND a.tolandi = TRUE AND k.holat = 'tasdiqlangan'
        LIMIT 1`
    );
    res.json(r.rows[0] || null);
  } catch (err) {
    console.error('reklama faolBanner xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// POST /api/reklama/kampaniya — баннер яратиш (модерацияга тушади)
const kampaniyaYarat = async (req, res) => {
  try {
    const sarlavha = String(req.body.sarlavha || '').trim().slice(0, 100);
    const rasm_url = String(req.body.rasm_url || '').trim().slice(0, 500);
    const havola = String(req.body.havola || '').trim().slice(0, 500);
    if (!sarlavha || !rasm_url || !havola) return res.status(400).json({ xato: 'Сарлавҳа, расм ва ҳавола киритинг' });
    if (!/^https?:\/\//i.test(rasm_url) || !/^https?:\/\//i.test(havola)) {
      return res.status(400).json({ xato: 'Расм ва ҳавола http(s) бўлсин' });
    }
    const r = await query(
      `INSERT INTO reklama_kampaniyalar (user_id, sarlavha, rasm_url, havola)
       VALUES ($1, $2, $3, $4) RETURNING id, sarlavha, rasm_url, havola, holat`,
      [req.user.id, sarlavha, rasm_url, havola]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error('reklama kampaniyaYarat xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// GET /api/reklama/auksion — жорий кимошди ҳолати + менинг кампаниялар + ютуқлар
const auksionHolati = async (req, res) => {
  try {
    const auksion = await joriyAuksion();
    let joriy = null;
    if (auksion) {
      const top = await query(
        `SELECT summa, kampaniya_id, COUNT(*) OVER () AS soni
           FROM reklama_takliflar WHERE auksion_id = $1 ORDER BY summa DESC, id ASC LIMIT 1`,
        [auksion.id]
      );
      const joriyNarx = top.rows[0] ? Number(top.rows[0].summa) : 0;
      const yetakchiKamp = top.rows[0]?.kampaniya_id || null;
      // Менинг шу кимошдидаги энг юқори таклифим
      const men = await query(
        `SELECT MAX(summa) AS eng FROM reklama_takliflar WHERE auksion_id = $1 AND user_id = $2`,
        [auksion.id, req.user.id]
      );
      const meningEng = men.rows[0]?.eng ? Number(men.rows[0].eng) : 0;
      // Етакчи кампания шу фойдаланувчиникими? (исм яширин — фақат шу белги)
      let yetakchimi = false;
      if (yetakchiKamp) {
        const k = await query(`SELECT user_id FROM reklama_kampaniyalar WHERE id = $1`, [yetakchiKamp]);
        yetakchimi = k.rows[0]?.user_id === req.user.id;
      }
      joriy = {
        id: auksion.id,
        oy: auksion.oy.trim(),
        tugash: auksion.tugash,
        reserve_narx: auksion.reserve_narx,
        min_qadam: auksion.min_qadam,
        joriy_narx: joriyNarx,
        keyingi_min: joriyNarx > 0 ? joriyNarx + auksion.min_qadam : auksion.reserve_narx,
        takliflar_soni: top.rows[0] ? Number(top.rows[0].soni) : 0,
        mening_eng: meningEng,
        yetakchimi,
      };
    }
    // Менинг кампаниялар
    const kampaniyalar = await query(
      `SELECT id, sarlavha, rasm_url, havola, holat, rad_sababi
         FROM reklama_kampaniyalar WHERE user_id = $1 ORDER BY id DESC`,
      [req.user.id]
    );
    // Ютуқлар — ёпилган, мени ғолиб қилган, ҳали тўланмаган кимошдилар
    const yutuqlar = await query(
      `SELECT a.id, a.oy, a.golib_summa
         FROM reklama_auksionlar a
         JOIN reklama_kampaniyalar k ON k.id = a.golib_kampaniya_id
        WHERE a.holat = 'yopilgan' AND a.tolandi = FALSE AND k.user_id = $1
        ORDER BY a.oy DESC`,
      [req.user.id]
    );
    res.json({
      auksion: joriy,
      kampaniyalar: kampaniyalar.rows,
      yutuqlar: yutuqlar.rows.map((y) => ({ ...y, oy: y.oy.trim() })),
    });
  } catch (err) {
    console.error('reklama auksionHolati xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// POST /api/reklama/taklif — кимошдида таклиф қилиш { kampaniya_id, summa }
const taklifQil = async (req, res) => {
  try {
    const kampaniyaId = parseInt(req.body.kampaniya_id, 10);
    const summa = parseInt(req.body.summa, 10);
    if (!Number.isFinite(kampaniyaId) || !Number.isFinite(summa) || summa <= 0) {
      return res.status(400).json({ xato: 'Нотўғри таклиф' });
    }
    // Кампания эгаси ва тасдиқлангани текширилади
    const k = await query(`SELECT user_id, holat FROM reklama_kampaniyalar WHERE id = $1`, [kampaniyaId]);
    if (!k.rows[0] || k.rows[0].user_id !== req.user.id) return res.status(403).json({ xato: 'Бу кампания сизники эмас' });
    if (k.rows[0].holat !== 'tasdiqlangan') return res.status(400).json({ xato: 'Кампания ҳали тасдиқланмаган' });

    const auksion = await joriyAuksion();
    if (!auksion) return res.status(400).json({ xato: 'Очиқ кимошди йўқ' });
    if (new Date(auksion.tugash) <= new Date()) return res.status(400).json({ xato: 'Кимошди тугади' });

    const top = await query(
      `SELECT MAX(summa) AS eng FROM reklama_takliflar WHERE auksion_id = $1`,
      [auksion.id]
    );
    const joriyNarx = top.rows[0]?.eng ? Number(top.rows[0].eng) : 0;
    const minQabul = joriyNarx > 0 ? joriyNarx + auksion.min_qadam : auksion.reserve_narx;
    if (summa < minQabul) {
      return res.status(400).json({ xato: `Камида ${minQabul.toLocaleString()} сўм таклиф қилинг`, keyingi_min: minQabul });
    }

    await query(
      `INSERT INTO reklama_takliflar (auksion_id, kampaniya_id, user_id, summa)
       VALUES ($1, $2, $3, $4)`,
      [auksion.id, kampaniyaId, req.user.id, summa]
    );

    // Anti-sniping — охирги SNIPING_SOAT соатда таклиф келса, шунчага узаямиз
    const qolgan = (new Date(auksion.tugash) - Date.now()) / 3600000;
    if (qolgan < SNIPING_SOAT) {
      await query(
        `UPDATE reklama_auksionlar SET tugash = tugash + ($2 || ' hours')::INTERVAL WHERE id = $1`,
        [auksion.id, SNIPING_SOAT]
      );
    }
    res.status(201).json({ ok: true, summa, keyingi_min: summa + auksion.min_qadam });
  } catch (err) {
    console.error('reklama taklifQil xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// ===== Админ =====

// GET /api/reklama/admin/royxat — модерация кутаётган + сўнгги кампаниялар
const adminRoyxat = async (req, res) => {
  try {
    const r = await query(
      `SELECT k.id, k.sarlavha, k.rasm_url, k.havola, k.holat, k.rad_sababi, k.yaratilgan,
              u.ism AS reklamachi
         FROM reklama_kampaniyalar k JOIN users u ON u.id = k.user_id
        ORDER BY (k.holat = 'kutilmoqda') DESC, k.id DESC LIMIT 100`
    );
    res.json(r.rows);
  } catch (err) {
    console.error('reklama adminRoyxat xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// POST /api/reklama/admin/moderatsiya/:id — { holat: 'tasdiqlangan'|'rad', sabab }
const adminModeratsiya = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { holat } = req.body;
    if (!['tasdiqlangan', 'rad'].includes(holat)) return res.status(400).json({ xato: 'Нотўғри ҳолат' });
    // Шаффофлик — рад этишда сабаб МАЖБУРИЙ (бизнинг тамойил)
    const sabab = String(req.body.sabab || '').trim().slice(0, 300);
    if (holat === 'rad' && !sabab) return res.status(400).json({ xato: 'Рад этиш сабабини ёзинг' });
    const r = await query(
      `UPDATE reklama_kampaniyalar SET holat = $2, rad_sababi = $3 WHERE id = $1 RETURNING id, holat, rad_sababi`,
      [id, holat, holat === 'rad' ? sabab : null]
    );
    if (r.rows.length === 0) return res.status(404).json({ xato: 'Топилмади' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error('reklama adminModeratsiya xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// GET /api/reklama/admin/auksionlar — кимошди тарихи (админ кузатуви)
const adminAuksionlar = async (req, res) => {
  try {
    await auksionlarniTekshir();
    const r = await query(
      `SELECT a.id, a.oy, a.tugash, a.reserve_narx, a.min_qadam, a.holat, a.golib_summa, a.tolandi,
              k.sarlavha AS golib_sarlavha,
              (SELECT COUNT(*) FROM reklama_takliflar t WHERE t.auksion_id = a.id) AS takliflar
         FROM reklama_auksionlar a
         LEFT JOIN reklama_kampaniyalar k ON k.id = a.golib_kampaniya_id
        ORDER BY a.oy DESC LIMIT 24`
    );
    res.json(r.rows.map((x) => ({ ...x, oy: x.oy.trim() })));
  } catch (err) {
    console.error('reklama adminAuksionlar xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// POST /api/reklama/admin/auksion/:id — бошланғич нарх/қадамни созлаш { reserve_narx, min_qadam }
const adminAuksionSozla = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const reserve = parseInt(req.body.reserve_narx, 10);
    const qadam = parseInt(req.body.min_qadam, 10);
    if (!Number.isFinite(reserve) || !Number.isFinite(qadam) || reserve < 0 || qadam <= 0) {
      return res.status(400).json({ xato: 'Нотўғри қиймат' });
    }
    // Фақат очиқ ва ҳали таклиф тушмаган кимошдини созлаш мумкин
    const t = await query(`SELECT COUNT(*) AS c FROM reklama_takliflar WHERE auksion_id = $1`, [id]);
    if (Number(t.rows[0].c) > 0) return res.status(400).json({ xato: 'Таклиф тушган — ўзгартириб бўлмайди' });
    const r = await query(
      `UPDATE reklama_auksionlar SET reserve_narx = $2, min_qadam = $3 WHERE id = $1 AND holat = 'ochiq' RETURNING id`,
      [id, reserve, qadam]
    );
    if (r.rows.length === 0) return res.status(404).json({ xato: 'Очиқ кимошди топилмади' });
    res.json({ ok: true });
  } catch (err) {
    console.error('reklama adminAuksionSozla xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

module.exports = {
  auksionlarniTekshir, reklamaFaollashtir,
  faolBanner, kampaniyaYarat, auksionHolati, taklifQil,
  adminRoyxat, adminModeratsiya, adminAuksionlar, adminAuksionSozla,
};
