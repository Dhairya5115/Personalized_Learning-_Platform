const db = require('../config/db');

async function run() {
    try {
        const res = await db.query('SELECT * FROM materials ORDER BY created_at DESC LIMIT 5');
        console.log('Latest materials:');
        res.rows.forEach(row => {
            console.log(`ID: ${row.id}`);
            console.log(`Title: ${row.title}`);
            console.log(`Type: ${row.type}`);
            console.log(`URL: ${row.file_url}`);
            console.log('-------------------------------------------');
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
