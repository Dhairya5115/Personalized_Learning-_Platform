const db = require('../config/db');
const emailService = require('../services/email_service');

/**
 * TA applies to assist a specific course
 */
async function applyForCourse(req, res) {
    const { courseId, fullName, contact, qualification, motivation, experience, resumeLink } = req.body;
    const taId = req.user.id;

    if (!courseId) {
        return res.status(400).json({ error: 'courseId is required' });
    }
    if (!fullName || !contact || !qualification || !motivation) {
        return res.status(400).json({ error: 'Full Name, Contact, Qualification, and Motivation are required' });
    }

    try {
        // Check if TA already has an active (PENDING or APPROVED) application for this course
        const existingCheck = await db.query(
            `SELECT id, status FROM ta_applications WHERE ta_id = $1 AND course_id = $2 AND status IN ('PENDING', 'APPROVED')`,
            [taId, courseId]
        );

        if (existingCheck.rows.length > 0) {
            return res.status(409).json({ 
                error: `You already have an active (${existingCheck.rows[0].status}) application for this course.` 
            });
        }

        const insertQuery = `
            INSERT INTO ta_applications (ta_id, course_id, full_name, contact, qualification, motivation, experience, resume_link, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
            RETURNING *
        `;

        const result = await db.query(insertQuery, [
            taId,
            courseId,
            fullName,
            contact,
            qualification,
            motivation || '',
            experience || '',
            resumeLink || ''
        ]);

        return res.status(201).json({
            success: true,
            application: result.rows[0]
        });
    } catch (err) {
        console.error('Apply for course error:', err.message);
        return res.status(500).json({ error: 'Failed to submit TA application' });
    }
}

/**
 * TA fetches their own submitted applications
 */
async function getMyApplications(req, res) {
    const taId = req.user.id;

    try {
        const queryText = `
            SELECT 
                a.*, 
                c.title AS course_title, 
                c.description AS course_description,
                u.first_name AS reviewer_first_name, 
                u.last_name AS reviewer_last_name
            FROM ta_applications a
            JOIN courses c ON a.course_id = c.id
            LEFT JOIN users u ON a.reviewed_by = u.id
            WHERE a.ta_id = $1
            ORDER BY a.created_at DESC
        `;
        const result = await db.query(queryText, [taId]);
        return res.json(result.rows);
    } catch (err) {
        console.error('Get TA applications error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch TA applications' });
    }
}

/**
 * Teacher fetches pending TA applications for courses they own
 */
async function getTeacherPendingApplications(req, res) {
    const teacherId = req.user.id;

    try {
        const queryText = `
            SELECT 
                a.*, 
                c.title AS course_title,
                u.first_name AS ta_first_name, 
                u.last_name AS ta_last_name, 
                u.email AS ta_email
            FROM ta_applications a
            JOIN courses c ON a.course_id = c.id
            JOIN users u ON a.ta_id = u.id
            WHERE c.teacher_id = $1
            ORDER BY a.created_at DESC
        `;
        const result = await db.query(queryText, [teacherId]);
        return res.json(result.rows);
    } catch (err) {
        console.error('Get teacher pending applications error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch pending applications for review' });
    }
}

/**
 * Teacher reviews (Approve/Reject) a TA application
 */
async function reviewApplication(req, res) {
    const { id } = req.params;
    const { status } = req.body; // 'APPROVED' or 'REJECTED'
    const teacherId = req.user.id;

    if (!status || !['APPROVED', 'REJECTED'].includes(status.toUpperCase())) {
        return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
    }

    try {
        // Fetch application details and verify teacher ownership
        const appRes = await db.query(
            `SELECT a.*, c.title AS course_title, u.email AS ta_email, u.first_name AS ta_first_name
             FROM ta_applications a
             JOIN courses c ON a.course_id = c.id
             JOIN users u ON a.ta_id = u.id
             WHERE a.id = $1 AND c.teacher_id = $2`,
            [id, teacherId]
        );

        if (appRes.rows.length === 0) {
            return res.status(404).json({ error: 'Application not found or unauthorized' });
        }

        const app = appRes.rows[0];
        const newStatus = status.toUpperCase();

        // 1. Update application status
        await db.query(
            `UPDATE ta_applications 
             SET status = $1, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2 
             WHERE id = $3`,
            [newStatus, teacherId, id]
        );

        // 2. If approved, link TA to course in course_tas table
        if (newStatus === 'APPROVED') {
            await db.query(
                `INSERT INTO course_tas (ta_id, course_id) 
                 VALUES ($1, $2) 
                 ON CONFLICT (ta_id, course_id) DO NOTHING`,
                [app.ta_id, app.course_id]
            );
        }

        // 3. Create in-app notification entry
        const notifTitle = `TA Application ${newStatus === 'APPROVED' ? 'Approved 🎉' : 'Status Update'}`;
        const notifMsg = `Your application to assist as TA for course "${app.course_title}" has been ${newStatus.toLowerCase()}.`;
        await db.query(
            `INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)`,
            [app.ta_id, notifTitle, notifMsg]
        );

        // 4. Send email notification via Nodemailer
        emailService.sendTaApplicationDecision(app.ta_email, app.ta_first_name, app.course_title, newStatus);

        return res.json({
            success: true,
            message: `TA application has been ${newStatus.toLowerCase()} successfully.`
        });
    } catch (err) {
        console.error('Review application error:', err.message);
        return res.status(500).json({ error: 'Failed to process application review' });
    }
}

