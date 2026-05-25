// Иссиқ харита — сўнгги сафарлар ҳайдовчига зич жойларни кўрсатиш учун
const { query } = require('../config/db');

// Манзил "lat, lng" кўринишида сақланади. Махфийлик учун координатани
// ~3 хонагача (≈110 м) яхлитлаймиз — зичликни кўрсатишга етади, аниқ
// уй манзилини очмайди. Сонли бўлмаса (жой номи) ўзгартирмаймиз.
function manzilYaxlitla(manzil) {
  if (typeof manzil !== 'string') return manzil;
  const m = manzil.match(/^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/);
  if (!m) return manzil;
  return `${Number(m[1]).toFixed(3)}, ${Number(m[2]).toFixed(3)}`;
}

// GET /api/heatmap — фаол ва сўнгги 3 соатлик тугаган сафарлар
const heatmap = async (_req, res) => {
  try {
    const r = await query(
      `SELECT id, boshlanish_manzil, tugash_manzil, masofa_km,
              kelishilgan_narx, taklif_narx, holat, yaratilgan
       FROM rides
       WHERE holat IN ('kutilmoqda', 'qabul_qilindi')
          OR yaratilgan > NOW() - INTERVAL '3 hours'
       ORDER BY yaratilgan DESC
       LIMIT 150`
    );
    const natija = r.rows.map((x) => ({
      ...x,
      boshlanish_manzil: manzilYaxlitla(x.boshlanish_manzil),
      tugash_manzil: manzilYaxlitla(x.tugash_manzil),
    }));
    res.json(natija);
  } catch (err) {
    console.error('heatmap xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

module.exports = { heatmap };
