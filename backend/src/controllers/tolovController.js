// Тўлов мувофиқлаштируви (reconciliation) ва қайтариш (refund) — админ учун.
// Payme/Click webhook'и ёки тармоқ узилиши сабаб тўлов тушса-ю обуна фаоллашмай
// қолса — пул кетган, хизмат йўқ. Бу модуль номувофиқликни топиб тузатади/билдиради.
const { query } = require('../config/db');
const { obunaTolovHolati, avtoTuzatish } = require('../utils/tolovHolat');
const { obunaFaollashtir } = require('./subscriptionController');

// Обуна тўловларини солиштириб номувофиқликни топамиз/тузатамиз.
// • 'faollashtirilmagan' (тўлов бор, обуна фаол эмас) → автомат фаоллаштирамиз.
// • Қолганлари (tolovsiz_faol, etim_tolov) → ҳисоботга, админ кўради.
// Қайтаради: { tekshirilgan, tuzatilgan, ogohlar: [...] }.
async function obunalarniSolishtir({ jim = true } = {}) {
  // Сўнгги 30 кундаги обунага боғлиқ транзакциялар (эски-ларни такрор кўрмаймиз)
  const r = await query(
    `SELECT t.id AS tx_id, t.holat AS tx_holat, t.summa, t.tizim, t.yaratilgan,
            o.id AS obuna_id, o.holat AS obuna_holat, o.user_id
       FROM transactions t
       JOIN obunalar o ON o.id = t.obuna_id
      WHERE t.obuna_id IS NOT NULL
        AND t.yaratilgan > NOW() - INTERVAL '30 days'`
  );

  const natija = { tekshirilgan: r.rows.length, tuzatilgan: 0, ogohlar: [] };
  for (const row of r.rows) {
    const holat = obunaTolovHolati(
      { holat: row.tx_holat, obuna_id: row.obuna_id },
      { holat: row.obuna_holat }
    );
    if (holat === 'ok') continue;

    if (avtoTuzatish(holat)) {
      // Тўлов аниқ тушган — обунани фаоллаштирамиз (идемпотент)
      const ok = await obunaFaollashtir(row.obuna_id);
      if (ok) {
        natija.tuzatilgan++;
        if (!jim) console.log(`🔧 Обуна #${row.obuna_id} автомат фаоллаштирилди (tx #${row.tx_id})`);
      }
    } else {
      natija.ogohlar.push({
        tx_id: row.tx_id, obuna_id: row.obuna_id, user_id: row.user_id,
        muammo: holat, summa: row.summa,
      });
    }
  }
  if (!jim && (natija.tuzatilgan || natija.ogohlar.length)) {
    console.log(`💳 Тўлов солиштируви: ${natija.tuzatilgan} тузатилди, ${natija.ogohlar.length} огоҳ`);
  }
  return natija;
}

// ===== Админ эндпоинтлари =====

// GET /api/admin/tolovlar?holat=&tizim=  — транзакциялар рўйхати
const royxat = async (req, res) => {
  try {
    const shartlar = [];
    const qiymat = [];
    if (['kutilmoqda', 'tolandi', 'bekor'].includes(req.query.holat)) {
      qiymat.push(req.query.holat); shartlar.push(`t.holat = $${qiymat.length}`);
    }
    if (['payme', 'click', 'test'].includes(req.query.tizim)) {
      qiymat.push(req.query.tizim); shartlar.push(`t.tizim = $${qiymat.length}`);
    }
    const where = shartlar.length ? `WHERE ${shartlar.join(' AND ')}` : '';
    const r = await query(
      `SELECT t.id, t.tizim, t.summa, t.holat, t.ride_id, t.obuna_id, t.reklama_id,
              t.tashqi_id, t.yaratilgan,
              o.user_id AS obuna_user_id, o.holat AS obuna_holat, o.turi AS obuna_turi,
              u.ism AS user_ism
         FROM transactions t
         LEFT JOIN obunalar o ON o.id = t.obuna_id
         LEFT JOIN users u ON u.id = o.user_id
         ${where}
         ORDER BY t.id DESC LIMIT 100`,
      qiymat
    );
    res.json(r.rows);
  } catch (err) {
    console.error('admin tolovlar xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// POST /api/admin/tolov/solishtir — қўлда солиштиришни ишга тушириш
const solishtirIshga = async (_req, res) => {
  try {
    const n = await obunalarniSolishtir({ jim: false });
    res.json(n);
  } catch (err) {
    console.error('solishtir ishga xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

// POST /api/admin/tolov/:id/qaytar  body: { sabab }
// Тўловни қайтарилган деб белгилаймиз ва боғлиқ обунани бекор қиламиз.
// Сабаб МАЖБУРИЙ (шаффофлик). Эслатма: бу ички ҳисоб ёзуви — Payme/Click'да
// пулни қайтариш алоҳида (мерчант кабинети) амалга оширилади.
const qaytar = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const sabab = typeof req.body.sabab === 'string' ? req.body.sabab.trim() : '';
    if (!Number.isInteger(id)) return res.status(400).json({ xato: 'Нотўғри ид' });
    if (sabab.length < 3) return res.status(400).json({ xato: 'Қайтариш сабабини ёзинг' });

    const t = await query(`SELECT id, holat, obuna_id FROM transactions WHERE id = $1`, [id]);
    if (t.rows.length === 0) return res.status(404).json({ xato: 'Тўлов топилмади' });
    const tx = t.rows[0];
    if (tx.holat === 'bekor') return res.status(400).json({ xato: 'Аллақачон бекор қилинган' });

    await query(
      `UPDATE transactions SET holat = 'bekor', bekor_vaqti = $2 WHERE id = $1`,
      [id, Date.now()]
    );
    // Боғлиқ обунани бекор қиламиз (хизмат тўхтайди)
    if (tx.obuna_id) {
      await query(
        `UPDATE obunalar SET holat = 'bekor', tugash_sana = LEAST(tugash_sana, NOW()) WHERE id = $1`,
        [tx.obuna_id]
      );
    }
    res.json({ ok: true, sabab });
  } catch (err) {
    console.error('tolov qaytar xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

module.exports = { obunalarniSolishtir, royxat, solishtirIshga, qaytar };
