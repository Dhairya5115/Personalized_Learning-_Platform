const db = require('../config/db');

async function run() {
    try {
        const res = await db.query('SELECT email, role FROM users');
        console.log('Database Users:');
        console.log(res.rows);
    } catch (err) {
        console.error('Error querying users:', err);
    } finally {
        db.pool.end();
    }
}

run();
