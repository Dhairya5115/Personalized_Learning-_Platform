const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course_controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Public or standard student/teacher read routes
router.get('/', authenticateToken, courseController.getAllCourses);
router.get('/enrolled', authenticateToken, requireRole(['STUDENT']), courseController.getEnrolledCourses);
router.get('/:id', authenticateToken, courseController.getCourseById);
router.get('/:courseId/topics', authenticateToken, courseController.getTopicsByCourse);

// Teacher/Admin actions
router.post('/', authenticateToken, requireRole(['TEACHER', 'ADMIN']), courseController.createCourse);
router.post('/:courseId/topics', authenticateToken, requireRole(['TEACHER', 'ADMIN']), courseController.createTopic);

// Student actions
router.post('/enroll', authenticateToken, requireRole(['STUDENT']), courseController.enrollInCourse);

module.exports = router;
