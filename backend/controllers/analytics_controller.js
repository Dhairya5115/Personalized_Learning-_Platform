const db = require('../config/db');

/**
 * Fetch learning analytics reports for the logged-in student
 */
async function getStudentAnalytics(req, res) {
    const studentId = req.user.id;

    try {
        // 1. Fetch user summary details (XP, Streak)
        const userRes = await db.query(
            'SELECT xp_points, streak_count FROM users WHERE id = $1',
            [studentId]
        );
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'Student profile not found' });
        }
        const user = userRes.rows[0];

        // 2. Fetch average quiz attempt scores
        const averageRes = await db.query(
            'SELECT COALESCE(AVG(score), 0) as avg_score, COUNT(id) as total_attempts FROM quiz_attempts WHERE student_id = $1',
            [studentId]
        );
        const stats = averageRes.rows[0];

        // 3. Fetch topic-wise mastery scores
        const topicRes = await db.query(
            `SELECT t.title as topic_title, p.skill_score, p.completion_percentage 
             FROM progress p
             JOIN topics t ON p.topic_id = t.id
             WHERE p.student_id = $1
             ORDER BY p.skill_score DESC`,
            [studentId]
        );

        // 4. Fetch chronological quiz attempt history (last 8 attempts for trends line-chart)
        const attemptsRes = await db.query(
            `SELECT score, completed_at 
             FROM quiz_attempts 
             WHERE student_id = $1 
             ORDER BY completed_at ASC 
             LIMIT 8`,
            [studentId]
        );

        // 5. Fetch study activity heatmap data (past 90 days)
        const heatmapQuery = `
            SELECT activity_date::text, SUM(activity_count)::integer as count
            FROM (
                SELECT DATE(completed_at) as activity_date, COUNT(*) as activity_count
                FROM quiz_attempts
                WHERE student_id = $1 AND completed_at >= CURRENT_DATE - INTERVAL '90 days'
                GROUP BY activity_date
                UNION ALL
                SELECT DATE(last_reviewed_at) as activity_date, COUNT(*) as activity_count
                FROM spaced_repetition
                WHERE student_id = $1 AND last_reviewed_at >= CURRENT_DATE - INTERVAL '90 days'
                GROUP BY activity_date
            ) sub
            GROUP BY activity_date
            ORDER BY activity_date ASC
        `;
        const heatmapRes = await db.query(heatmapQuery, [studentId]);

        // 6. Fetch recent detailed attempts (for PASS/FAIL and correct/incorrect display on performance page)
        const recentAttemptsQuery = `
            SELECT qa.id, qa.score, qa.completed_at, q.title as quiz_title,
                   COALESCE(q.passing_score, 50) as passing_score,
                   COUNT(qr.id)::integer as total_questions,
                   SUM(CASE WHEN qr.is_correct = TRUE THEN 1 ELSE 0 END)::integer as correct_count
            FROM quiz_attempts qa
            JOIN quizzes q ON qa.quiz_id = q.id
            LEFT JOIN question_responses qr ON qa.id = qr.attempt_id
            WHERE qa.student_id = $1
            GROUP BY qa.id, q.title, q.passing_score
            ORDER BY qa.completed_at DESC
            LIMIT 10
        `;
        const recentAttemptsRes = await db.query(recentAttemptsQuery, [studentId]);

        return res.json({
            success: true,
            summary: {
                xpPoints: user.xp_points,
                streakCount: user.streak_count,
                averageScore: Math.round(parseFloat(stats.avg_score)),
                totalAttempts: parseInt(stats.total_attempts) || 0
            },
            topicScores: topicRes.rows,
            quizTrends: attemptsRes.rows.map((row, idx) => ({
                label: `Quiz ${idx + 1}`,
                score: row.score,
                date: new Date(row.completed_at).toLocaleDateString()
            })),
            studyHeatmap: heatmapRes.rows,
            recentAttempts: recentAttemptsRes.rows
        });

    } catch (err) {
        console.error('[Analytics Error] getStudentAnalytics controller:', err.message);
        return res.status(500).json({ error: 'Internal server error compiling analytics report data' });
    }
}

async function getTeacherAnalytics(req, res) {
    const teacherId = req.user.id;

    try {
        // 1. Total courses taught by this teacher
        const coursesCountRes = await db.query(
            'SELECT COUNT(id) as total_courses FROM courses WHERE teacher_id = $1',
            [teacherId]
        );
        const totalCourses = parseInt(coursesCountRes.rows[0].total_courses) || 0;

        // 2. Total unique student enrollments
        const studentsCountRes = await db.query(
            `SELECT COUNT(DISTINCT e.student_id) as total_students 
             FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             WHERE c.teacher_id = $1`,
            [teacherId]
        );
        const totalStudents = parseInt(studentsCountRes.rows[0].total_students) || 0;

        // 3. Weakest topics (top 5 lowest average skill scores)
        const weakestTopicsRes = await db.query(
            `SELECT t.id as topic_id, t.title as topic_title, c.title as course_title, 
                    ROUND(COALESCE(AVG(p.skill_score), 0)) as avg_skill_score
             FROM topics t
             JOIN courses c ON t.course_id = c.id
             LEFT JOIN progress p ON t.id = p.topic_id
             WHERE c.teacher_id = $1
             GROUP BY t.id, t.title, c.title
             ORDER BY avg_skill_score ASC
             LIMIT 5`,
            [teacherId]
        );

        // 4. Student grades and progress table
        const studentGradesRes = await db.query(
            `SELECT u.id as student_id, u.first_name, u.last_name, u.email, u.xp_points,
                    COUNT(DISTINCT e.course_id) as course_count,
                    ROUND(COALESCE(AVG(qa.score), 0)) as avg_quiz_score
             FROM users u
             JOIN enrollments e ON u.id = e.student_id
             JOIN courses c ON e.course_id = c.id
             LEFT JOIN topics t ON t.course_id = c.id
             LEFT JOIN quizzes q ON q.topic_id = t.id
             LEFT JOIN quiz_attempts qa ON qa.student_id = u.id AND qa.quiz_id = q.id
             WHERE c.teacher_id = $1
             GROUP BY u.id, u.first_name, u.last_name, u.email, u.xp_points
             ORDER BY u.xp_points DESC`,
            [teacherId]
        );

        return res.json({
            success: true,
            summary: {
                totalCourses,
                totalStudents
            },
            weakestTopics: weakestTopicsRes.rows,
            studentGrades: studentGradesRes.rows
        });

    } catch (err) {
        console.error('[Analytics Error] getTeacherAnalytics controller:', err.message);
        return res.status(500).json({ error: 'Internal server error compiling teacher analytics reports' });
    }
}

module.exports = {
    getStudentAnalytics,
    getTeacherAnalytics
};
