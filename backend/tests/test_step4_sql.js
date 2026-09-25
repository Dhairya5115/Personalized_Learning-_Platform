require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../config/db');

async function testStep4() {
    try {
        console.log('Testing SQL aggregation query for progress recalculation...');
        const studentRes = await db.query("SELECT id FROM users WHERE role = 'STUDENT' LIMIT 1");
        const topicRes = await db.query("SELECT id FROM topics LIMIT 1");
        const studentId = studentRes.rows[0].id;
        const topicId = topicRes.rows[0].id;

        const singleQuery = `
            WITH stats AS (
                SELECT 
                    (SELECT COUNT(*)::integer FROM materials WHERE topic_id = $2) AS total_materials,
                    (SELECT COUNT(DISTINCT cm.material_id)::integer 
                     FROM completed_materials cm 
                     JOIN materials m ON cm.material_id = m.id 
                     WHERE cm.student_id = $1 AND m.topic_id = $2) AS completed_materials,
                    (SELECT COUNT(*)::integer FROM quizzes WHERE topic_id = $2) AS total_quizzes,
                    (SELECT COUNT(DISTINCT qa.quiz_id)::integer 
                     FROM quiz_attempts qa 
                     JOIN quizzes q ON qa.quiz_id = q.id 
                     WHERE qa.student_id = $1 AND q.topic_id = $2) AS attempted_quizzes
            ),
            computed AS (
                SELECT 
                    CASE 
                        WHEN (total_materials + total_quizzes) > 0 
                        THEN LEAST(100, GREATEST(0, ROUND(((completed_materials + attempted_quizzes)::numeric / (total_materials + total_quizzes)::numeric) * 100)))::integer
                        ELSE 0 
                    END AS completion_percentage
                FROM stats
            )
            INSERT INTO progress (student_id, topic_id, completion_percentage, last_studied_at)
            VALUES ($1, $2, (SELECT completion_percentage FROM computed), CURRENT_TIMESTAMP)
            ON CONFLICT (student_id, topic_id)
            DO UPDATE SET completion_percentage = EXCLUDED.completion_percentage,
                          last_studied_at = CURRENT_TIMESTAMP
            RETURNING completion_percentage;
        `;

        const res = await db.query(singleQuery, [studentId, topicId]);
        console.log('Progress SQL aggregation result:', res.rows[0]);

        console.log('\nTesting TA course student quiz aggregation query...');
        const courseRes = await db.query("SELECT id FROM courses LIMIT 1");
        const courseId = courseRes.rows[0].id;

        const studentStatsQuery = `
            SELECT 
                qa.student_id,
                ROUND(AVG(qa.score))::integer AS average_score,
                (ARRAY_AGG(qa.score ORDER BY qa.completed_at DESC))[1] AS recent_score,
                COUNT(qa.id)::integer AS attempts_count
            FROM quiz_attempts qa
            JOIN quizzes q ON qa.quiz_id = q.id
            JOIN topics t ON q.topic_id = t.id
            WHERE t.course_id = $1
            GROUP BY qa.student_id
        `;
        const statsRes = await db.query(studentStatsQuery, [courseId]);
        console.log(`Student overall quiz stats (${statsRes.rows.length} students):`, statsRes.rows.slice(0, 3));

        const topicStatsQuery = `
            SELECT 
                qa.student_id,
                q.topic_id,
                ROUND(AVG(qa.score))::integer AS topic_avg,
                (ARRAY_AGG(qa.score ORDER BY qa.completed_at DESC))[1] AS topic_recent
            FROM quiz_attempts qa
            JOIN quizzes q ON qa.quiz_id = q.id
            JOIN topics t ON q.topic_id = t.id
            WHERE t.course_id = $1
            GROUP BY qa.student_id, q.topic_id
        `;
        const topicStatsRes = await db.query(topicStatsQuery, [courseId]);
        console.log(`Student topic quiz stats (${topicStatsRes.rows.length} rows):`, topicStatsRes.rows.slice(0, 3));

        console.log('\nTesting quiz attempts running average in quiz submission...');
        const quizRes = await db.query("SELECT id FROM quizzes LIMIT 1");
        const quizId = quizRes.rows[0].id;

        const avgQuery = `
            SELECT 
                ROUND(AVG(score))::integer AS average_score,
                COUNT(id)::integer AS attempts_count
            FROM quiz_attempts 
            WHERE student_id = $1 AND quiz_id = $2
        `;
        const avgRes = await db.query(avgQuery, [studentId, quizId]);
        console.log('Quiz running average SQL aggregation result:', avgRes.rows[0]);

        console.log('\nAll aggregation tests succeeded!');
        process.exit(0);
    } catch (err) {
        console.error('Test Step 4 error:', err);
        process.exit(1);
    }
}

testStep4();
