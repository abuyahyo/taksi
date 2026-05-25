const express = require('express');
const router = express.Router();
const { qidir, teskari } = require('../controllers/geocodeController');

router.get('/', qidir);
router.get('/reverse', teskari);

module.exports = router;
