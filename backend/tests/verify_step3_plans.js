require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../config/db');

async function runStep3Verify() {
    try {
        console.log('--- Benchmarking Step 3: N+1 Elimination ---\n');

        // Fetch sample questions
        const sampleQuestions = await db.query('SELECT id FROM questions LIMIT 10');
        const questionIds = sampleQuestions.rows.map(r => r.id);

        if (questionIds.length === 0) {
            console.log('No questions found to benchmark.');
            process.exit(0);
        }

        console.log(`Testing with N = ${questionIds.length} questions:\n`);

        // 1. Single Question Query (Old loop query)
        const singleExplain = await db.query(
            'EXPLAIN (ANALYZE, BUFFERS) SELECT correct_option_id, difficulty, content, options FROM questions WHERE id = $1',
            [questionIds[0]]
        );
        console.log('1. OLD LOOP QUERY (Executed N times in loop):');
        console.log('Query: SELECT correct_option_id, difficulty, content, options FROM questions WHERE id = $1');
        console.log(singleExplain.rows.map(r => r['QUERY PLAN']).join('\n'));
        console.log('\n----------------------------------------------------\n');

        // 2. Batched ANY($1) Query (New single query)
        const batchExplain = await db.query(
            'EXPLAIN (ANALYZE, BUFFERS) SELECT id, correct_option_id, difficulty, content, options FROM questions WHERE id = ANY($1)',
            [questionIds]
        );
        console.log('2. NEW BATCHED QUERY (Executed once):');
        console.log('Query: SELECT id, correct_option_id, difficulty, content, options FROM questions WHERE id = ANY($1)');
        console.log(batchExplain.rows.map(r => r['QUERY PLAN']).join('\n'));
        console.log('\n----------------------------------------------------\n');

        // 3. User Achievements: Old loop check vs New pre-fetch
        const sampleStudent = await db.query("SELECT id FROM users WHERE role = 'STUDENT' LIMIT 1");
        const studentId = sampleStudent.rows[0].id;
        const sampleAch = await db.query('SELECT id FROM achievements LIMIT 1');
        const achId = sampleAch.rows[0]?.id;

        if (achId) {
            const oldAchExplain = await db.query(
                'EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM user_achievements WHERE student_id = $1 AND achievement_id = $2',
                [studentId, achId]
            );
            console.log('3. ACHIEVEMENTS - OLD LOOP CHECK (Executed inside loop per achievement):');
            console.log('Query: SELECT id FROM user_achievements WHERE student_id = $1 AND achievement_id = $2');
            console.log(oldAchExplain.rows.map(r => r['QUERY PLAN']).join('\n'));
            console.log('\n----------------------------------------------------\n');

            const newAchExplain = await db.query(
                'EXPLAIN (ANALYZE, BUFFERS) SELECT achievement_id FROM user_achievements WHERE student_id = $1',
                [studentId]
            );
            console.log('4. ACHIEVEMENTS - NEW PRE-FETCH (Executed once):');
            console.log('Query: SELECT achievement_id FROM user_achievements WHERE student_id = $1');
            console.log(newAchExplain.rows.map(r => r['QUERY PLAN']).join('\n'));
        }

        process.exit(0);
    } catch (err) {
        console.error('Error running Step 3 verification:', err.message);
        process.exit(1);
    }
}

runStep3Verify();
