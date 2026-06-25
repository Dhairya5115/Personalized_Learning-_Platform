const express = require('express');
const router = express.Router();
const plannerController = require('../controllers/study_planner_controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.post('/generate', authenticateToken, requireRole(['STUDENT']), plannerController.generatePlan);
router.get('/latest', authenticateToken, requireRole(['STUDENT']), plannerController.getLatestPlan);

module.exports = router;
