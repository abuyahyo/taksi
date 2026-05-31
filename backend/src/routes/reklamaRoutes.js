const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const c = require('../controllers/reklamaController');

// Фаол баннер — PUBLIC (меҳмон йўловчилар ҳам кўради)
router.get('/faol', c.faolBanner);

// Қолгани — логин керак
router.use(authMiddleware);
router.get('/auksion', c.auksionHolati);
router.post('/kampaniya', c.kampaniyaYarat);
router.post('/taklif', c.taklifQil);

// Админ — модерация ва кимошди кузатуви
router.get('/admin/royxat', roleMiddleware('admin'), c.adminRoyxat);
router.post('/admin/moderatsiya/:id', roleMiddleware('admin'), c.adminModeratsiya);
router.get('/admin/auksionlar', roleMiddleware('admin'), c.adminAuksionlar);
router.post('/admin/auksion/:id', roleMiddleware('admin'), c.adminAuksionSozla);

module.exports = router;
