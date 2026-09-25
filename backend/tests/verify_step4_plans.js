require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../config/db');

async function runStep4Plans() {
    try {
        console.log('=== Benchmarking Step 4: Push Aggregation into SQL ===\n');

        const courseRes = await db.query('SELECT id FROM courses LIMIT 1');
        const courseId = courseRes.rows[0].id;
        const studentRes = await db.query("SELECT id FROM users WHERE role = 'STUDENT' LIMIT 1");
        const studentId = studentRes.rows[0].id;
        const topicRes = await db.query('SELECT id FROM topics LIMIT 1');
        const topicId = topicRes.rows[0].id;
        const quizRes = await db.query('SELECT id FROM quizzes LIMIT 1');
        const quizId = quizRes.rows[0].id;

        // 1. TA Controller: Raw rows fetch (BEFORE)
        console.log('1. TA CONTROLLER - BEFORE (Fetching raw unaggregated historical rows):');
        const beforeTaExplain = await db.query(`
            EXPLAIN (ANALYZE, BUFFERS)
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
            ORDER BY qa.completed_at ASC
        `, [courseId]);
        console.log(beforeTaExplain.rows.map(r => r['QUERY PLAN']).join('\n'));
        console.log('\n----------------------------------------------------\n');

        // 2. TA Controller: SQL Aggregated (AFTER)
        console.log('2. TA CONTROLLER - AFTER (Pushing AVG, recent score array_agg, and COUNT into PostgreSQL):');
        const afterTaExplain = await db.query(`
            EXPLAIN (ANALYZE, BUFFERS)
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
        `, [courseId]);
        console.log(afterTaExplain.rows.map(r => r['QUERY PLAN']).join('\n'));
        console.log('\n----------------------------------------------------\n');

        // 3. Quiz Engine Running Average: Raw fetch (BEFORE)
        console.log('3. QUIZ SUBMISSION - BEFORE (Fetching raw scores for JS reduce):');
        const beforeQuizAvgExplain = await db.query(`
            EXPLAIN (ANALYZE, BUFFERS)
            SELECT score FROM quiz_attempts WHERE student_id = $1 AND quiz_id = $2 ORDER BY completed_at ASC
        `, [studentId, quizId]);
        console.log(beforeQuizAvgExplain.rows.map(r => r['QUERY PLAN']).join('\n'));
        console.log('\n----------------------------------------------------\n');

        // 4. Quiz Engine Running Average: SQL Aggregated (AFTER)
        console.log('4. QUIZ SUBMISSION - AFTER (Pushing AVG & COUNT into PostgreSQL):');
        const afterQuizAvgExplain = await db.query(`
            EXPLAIN (ANALYZE, BUFFERS)
            SELECT ROUND(AVG(score))::integer AS average_score, COUNT(id)::integer AS attempts_count 
            FROM quiz_attempts 
            WHERE student_id = $1 AND quiz_id = $2
        `, [studentId, quizId]);
        console.log(afterQuizAvgExplain.rows.map(r => r['QUERY PLAN']).join('\n'));
        console.log('\n----------------------------------------------------\n');

        // 5. Progress Recalculation: Atomic CTE + Aggregation (AFTER)
        console.log('5. PROGRESS RECALCULATION - AFTER (Single atomic CTE query with counts + math + upsert):');
        const progressExplain = await db.query(`
            EXPLAIN (ANALYZE, BUFFERS)
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
        `, [studentId, topicId]);
        console.log(progressExplain.rows.map(r => r['QUERY PLAN']).join('\n'));

        process.exit(0);
    } catch (err) {
        console.error('Error running Step 4 plans:', err);
        process.exit(1);
    }
}

runStep4Plans();
