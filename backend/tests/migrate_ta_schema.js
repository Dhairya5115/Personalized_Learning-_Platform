const db = require('../config/db');

async function runMigration() {
    console.log('Running TA schema migration on PostgreSQL database...');
    try {
        // 1. Add 'TA' to user_role ENUM if not already present
        await db.query(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'TA';`);

        // 2. Create ta_applications table if not exists
        await db.query(`
            CREATE TABLE IF NOT EXISTS ta_applications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                ta_id UUID REFERENCES users(id) ON DELETE CASCADE,
                course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
                motivation TEXT,
                experience TEXT,
                resume_link TEXT,
                status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                reviewed_at TIMESTAMP WITH TIME ZONE,
                reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL
            );
        `);

        // Ensure columns exist on ta_applications
        await db.query(`ALTER TABLE ta_applications ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);`);
        await db.query(`ALTER TABLE ta_applications ADD COLUMN IF NOT EXISTS contact VARCHAR(50);`);
        await db.query(`ALTER TABLE ta_applications ADD COLUMN IF NOT EXISTS qualification VARCHAR(255);`);
        await db.query(`ALTER TABLE ta_applications ADD COLUMN IF NOT EXISTS motivation TEXT;`);
        await db.query(`ALTER TABLE ta_applications ADD COLUMN IF NOT EXISTS experience TEXT;`);
        await db.query(`ALTER TABLE ta_applications ADD COLUMN IF NOT EXISTS resume_link TEXT;`);
        await db.query(`ALTER TABLE ta_applications ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING';`);
        await db.query(`ALTER TABLE ta_applications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`);
        await db.query(`ALTER TABLE ta_applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;`);
        await db.query(`ALTER TABLE ta_applications ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;`);

        await db.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_ta_applications_active 
            ON ta_applications(ta_id, course_id) 
            WHERE status IN ('PENDING', 'APPROVED');
        `);

        // 3. Create course_tas table
        await db.query(`
            CREATE TABLE IF NOT EXISTS course_tas (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                ta_id UUID REFERENCES users(id) ON DELETE CASCADE,
                course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
                assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(ta_id, course_id)
            );
        `);

        // 4. Create ta_requests table
        await db.query(`
            CREATE TABLE IF NOT EXISTS ta_requests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                student_id UUID REFERENCES users(id) ON DELETE CASCADE,
                ta_id UUID REFERENCES users(id) ON DELETE CASCADE,
                course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
                subject TEXT NOT NULL,
                description TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SCHEDULED', 'RESOLVED', 'DECLINED')),
                meeting_link TEXT,
                scheduled_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 5. Create indexes
        await db.query(`CREATE INDEX IF NOT EXISTS idx_ta_applications_ta ON ta_applications(ta_id);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_ta_applications_course ON ta_applications(course_id);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_course_tas_ta ON course_tas(ta_id);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_course_tas_course ON course_tas(course_id);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_ta_requests_ta ON ta_requests(ta_id);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_ta_requests_student ON ta_requests(student_id);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_ta_requests_course ON ta_requests(course_id);`);

        console.log('TA schema migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
}

runMigration();
