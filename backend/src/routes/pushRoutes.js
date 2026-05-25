const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { vapidPublic, subscribe, unsubscribe } = require('../controllers/pushController');

router.get('/vapid', vapidPublic);
router.post('/subscribe', authMiddleware, subscribe);
router.post('/unsubscribe', authMiddleware, unsubscribe);

module.exports = router;
