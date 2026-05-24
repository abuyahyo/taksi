const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { stats } = require('../controllers/driverController');

router.use(authMiddleware, roleMiddleware('haydovchi'));
router.get('/stats', stats);

module.exports = router;