/**
 * TA fetches courses they are assigned to
 */
async function getMyAssignedCourses(req, res) {
    const taId = req.user.id;

    try {
        const queryText = `
            SELECT 
                c.*, 
                ct.assigned_at,
                u.first_name AS teacher_first_name, 
                u.last_name AS teacher_last_name
            FROM course_tas ct
            JOIN courses c ON ct.course_id = c.id
            LEFT JOIN users u ON c.teacher_id = u.id
            WHERE ct.ta_id = $1
            ORDER BY ct.assigned_at DESC
        `;
        const result = await db.query(queryText, [taId]);
        return res.json(result.rows);
    } catch (err) {
        console.error('Get assigned courses error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch assigned courses' });
    }
}

/**
 * TA fetches students enrolled in an assigned course (limited student data access guard)
 */
async function getAssignedCourseStudents(req, res) {
    const { courseId } = req.params;
    const taId = req.user.id;

    try {
        // Enforce TA course assignment guard
        const guardCheck = await db.query(
            `SELECT id FROM course_tas WHERE ta_id = $1 AND course_id = $2`,
            [taId, courseId]
        );

        if (guardCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Forbidden: You are not an assigned TA for this course' });
        }

        // Fetch enrolled students and their progress per topic (no sensitive fields like password_hash)
        const queryText = `
            SELECT 
                e.id AS enrollment_id,
                e.enrolled_at,
                e.payment_status,
                u.id AS student_id,
                u.first_name,
                u.last_name,
                u.email,
                COALESCE(
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'topic_id', t.id,
                            'topic_title', t.title,
                            'skill_score', COALESCE(p.skill_score, 0),
                            'completion_percentage', COALESCE(p.completion_percentage, 0),
                            'last_studied_at', p.last_studied_at
                        )
                    ) FILTER (WHERE t.id IS NOT NULL), '[]'
                ) AS topic_progress
            FROM enrollments e
            JOIN users u ON e.student_id = u.id
            LEFT JOIN topics t ON t.course_id = e.course_id
            LEFT JOIN progress p ON p.student_id = u.id AND p.topic_id = t.id
            WHERE e.course_id = $1
            GROUP BY e.id, u.id
            ORDER BY u.first_name, u.last_name
        `;
        const result = await db.query(queryText, [courseId]);
        return res.json(result.rows);
    } catch (err) {
        console.error('Get assigned course students error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch student data for course' });
    }
}

/**
 * Student fetches available TAs for courses they are enrolled in
 */
async function getAvailableTasForStudent(req, res) {
    const studentId = req.user.id;

    try {
        const queryText = `
            SELECT DISTINCT
                u.id AS ta_id,
                u.first_name,
                u.last_name,
                u.email,
                c.id AS course_id,
                c.title AS course_title
            FROM enrollments e
            JOIN course_tas ct ON e.course_id = ct.course_id
            JOIN users u ON ct.ta_id = u.id
            JOIN courses c ON ct.course_id = c.id
            WHERE e.student_id = $1
            ORDER BY c.title, u.first_name
        `;
        const result = await db.query(queryText, [studentId]);
        return res.json(result.rows);
    } catch (err) {
        console.error('Get available TAs error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch available TAs' });
    }
}

/**
 * Student creates a doubt request to a specific assigned TA
 */
