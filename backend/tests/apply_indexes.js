require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../config/db');

async function applyIndexes() {
    console.log('=== Applying Performance Indexes ===\n');

    const indexStatements = [
        // 1. question_responses foreign key to attempt_id
        {
            name: 'idx_question_responses_attempt',
            sql: 'CREATE INDEX IF NOT EXISTS idx_question_responses_attempt ON question_responses(attempt_id);'
        },
        // 2. courses teacher_id foreign key
        {
            name: 'idx_courses_teacher',
            sql: 'CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id);'
        },
        // 3. enrollments course_id foreign key (existing unique is on student_id, course_id)
        {
            name: 'idx_enrollments_course',
            sql: 'CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);'
        },
        // 4. topics course_id and sequence_order
        {
            name: 'idx_topics_course_seq',
            sql: 'CREATE INDEX IF NOT EXISTS idx_topics_course_seq ON topics(course_id, sequence_order);'
        },
        // 5. quizzes topic_id foreign key
        {
            name: 'idx_quizzes_topic',
            sql: 'CREATE INDEX IF NOT EXISTS idx_quizzes_topic ON quizzes(topic_id);'
        },
        // 6. quiz_attempts composite on quiz_id, student_id
        {
            name: 'idx_quiz_attempts_quiz_student',
            sql: 'CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_student ON quiz_attempts(quiz_id, student_id);'
        },
        // 7. quiz_attempts student_id, completed_at for recent attempt sorting
        {
            name: 'idx_quiz_attempts_student_completed',
            sql: 'CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_completed ON quiz_attempts(student_id, completed_at DESC);'
        },
        // 8. users role and xp_points DESC for Leaderboard ranking
        {
            name: 'idx_users_student_xp',
            sql: 'CREATE INDEX IF NOT EXISTS idx_users_student_xp ON users(role, xp_points DESC);'
        },
        // 9. ta_requests composite on ta_id and status
        {
            name: 'idx_ta_requests_ta_status',
            sql: 'CREATE INDEX IF NOT EXISTS idx_ta_requests_ta_status ON ta_requests(ta_id, status);'
        }
    ];

    for (const stmt of indexStatements) {
        process.stdout.write(`Creating index ${stmt.name}... `);
        await db.query(stmt.sql);
        console.log('DONE');
    }

    console.log('\n=== Verifying newly added indexes in PostgreSQL ===');
    const verifyRes = await db.query(`
        SELECT tablename, indexname, indexdef 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
          AND indexname IN (${indexStatements.map(s => `'${s.name}'`).join(', ')})
        ORDER BY tablename, indexname;
    `);
    console.log(verifyRes.rows);

    process.exit(0);
}

applyIndexes().catch(err => {
    console.error('Error applying indexes:', err);
    process.exit(1);
});
