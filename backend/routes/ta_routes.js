const express = require('express');
const router = express.Router();
const taController = require('../controllers/ta_controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

// TA Application Routes
router.post('/applications', authenticateToken, requireRole(['TA']), taController.applyForCourse);
router.get('/applications/my', authenticateToken, requireRole(['TA']), taController.getMyApplications);
router.get('/applications/teacher', authenticateToken, requireRole(['TEACHER']), taController.getTeacherPendingApplications);
router.put('/applications/:id/review', authenticateToken, requireRole(['TEACHER']), taController.reviewApplication);
router.get('/teacher-overview', authenticateToken, requireRole(['TEACHER']), taController.getTeacherTaOverview);

// TA Course & Enrolled Students Access Routes
router.get('/my-courses', authenticateToken, requireRole(['TA']), taController.getMyAssignedCourses);
router.get('/courses/:courseId/students', authenticateToken, requireRole(['TA']), taController.getAssignedCourseStudents);
router.get('/dashboard-stats', authenticateToken, requireRole(['TA']), taController.getTaDashboardStats);

// Student & TA Doubt Request Routes
router.get('/available-for-student', authenticateToken, requireRole(['STUDENT']), taController.getAvailableTasForStudent);
router.post('/requests', authenticateToken, requireRole(['STUDENT']), taController.createDoubtRequest);
router.get('/requests/student', authenticateToken, requireRole(['STUDENT']), taController.getStudentRequests);
router.get('/requests/ta', authenticateToken, requireRole(['TA']), taController.getTaRequests);
router.put('/requests/:id/schedule', authenticateToken, requireRole(['TA']), taController.scheduleDoubtRequest);
router.put('/requests/:id/status', authenticateToken, taController.updateRequestStatus);

module.exports = router;
