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

// Learning Materials
router.get('/topics/:topicId/materials', authenticateToken, courseController.getMaterialsByTopic);
router.post('/topics/:topicId/materials', authenticateToken, requireRole(['TEACHER', 'ADMIN']), courseController.createMaterial);
router.delete('/materials/:id', authenticateToken, requireRole(['TEACHER', 'ADMIN']), courseController.deleteMaterial);
router.delete('/topics/:id', authenticateToken, requireRole(['TEACHER', 'ADMIN']), courseController.deleteTopic);
router.delete('/:id', authenticateToken, requireRole(['TEACHER', 'ADMIN']), courseController.deleteCourse);
router.post('/materials/:id/complete', authenticateToken, requireRole(['STUDENT']), courseController.completeMaterial);
router.post('/upload-local', authenticateToken, requireRole(['TEACHER', 'ADMIN']), courseController.uploadLocalFile);
router.get('/teacher/student-progress', authenticateToken, requireRole(['TEACHER', 'ADMIN']), courseController.getTeacherStudentProgress);

module.exports = router;
