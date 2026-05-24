const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { tarix } = require('../controllers/messageController');

router.use(authMiddleware);
router.get('/:rideId', tarix);

module.exports = router;
