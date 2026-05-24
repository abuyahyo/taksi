const express = require('express');
const router = express.Router();
const { qidir } = require('../controllers/geocodeController');

router.get('/', qidir);

module.exports = router;
