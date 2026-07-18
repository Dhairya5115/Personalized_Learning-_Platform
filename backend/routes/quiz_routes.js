const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quiz_controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Student endpoints
router.get('/:quizId/next', authenticateToken, requireRole(['STUDENT']), quizController.getNextAdaptiveQuestion);
router.post('/submit', authenticateToken, requireRole(['STUDENT']), quizController.submitQuiz);
router.get('/topic/:topicId', authenticateToken, quizController.getQuizzesByTopic);

// Teacher/Admin endpoints
router.post('/', authenticateToken, requireRole(['TEACHER', 'ADMIN']), quizController.createQuiz);
router.get('/:quizId/questions', authenticateToken, quizController.getQuizQuestions);
router.post('/:quizId/questions', authenticateToken, requireRole(['TEACHER', 'ADMIN']), quizController.addQuestionToQuiz);
router.put('/questions/:questionId', authenticateToken, requireRole(['TEACHER', 'ADMIN']), quizController.updateQuestion);
router.delete('/questions/:questionId', authenticateToken, requireRole(['TEACHER', 'ADMIN']), quizController.deleteQuestion);
router.post('/topic/:topicId/generate-ai', authenticateToken, requireRole(['TEACHER', 'ADMIN']), quizController.generateAiQuiz);
router.delete('/:quizId', authenticateToken, requireRole(['TEACHER', 'ADMIN']), quizController.deleteQuiz);

module.exports = router;
