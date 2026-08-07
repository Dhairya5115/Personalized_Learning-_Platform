const nodemailer = require('nodemailer');
const ics = require('ics');
const dns = require('dns');
require('dotenv').config();

// Configure Google & Cloudflare public DNS resolvers to prevent Windows OS GetAddrInfo IPv6 timeouts (queryA ETIMEOUT)
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

/**
 * Creates a Nodemailer transporter using dynamic IPv4 DNS resolution
 * to bypass Windows/Node.js IPv6 GetAddrInfo DNS resolution timeouts.
 */
async function getTransporter() {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    let targetHost = smtpHost;

    if (smtpHost === 'smtp.gmail.com') {
        try {
            const addrs = await new Promise((resolve) => {
                dns.resolve4('smtp.gmail.com', (err, addresses) => {
                    if (!err && addresses && addresses.length > 0) resolve(addresses);
                    else resolve(null);
                });
            });
            if (addrs && addrs[0]) {
                targetHost = addrs[0];
            }
        } catch (e) {}
    }

    const port = parseInt(process.env.SMTP_PORT) || 587;
    const isSecure = process.env.SMTP_SECURE === 'true' && port === 465;

    return nodemailer.createTransport({
        host: targetHost,
        port: port,
        secure: isSecure,
        auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || ''
        },
        tls: {
            servername: smtpHost,
            rejectUnauthorized: false
        }
    });
}

// Verify connection configuration on startup
getTransporter().then(transporter => {
    transporter.verify((error, success) => {
        if (error) {
            console.warn('Nodemailer SMTP configuration invalid or offline:', error.message);
        } else {
            console.log('Nodemailer SMTP connection verified successfully');
        }
    });
}).catch(err => {
    console.warn('Nodemailer init error:', err.message);
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
        const transporter = await getTransporter();
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
        const transporter = await getTransporter();
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
        const transporter = await getTransporter();
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
        const transporter = await getTransporter();
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
        const transporter = await getTransporter();
        await transporter.sendMail(mailOptions);
        console.log(`[Email] Password reset link sent to: ${toEmail}`);
    } catch (err) {
        console.error('[Email Error] Failed to send password reset:', err.message);
    }
}

/**
 * Send TA Application Decision Notification (APPROVED / REJECTED)
 */
async function sendTaApplicationDecision(toEmail, taName, courseTitle, decision) {
    const isApproved = decision.toUpperCase() === 'APPROVED';
    const mailOptions = {
        from: `"Personalized Learning Platform" <${process.env.SMTP_USER || 'no-reply@learningplatform.com'}>`,
        to: toEmail,
        subject: `Update on your TA Application for ${courseTitle}`,
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; color: #1f2937;">
                <h2 style="color: ${isApproved ? '#10b981' : '#ef4444'}; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">
                    TA Application ${isApproved ? 'Approved!' : 'Status Update'}
                </h2>
                <p>Hello <strong>${taName}</strong>,</p>
                <p>Your application to serve as a Teaching Assistant for <strong>${courseTitle}</strong> has been <strong>${decision.toUpperCase()}</strong>.</p>
                ${isApproved ? `
                    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <strong style="color: #065f46;">Next Steps:</strong>
                        <p style="margin: 5px 0 0 0; color: #047857;">You now have access to view enrolled students, topic progress skill scores, and incoming student doubt requests for this course on your TA Dashboard.</p>
                    </div>
                    <div style="text-align: center; margin: 25px 0;">
                        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to TA Dashboard</a>
                    </div>
                ` : `
                    <p style="color: #6b7280;">Thank you for your interest in assisting with this course. You may apply for other open courses from your TA catalog.</p>
                `}
            </div>
        `
    };

    try {
        const transporter = await getTransporter();
        await transporter.sendMail(mailOptions);
        console.log(`[Email] TA application decision (${decision}) sent to: ${toEmail}`);
    } catch (err) {
        console.error('[Email Error] Failed to send TA application decision:', err.message);
    }
}

/**
 * Send New Doubt Request Email to TA
 */
async function sendNewDoubtRequestToTa(toEmail, taName, studentName, courseTitle, subject, description) {
    const mailOptions = {
        from: `"Personalized Learning Platform" <${process.env.SMTP_USER || 'no-reply@learningplatform.com'}>`,
        to: toEmail,
        subject: `New Doubt Request from ${studentName} - ${courseTitle}`,
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; color: #1f2937;">
                <h3 style="color: #6366f1; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">New Student Doubt Submitted</h3>
                <p>Hello <strong>${taName}</strong>,</p>
                <p>Student <strong>${studentName}</strong> has submitted a doubt request for <strong>${courseTitle}</strong>.</p>
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; margin: 20px 0;">
                    <p style="margin: 0 0 8px 0;"><strong>Topic / Subject:</strong> ${subject}</p>
                    <p style="margin: 0;"><strong>Description:</strong> ${description}</p>
                </div>
                <p>Please log in to your TA dashboard to schedule a virtual meeting time and link.</p>
                <div style="text-align: center; margin: 25px 0;">
                    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Respond to Request</a>
                </div>
            </div>
        `
    };

    try {
        const transporter = await getTransporter();
        await transporter.sendMail(mailOptions);
        console.log(`[Email] New doubt request notification sent to TA: ${toEmail}`);
    } catch (err) {
        console.error('[Email Error] Failed to send doubt request to TA:', err.message);
    }
}

