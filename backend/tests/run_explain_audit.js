require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../config/db');
const fs = require('fs');

async function runExplainAudit() {
    const teacherId = '383d5df8-97ec-4b6d-bf36-36824331c7af';
    const taId = 'efb6902f-43f0-4c98-9882-1ab02f8cd50e';
    const studentId = '515d5057-19a5-45d4-b760-1cb6572a64e4';
    const courseId = '3f4c302f-d9cf-4015-a0d1-b87f8615a77a';

    const attemptRes = await db.query('SELECT id FROM quiz_attempts ORDER BY completed_at DESC LIMIT 1');
    const attemptId = attemptRes.rows[0]?.id;

    const queries = [
        {
            name: '1. Student Progress Page - Enrollments Query',
            sql: `EXPLAIN (ANALYZE, BUFFERS)
            SELECT 
                e.id AS enrollment_id,
                e.course_id,
                c.title AS course_title,
                e.student_id,
                u.first_name,
                u.last_name,
                u.email,
                u.xp_points,
                u.streak_count,
                e.enrolled_at,
                e.payment_status
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            JOIN users u ON e.student_id = u.id
            WHERE c.teacher_id = $1
            ORDER BY u.last_name, u.first_name`,
            params: [teacherId]
        },
        {
            name: '1b. Student Progress Page - Progress Records Query',
            sql: `EXPLAIN (ANALYZE, BUFFERS)
            SELECT student_id, topic_id, skill_score, completion_percentage, last_studied_at
            FROM progress
            WHERE student_id = ANY($1) AND topic_id = ANY($2)`,
            params: [[studentId], ['d261e433-e522-493e-a89a-ec2db9f5a77b']]
        },
        {
            name: '1c. Student Progress Page - Quiz Attempts Aggregation Query',
            sql: `EXPLAIN (ANALYZE, BUFFERS)
            SELECT student_id, quiz_id, MAX(score) AS best_score, COUNT(id) AS attempts_count
            FROM quiz_attempts
            WHERE student_id = ANY($1) AND quiz_id = ANY($2)
            GROUP BY student_id, quiz_id`,
            params: [[studentId], ['3d6b2a92-b862-4e13-b508-c8990ff863b7']]
        },
        {
            name: '2. Teacher Dashboard - TA Overview with per-TA Student Counts',
            sql: `EXPLAIN (ANALYZE, BUFFERS)
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
            ORDER BY distinct_student_count DESC, c.title ASC`,
            params: [teacherId]
        },
        {
            name: '3. TA Assigned Students Page - Students List',
            sql: `EXPLAIN (ANALYZE, BUFFERS)
            SELECT 
                e.student_id,
                u.first_name,
                u.last_name,
                u.email,
                e.enrolled_at,
                e.payment_status
            FROM enrollments e
            JOIN users u ON e.student_id = u.id
            WHERE e.course_id = $1
            ORDER BY u.first_name, u.last_name`,
            params: [courseId]
        },
        {
            name: '3b. TA Assigned Students Page - Quiz Attempts Query',
            sql: `EXPLAIN (ANALYZE, BUFFERS)
            SELECT 
                qa.student_id,
                qa.quiz_id,
                qa.score,
                qa.completed_at,
                q.topic_id,
                t.title AS topic_title
            FROM quiz_attempts qa
            JOIN quizzes q ON qa.quiz_id = q.id
            JOIN topics t ON q.topic_id = t.id
            WHERE t.course_id = $1
            ORDER BY qa.completed_at ASC`,
            params: [courseId]
        },
        {
            name: '4. Student Leaderboard Ranking',
            sql: `EXPLAIN (ANALYZE, BUFFERS)
            SELECT id, first_name, last_name, xp_points, streak_count 
            FROM users 
            WHERE role = 'STUDENT'
            ORDER BY xp_points DESC 
            LIMIT 10`,
            params: []
        },
        {
            name: '5. Doubt Requests / TA Applications Filtered - Teacher Pending Applications',
            sql: `EXPLAIN (ANALYZE, BUFFERS)
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
            ORDER BY a.created_at DESC`,
            params: [teacherId]
        },
        {
            name: '5b. Doubt Requests Filtered - TA Incoming Requests',
            sql: `EXPLAIN (ANALYZE, BUFFERS)
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
            ORDER BY r.created_at DESC`,
            params: [taId]
        },
        {
            name: '5c. Doubt Requests Filtered - TA Pending Doubts Count',
            sql: `EXPLAIN (ANALYZE, BUFFERS)
            SELECT COUNT(*) AS pending_doubts 
            FROM ta_requests 
            WHERE ta_id = $1 AND status = 'PENDING'`,
            params: [taId]
        },
        {
            name: '6. Quiz Results/Review Page - Questions + Responses for one Attempt',
            sql: `EXPLAIN (ANALYZE, BUFFERS)
            SELECT 
                qr.id AS response_id,
                qr.question_id,
                q.content,
                q.options,
                q.correct_option_id,
                qr.selected_option_id,
                qr.is_correct,
                q.difficulty
            FROM question_responses qr
            JOIN questions q ON qr.question_id = q.id
            WHERE qr.attempt_id = $1`,
            params: [attemptId]
        }
    ];

    let output = '';
    for (const q of queries) {
        output += `\n======================================================\n`;
        output += `QUERY: ${q.name}\n`;
        output += `======================================================\n`;
        try {
            const res = await db.query(q.sql, q.params);
            output += res.rows.map(r => r['QUERY PLAN']).join('\n') + '\n';
        } catch (e) {
            output += `ERROR running ${q.name}: ${e.message}\n`;
        }
    }

    fs.writeFileSync(__dirname + '/audit_report.txt', output);
    console.log('Saved audit report to audit_report.txt');
    process.exit(0);
}

runExplainAudit().catch(err => {
    console.error(err);
    process.exit(1);
});
