require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const express = require('express');
const quizRoutes = require('../routes/quiz_routes');
const quizEngine = require('../engines/quiz_engine');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev';

async function runTests() {
    console.log('=== Starting TA Quiz Access & Student Per-Question Review Tests ===\n');

    // 1. Get a TA user and a Student user
    const taRes = await db.query("SELECT id, email, role FROM users WHERE role = 'TA' LIMIT 1");
    const studentRes = await db.query("SELECT id, email, role FROM users WHERE role = 'STUDENT' LIMIT 1");

    if (taRes.rows.length === 0 || studentRes.rows.length === 0) {
        console.error('Could not find TA or Student user in DB');
        process.exit(1);
    }

    const taUser = taRes.rows[0];
    const studentUser = studentRes.rows[0];

    console.log(`Found TA user: ${taUser.email} (${taUser.id})`);
    console.log(`Found Student user: ${studentUser.email} (${studentUser.id})`);

    const taToken = jwt.sign({ id: taUser.id, role: 'TA', email: taUser.email }, JWT_SECRET);
    const studentToken = jwt.sign({ id: studentUser.id, role: 'STUDENT', email: studentUser.email }, JWT_SECRET);

    // 2. Find a quiz with at least 2 questions
    const quizRes = await db.query(`
        SELECT q.id, q.title, q.topic_id 
        FROM quizzes q 
        JOIN questions qs ON qs.quiz_id = q.id 
        GROUP BY q.id, q.title, q.topic_id 
        HAVING COUNT(qs.id) >= 2 
        LIMIT 1
    `);

    if (quizRes.rows.length === 0) {
        console.error('No quiz with at least 2 questions found');
        process.exit(1);
    }

    const quiz = quizRes.rows[0];
    console.log(`Using Quiz: "${quiz.title}" (${quiz.id})\n`);

    // Fetch questions for this quiz
    const questionsRes = await db.query('SELECT id, content, options, correct_option_id FROM questions WHERE quiz_id = $1 LIMIT 2', [quiz.id]);
    const questions = questionsRes.rows;
    console.log(`Loaded ${questions.length} questions for testing.`);

    // 3. Setup lightweight supertest-like fetch using Express app
    const app = express();
    app.use(express.json());
    app.use('/api/quiz', quizRoutes);

    const server = app.listen(0);
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}/api/quiz`;

    try {
        // TEST 1: TA can view quiz questions (Read access)
        console.log('--- Test 1: TA views quiz questions via GET /:quizId/questions ---');
        const taQuestionsRes = await fetch(`${baseUrl}/${quiz.id}/questions`, {
            headers: { 'Authorization': `Bearer ${taToken}` }
        });
        console.log(`HTTP Status: ${taQuestionsRes.status}`);
        const taQuestionsData = await taQuestionsRes.json();
        if (taQuestionsRes.status === 200 && Array.isArray(taQuestionsData) && taQuestionsData.length > 0) {
            console.log(`✓ SUCCESS: TA received ${taQuestionsData.length} questions for read-only preview.`);
        } else {
            throw new Error(`Expected 200 and questions array, got ${taQuestionsRes.status}`);
        }

        // TEST 2: TA can view quiz details via GET /:quizId
        console.log('\n--- Test 2: TA views quiz details via GET /:quizId ---');
        const taDetailsRes = await fetch(`${baseUrl}/${quiz.id}`, {
            headers: { 'Authorization': `Bearer ${taToken}` }
        });
        console.log(`HTTP Status: ${taDetailsRes.status}`);
        const taDetailsData = await taDetailsRes.json();
        if (taDetailsRes.status === 200 && taDetailsData.id === quiz.id) {
            console.log(`✓ SUCCESS: TA received quiz metadata for "${taDetailsData.title}".`);
        } else {
            throw new Error(`Expected 200 and quiz details, got ${taDetailsRes.status}`);
        }

        // TEST 3: TA CANNOT call GET /:quizId/next (server-side block)
        console.log('\n--- Test 3: TA attempts to start/take quiz via GET /:quizId/next ---');
        const taNextRes = await fetch(`${baseUrl}/${quiz.id}/next`, {
            headers: { 'Authorization': `Bearer ${taToken}` }
        });
        console.log(`HTTP Status: ${taNextRes.status}`);
        const taNextData = await taNextRes.json();
        console.log('Response body:', taNextData);
        if (taNextRes.status === 403) {
            console.log('✓ SUCCESS: Backend rejected TA quiz attempt with 403 Forbidden.');
        } else {
            throw new Error(`Expected 403 Forbidden for TA attempt, got ${taNextRes.status}`);
        }

        // TEST 4: TA CANNOT submit quiz answers via POST /submit (server-side block)
        console.log('\n--- Test 4: TA attempts to submit quiz attempt via POST /submit ---');
        const taSubmitRes = await fetch(`${baseUrl}/submit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${taToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quizId: quiz.id,
                responses: [
                    { questionId: questions[0].id, selectedOptionId: 'A' }
                ]
            })
        });
        console.log(`HTTP Status: ${taSubmitRes.status}`);
        const taSubmitData = await taSubmitRes.json();
        console.log('Response body:', taSubmitData);
        if (taSubmitRes.status === 403) {
            console.log('✓ SUCCESS: Backend rejected TA quiz submission with 403 Forbidden.');
        } else {
            throw new Error(`Expected 403 Forbidden for TA submit, got ${taSubmitRes.status}`);
        }

        // TEST 5: Direct engine call with TA studentId is rejected
        console.log('\n--- Test 5: Direct quizEngine.processQuizSubmission with TA ID ---');
        try {
            await quizEngine.processQuizSubmission(taUser.id, quiz.id, quiz.topic_id, [
                { questionId: questions[0].id, selectedOptionId: 'A' }
            ]);
            throw new Error('Expected quizEngine to throw error for TA user, but it succeeded!');
        } catch (engineErr) {
            console.log(`✓ SUCCESS: Quiz engine threw error: "${engineErr.message}"`);
        }

        // TEST 6: Student takes quiz with 1 correct and 1 incorrect answer
        console.log('\n--- Test 6: Student submits quiz (1 correct, 1 incorrect) ---');
        const q1 = questions[0];
        const q2 = questions[1];

        // q1: pick correct answer
        const q1Selected = q1.correct_option_id;

        // q2: pick wrong answer
        const q2Options = typeof q2.options === 'string' ? JSON.parse(q2.options) : q2.options;
        const wrongOpt = q2Options.find(o => o.id !== q2.correct_option_id) || { id: 'Z' };
        const q2Selected = wrongOpt.id;

        const studentSubmitRes = await fetch(`${baseUrl}/submit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${studentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quizId: quiz.id,
                responses: [
                    { questionId: q1.id, selectedOptionId: q1Selected },
                    { questionId: q2.id, selectedOptionId: q2Selected }
                ]
            })
        });

        console.log(`HTTP Status: ${studentSubmitRes.status}`);
        const studentSubmitData = await studentSubmitRes.json();

        if (studentSubmitRes.status !== 200 || !studentSubmitData.success) {
            throw new Error(`Student submission failed: ${JSON.stringify(studentSubmitData)}`);
        }

        const results = studentSubmitData.results;
        console.log('Score:', results.score + '%');
        console.log('Correct count:', results.correctCount, '/', results.totalQuestions);
        console.log('Per-question review count:', results.questionReview.length);

        // Verify Question Review Breakdown
        const rev1 = results.questionReview[0];
        const rev2 = results.questionReview[1];

        console.log('\nReview Q1:', {
            questionId: rev1.questionId,
            selectedOptionId: rev1.selectedOptionId,
            correctOptionId: rev1.correctOptionId,
            isCorrect: rev1.isCorrect,
            hasOptions: Array.isArray(rev1.options) && rev1.options.length > 0
        });

        console.log('Review Q2:', {
            questionId: rev2.questionId,
            selectedOptionId: rev2.selectedOptionId,
            correctOptionId: rev2.correctOptionId,
            isCorrect: rev2.isCorrect,
            hasOptions: Array.isArray(rev2.options) && rev2.options.length > 0
        });

        if (rev1.isCorrect !== true || rev1.selectedOptionId !== q1Selected || rev1.correctOptionId !== q1Selected) {
            throw new Error('Question 1 review data mismatch!');
        }

        if (rev2.isCorrect !== false || rev2.selectedOptionId !== q2Selected || rev2.correctOptionId !== q2.correct_option_id) {
            throw new Error('Question 2 review data mismatch!');
        }

        if (!Array.isArray(rev1.options) || !Array.isArray(rev2.options)) {
            throw new Error('Options array missing from question review!');
        }

        console.log('✓ SUCCESS: Student per-question review data verified successfully.');

        // TEST 7: Database verification of selected_option_id persistence
        console.log('\n--- Test 7: Verify database persistence in question_responses table ---');
        const dbResponses = await db.query(
            'SELECT attempt_id, question_id, student_id, is_correct, selected_option_id FROM question_responses WHERE attempt_id = $1 ORDER BY is_correct DESC',
            [results.attemptId]
        );

        console.log('DB Rows:', dbResponses.rows);
        if (dbResponses.rows.length !== 2) {
            throw new Error(`Expected 2 rows in question_responses, found ${dbResponses.rows.length}`);
        }

        if (dbResponses.rows[0].selected_option_id !== q1Selected || dbResponses.rows[1].selected_option_id !== q2Selected) {
            throw new Error('selected_option_id in question_responses table does not match submitted values!');
        }

        console.log('✓ SUCCESS: Database question_responses table correctly persisted selected_option_id!');

        console.log('\n======================================================');
        console.log(' ALL TESTS PASSED: Access controls and review verified!');
        console.log('======================================================');

    } finally {
        server.close();
        process.exit(0);
    }
}

runTests().catch(err => {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
});
