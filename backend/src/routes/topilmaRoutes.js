const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  royxat, yarat, bitta, javob, narxTaklif, kelishildi, qaytarildi, bekor,
} = require('../controllers/topilmaController');

router.use(authMiddleware);
router.get('/', royxat);
router.post('/', yarat);
router.get('/:id', bitta);
router.post('/:id/javob', javob);            // ҳайдовчи: топдим/топмадим
router.post('/:id/narx', narxTaklif);        // савдо: қарши таклиф
router.post('/:id/kelishildi', kelishildi);  // жорий нархга рози
router.post('/:id/qaytarildi', qaytarildi);  // йўловчи: олдим
router.post('/:id/bekor', bekor);            // бекор қилиш

module.exports = router;
