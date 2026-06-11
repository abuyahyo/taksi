// Низо (шикоят) API — ҳар қандай рўйхатдан ўтган фойдаланувчи (йўловчи/ҳайдовчи)
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { yarat, meniki } = require('../controllers/nizoController');

router.use(authMiddleware);
router.post('/', yarat);
router.get('/meniki', meniki);

module.exports = router;
