const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { stats, daromad, profile, updateProfile, onboarding, kodim } = require('../controllers/driverController');
const { holatim, sotibOlish } = require('../controllers/subscriptionController');
const { meningKodim } = require('../controllers/referalController');
const { upload, yukla, royxatim, faylBer } = require('../controllers/kycController');

// KYC файлини узатиш — эгаси ёки админ (роль локидан ОЛДИН, токи админ ҳам кўрсин)
router.get('/hujjat/:id/fayl', authMiddleware, faylBer);

router.use(authMiddleware, roleMiddleware('haydovchi'));
router.get('/stats', stats);
router.get('/daromad', daromad);
router.get('/profile', profile);
router.put('/profile', updateProfile);
router.get('/onboarding', onboarding);
router.get('/code', kodim);
router.get('/subscription', holatim);
router.post('/subscription/buy', sotibOlish);
// Таклиф дастури — ўз кодим + статистика
router.get('/referral', meningKodim);
// KYC — ҳужжат юклаш ва ўз рўйхатини кўриш
router.post('/hujjat', upload.single('fayl'), yukla);
router.get('/hujjatlar', royxatim);

module.exports = router;
