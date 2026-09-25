const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/db');
const authController = require('../controllers/auth_controller');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev';

async function runDirectAuthRefreshTest() {
    console.log('=== Testing Auth Refresh Logic Directly ===');
    
    try {
        // 1. Fetch any user from db
        const userRes = await db.query('SELECT id, email, role FROM users LIMIT 1');
        if (userRes.rows.length === 0) {
            console.log('No user in database, skipping direct controller test.');
            return;
        }

        const testUser = userRes.rows[0];
        console.log('Using test user:', testUser.email, testUser.role);

        // 2. Generate a valid token
        const token = jwt.sign(
            { id: testUser.id, email: testUser.email, role: testUser.role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        // 3. Test authController.refreshToken
        let responseStatus = 200;
        let responseJson = null;

        const req = {
            headers: {
                authorization: `Bearer ${token}`
            },
            body: { token }
        };

        const res = {
            status: (code) => {
                responseStatus = code;
                return res;
            },
            json: (data) => {
                responseJson = data;
                return res;
            }
        };

        await authController.refreshToken(req, res);

        console.log('Response Status:', responseStatus);
        console.log('Response Success:', responseJson?.success);
        console.log('Refreshed Token Exists:', !!responseJson?.token);
        console.log('User payload returned:', responseJson?.user?.email);

        if (responseStatus === 200 && responseJson?.success && responseJson?.token) {
            console.log('\n>>> AUTH REFRESH TEST PASSED WITH FLYING COLORS! <<<');
        } else {
            throw new Error(`Unexpected response: ${JSON.stringify(responseJson)}`);
        }

    } catch (err) {
        console.error('Test failed with error:', err.message);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

runDirectAuthRefreshTest();
