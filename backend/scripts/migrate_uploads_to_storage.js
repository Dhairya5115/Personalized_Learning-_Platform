/**
 * TailorLearn - Bulk Migration Script: Local Uploads to Cloud Storage (Cloudinary)
 *
 * NOTE: This script does NOT run automatically.
 * It is only executed when manually approved by the user.
 *
 * Usage:
 *   node backend/scripts/migrate_uploads_to_storage.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');
const { cloudinary, isConfigured } = require('../services/storage_service');

async function migrateUploads() {
    console.log('========================================================');
    console.log('  TailorLearn: Migrate Local Uploads to Cloud Storage   ');
    console.log('========================================================\n');

    if (!isConfigured) {
        console.error('❌ Cloudinary is not configured!');
        console.error('Please ensure the following environment variables are set in backend/.env:');
        console.error('  - CLOUDINARY_CLOUD_NAME');
        console.error('  - CLOUDINARY_API_KEY');
        console.error('  - CLOUDINARY_API_SECRET\n');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1')
            ? { rejectUnauthorized: false }
            : false
    });

    const uploadsDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadsDir)) {
        console.error(`❌ Local uploads directory not found at: ${uploadsDir}`);
        process.exit(1);
    }

    try {
        const client = await pool.connect();
        console.log('✔ Connected to database.');

        // 1. Query all materials pointing to localhost
        const query = `
            SELECT id, title, type, file_url 
            FROM materials 
            WHERE file_url LIKE '%localhost%' OR file_url LIKE '%127.0.0.1%'
        `;
        const res = await client.query(query);
        console.log(`Found ${res.rows.length} material(s) with localhost URLs.\n`);

        if (res.rows.length === 0) {
            console.log('No materials require migration. Database is already clean!');
            client.release();
            await pool.end();
            return;
        }

        let migratedCount = 0;

        for (const row of res.rows) {
            console.log(`Processing: [${row.title}] (${row.type})`);
            console.log(`  Current URL: ${row.file_url}`);

            // Extract filename from URL (e.g. "1784809086978_14519720_3840_2160_25fps.mp4")
            const decodedUrl = decodeURIComponent(row.file_url);
            const filename = path.basename(decodedUrl.split('?')[0]);
            const localFilePath = path.join(uploadsDir, filename);

            if (!fs.existsSync(localFilePath)) {
                console.warn(`  ⚠️ Local file not found at: ${localFilePath}`);
                console.warn(`  Skipping row ${row.id}.\n`);
                continue;
            }

            console.log(`  Uploading to Cloudinary: ${filename}...`);
            const uploadResult = await cloudinary.uploader.upload(localFilePath, {
                resource_type: row.type === 'VIDEO' ? 'video' : 'auto',
                folder: 'tailorlearn/materials',
                use_filename: true,
                unique_filename: true
            });

            const newUrl = uploadResult.secure_url;
            console.log(`  ✔ Uploaded! New Cloudinary URL: ${newUrl}`);

            // Update database row
            await client.query('UPDATE materials SET file_url = $1 WHERE id = $2', [newUrl, row.id]);
            console.log(`  ✔ Updated database row ${row.id} with permanent cloud URL.\n`);
            migratedCount++;
        }

        console.log('========================================================');
        console.log(`🎉 Migration complete! Updated ${migratedCount} of ${res.rows.length} rows.`);
        console.log('========================================================');

        client.release();
        await pool.end();
    } catch (err) {
        console.error('❌ Migration failed with error:', err.message);
        await pool.end();
        process.exit(1);
    }
}

// Run only when directly invoked from command line
if (require.main === module) {
    migrateUploads();
}

module.exports = migrateUploads;

