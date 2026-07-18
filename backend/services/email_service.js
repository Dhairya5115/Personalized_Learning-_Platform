const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
    },
    tls: {
        // Allow self-signed certs in dev — safe for local/dev only
        rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
});

// Verify connection configuration on startup
transporter.verify((error, success) => {
    if (error) {
        console.warn('Nodemailer SMTP configuration invalid or offline. Mails will fail to send in this state.', error.message);
    } else {
        console.log('Nodemailer SMTP connection verified successfully');
    }
});

/**
 * Send Course Purchase Confirmation
 */
async function sendPurchaseConfirmation(toEmail, studentName, courseTitle, price) {
    const mailOptions = {
        from: `"Personalized Learning Platform" <${process.env.SMTP_USER || 'no-reply@learningplatform.com'}>`,
        to: toEmail,
        subject: `Welcome to ${courseTitle}! - Enrollment Confirmed`,
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; color: #1f2937;">
                <h2 style="color: #4f46e5; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">Payment Confirmation</h2>
                <p>Hello <strong>${studentName}</strong>,</p>
                <p>Thank you for purchasing <strong>${courseTitle}</strong>. Your enrollment is now active and the course content has been unlocked on your dashboard!</p>
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #f3f4f6; margin: 20px 0;">
                    <strong style="color: #374151;">Transaction Summary:</strong><br/>
                    <table style="width: 100%; margin-top: 10px;">
                        <tr>
                            <td style="color: #6b7280; padding: 4px 0;">Course Name:</td>
                            <td style="text-align: right; font-weight: bold; color: #111827;">${courseTitle}</td>
                        </tr>
                        <tr>
                            <td style="color: #6b7280; padding: 4px 0;">Amount Paid:</td>
                            <td style="text-align: right; font-weight: bold; color: #10b981;">INR ${parseFloat(price).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="color: #6b7280; padding: 4px 0;">Status:</td>
                            <td style="text-align: right; font-weight: bold; color: #4f46e5;">SUCCESS</td>
                        </tr>
                    </table>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/courses" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Start Learning</a>
                </div>
                <p style="font-size: 13px; color: #9ca3af; line-height: 1.5;">If you did not make this purchase, please contact our support team immediately.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[Email] Purchase confirmation sent successfully to: ${toEmail}`);
    } catch (err) {
        console.error('[Email Error] Failed to send purchase confirmation:', err.message);
    }
}

/**
 * Send Spaced Repetition Review Reminder
 */
async function sendSpacedRepetitionReminder(toEmail, studentName, overdueCount) {
    const mailOptions = {
        from: `"Personalized Learning Platform" <${process.env.SMTP_USER || 'no-reply@learningplatform.com'}>`,
        to: toEmail,
        subject: `Daily Brain Boost: ${overdueCount} concept reviews waiting!`,
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; color: #1f2937;">
                <h3 style="color: #10b981; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">Keep Mastered Concepts Fresh</h3>
                <p>Hi <strong>${studentName}</strong>,</p>
                <p>You have <strong>${overdueCount} items</strong> ready for Spaced Repetition reviews today. Retaining information is 3x more effective when you practice right on time!</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/reviews" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Start Today's Review</a>
                </div>
                <p style="font-size: 12px; color: #9ca3af;">You receive these notifications based on concepts you flag to remember. You can update your alert settings in your profile.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[Email] SRS reminder sent to: ${toEmail}`);
    } catch (err) {
        console.error('[Email Error] Failed to send SRS reminder:', err.message);
    }
}

/**
 * Send Streak Protection Warning
 */
async function sendStreakWarning(toEmail, studentName, currentStreak) {
    const mailOptions = {
        from: `"Personalized Learning Platform" <${process.env.SMTP_USER || 'no-reply@learningplatform.com'}>`,
        to: toEmail,
        subject: `🔥 Save your ${currentStreak}-day streak!`,
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; color: #1f2937;">
                <h3 style="color: #ef4444; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">Streak Protection Alert!</h3>
                <p>Hey <strong>${studentName}</strong>,</p>
                <p>Your <strong>${currentStreak}-day learning streak</strong> is about to expire in a few hours. Spend just 5 minutes reviewing content or taking a quick quiz to keep it alive!</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Learn Now</a>
                </div>
                <p style="font-size: 12px; color: #9ca3af;">Consistency is the key to deep technical competence. Don't let your hard work break!</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[Email] Streak warning sent to: ${toEmail}`);
    } catch (err) {
        console.error('[Email Error] Failed to send streak warning:', err.message);
    }
}

/**
 * Send Weekly Progress Digest
 */
async function sendWeeklyDigest(toEmail, studentName, xpEarned, rank, completedQuizzes) {
    const mailOptions = {
        from: `"Personalized Learning Platform" <${process.env.SMTP_USER || 'no-reply@learningplatform.com'}>`,
        to: toEmail,
        subject: `Your Weekly Learning Report 📊`,
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; color: #1f2937;">
                <h3 style="color: #6366f1; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">Weekly Wrap-up</h3>
                <p>Hi <strong>${studentName}</strong>,</p>
                <p>Here is how you performed on the platform this week:</p>
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #f3f4f6; margin: 20px 0;">
                    <table style="width: 100%;">
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="color: #6b7280; padding: 8px 0;">XP Points Earned:</td>
                            <td style="text-align: right; font-weight: bold; color: #4f46e5;">+${xpEarned} XP</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="color: #6b7280; padding: 8px 0;">Quizzes Taken:</td>
                            <td style="text-align: right; font-weight: bold; color: #374151;">${completedQuizzes}</td>
                        </tr>
                        <tr>
                            <td style="color: #6b7280; padding: 8px 0;">Current Leaderboard Rank:</td>
                            <td style="text-align: right; font-weight: bold; color: #f59e0b;">#${rank}</td>
                        </tr>
                    </table>
                </div>
                <p>Fantastic job! Keep up the momentum next week.</p>
                <div style="text-align: center; margin-top: 25px;">
                    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to My Dashboard</a>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[Email] Weekly digest sent to: ${toEmail}`);
    } catch (err) {
        console.error('[Email Error] Failed to send weekly digest:', err.message);
    }
}

/**
 * Send Password Reset Token
 */
async function sendPasswordReset(toEmail, resetToken) {
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    const mailOptions = {
        from: `"Personalized Learning Platform" <${process.env.SMTP_USER || 'no-reply@learningplatform.com'}>`,
        to: toEmail,
        subject: 'Reset Password Request',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; color: #1f2937;">
                <h3 style="color: #dc2626; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">Reset Your Password</h3>
                <p>You requested a password reset for your account. Please click the button below to specify a new password. This token link will expire in 1 hour.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
                </div>
                <p style="font-size: 12px; color: #9ca3af; line-height: 1.5;">If you did not request this, you can safely ignore this email. Your password will remain unchanged.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[Email] Password reset link sent to: ${toEmail}`);
    } catch (err) {
        console.error('[Email Error] Failed to send password reset:', err.message);
    }
}

module.exports = {
    sendPurchaseConfirmation,
    sendSpacedRepetitionReminder,
    sendStreakWarning,
    sendWeeklyDigest,
    sendPasswordReset
};
