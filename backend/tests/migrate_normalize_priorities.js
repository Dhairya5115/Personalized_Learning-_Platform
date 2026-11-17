const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/db');

async function runMigration() {
    console.log('--- One-time Migration: Normalize Topic Priorities to Contiguous 1..N ---');
    try {
        const sql = `
            WITH ranked_topics AS (
                SELECT 
                    id,
                    ROW_NUMBER() OVER (
                        PARTITION BY course_id 
                        ORDER BY sequence_order ASC, created_at ASC, id ASC
                    ) AS new_priority
                FROM topics
            )
            UPDATE topics t
            SET sequence_order = rt.new_priority
            FROM ranked_topics rt
            WHERE t.id = rt.id AND t.sequence_order != rt.new_priority
            RETURNING t.id, t.course_id, t.sequence_order;
        `;
        const res = await db.query(sql);
        console.log(`✔ Normalized topic priorities across all courses. Updated ${res.rowCount} row(s).`);

        // Ensure composite index exists
        await db.query(`CREATE INDEX IF NOT EXISTS idx_topics_course_seq ON topics(course_id, sequence_order);`);
        console.log('✔ Verified composite index idx_topics_course_seq on topics(course_id, sequence_order).');

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigration();