async function createDoubtRequest(req, res) {
    const { taId, courseId, subject, description } = req.body;
    const studentId = req.user.id;

    if (!taId || !courseId || !subject || !description) {
        return res.status(400).json({ error: 'taId, courseId, subject, and description are required' });
    }

    try {
        // Verify student is enrolled AND TA is assigned to this course
        const verifyQuery = `
            SELECT ct.id, c.title AS course_title, s.first_name AS student_first_name, s.last_name AS student_last_name, ta.email AS ta_email, ta.first_name AS ta_first_name
            FROM course_tas ct
            JOIN enrollments e ON ct.course_id = e.course_id
            JOIN courses c ON ct.course_id = c.id
            JOIN users s ON e.student_id = s.id
            JOIN users ta ON ct.ta_id = ta.id
            WHERE ct.ta_id = $1 AND ct.course_id = $2 AND e.student_id = $3
        `;
        const verifyRes = await db.query(verifyQuery, [taId, courseId, studentId]);

        if (verifyRes.rows.length === 0) {
            return res.status(403).json({ error: 'Unauthorized: Selected TA is not assigned to your course.' });
        }

        const info = verifyRes.rows[0];

        // Insert doubt request
        const insertQuery = `
            INSERT INTO ta_requests (student_id, ta_id, course_id, subject, description, status)
            VALUES ($1, $2, $3, $4, $5, 'PENDING')
            RETURNING *
        `;
        const result = await db.query(insertQuery, [studentId, taId, courseId, subject.trim(), description.trim()]);

        // Insert in-app notification for TA
        const studentFullName = `${info.student_first_name} ${info.student_last_name}`;
        await db.query(
            `INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)`,
            [taId, 'New Doubt Request 💡', `Student ${studentFullName} submitted a doubt for ${info.course_title}: "${subject}".`]
        );

        // Send email to TA via Nodemailer
        emailService.sendNewDoubtRequestToTa(
            info.ta_email,
            info.ta_first_name,
            studentFullName,
            info.course_title,
            subject,
            description
        );

        return res.status(201).json({
            success: true,
            request: result.rows[0]
        });
    } catch (err) {
        console.error('Create doubt request error:', err.message);
        return res.status(500).json({ error: 'Failed to create doubt request' });
    }
}

/**
 * Student views their sent doubt requests
 */
async function getStudentRequests(req, res) {
    const studentId = req.user.id;

    try {
        const queryText = `
            SELECT 
                r.*, 
                c.title AS course_title,
                u.first_name AS ta_first_name, 
                u.last_name AS ta_last_name, 
                u.email AS ta_email
            FROM ta_requests r
            JOIN courses c ON r.course_id = c.id
            JOIN users u ON r.ta_id = u.id
            WHERE r.student_id = $1
            ORDER BY r.created_at DESC
        `;
        const result = await db.query(queryText, [studentId]);
        return res.json(result.rows);
    } catch (err) {
        console.error('Get student requests error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch doubt requests' });
    }
}

/**
 * TA views incoming doubt requests
 */
async function getTaRequests(req, res) {
    const taId = req.user.id;

    try {
        const queryText = `
            SELECT 
                r.*, 
                c.title AS course_title,
                u.first_name AS student_first_name, 
                u.last_name AS student_last_name, 
                u.email AS student_email
            FROM ta_requests r
            JOIN courses c ON r.course_id = c.id
            JOIN users u ON r.student_id = u.id
            WHERE r.ta_id = $1
            ORDER BY r.created_at DESC
        `;
        const result = await db.query(queryText, [taId]);
        return res.json(result.rows);
    } catch (err) {
        console.error('Get TA requests error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch incoming doubt requests' });
    }
}

/**
 * TA schedules virtual meeting for a doubt request
 */
async function scheduleDoubtRequest(req, res) {
    const { id } = req.params;
    const { meetingLink, scheduledAt } = req.body;
    const taId = req.user.id;

    if (!meetingLink || !scheduledAt) {
        return res.status(400).json({ error: 'meetingLink and scheduledAt datetime are required' });
    }

    try {
        const reqCheck = await db.query(
            `SELECT r.*, c.title AS course_title, 
                    s.email AS student_email, s.first_name AS student_first_name,
                    ta.first_name AS ta_first_name, ta.last_name AS ta_last_name, ta.email AS ta_email
             FROM ta_requests r
             JOIN courses c ON r.course_id = c.id
             JOIN users s ON r.student_id = s.id
             JOIN users ta ON r.ta_id = ta.id
             WHERE r.id = $1 AND r.ta_id = $2`,
            [id, taId]
        );

        if (reqCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Doubt request not found or unauthorized' });
        }

        const requestData = reqCheck.rows[0];

        const updateQuery = `
            UPDATE ta_requests 
            SET meeting_link = $1, scheduled_at = $2, status = 'SCHEDULED' 
            WHERE id = $3
            RETURNING *
        `;
        const updatedRes = await db.query(updateQuery, [meetingLink.trim(), scheduledAt, id]);

        const taFullName = `${requestData.ta_first_name} ${requestData.ta_last_name}`;

        // Insert in-app notification for student
        await db.query(
            `INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)`,
            [
                requestData.student_id,
                'Doubt Session Scheduled 📅',
                `TA ${taFullName} scheduled your session for "${requestData.subject}". Join link: ${meetingLink}`
            ]
        );

        // Send email with .ics calendar attachment to student
        emailService.sendDoubtScheduledToStudent(
            requestData.student_email,
            requestData.student_first_name,
            requestData.ta_email,
            taFullName,
            requestData.course_title,
            requestData.subject,
            meetingLink.trim(),
            scheduledAt
        );

        return res.json({
            success: true,
            request: updatedRes.rows[0]
        });
    } catch (err) {
        console.error('Schedule doubt request error:', err.message);
        return res.status(500).json({ error: 'Failed to schedule doubt request' });
    }
}

