const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { meniki } = require('../controllers/rideController');
const { yarat: shareYarat } = require('../controllers/shareController');

router.use(authMiddleware);
router.get('/me', meniki);
router.post('/:id/share', shareYarat);

module.exports = router;
