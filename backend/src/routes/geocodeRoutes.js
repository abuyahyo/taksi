const express = require('express');
const router = express.Router();
const { qidir, teskari } = require('../controllers/geocodeController');
const { yol } = require('../controllers/routeController');
const { rateLimit } = require('../middleware/rateLimit');

// Очиқ прокси абузини тўсамиз — Nominatim 1 req/sec сиёсати, IP'миз блокланмасин.
// Кэш бор, лекин ноёб сўровлар кэшни айланиб ўтади. IP бўйича дақиқада чеклаймиз.
const geoLimit = rateLimit({ oyna: 60 * 1000, maks: 60, xabar: 'Жуда кўп қидирув. Бироздан кейин уриниб кўринг.' });

router.get('/', geoLimit, qidir);
router.get('/reverse', geoLimit, teskari);
router.get('/route', geoLimit, yol);

module.exports = router;
