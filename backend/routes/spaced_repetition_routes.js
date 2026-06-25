const express = require('express');
const router = express.Router();
const srsController = require('../controllers/spaced_repetition_controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/overdue', authenticateToken, requireRole(['STUDENT']), srsController.getOverdueReviews);
router.post('/review', authenticateToken, requireRole(['STUDENT']), srsController.submitReview);
router.post('/register', authenticateToken, requireRole(['STUDENT']), srsController.registerMaterialForSrs);

module.exports = router;
