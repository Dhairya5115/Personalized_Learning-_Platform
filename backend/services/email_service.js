const ics = require('ics');
require('dotenv').config();

const getFrontendUrl = () => {
    return process.env.FRONTEND_URL || process.env.CLIENT_URL || (process.env.NODE_ENV === 'production' ? 'https://tailorlearn.vercel.app' : 'http://localhost:5173');
};

/**
 * Determine active email delivery provider:
 * 1. 'brevo'  - Brevo HTTPS REST API (Port 443) -> Primary recommendation (300 free emails/day, single sender verification)
 * 2. 'resend' - Resend HTTPS REST API (Port 443) -> Secondary (3,000 free emails/mo, requires custom domain for arbitrary recipients)
 * 3. 'smtp'   - Nodemailer SMTP (local development only, blocked on Render free tier)
 * 4. 'mock'   - Console logger fallback when no credentials are configured
 */
function getActiveProvider() {
    if (process.env.BREVO_API_KEY) return 'brevo';
    if (process.env.RESEND_API_KEY) return 'resend';
    if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.NODE_ENV !== 'production') return 'smtp';
    return 'mock';
}

function getSenderInfo() {
    const name = process.env.EMAIL_SENDER_NAME || 'TailorLearn';
    const email = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || process.env.RESEND_FROM || process.env.SMTP_FROM || 'dnshah5115@gmail.com';
    return { name, email };
}

/**
 * Non-blocking startup verification to inform operators of email status
 * without crashing or hanging on blocked TCP ports.
 */
async function verifyEmailConfiguration() {
    const provider = getActiveProvider();
    const sender = getSenderInfo();

    console.log('----------------------------------------------------');
    if (provider === 'brevo') {
        console.log(`[Email Service] ✔ Configured with Brevo HTTPS API (Port 443)`);
        console.log(`  Sender: "${sender.name}" <${sender.email}>`);
        console.log(`  Daily limit: 300 free transactional emails/day`);
    } else if (provider === 'resend') {
        console.log(`[Email Service] ✔ Configured with Resend HTTPS API (Port 443)`);
        console.log(`  Sender: "${sender.name}" <${sender.email}>`);
    } else if (provider === 'smtp') {
        console.log(`[Email Service] ℹ Using local SMTP transport for development`);
        console.log(`  Host: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
    } else {
        console.warn(`[Email Service] ⚠️ WARNING: No HTTPS email provider configured!`);
        console.warn(`  Render blocks outbound SMTP ports (25, 465, 587) on free services.`);
        console.warn(`  To enable live email delivery, set BREVO_API_KEY and BREVO_SENDER_EMAIL in Render environment variables.`);
        console.warn(`  Outgoing emails will be logged to the console in mock mode.`);
    }
    console.log('----------------------------------------------------');
}

/**
 * Send an email via Brevo REST API (HTTPS over port 443)
 */
async function sendViaBrevo({ to, subject, html, attachments = [] }, timeoutMs = 8000) {
    const sender = getSenderInfo();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Format attachments for Brevo: [{ name: string, content: base64 string }]
    const formattedAttachments = attachments.map(att => {
        let contentBase64 = '';
        if (Buffer.isBuffer(att.content)) {
            contentBase64 = att.content.toString('base64');
        } else if (typeof att.content === 'string') {
            contentBase64 = Buffer.from(att.content, 'utf8').toString('base64');
        }
        return {
            name: att.filename || 'attachment',
            content: contentBase64
        };
    });

    const payload = {
        sender: { name: sender.name, email: sender.email },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html
    };

    if (formattedAttachments.length > 0) {
        payload.attachment = formattedAttachments;
    }

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': process.env.BREVO_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Brevo HTTP ${response.status}: ${errBody}`);
        }

        const data = await response.json();
        return { success: true, messageId: data.messageId, provider: 'brevo' };
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Send an email via Resend REST API (HTTPS over port 443)
 */
async function sendViaResend({ to, subject, html, attachments = [] }, timeoutMs = 8000) {
    const sender = getSenderInfo();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const formattedAttachments = attachments.map(att => ({
        filename: att.filename || 'attachment',
        content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : Buffer.from(att.content).toString('base64')
    }));

    const payload = {
        from: `${sender.name} <${sender.email}>`,
        to: [to],
        subject: subject,
        html: html
    };

    if (formattedAttachments.length > 0) {
        payload.attachments = formattedAttachments;
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Resend HTTP ${response.status}: ${errBody}`);
        }

        const data = await response.json();
        return { success: true, messageId: data.id, provider: 'resend' };
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Local SMTP fallback for non-production development environments
 */
async function sendViaSmtp({ to, subject, html, attachments = [] }) {
    const nodemailer = require('nodemailer');
    const sender = getSenderInfo();

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || ''
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 8000
    });

    const info = await transporter.sendMail({
        from: `"${sender.name}" <${sender.email}>`,
        to,
        subject,
        html,
        attachments
    });

    return { success: true, messageId: info.messageId, provider: 'smtp' };
}

/**
 * Universal dispatcher with retries, exponential backoff, and strict timeout.
 * Errors are caught and logged so email failures never crash or block parent requests.
 */
async function dispatchEmail(options) {
    const provider = getActiveProvider();

    if (provider === 'mock') {
        console.log(`[Email Mock Dispatch] To: ${options.to} | Subject: "${options.subject}"`);
        return { success: true, messageId: 'mock-id-' + Date.now(), provider: 'mock' };
    }

    const MAX_RETRIES = 2;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            let result;
            if (provider === 'brevo') {
                result = await sendViaBrevo(options);
            } else if (provider === 'resend') {
                result = await sendViaResend(options);
            } else if (provider === 'smtp') {
                result = await sendViaSmtp(options);
            }

            console.log(`[Email Service] ✔ Sent via ${provider} to ${options.to} (Message ID: ${result?.messageId || 'OK'})`);
            return { success: true, ...result };
        } catch (err) {
            lastError = err;
            console.warn(`[Email Service] Attempt ${attempt}/${MAX_RETRIES} failed for ${options.to}: ${err.message}`);

            if (attempt < MAX_RETRIES) {
                const backoffMs = attempt * 600;
                await new Promise(res => setTimeout(res, backoffMs));
            }
        }
    }

    console.error(`[Email Service Error] All ${MAX_RETRIES} attempts failed for ${options.to}: ${lastError?.message}`);
    return { success: false, error: lastError?.message || 'Email delivery failed' };
}

/**
 * 1. Send Course Purchase Confirmation
 */
async function sendPurchaseConfirmation(toEmail, studentName, courseTitle, price) {
    return dispatchEmail({
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
                    <a href="${getFrontendUrl()}/courses" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Start Learning</a>
                </div>
                <p style="font-size: 13px; color: #9ca3af; line-height: 1.5;">If you did not make this purchase, please contact our support team immediately.</p>
            </div>
        `
    });
}

