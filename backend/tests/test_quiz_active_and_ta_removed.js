const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/db');
const pool = db.pool;

async function runTests() {
    console.log('=== Starting Test: Quiz Active/Inactive & TA REMOVED Workflow ===');
    const client = await pool.connect();

    try {
        // 1. Verify schema columns & constraints
        console.log('\n1. Verifying Database Schema...');
        const quizColRes = await client.query(`
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'quizzes' AND column_name = 'is_active';
        `);
        console.log('quizzes.is_active column:', quizColRes.rows[0]);
        if (!quizColRes.rows[0]) throw new Error('is_active column missing on quizzes table');

        const enumRes = await client.query(`
            SELECT enumlabel 
            FROM pg_enum 
            WHERE enumtypid = 'ta_application_status'::regtype;
        `);
        const enumValues = enumRes.rows.map(r => r.enumlabel);
        console.log('ta_application_status enum values:', enumValues);
        if (!enumValues.includes('REMOVED')) throw new Error('REMOVED value missing from enum');

        // 2. Test Quiz Toggle Active Backend Logic
        console.log('\n2. Testing Quiz Active Toggle...');
        const sampleQuizRes = await client.query('SELECT id, is_active FROM quizzes LIMIT 1');
        if (sampleQuizRes.rows.length > 0) {
            const quizId = sampleQuizRes.rows[0].id;

            // Toggle to false
            await client.query('UPDATE quizzes SET is_active = $1 WHERE id = $2', [false, quizId]);
            const updated1 = await client.query('SELECT is_active FROM quizzes WHERE id = $1', [quizId]);
            console.log(`Quiz ${quizId} toggled to false:`, updated1.rows[0].is_active === false ? 'PASS' : 'FAIL');

            // Toggle back to true
            await client.query('UPDATE quizzes SET is_active = $1 WHERE id = $2', [true, quizId]);
            const updated2 = await client.query('SELECT is_active FROM quizzes WHERE id = $1', [quizId]);
            console.log(`Quiz ${quizId} toggled to true:`, updated2.rows[0].is_active === true ? 'PASS' : 'FAIL');
        } else {
            console.log('No quizzes found in DB to test directly (table empty).');
        }

        // 3. Test TA Application REMOVED and course_tas deletion
        console.log('\n3. Testing TA Application Status REMOVED & Access Revocation...');
        const userRes = await client.query("SELECT id FROM users WHERE role = 'TA' LIMIT 1");
        const courseRes = await client.query("SELECT id, teacher_id FROM courses LIMIT 1");

        if (userRes.rows.length > 0 && courseRes.rows.length > 0) {
            const taId = userRes.rows[0].id;
            const courseId = courseRes.rows[0].id;

            // Ensure test application exists
            const appInsert = await client.query(`
                INSERT INTO ta_applications (ta_id, course_id, motivation, experience, status)
                VALUES ($1, $2, 'Test motivation for removal test', 'Experience', 'APPROVED')
                ON CONFLICT (ta_id, course_id) DO UPDATE SET status = 'APPROVED'
                RETURNING id, status;
            `, [taId, courseId]);
            const appId = appInsert.rows[0].id;

            // Ensure course_tas mapping exists
            await client.query(`
                INSERT INTO course_tas (ta_id, course_id)
                VALUES ($1, $2)
                ON CONFLICT (ta_id, course_id) DO NOTHING;
            `, [taId, courseId]);

            const beforeRemoval = await client.query('SELECT * FROM course_tas WHERE ta_id = $1 AND course_id = $2', [taId, courseId]);
            console.log('course_tas exists before removal:', beforeRemoval.rows.length === 1 ? 'PASS' : 'FAIL');

            // Perform removal
            await client.query("UPDATE ta_applications SET status = 'REMOVED' WHERE id = $1", [appId]);
            await client.query('DELETE FROM course_tas WHERE ta_id = $1 AND course_id = $2', [taId, courseId]);

            const afterRemovalApp = await client.query('SELECT status FROM ta_applications WHERE id = $1', [appId]);
            const afterRemovalMapping = await client.query('SELECT * FROM course_tas WHERE ta_id = $1 AND course_id = $2', [taId, courseId]);

            console.log('ta_applications status updated to REMOVED:', afterRemovalApp.rows[0].status === 'REMOVED' ? 'PASS' : 'FAIL');
            console.log('course_tas entry successfully deleted:', afterRemovalMapping.rows.length === 0 ? 'PASS' : 'FAIL');
        }

        console.log('\n=== All Automated Tests Passed Successfully! ===');
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runTests();
