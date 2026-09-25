const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/db');

async function runMigration() {
    console.log('Running migration for Quiz is_active and TA REMOVED status...');
    try {
        // 1. Add is_active column to quizzes
        await db.query(`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;`);
        await db.query(`UPDATE quizzes SET is_active = true WHERE is_active IS NULL;`);
        console.log('✔ Added is_active column to quizzes table');

        // 2. Update ta_applications status enum
        try {
            await db.query(`ALTER TYPE ta_application_status ADD VALUE IF NOT EXISTS 'REMOVED';`);
            console.log("✔ Added 'REMOVED' to ta_application_status enum");
        } catch (e) {
            console.log('Note on enum update:', e.message);
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
