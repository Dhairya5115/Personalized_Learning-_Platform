const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth_controller');
const { authenticateToken } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.get('/profile', authenticateToken, authController.getProfile);
router.get('/leaderboard', authenticateToken, authController.getLeaderboard);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;

