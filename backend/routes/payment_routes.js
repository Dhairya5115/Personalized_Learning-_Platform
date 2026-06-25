const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment_controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.post('/create-order', authenticateToken, requireRole(['STUDENT']), paymentController.createOrder);
router.post('/verify', authenticateToken, requireRole(['STUDENT']), paymentController.verifyPayment);

module.exports = router;
