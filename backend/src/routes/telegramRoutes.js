// Telegram бот webhook йўли — Telegram сервери чақиради (secret token билан ҳимоя)
const express = require('express');
const router = express.Router();
const { webhook } = require('../controllers/telegramWebhookController');

router.post('/webhook', webhook);

module.exports = router;
