// Тўлов йўллари — webhook (Payme/Click) ва клиент API (URL генератор, синов)
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { paymeWebhook } = require('../controllers/paymeController');
const { prepare, complete } = require('../controllers/clickController');
const { checkoutUrl, testPay, status } = require('../controllers/paymentController');

// Webhook'лар — Payme/Click сервери чақиради (auth йўқ, ўз протоколларида ҳимоя)
router.post('/payme', paymeWebhook);
router.post('/click/prepare', prepare);
router.post('/click/complete', complete);

// Клиент API — JWT талаб қилинади
router.post('/url',      authMiddleware, checkoutUrl);
router.post('/test-pay', authMiddleware, testPay);
router.get('/status/:rideId', authMiddleware, status);

module.exports = router;
