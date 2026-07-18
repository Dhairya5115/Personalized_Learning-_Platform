const db = require('../config/db');
const quizController = require('../controllers/quiz_controller');

async function runTest() {
    console.log('Starting Quiz Deletion integration test...');
    try {
        // Fetch the quiz we just created
        const quizRes = await db.query('SELECT id, title FROM quizzes WHERE title = $1 ORDER BY created_at DESC LIMIT 1', ['Mastering Tree Data Structures']);
        if (quizRes.rows.length === 0) {
            console.log('No test quiz found in database.');
            process.exit(0);
        }
        
        const quiz = quizRes.rows[0];
        console.log(`Deleting quiz: "${quiz.title}" (${quiz.id})`);

        // Check current questions count
        const countBefore = await db.query('SELECT COUNT(*) FROM questions WHERE quiz_id = $1', [quiz.id]);
        console.log(`Questions count before deletion: ${countBefore.rows[0].count}`);

        const mockReq = {
            params: { quizId: quiz.id },
            user: { role: 'TEACHER' }
        };

        const mockRes = {
            statusCode: 200,
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: async function(data) {
                console.log('Response Status:', this.statusCode);
                console.log('Response Body:', JSON.stringify(data, null, 2));
                
                if (data.success) {
                    // Check if questions are also gone
                    const countAfter = await db.query('SELECT COUNT(*) FROM questions WHERE quiz_id = $1', [quiz.id]);
                    console.log(`Questions count after deletion: ${countAfter.rows[0].count}`);
                    
                    if (parseInt(countAfter.rows[0].count) === 0) {
                        console.log('✨ [PASS] Cascade deletion test successful!');
                    } else {
                        console.log('❌ [FAIL] Questions were not cascade-deleted!');
                    }
                } else {
                    console.log('❌ [FAIL] Quiz deletion failed:', data.error);
                }
            }
        };

        await quizController.deleteQuiz(mockReq, mockRes);
        
    } catch (err) {
        console.error('CRITICAL ERROR running quiz deletion test:', err);
    } finally {
        db.pool.end();
    }
}

runTest();
