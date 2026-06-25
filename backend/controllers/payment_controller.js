const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../config/db');
const emailService = require('../services/email_service');
require('dotenv').config();

// Initialize Razorpay SDK. Fallback dummy configuration if keys are missing in env.
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_id';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';

const razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
});

/**
 * Initiate Razorpay Order
 */
async function createOrder(req, res) {
    const { courseId } = req.body;
    const studentId = req.user.id;

    if (!courseId) {
        return res.status(400).json({ error: 'courseId is required' });
    }

    try {
        // Get course details
        const courseRes = await db.query('SELECT title, price FROM courses WHERE id = $1', [courseId]);
        if (courseRes.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        const course = courseRes.rows[0];
        const amountInPaise = Math.round(parseFloat(course.price) * 100);

        if (amountInPaise <= 0) {
            return res.status(400).json({ error: 'Course is free. Direct enrollment should be used.' });
        }

        const options = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: `receipt_${Date.now()}_${studentId.substring(0, 8)}`
        };

        const order = await razorpay.orders.create(options);

        // Store pending payment in database
        const insertQuery = `
            INSERT INTO payments (student_id, course_id, razorpay_order_id, amount, status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        await db.query(insertQuery, [
            studentId,
            courseId,
            order.id,
            course.price,
            'PENDING'
        ]);

        return res.status(201).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency
        });

    } catch (err) {
        console.error('Razorpay create order error:', err.message);
        return res.status(500).json({ error: 'Failed to create payment order with Razorpay gateway' });
    }
}

/**
 * Verify Razorpay Signature
 */
async function verifyPayment(req, res) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const studentId = req.user.id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'Missing required Razorpay payment response variables' });
    }

    try {
        // Calculate expected signature using HMAC-SHA256
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Update payment record in database
            const updatePaymentQuery = `
                UPDATE payments 
                SET razorpay_payment_id = $1, razorpay_signature = $2, status = 'SUCCESS'
                WHERE razorpay_order_id = $3
                RETURNING course_id, amount
            `;
            const paymentResult = await db.query(updatePaymentQuery, [
                razorpay_payment_id,
                razorpay_signature,
                razorpay_order_id
            ]);

            if (paymentResult.rows.length === 0) {
                return res.status(404).json({ error: 'Transaction order record not found in database' });
            }

            const { course_id, amount } = paymentResult.rows[0];

            // Insert enrollment
            const insertEnrollmentQuery = `
                INSERT INTO enrollments (student_id, course_id, payment_status)
                VALUES ($1, $2, 'PAID')
                ON CONFLICT (student_id, course_id) 
                DO UPDATE SET payment_status = 'PAID'
            `;
            await db.query(insertEnrollmentQuery, [studentId, course_id]);

            // Retrieve student & course details to trigger Nodemailer receipt
            const studentRes = await db.query('SELECT email, first_name FROM users WHERE id = $1', [studentId]);
            const courseRes = await db.query('SELECT title FROM courses WHERE id = $1', [course_id]);

            if (studentRes.rows.length > 0 && courseRes.rows.length > 0) {
                const student = studentRes.rows[0];
                const course = courseRes.rows[0];
                
                // Run asynchronous email sending
                emailService.sendPurchaseConfirmation(
                    student.email,
                    student.first_name,
                    course.title,
                    amount
                );
            }

            return res.json({
                success: true,
                message: 'Payment verified and enrollment created successfully'
            });

        } else {
            // Signature mismatch: fail payment record
            await db.query(`UPDATE payments SET status = 'FAILED' WHERE razorpay_order_id = $1`, [razorpay_order_id]);
            return res.status(400).json({ success: false, error: 'Signature verification mismatch. Transaction marked as failed.' });
        }

    } catch (err) {
        console.error('Razorpay verification error:', err.message);
        return res.status(500).json({ error: 'Internal server error verifying payment transaction' });
    }
}

module.exports = {
    createOrder,
    verifyPayment
};
