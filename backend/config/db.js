const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const isRemoteDb = process.env.DATABASE_URL && 
    !process.env.DATABASE_URL.includes('localhost') && 
    !process.env.DATABASE_URL.includes('127.0.0.1');

// Clean connection string (strip unsupported channel_binding param from Neon URLs)
let dbUrl = process.env.DATABASE_URL || '';
dbUrl = dbUrl.replace(/[?&]channel_binding=[^&]+/g, '');

const pool = new Pool({
    connectionString: dbUrl,
    ssl: (isProduction || isRemoteDb) ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
    console.log('PostgreSQL database pool connected successfully');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