/**
 * Send Scheduled Doubt Session Details to Student with .ics Calendar Invitation
 */
async function sendDoubtScheduledToStudent(toEmail, studentName, taEmail, taName, courseTitle, subject, meetingLink, scheduledAt) {
    const scheduledDateObj = new Date(scheduledAt);
    const formattedDateStr = scheduledDateObj.toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short'
    });

    // Generate .ics calendar event file attachment using `ics` package
    let icsAttachment = null;
    try {
        const year = scheduledDateObj.getFullYear();
        const month = scheduledDateObj.getMonth() + 1;
        const day = scheduledDateObj.getDate();
        const hours = scheduledDateObj.getHours();
        const minutes = scheduledDateObj.getMinutes();

        const eventData = {
            start: [year, month, day, hours, minutes],
            duration: { hours: 1, minutes: 0 },
            title: `Doubt Session: ${subject} (${courseTitle})`,
            description: `Virtual 1-on-1 doubt solving session with TA ${taName}.\nMeeting Link: ${meetingLink}`,
            location: meetingLink,
            url: meetingLink,
            organizer: { name: taName, email: taEmail || 'ta@learningplatform.com' },
            attendees: [{ name: studentName, email: toEmail, rsvp: true }]
        };

        const { error, value } = ics.createEvent(eventData);
        if (!error && value) {
            icsAttachment = {
                filename: 'doubt-session-invite.ics',
                content: value,
                contentType: 'text/calendar; method=REQUEST; charset=UTF-8'
            };
        } else if (error) {
            console.warn('[ICS Event Error]', error);
        }
    } catch (icsErr) {
        console.error('[ICS Generation Error]', icsErr.message);
    }

    // Generate one-click Google Calendar template link
    let googleCalendarUrl = '#';
    try {
        const startDate = new Date(scheduledAt);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default 60 min duration
        const formatGCalDate = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
        const startUTC = formatGCalDate(startDate);
        const endUTC = formatGCalDate(endDate);

        const gCalParams = new URLSearchParams({
            action: 'TEMPLATE',
            text: `Doubt Session: ${subject} (${courseTitle})`,
            dates: `${startUTC}/${endUTC}`,
            details: `1-on-1 Virtual Doubt Solving Session with TA ${taName}.\nCourse: ${courseTitle}\nSubject: ${subject}\nMeeting Link: ${meetingLink}`,
            location: meetingLink
        });
        googleCalendarUrl = `https://calendar.google.com/calendar/render?${gCalParams.toString()}`;
    } catch (gCalErr) {
        console.error('[Google Calendar URL Error]', gCalErr.message);
    }

    const mailOptions = {
        from: `"Personalized Learning Platform" <${process.env.SMTP_USER || 'no-reply@learningplatform.com'}>`,
        to: toEmail,
        subject: `📅 Doubt Session Scheduled: ${subject}`,
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; color: #1f2937;">
                <h2 style="color: #4f46e5; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">Virtual Meeting Scheduled!</h2>
                <p>Hello <strong>${studentName}</strong>,</p>
                <p>Teaching Assistant <strong>${taName}</strong> has scheduled your doubt solving session for <strong>${courseTitle}</strong>.</p>
                
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${subject}</p>
                    <p style="margin: 0 0 10px 0;"><strong>Scheduled Time:</strong> <span style="color: #4f46e5; font-weight: bold;">${formattedDateStr}</span></p>
                    <p style="margin: 0;"><strong>Meeting Link:</strong> <a href="${meetingLink}" target="_blank" style="color: #2563eb; font-weight: bold;">${meetingLink}</a></p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${googleCalendarUrl}" target="_blank" style="background-color: #10b981; color: white; padding: 12px 22px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px; margin-bottom: 10px;">📅 Add to Google Calendar</a>
                    <a href="${meetingLink}" target="_blank" style="background-color: #4f46e5; color: white; padding: 12px 22px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-bottom: 10px;">🎥 Join Virtual Meeting</a>
                </div>

                <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">
                    💡 <em>Click the button above to add this event directly to Google Calendar, or open the attached <code>.ics</code> file to import into Outlook / Apple Calendar.</em>
                </p>
            </div>
        `,
        attachments: icsAttachment ? [icsAttachment] : []
    };

    try {
        const transporter = await getTransporter();
        await transporter.sendMail(mailOptions);
        console.log(`[Email] Doubt scheduled notification & calendar event sent to student: ${toEmail}`);
    } catch (err) {
        console.error('[Email Error] Failed to send scheduled doubt email:', err.message);
    }
}

module.exports = {
    sendPurchaseConfirmation,
    sendSpacedRepetitionReminder,
    sendStreakWarning,
    sendWeeklyDigest,
    sendPasswordReset,
    sendTaApplicationDecision,
    sendNewDoubtRequestToTa,
    sendDoubtScheduledToStudent
};

