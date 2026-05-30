// Админ API йўллари — фақат 'admin' роли учун
const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const {
  statistika, foydalanuvchilar, bloklash, blokniYechish, buyurtmalar, tasdiqlash, tasdiqBekor,
  hujjatlar, hujjatRad, kycOcheret,
} = require('../controllers/adminController');

// Барча админ йўллари токен + админ роли талаб қилади
router.use(authMiddleware, roleMiddleware('admin'));

router.get('/statistika', statistika);
router.get('/foydalanuvchilar', foydalanuvchilar);
router.post('/bloklash/:id', bloklash);
router.post('/blok-yechish/:id', blokniYechish);
router.post('/tasdiqlash/:id', tasdiqlash);
router.post('/tasdiq-bekor/:id', tasdiqBekor);
router.get('/hujjatlar/:userId', hujjatlar);
router.get('/kyc-queue', kycOcheret);
router.post('/hujjat/:id/rad', hujjatRad);
router.get('/buyurtmalar', buyurtmalar);

const { royxat: sosRoyxat, qabul: sosQabul } = require('../controllers/sosController');
router.get('/sos', sosRoyxat);
router.post('/sos/:id/qabul', sosQabul);

module.exports = router;
