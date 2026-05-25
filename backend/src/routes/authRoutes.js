// Аутентификация API йўллари
const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { rateLimit } = require('../middleware/rateLimit');

// Brute-force ҳимояси — IP бўйича уринишларни чеклаймиз
const loginLimit = rateLimit({ oyna: 15 * 60 * 1000, maks: 10 });   // 15 дақ / 10 уриниш
const registerLimit = rateLimit({ oyna: 60 * 60 * 1000, maks: 5 }); // 1 соат / 5 уриниш

router.post('/register', registerLimit, register);
router.post('/login', loginLimit, login);

module.exports = router;
