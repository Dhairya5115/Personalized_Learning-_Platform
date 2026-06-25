const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quiz_controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Student endpoints
router.get('/:quizId/next', authenticateToken, requireRole(['STUDENT']), quizController.getNextAdaptiveQuestion);
router.post('/submit', authenticateToken, requireRole(['STUDENT']), quizController.submitQuiz);

// Teacher/Admin endpoints
router.post('/', authenticateToken, requireRole(['TEACHER', 'ADMIN']), quizController.createQuiz);
router.post('/:quizId/questions', authenticateToken, requireRole(['TEACHER', 'ADMIN']), quizController.addQuestionToQuiz);

module.exports = router;
