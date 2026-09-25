require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../config/db');

async function testPlans() {
    const courseRes = await db.query('SELECT id FROM courses LIMIT 1');
    const courseId = courseRes.rows[0].id;

    console.log('--- 1. TA BEFORE ---');
    const p1 = await db.query(`EXPLAIN (ANALYZE, BUFFERS)
        SELECT qa.student_id, qa.quiz_id, qa.score, qa.completed_at, q.topic_id, t.title AS topic_title
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.id
        JOIN topics t ON q.topic_id = t.id
        WHERE t.course_id = $1
        ORDER BY qa.completed_at ASC`, [courseId]);
    console.log(p1.rows.map(r => r['QUERY PLAN']).join('\n'));

    console.log('\n--- 2. TA AFTER ---');
    const p2 = await db.query(`EXPLAIN (ANALYZE, BUFFERS)
        SELECT 
            qa.student_id,
            ROUND(AVG(qa.score))::integer AS average_score,
            (ARRAY_AGG(qa.score ORDER BY qa.completed_at DESC))[1] AS recent_score,
            COUNT(qa.id)::integer AS attempts_count
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.id
        JOIN topics t ON q.topic_id = t.id
        WHERE t.course_id = $1
        GROUP BY qa.student_id`, [courseId]);
    console.log(p2.rows.map(r => r['QUERY PLAN']).join('\n'));
    process.exit(0);
}

testPlans();
