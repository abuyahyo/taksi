const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { me, updateMe, songgiManzillar } = require('../controllers/passengerController');

router.use(authMiddleware);
router.get('/me', me);
router.put('/me', updateMe);
router.get('/recent', songgiManzillar);

module.exports = router;
