const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai_controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.post('/doubt-solve', authenticateToken, requireRole(['STUDENT']), aiController.solveDoubt);

module.exports = router;
