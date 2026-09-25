require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../config/db');

async function runStep5Plans() {
    try {
        console.log('=== Benchmarking Step 5: Pagination & Limiting ===\n');

        // 1. Courses List: Unbounded vs Bounded (LIMIT 50)
        console.log('1. COURSES LIST - WITHOUT LIMIT (Unbounded):');
        const p1Without = await db.query(`
            EXPLAIN (ANALYZE, BUFFERS)
            SELECT c.*, u.first_name as teacher_first_name, u.last_name as teacher_last_name
            FROM courses c
            LEFT JOIN users u ON c.teacher_id = u.id
            ORDER BY c.created_at DESC
        `);
        console.log(p1Without.rows.map(r => r['QUERY PLAN']).join('\n'));
        console.log('\n----------------------------------------------------\n');

        console.log('2. COURSES LIST - WITH LIMIT (Bounded LIMIT 50 OFFSET 0):');
        const p1With = await db.query(`
            EXPLAIN (ANALYZE, BUFFERS)
            SELECT c.*, u.first_name as teacher_first_name, u.last_name as teacher_last_name
            FROM courses c
            LEFT JOIN users u ON c.teacher_id = u.id
            ORDER BY c.created_at DESC
            LIMIT 50 OFFSET 0
        `);
        console.log(p1With.rows.map(r => r['QUERY PLAN']).join('\n'));
        console.log('\n----------------------------------------------------\n');

        // 2. TA Applications: Unbounded vs Bounded
        const teacherRes = await db.query("SELECT id FROM users WHERE role = 'TEACHER' LIMIT 1");
        const teacherId = teacherRes.rows[0].id;

        console.log('3. TA APPLICATIONS - WITHOUT LIMIT:');
        const p2Without = await db.query(`
            EXPLAIN (ANALYZE, BUFFERS)
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
            ORDER BY a.created_at DESC
        `, [teacherId]);
        console.log(p2Without.rows.map(r => r['QUERY PLAN']).join('\n'));
        console.log('\n----------------------------------------------------\n');

        console.log('4. TA APPLICATIONS - WITH LIMIT 50 OFFSET 0:');
        const p2With = await db.query(`
            EXPLAIN (ANALYZE, BUFFERS)
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
            ORDER BY a.created_at DESC
            LIMIT 50 OFFSET 0
        `, [teacherId]);
        console.log(p2With.rows.map(r => r['QUERY PLAN']).join('\n'));

        process.exit(0);
    } catch (err) {
        console.error('Error running Step 5 plans:', err);
        process.exit(1);
    }
}

runStep5Plans();
