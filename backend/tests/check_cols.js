require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../config/db');

async function checkCols() {
    const c = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'courses'");
    console.log('courses:', c.rows.map(x => x.column_name));
    const m = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'materials'");
    console.log('materials:', m.rows.map(x => x.column_name));
    process.exit(0);
}

checkCols();
