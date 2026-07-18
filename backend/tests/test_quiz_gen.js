const db = require('../config/db');
const quizController = require('../controllers/quiz_controller');
require('dotenv').config();

async function runTest() {
    console.log('Starting AI Quiz Generator integration test...');
    try {
        // Fetch first topic in DB
        const topicRes = await db.query('SELECT id, title FROM topics LIMIT 1');
        if (topicRes.rows.length === 0) {
            console.log('No topics found in database. Please seed the DB first.');
            process.exit(0);
        }
        
        const topic = topicRes.rows[0];
        console.log(`Using topic: "${topic.title}" (${topic.id})`);

        const mockReq = {
            params: { topicId: topic.id },
            user: { role: 'TEACHER' }
        };

        const mockRes = {
            statusCode: 200,
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                console.log('Response Status:', this.statusCode);
                console.log('Response Body:', JSON.stringify(data, null, 2));
                
                if (data.success) {
                    console.log('✨ [PASS] AI Quiz Generation test successful!');
                } else {
                    console.log('❌ [FAIL] AI Quiz Generation failed:', data.error);
                }
            }
        };

        await quizController.generateAiQuiz(mockReq, mockRes);
        
    } catch (err) {
        console.error('CRITICAL ERROR running AI quiz generator test:', err);
    } finally {
        // End the DB pool connection to let the process exit
        db.pool.end();
    }
}

runTest();
