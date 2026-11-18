const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const localPool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:post5115@localhost:5432/personalized_learning_platform',
    ssl: false
});

// Tables in dependency order
const tables = [
    'users',
    'courses',
    'enrollments',
    'payments',
    'topics',
    'materials',
    'quizzes',
    'questions',
    'quiz_attempts',
    'question_responses',
    'progress',
    'completed_materials',
    'study_plans',
    'spaced_repetition',
    'achievements',
    'user_achievements',
    'notifications',
    'ta_applications',
    'course_tas',
    'ta_requests'
];

function escapeSqlVal(val) {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    if (typeof val === 'number') return val.toString();
    if (val instanceof Date) return `'${val.toISOString()}'`;
    if (typeof val === 'object') {
        const jsonStr = JSON.stringify(val).replace(/'/g, "''");
        return `'${jsonStr}'::jsonb`;
    }
    const escaped = val.toString().replace(/'/g, "''");
    return `'${escaped}'`;
}

async function exportData() {
    console.log('--- Exporting Local TailorLearn Database to SQL File ---');
    const client = await localPool.connect();
    let sqlOutput = `-- TailorLearn Local Database Dump for Neon Import\n`;
    sqlOutput += `-- Generated on ${new Date().toISOString()}\n\n`;
    sqlOutput += `BEGIN;\n\n`;
    sqlOutput += `-- 1. Ensure any recently added columns and updated constraints exist before inserting\n`;
    sqlOutput += `ALTER TABLE materials ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;\n`;
    sqlOutput += `ALTER TABLE materials ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 0.00;\n`;
    sqlOutput += `ALTER TABLE payments ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES materials(id) ON DELETE CASCADE;\n`;
    sqlOutput += `ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;\n\n`;
    sqlOutput += `-- TA Applications columns and status constraint\n`;
    sqlOutput += `ALTER TABLE ta_applications ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;\n`;
    sqlOutput += `ALTER TABLE ta_applications ADD COLUMN IF NOT EXISTS availability TEXT;\n`;
    sqlOutput += `ALTER TABLE ta_applications DROP CONSTRAINT IF EXISTS ta_applications_status_check;\n`;
    sqlOutput += `ALTER TABLE ta_applications ADD CONSTRAINT ta_applications_status_check CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REMOVED'));\n\n`;

    let totalRows = 0;

    try {
        for (const table of tables) {
            try {
                const res = await client.query(`SELECT * FROM ${table}`);
                if (res.rows.length === 0) continue;

                console.log(`Exporting table: ${table} (${res.rows.length} rows)...`);
                totalRows += res.rows.length;

                const columns = res.fields.map(f => `"${f.name}"`).join(', ');

                sqlOutput += `-- Table: ${table} (${res.rows.length} rows)\n`;
                for (const row of res.rows) {
                    const values = res.fields.map(f => escapeSqlVal(row[f.name])).join(', ');
                    sqlOutput += `INSERT INTO ${table} (${columns}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
                }
                sqlOutput += `\n`;
            } catch (err) {
                console.warn(`Skipping table ${table}: ${err.message}`);
            }
        }

        sqlOutput += `COMMIT;\n`;

        const outputPath = path.join(__dirname, '../database/transfer_to_neon.sql');
        fs.writeFileSync(outputPath, sqlOutput, 'utf8');

        console.log(`\n✔ Successfully exported ${totalRows} row(s) to: database/transfer_to_neon.sql`);
        console.log(`\nNext step: Open database/transfer_to_neon.sql, copy all text, and paste it into Neon SQL Editor!`);
    } catch (err) {
        console.error('Export failed:', err.message);
    } finally {
        client.release();
        await localPool.end();
    }
}

exportData();

