const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { koʻr } = require('../controllers/shareController');

// Оммавий — login керак эмас (бутун мақсад шу)
router.get('/:kalit', koʻr);

module.exports = router;
