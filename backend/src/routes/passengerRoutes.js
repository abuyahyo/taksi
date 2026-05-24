const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { me, updateMe } = require('../controllers/passengerController');

router.use(authMiddleware);
router.get('/me', me);
router.put('/me', updateMe);

module.exports = router;