/**
 * 2. Send Spaced Repetition Review Reminder
 */
async function sendSpacedRepetitionReminder(toEmail, studentName, overdueCount) {
    return dispatchEmail({
        to: toEmail,
        subject: `Daily Brain Boost: ${overdueCount} concept reviews waiting!`,
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; color: #1f2937;">
                <h3 style="color: #10b981; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">Keep Mastered Concepts Fresh</h3>
                <p>Hi <strong>${studentName}</strong>,</p>
                <p>You have <strong>${overdueCount} items</strong> ready for Spaced Repetition reviews today. Retaining information is 3x more effective when you practice right on time!</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${getFrontendUrl()}/reviews" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Start Today's Review</a>
                </div>
                <p style="font-size: 12px; color: #9ca3af;">You receive these notifications based on concepts you flag to remember. You can update your alert settings in your profile.</p>
            </div>
        `
    });
}

/**
 * 3. Send Streak Protection Warning
 */
async function sendStreakWarning(toEmail, studentName, currentStreak) {
    return dispatchEmail({
        to: toEmail,
        subject: `🔥 Save your ${currentStreak}-day streak!`,
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; color: #1f2937;">
                <h3 style="color: #ef4444; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">Streak Protection Alert!</h3>
                <p>Hey <strong>${studentName}</strong>,</p>
                <p>Your <strong>${currentStreak}-day learning streak</strong> is about to expire in a few hours. Spend just 5 minutes reviewing content or taking a quick quiz to keep it alive!</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${getFrontendUrl()}/dashboard" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Learn Now</a>
                </div>
                <p style="font-size: 12px; color: #9ca3af;">Consistency is the key to deep technical competence. Don't let your hard work break!</p>
            </div>
        `
    });
}

/**
 * 4. Send Weekly Progress Digest
 */
async function sendWeeklyDigest(toEmail, studentName, xpEarned, rank, completedQuizzes) {
    return dispatchEmail({
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
                    <a href="${getFrontendUrl()}/dashboard" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to My Dashboard</a>
                </div>
            </div>
        `
    });
}

/**
 * 5. Send Password Reset Token
 */
async function sendPasswordReset(toEmail, resetToken) {
    const resetUrl = `${getFrontendUrl()}/reset-password?token=${resetToken}`;
    return dispatchEmail({
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
    });
}

/**
 * 6. Send TA Application Decision Notification (APPROVED / REJECTED)
 */
async function sendTaApplicationDecision(toEmail, taName, courseTitle, decision) {
    const isApproved = decision.toUpperCase() === 'APPROVED';
    return dispatchEmail({
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
                        <a href="${getFrontendUrl()}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to TA Dashboard</a>
                    </div>
                ` : `
                    <p style="color: #6b7280;">Thank you for your interest in assisting with this course. You may apply for other open courses from your TA catalog.</p>
                `}
            </div>
        `
    });
}

/**
 * 7. Send New Doubt Request Email to TA
 */
async function sendNewDoubtRequestToTa(toEmail, taName, studentName, courseTitle, subject, description) {
    return dispatchEmail({
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
                    <a href="${getFrontendUrl()}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Respond to Request</a>
                </div>
            </div>
        `
    });
}

/**
 * 8. Send Scheduled Doubt Session Details to Student with .ics Calendar Invitation
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
            organizer: { name: taName, email: taEmail || 'ta@tailorlearn.com' },
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
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
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

    return dispatchEmail({
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
    });
}

module.exports = {
    verifyEmailConfiguration,
    sendPurchaseConfirmation,
    sendSpacedRepetitionReminder,
    sendStreakWarning,
    sendWeeklyDigest,
    sendPasswordReset,
    sendTaApplicationDecision,
    sendNewDoubtRequestToTa,
    sendDoubtScheduledToStudent
};
