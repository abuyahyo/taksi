const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { meniki } = require('../controllers/rideController');

router.use(authMiddleware);
router.get('/me', meniki);

module.exports = router;
