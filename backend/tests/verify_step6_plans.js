require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../config/db');

async function runStep6Plans() {
    try {
        console.log('=== Benchmarking Step 6: Select Only What Is Needed ===\n');

        // 1. Courses List: SELECT c.* vs Explicit Columns
        console.log('1. COURSES - BEFORE (SELECT c.* with all columns wildcard):');
        const beforeCoursesExplain = await db.query(`
            EXPLAIN (ANALYZE, BUFFERS)
            SELECT c.*, u.first_name as teacher_first_name, u.last_name as teacher_last_name
            FROM courses c
            LEFT JOIN users u ON c.teacher_id = u.id
            ORDER BY c.created_at DESC
            LIMIT 50 OFFSET 0
        `);
        console.log(beforeCoursesExplain.rows.map(r => r['QUERY PLAN']).join('\n'));
        console.log('\n----------------------------------------------------\n');

        console.log('2. COURSES - AFTER (Explicit columns without wildcard projection):');
        const afterCoursesExplain = await db.query(`
            EXPLAIN (ANALYZE, BUFFERS)
            SELECT c.id, c.teacher_id, c.title, c.description, c.price, c.created_at,
                   u.first_name as teacher_first_name, u.last_name as teacher_last_name
            FROM courses c
            LEFT JOIN users u ON c.teacher_id = u.id
            ORDER BY c.created_at DESC
            LIMIT 50 OFFSET 0
        `);
        console.log(afterCoursesExplain.rows.map(r => r['QUERY PLAN']).join('\n'));
        console.log('\n----------------------------------------------------\n');

        // 2. Quiz Questions: SELECT * vs Explicit columns
        const quizRes = await db.query('SELECT id FROM quizzes LIMIT 1');
        const quizId = quizRes.rows[0].id;

        console.log('3. QUIZ QUESTIONS - BEFORE (SELECT *):');
        const beforeQExplain = await db.query(`
            EXPLAIN (ANALYZE, BUFFERS)
            SELECT * FROM questions WHERE quiz_id = $1 ORDER BY difficulty DESC, created_at ASC
        `, [quizId]);
        console.log(beforeQExplain.rows.map(r => r['QUERY PLAN']).join('\n'));
        console.log('\n----------------------------------------------------\n');

        console.log('4. QUIZ QUESTIONS - AFTER (Explicit columns):');
        const afterQExplain = await db.query(`
            EXPLAIN (ANALYZE, BUFFERS)
            SELECT id, quiz_id, content, options, correct_option_id, difficulty, created_at 
            FROM questions 
            WHERE quiz_id = $1 
            ORDER BY difficulty DESC, created_at ASC
        `, [quizId]);
        console.log(afterQExplain.rows.map(r => r['QUERY PLAN']).join('\n'));
        console.log('\n----------------------------------------------------\n');

        // 3. Index-Only Scan verification on ta_requests
        const taRes = await db.query("SELECT id FROM users WHERE role = 'TA' LIMIT 1");
        const taId = taRes.rows[0].id;

        console.log('5. INDEX ONLY SCAN VERIFICATION (ta_requests by ta_id & status using idx_ta_requests_ta_status):');
        const indexOnlyExplain = await db.query(`
            EXPLAIN (ANALYZE, BUFFERS)
            SELECT COUNT(*) FROM ta_requests WHERE ta_id = $1 AND status = 'PENDING'
        `, [taId]);
        console.log(indexOnlyExplain.rows.map(r => r['QUERY PLAN']).join('\n'));

        process.exit(0);
    } catch (err) {
        console.error('Error running Step 6 plans:', err);
        process.exit(1);
    }
}

runStep6Plans();
