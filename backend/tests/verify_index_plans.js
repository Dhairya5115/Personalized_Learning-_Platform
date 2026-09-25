require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../config/db');

async function verifyIndexPlans() {
    const attemptRes = await db.query('SELECT id FROM quiz_attempts ORDER BY completed_at DESC LIMIT 1');
    const attemptId = attemptRes.rows[0]?.id;
    const teacherId = '383d5df8-97ec-4b6d-bf36-36824331c7af';
    const courseId = '3f4c302f-d9cf-4015-a0d1-b87f8615a77a';
    const taId = 'efb6902f-43f0-4c98-9882-1ab02f8cd50e';

    const client = await db.pool.connect();
    try {
        await client.query('SET enable_seqscan = OFF');

        console.log('=== Index Plan 1: Query 6 (question_responses using idx_question_responses_attempt) ===');
        let res = await client.query(`
            EXPLAIN (ANALYZE, BUFFERS)
            SELECT qr.id, qr.question_id, q.content, q.correct_option_id, qr.selected_option_id, qr.is_correct
            FROM question_responses qr
            JOIN questions q ON qr.question_id = q.id
            WHERE qr.attempt_id = $1
        `, [attemptId]);
        console.log(res.rows.map(r => r['QUERY PLAN']).join('\n'));

        console.log('\n=== Index Plan 2: Leaderboard (users using idx_users_student_xp) ===');
        res = await client.query(`
            EXPLAIN (ANALYZE, BUFFERS)
            SELECT id, first_name, last_name, xp_points, streak_count 
            FROM users 
            WHERE role = 'STUDENT'
            ORDER BY xp_points DESC 
            LIMIT 10
        `);
        console.log(res.rows.map(r => r['QUERY PLAN']).join('\n'));

        console.log('\n=== Index Plan 3: Enrollments (using idx_enrollments_course) ===');
        res = await client.query(`
            EXPLAIN (ANALYZE, BUFFERS)
            SELECT student_id FROM enrollments WHERE course_id = $1
        `, [courseId]);
        console.log(res.rows.map(r => r['QUERY PLAN']).join('\n'));

        console.log('\n=== Index Plan 4: Doubt Requests (using idx_ta_requests_ta_status) ===');
        res = await client.query(`
            EXPLAIN (ANALYZE, BUFFERS)
            SELECT COUNT(*) FROM ta_requests WHERE ta_id = $1 AND status = 'PENDING'
        `, [taId]);
        console.log(res.rows.map(r => r['QUERY PLAN']).join('\n'));

        console.log('\n=== Index Plan 5: Courses (using idx_courses_teacher) ===');
        res = await client.query(`
            EXPLAIN (ANALYZE, BUFFERS)
            SELECT id, title FROM courses WHERE teacher_id = $1
        `, [teacherId]);
        console.log(res.rows.map(r => r['QUERY PLAN']).join('\n'));

        console.log('\n=== Index Plan 6: Topics (using idx_topics_course_seq) ===');
        res = await client.query(`
            EXPLAIN (ANALYZE, BUFFERS)
            SELECT id, title, sequence_order FROM topics WHERE course_id = $1 ORDER BY sequence_order ASC
        `, [courseId]);
        console.log(res.rows.map(r => r['QUERY PLAN']).join('\n'));

    } finally {
        client.release();
        process.exit(0);
    }
}

verifyIndexPlans().catch(err => {
    console.error(err);
    process.exit(1);
});
