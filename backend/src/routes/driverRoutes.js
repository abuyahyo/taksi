const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { stats, profile, updateProfile } = require('../controllers/driverController');
const { holatim, sotibOlish } = require('../controllers/subscriptionController');

router.use(authMiddleware, roleMiddleware('haydovchi'));
router.get('/stats', stats);
router.get('/profile', profile);
router.put('/profile', updateProfile);
router.get('/subscription', holatim);
router.post('/subscription/buy', sotibOlish);

module.exports = router;