/**
 * Update doubt request status (RESOLVED | DECLINED)
 */
async function updateRequestStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!status || !['RESOLVED', 'DECLINED'].includes(status.toUpperCase())) {
        return res.status(400).json({ error: 'Status must be RESOLVED or DECLINED' });
    }

    try {
        // Verify user is either student or TA for this request
        const reqCheck = await db.query(
            `SELECT id FROM ta_requests WHERE id = $1 AND (student_id = $2 OR ta_id = $3)`,
            [id, userId, userId]
        );

        if (reqCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Doubt request not found or unauthorized' });
        }

        const updateRes = await db.query(
            `UPDATE ta_requests SET status = $1 WHERE id = $2 RETURNING *`,
            [status.toUpperCase(), id]
        );

        return res.json({
            success: true,
            request: updateRes.rows[0]
        });
    } catch (err) {
        console.error('Update request status error:', err.message);
        return res.status(500).json({ error: 'Failed to update request status' });
    }
}

/**
 * Teacher fetches Active TAs for their courses with distinct student counts
 */
async function getTeacherTaOverview(req, res) {
    const teacherId = req.user.id;

    try {
        const queryText = `
            SELECT 
                ct.id AS link_id,
                u.id AS ta_id,
                u.first_name AS ta_first_name,
                u.last_name AS ta_last_name,
                u.email AS ta_email,
                c.id AS course_id,
                c.title AS course_title,
                ct.assigned_at,
                'Active' AS current_status,
                COUNT(DISTINCT u_std.email) AS distinct_student_count
            FROM course_tas ct
            JOIN courses c ON ct.course_id = c.id
            JOIN users u ON ct.ta_id = u.id
            LEFT JOIN enrollments e ON e.course_id = c.id
            LEFT JOIN users u_std ON e.student_id = u_std.id
            WHERE c.teacher_id = $1
            GROUP BY ct.id, u.id, u.first_name, u.last_name, u.email, c.id, c.title, ct.assigned_at
            ORDER BY distinct_student_count DESC, c.title ASC
        `;
        const result = await db.query(queryText, [teacherId]);
        return res.json(result.rows);
    } catch (err) {
        console.error('Get Teacher TA Overview error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch TA overview' });
    }
}

/**
 * TA fetches their own dashboard stats (total distinct students handled, assigned courses count, pending doubt requests count)
 */
async function getTaDashboardStats(req, res) {
    const taId = req.user.id;

    try {
        const studentRes = await db.query(`
            SELECT COUNT(DISTINCT u.email) AS total_students
            FROM course_tas ct
            JOIN enrollments e ON e.course_id = ct.course_id
            JOIN users u ON e.student_id = u.id
            WHERE ct.ta_id = $1
        `, [taId]);

        const courseRes = await db.query(`
            SELECT COUNT(*) AS total_courses FROM course_tas WHERE ta_id = $1
        `, [taId]);

        const doubtRes = await db.query(`
            SELECT COUNT(*) AS pending_doubts FROM ta_requests WHERE ta_id = $1 AND status = 'PENDING'
        `, [taId]);

        return res.json({
            totalStudents: parseInt(studentRes.rows[0]?.total_students || 0),
            totalCourses: parseInt(courseRes.rows[0]?.total_courses || 0),
            pendingDoubts: parseInt(doubtRes.rows[0]?.pending_doubts || 0)
        });
    } catch (err) {
        console.error('Get TA Dashboard stats error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch TA dashboard stats' });
    }
}

module.exports = {
    applyForCourse,
    getMyApplications,
    getTeacherPendingApplications,
    reviewApplication,
    getMyAssignedCourses,
    getAssignedCourseStudents,
    getAvailableTasForStudent,
    createDoubtRequest,
    getStudentRequests,
    getTaRequests,
    scheduleDoubtRequest,
    updateRequestStatus,
    getTeacherTaOverview,
    getTaDashboardStats
};
