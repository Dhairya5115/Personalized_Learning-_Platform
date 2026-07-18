const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function run() {
    try {
        const salt = await bcrypt.genSalt(12);
        const hash = await bcrypt.hash('password123', salt);
        await db.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, 'dnshah5115@gmail.com']);
        console.log('Successfully set student dnshah5115@gmail.com password to password123');
    } catch(err) {
        console.error(err);
    } finally {
        db.pool.end();
    }
}
run();
