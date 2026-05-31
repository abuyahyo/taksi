const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { me, updateMe, songgiManzillar, oxirgiSafar, manzillar, manzilQosh, manzilOchir, sevimlilar, sevimliQosh, sevimliOchir, haydovchiKodBoyicha } = require('../controllers/passengerController');

router.use(authMiddleware);
router.get('/me', me);
router.put('/me', updateMe);
router.get('/recent', songgiManzillar);
router.get('/last-ride', oxirgiSafar);
router.get('/addresses', manzillar);
router.post('/addresses', manzilQosh);
router.delete('/addresses/:id', manzilOchir);
router.get('/favorites', sevimlilar);
router.post('/favorites', sevimliQosh);
router.delete('/favorites/:id', sevimliOchir);
router.get('/driver/:kod', haydovchiKodBoyicha);

module.exports = router;
