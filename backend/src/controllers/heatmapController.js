// Иссиқ харита — сўнгги сафарлар ҳайдовчига зич жойларни кўрсатиш учун
const { query } = require('../config/db');

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
    res.json(r.rows);
  } catch (err) {
    console.error('heatmap xato:', err.message);
    res.status(500).json({ xato: 'Сервер хатоси' });
  }
};

module.exports = { heatmap };
