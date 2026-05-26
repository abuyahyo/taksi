const express = require('express');
const router = express.Router();
const { qidir, teskari } = require('../controllers/geocodeController');
const { yol } = require('../controllers/routeController');

router.get('/', qidir);
router.get('/reverse', teskari);
router.get('/route', yol);

module.exports = router;
