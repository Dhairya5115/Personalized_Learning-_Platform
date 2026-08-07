const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics_controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/report', authenticateToken, requireRole(['STUDENT']), analyticsController.getStudentAnalytics);
router.get('/teacher', authenticateToken, requireRole(['TEACHER', 'ADMIN', 'TA']), analyticsController.getTeacherAnalytics);

module.exports = router;
