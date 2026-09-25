require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../config/db');

async function audit() {
    console.log('=== Checking Existing Indexes in PostgreSQL ===');
    const idxRes = await db.query(`
        SELECT tablename, indexname, indexdef 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        ORDER BY tablename, indexname;
    `);
    console.log(idxRes.rows);

    console.log('\n=== Checking Table Row Counts ===');
    const tables = [
        'users', 'courses', 'enrollments', 'materials', 'topics',
        'quizzes', 'questions', 'quiz_attempts', 'question_responses',
        'progress', 'ta_applications', 'course_tas', 'ta_requests',
        'notifications', 'spaced_repetition'
    ];
    for (const t of tables) {
        try {
            const countRes = await db.query(`SELECT COUNT(*) as count FROM ${t}`);
            console.log(`${t.padEnd(20)}: ${countRes.rows[0].count} rows`);
        } catch (e) {
            console.log(`${t.padEnd(20)}: (table does not exist or error: ${e.message})`);
        }
    }

    process.exit(0);
}

audit().catch(err => {
    console.error(err);
    process.exit(1);
});
