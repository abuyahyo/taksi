// Админ API йўллари — фақат 'admin' роли учун
const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const {
  statistika, foydalanuvchilar, bloklash, blokniYechish, buyurtmalar,
} = require('../controllers/adminController');

// Барча админ йўллари токен + админ роли талаб қилади
router.use(authMiddleware, roleMiddleware('admin'));

router.get('/statistika', statistika);
router.get('/foydalanuvchilar', foydalanuvchilar);
router.post('/bloklash/:id', bloklash);
router.post('/blok-yechish/:id', blokniYechish);
router.get('/buyurtmalar', buyurtmalar);

module.exports = router;
