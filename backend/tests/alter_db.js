const db = require('../config/db');

async function run() {
    try {
        console.log('Running schema update alterations on database...');
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);`);
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP WITH TIME ZONE;`);
        await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;`);
        await db.query(`ALTER TABLE materials ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 0.00;`);
        await db.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES materials(id) ON DELETE CASCADE;`);
        console.log('Database alterations complete!');
        process.exit(0);
    } catch (err) {
        console.error('Alteration error:', err.stack || err.message);
        process.exit(1);
    }
}

run();
