const db = require('../config/db');
const quizEngine = require('../engines/quiz_engine');

/**
 * Get next adaptive question for a student
 */
async function getNextAdaptiveQuestion(req, res) {
    const { quizId } = req.params;
    const studentId = req.user.id;

    if (!quizId) {
        return res.status(400).json({ error: 'quizId is required' });
    }

    try {
        // Find topic id for the quiz
        const quizRes = await db.query('SELECT topic_id FROM quizzes WHERE id = $1', [quizId]);
        if (quizRes.rows.length === 0) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        const topicId = quizRes.rows[0].topic_id;

        const question = await quizEngine.getNextQuestion(studentId, quizId, topicId);
        
        if (!question) {
            return res.json({ 
                success: true, 
                completed: true, 
                message: 'No more unanswered questions left in this quiz!' 
            });
        }

        return res.json({
            success: true,
            completed: false,
            question: {
                id: question.id,
                content: question.content,
                options: question.options,
                difficulty: question.difficulty
            }
        });

    } catch (err) {
        console.error('Fetch adaptive question error:', err.message);
        return res.status(500).json({ error: 'Internal server error fetching next question' });
    }
}

/**
 * Submit quiz answers and score the performance adaptively
 */
async function submitQuiz(req, res) {
    const { quizId, responses } = req.body; // responses: [{ questionId, selectedOptionId }]
    const studentId = req.user.id;

    if (!quizId || !responses || !Array.isArray(responses)) {
        return res.status(400).json({ error: 'quizId and responses array are required' });
    }

    try {
        // Find topic id for the quiz
        const quizRes = await db.query('SELECT topic_id FROM quizzes WHERE id = $1', [quizId]);
        if (quizRes.rows.length === 0) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        const topicId = quizRes.rows[0].topic_id;

        const results = await quizEngine.processQuizSubmission(studentId, quizId, topicId, responses);
        return res.json({
            success: true,
            results
        });

    } catch (err) {
        console.error('Submit quiz error:', err.message);
        return res.status(500).json({ error: 'Internal server error processing quiz submission' });
    }
}

/**
 * Create a new quiz for a topic (Teacher/Admin)
 */
async function createQuiz(req, res) {
    const { topicId, title, passingScore } = req.body;

    if (!topicId || !title) {
        return res.status(400).json({ error: 'topicId and quiz title are required' });
    }

    try {
        const insertQuery = `
            INSERT INTO quizzes (topic_id, title, passing_score)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const result = await db.query(insertQuery, [topicId, title, passingScore || 50]);
        return res.status(201).json({ success: true, quiz: result.rows[0] });
    } catch (err) {
        console.error('Create quiz error:', err.message);
        return res.status(500).json({ error: 'Internal server error creating quiz' });
    }
}

/**
 * Add a question to a quiz (Teacher/Admin)
 */
async function addQuestionToQuiz(req, res) {
    const { quizId } = req.params;
    const { content, options, correctOptionId, difficulty } = req.body;

    if (!content || !options || !correctOptionId || !difficulty) {
        return res.status(400).json({ error: 'Question content, options, correctOptionId, and difficulty are required' });
    }

    const assignedDifficulty = ['EASY', 'MEDIUM', 'HARD'].includes(difficulty.toUpperCase())
        ? difficulty.toUpperCase()
        : 'MEDIUM';

    try {
        // Validate quiz exists
        const quizCheck = await db.query('SELECT id FROM quizzes WHERE id = $1', [quizId]);
        if (quizCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        const insertQuery = `
            INSERT INTO questions (quiz_id, content, options, correct_option_id, difficulty)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await db.query(insertQuery, [
            quizId,
            content,
            JSON.stringify(options),
            correctOptionId,
            assignedDifficulty
        ]);

        return res.status(201).json({ success: true, question: result.rows[0] });
    } catch (err) {
        console.error('Add question error:', err.message);
        return res.status(500).json({ error: 'Internal server error adding question' });
    }
}

module.exports = {
    getNextAdaptiveQuestion,
    submitQuiz,
    createQuiz,
    addQuestionToQuiz
};
