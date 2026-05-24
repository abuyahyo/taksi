// Тўлов webhook йўллари (Payme + Click)
const express = require('express');
const router = express.Router();
const { paymeWebhook } = require('../controllers/paymeController');
const { prepare, complete } = require('../controllers/clickController');

// Payme — битта манзил, JSON-RPC
router.post('/payme', paymeWebhook);

// Click — иккита босқич
router.post('/click/prepare', prepare);
router.post('/click/complete', complete);

module.exports = router;
