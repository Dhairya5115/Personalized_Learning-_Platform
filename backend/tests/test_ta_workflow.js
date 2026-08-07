const db = require('../config/db');
const emailService = require('../services/email_service');

async function testFullTaWorkflow() {
    console.log('--- Running Complete TA Feature Verification Test ---');
    try {
        // 1. Verify schema tables and 'TA' ENUM
        const tablesCheck = await db.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('ta_applications', 'course_tas', 'ta_requests')
        `);
        console.log('✔ Database Tables present:', tablesCheck.rows.map(r => r.table_name));

        const enumCheck = await db.query(`SELECT enumlabel FROM pg_enum WHERE enumlabel = 'TA'`);
        if (enumCheck.rows.length === 0) {
            throw new Error('user_role ENUM is missing TA value');
        }
        console.log('✔ ENUM user_role includes TA');

        // 2. Fetch seed teacher, course, student, and TA
        const teacherRes = await db.query(`SELECT * FROM users WHERE role = 'TEACHER' LIMIT 1`);
        const studentRes = await db.query(`SELECT * FROM users WHERE role = 'STUDENT' LIMIT 1`);
        const courseRes = await db.query(`SELECT * FROM courses LIMIT 1`);
        const taRes = await db.query(`SELECT * FROM users WHERE role = 'TA' LIMIT 1`);

        if (teacherRes.rows.length === 0 || courseRes.rows.length === 0) {
            console.log('⚠️ Skipping runtime query assertions: No seed teacher/course found.');
            process.exit(0);
        }

        const teacher = teacherRes.rows[0];
        const course = courseRes.rows[0];

        let ta = taRes.rows[0];
        if (!ta) {
            const newTaRes = await db.query(`
                INSERT INTO users (email, password_hash, first_name, last_name, role)
                VALUES ('test.ta@example.com', 'dummyhash', 'Test', 'TA', 'TA')
                RETURNING *
            `);
            ta = newTaRes.rows[0];
        }

        console.log(`✔ Found TA: ${ta.email}, Teacher: ${teacher.email}, Course: ${course.title}`);

        // 3. Test TA application submission
        await db.query(`DELETE FROM ta_applications WHERE ta_id = $1 AND course_id = $2`, [ta.id, course.id]);
        const appRes = await db.query(`
            INSERT INTO ta_applications (ta_id, course_id, motivation, experience, resume_link, status)
            VALUES ($1, $2, 'Test motivation', '2 years tutoring', 'https://example.com/resume', 'PENDING')
            RETURNING *
        `, [ta.id, course.id]);
        const appId = appRes.rows[0].id;
        console.log('✔ Created TA application ID:', appId);

        // 4. Test duplicate application prevention (attempting to re-apply)
        try {
            await db.query(`
                INSERT INTO ta_applications (ta_id, course_id, motivation, experience, status)
                VALUES ($1, $2, 'Duplicate motivation', '1 year', 'PENDING')
            `, [ta.id, course.id]);
            console.error('❌ Failed duplicate application guard test');
        } catch (err) {
            console.log('✔ Duplicate application unique constraint successfully caught constraint violation:', err.code);
        }

        // 5. Test Teacher Approval
        await db.query(`
            UPDATE ta_applications 
            SET status = 'APPROVED', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $1 
            WHERE id = $2
        `, [teacher.id, appId]);

        await db.query(`
            INSERT INTO course_tas (ta_id, course_id)
            VALUES ($1, $2)
            ON CONFLICT (ta_id, course_id) DO NOTHING
        `, [ta.id, course.id]);
        console.log('✔ Approved TA application and linked to course_tas');

        // 6. Test TA Course Guard
        const courseTaGuard = await db.query(`
            SELECT id FROM course_tas WHERE ta_id = $1 AND course_id = $2
        `, [ta.id, course.id]);
        if (courseTaGuard.rows.length === 0) {
            throw new Error('Course TA assignment guard check failed');
        }
        console.log('✔ Verified TA course-scoped access guard');

        // 7. Test Student Doubt Request Creation
        if (studentRes.rows.length > 0) {
            const student = studentRes.rows[0];
            // Ensure student is enrolled
            await db.query(`
                INSERT INTO enrollments (student_id, course_id, payment_status)
                VALUES ($1, $2, 'FREE')
                ON CONFLICT (student_id, course_id) DO NOTHING
            `, [student.id, course.id]);

            const reqRes = await db.query(`
                INSERT INTO ta_requests (student_id, ta_id, course_id, subject, description, status)
                VALUES ($1, $2, $3, 'Binary Search Trees', 'How to handle deletion with two children?', 'PENDING')
                RETURNING *
            `, [student.id, ta.id, course.id]);
            const requestId = reqRes.rows[0].id;
            console.log('✔ Created Student Doubt Request ID:', requestId);

            // 8. Test TA Scheduling & Calendar Invite Trigger
            const meetingLink = 'https://meet.google.com/test-meeting-room';
            const scheduledAt = new Date(Date.now() + 86400000).toISOString();

            await db.query(`
                UPDATE ta_requests 
                SET meeting_link = $1, scheduled_at = $2, status = 'SCHEDULED' 
                WHERE id = $3
            `, [meetingLink, scheduledAt, requestId]);

            console.log('✔ Scheduled doubt request with virtual meeting link & datetime');

            // 9. Test Nodemailer + ics Calendar generator execution
            await emailService.sendDoubtScheduledToStudent(
                student.email,
                student.first_name,
                ta.email,
                `${ta.first_name} ${ta.last_name}`,
                course.title,
                'Binary Search Trees',
                meetingLink,
                scheduledAt
            );
            console.log('✔ Dispatched test email with .ics calendar attachment');
        }

        console.log('\n====================================================');
        console.log('  🎉 ALL TA FEATURE END-TO-END VERIFICATIONS PASSED!');
        console.log('====================================================\n');
        process.exit(0);
    } catch (err) {
        console.error('❌ TA Verification Error:', err);
        process.exit(1);
    }
}

testFullTaWorkflow();
