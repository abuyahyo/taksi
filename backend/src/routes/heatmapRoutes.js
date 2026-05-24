const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { heatmap } = require('../controllers/heatmapController');

router.use(authMiddleware, roleMiddleware('haydovchi', 'admin'));
router.get('/', heatmap);

module.exports = router;
