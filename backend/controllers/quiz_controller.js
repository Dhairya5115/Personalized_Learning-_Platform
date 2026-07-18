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

        const exclude = req.query.exclude ? req.query.exclude.split(',').filter(id => id.trim() !== '') : [];
        const question = await quizEngine.getNextQuestion(studentId, quizId, topicId, exclude);
        
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
        // Validate topic exists and teacher owns course
        const topicCheck = await db.query(`
            SELECT t.id, c.teacher_id 
            FROM topics t
            JOIN courses c ON t.course_id = c.id
            WHERE t.id = $1
        `, [topicId]);
        if (topicCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Topic not found' });
        }
        if (topicCheck.rows[0].teacher_id !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'You are not authorized to create a quiz for this course' });
        }

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
        // Validate quiz exists and teacher owns course
        const quizCheck = await db.query(`
            SELECT q.id, c.teacher_id 
            FROM quizzes q
            JOIN topics t ON q.topic_id = t.id
            JOIN courses c ON t.course_id = c.id
            WHERE q.id = $1
        `, [quizId]);
        if (quizCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        if (quizCheck.rows[0].teacher_id !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'You are not authorized to add questions to this quiz' });
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

/**
 * Get quizzes for a specific topic
 */
async function getQuizzesByTopic(req, res) {
    const { topicId } = req.params;
    try {
        const result = await db.query('SELECT * FROM quizzes WHERE topic_id = $1', [topicId]);
        return res.json(result.rows);
    } catch (err) {
        console.error('Get quizzes by topic error:', err.message);
        return res.status(500).json({ error: 'Internal server error fetching quizzes' });
    }
}

const QUIZ_GEN_SYSTEM_PROMPT = `
You are an expert educational AI designed to generate adaptive, multiple-choice quizzes.
You must return only a valid JSON object matching the requested structure, with no extra text or explanations.

The output JSON object structure must be EXACTLY:
{
  "title": "Quiz Title (e.g. Master malloc() in C)",
  "passingScore": 60,
  "questions": [
    {
      "content": "Question content...",
      "options": [
        {"id": "A", "text": "Option A text"},
        {"id": "B", "text": "Option B text"},
        {"id": "C", "text": "Option C text"},
        {"id": "D", "text": "Option D text"}
      ],
      "correctOptionId": "A",
      "difficulty": "EASY"
    }
  ]
}
Generate exactly 10 questions (4 EASY, 3 MEDIUM, 3 HARD). The difficulty field must be exactly "EASY", "MEDIUM", or "HARD".
`;

/**
 * Automatically generate a quiz using OpenRouter AI based on topic details and materials
 */
async function generateAiQuiz(req, res) {
    const { topicId } = req.params;

    try {
        // 1. Fetch topic details and course teacher
        const topicRes = await db.query(`
            SELECT t.title, t.description, c.teacher_id 
            FROM topics t
            JOIN courses c ON t.course_id = c.id
            WHERE t.id = $1
        `, [topicId]);
        if (topicRes.rows.length === 0) {
            return res.status(404).json({ error: 'Topic not found' });
        }
        if (topicRes.rows[0].teacher_id !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'You are not authorized to generate AI quizzes for this course' });
        }
        const topic = topicRes.rows[0];

        // 2. Fetch associated materials
        const materialsRes = await db.query('SELECT title, type FROM materials WHERE topic_id = $1', [topicId]);
        const materialsList = materialsRes.rows.map(m => `- ${m.title} (${m.type})`).join('\n');

        // 3. Build AI completion keys & call
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
        const finalApiKey = OPENROUTER_API_KEY || OPENAI_API_KEY;
        const isOpenRouter = !!OPENROUTER_API_KEY || finalApiKey.startsWith('sk-or-');
        const openrouterModel = process.env.OPENROUTER_MODEL || 'openrouter/free';

        if (!finalApiKey) {
            return res.status(500).json({ error: 'AI API Key is not configured on the backend server.' });
        }

        let apiEndpoint = 'https://api.openai.com/v1/chat/completions';
        let headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${finalApiKey}`
        };
        let requestModel = 'gpt-4o-mini';

        if (isOpenRouter) {
            apiEndpoint = 'https://openrouter.ai/api/v1/chat/completions';
            headers['HTTP-Referer'] = 'http://localhost:5173';
            headers['X-Title'] = 'TailorLearn';
            requestModel = openrouterModel;
        }

        const userPrompt = `Create a quiz for the topic: "${topic.title}". Description: "${topic.description || 'No description'}". 
Study materials available for this topic:
${materialsList || 'No specific materials listed.'}
Ensure the questions are accurate and relevant to the topic. All questions must have exactly 4 choices (A, B, C, D) and specify the correct option ID.`;

        console.log(`[AI Quiz Gen] Calling AI model ${requestModel} for topic: ${topic.title}`);
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: requestModel,
                messages: [
                    { role: 'system', content: QUIZ_GEN_SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || 'AI completion request failed');
        }

        const data = await response.json();
        const contentString = data.choices[0].message.content;

        // Clean output string in case LLM wraps it in markdown code blocks
        let cleanJsonStr = contentString.trim();
        if (cleanJsonStr.startsWith('```json')) {
            cleanJsonStr = cleanJsonStr.slice(7);
        }
        if (cleanJsonStr.startsWith('```')) {
            cleanJsonStr = cleanJsonStr.slice(3);
        }
        if (cleanJsonStr.endsWith('```')) {
            cleanJsonStr = cleanJsonStr.slice(0, -3);
        }
        cleanJsonStr = cleanJsonStr.trim();

        const quizData = JSON.parse(cleanJsonStr);

        // 4. Save Quiz and Questions to Database in a transaction
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const quizInsertQuery = `
                INSERT INTO quizzes (topic_id, title, passing_score)
                VALUES ($1, $2, $3)
                RETURNING *
            `;
            const quizRes = await client.query(quizInsertQuery, [
                topicId,
                quizData.title || `${topic.title} AI Quiz`,
                quizData.passingScore || 60
            ]);
            const createdQuiz = quizRes.rows[0];

            const questions = quizData.questions || [];
            const createdQuestions = [];

            for (const q of questions) {
                const assignedDifficulty = ['EASY', 'MEDIUM', 'HARD'].includes(q.difficulty?.toUpperCase())
                    ? q.difficulty.toUpperCase()
                    : 'MEDIUM';

                const questionInsertQuery = `
                    INSERT INTO questions (quiz_id, content, options, correct_option_id, difficulty)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *
                `;
                const qRes = await client.query(questionInsertQuery, [
                    createdQuiz.id,
                    q.content,
                    JSON.stringify(q.options),
                    q.correctOptionId,
                    assignedDifficulty
                ]);
                createdQuestions.push(qRes.rows[0]);
            }

            await client.query('COMMIT');
            return res.status(201).json({
                success: true,
                quiz: createdQuiz,
                questionsCount: createdQuestions.length
            });
        } catch (dbErr) {
            await client.query('ROLLBACK');
            throw dbErr;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('[AI Quiz Gen Error]:', err.message);
        return res.status(500).json({ error: err.message || 'Internal server error generating AI quiz' });
    }
}

async function deleteQuiz(req, res) {
    const { quizId } = req.params;

    try {
        // Validate quiz exists and teacher owns course
        const quizCheck = await db.query(`
            SELECT q.id, c.teacher_id 
            FROM quizzes q
            JOIN topics t ON q.topic_id = t.id
            JOIN courses c ON t.course_id = c.id
            WHERE q.id = $1
        `, [quizId]);
        if (quizCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        if (quizCheck.rows[0].teacher_id !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'You are not authorized to delete this quiz' });
        }

        const result = await db.query('DELETE FROM quizzes WHERE id = $1 RETURNING *', [quizId]);
        return res.json({ success: true, message: 'Quiz deleted successfully', quiz: result.rows[0] });
    } catch (err) {
        console.error('Delete quiz error:', err.message);
        return res.status(500).json({ error: 'Internal server error deleting quiz' });
    }
}

/**
 * Fetch all questions for a specific quiz (Teacher/Admin or Student review)
 */
async function getQuizQuestions(req, res) {
    const { quizId } = req.params;
    try {
        const result = await db.query('SELECT * FROM questions WHERE quiz_id = $1 ORDER BY difficulty DESC, created_at ASC', [quizId]);
        return res.json(result.rows);
    } catch (err) {
        console.error('Get quiz questions error:', err.message);
        return res.status(500).json({ error: 'Internal server error fetching quiz questions' });
    }
}

/**
 * Update a specific question (Teacher/Admin)
 */
async function updateQuestion(req, res) {
    const { questionId } = req.params;
    const { content, options, correctOptionId, difficulty } = req.body;

    if (!content || !options || !correctOptionId || !difficulty) {
        return res.status(400).json({ error: 'Question content, options, correctOptionId, and difficulty are required' });
    }

    const assignedDifficulty = ['EASY', 'MEDIUM', 'HARD'].includes(difficulty.toUpperCase())
        ? difficulty.toUpperCase()
        : 'MEDIUM';

    try {
        // Validate question exists and teacher owns course
        const questionCheck = await db.query(`
            SELECT q.id, c.teacher_id 
            FROM questions q
            JOIN quizzes qz ON q.quiz_id = qz.id
            JOIN topics t ON qz.topic_id = t.id
            JOIN courses c ON t.course_id = c.id
            WHERE q.id = $1
        `, [questionId]);
        if (questionCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Question not found' });
        }
        if (questionCheck.rows[0].teacher_id !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'You are not authorized to update this question' });
        }

        const queryText = `
            UPDATE questions
            SET content = $1, options = $2, correct_option_id = $3, difficulty = $4
            WHERE id = $5
            RETURNING *
        `;
        const result = await db.query(queryText, [
            content,
            JSON.stringify(options),
            correctOptionId,
            assignedDifficulty,
            questionId
        ]);

        return res.json({ success: true, question: result.rows[0] });
    } catch (err) {
        console.error('Update question error:', err.message);
        return res.status(500).json({ error: 'Internal server error updating question' });
    }
}

/**
 * Delete a specific question (Teacher/Admin)
 */
async function deleteQuestion(req, res) {
    const { questionId } = req.params;
    try {
        // Validate question exists and teacher owns course
        const questionCheck = await db.query(`
            SELECT q.id, c.teacher_id 
            FROM questions q
            JOIN quizzes qz ON q.quiz_id = qz.id
            JOIN topics t ON qz.topic_id = t.id
            JOIN courses c ON t.course_id = c.id
            WHERE q.id = $1
        `, [questionId]);
        if (questionCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Question not found' });
        }
        if (questionCheck.rows[0].teacher_id !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'You are not authorized to delete this question' });
        }

        const result = await db.query('DELETE FROM questions WHERE id = $1 RETURNING *', [questionId]);
        return res.json({ success: true, message: 'Question deleted successfully', question: result.rows[0] });
    } catch (err) {
        console.error('Delete question error:', err.message);
        return res.status(500).json({ error: 'Internal server error deleting question' });
    }
}

module.exports = {
    getNextAdaptiveQuestion,
    submitQuiz,
    createQuiz,
    addQuestionToQuiz,
    getQuizzesByTopic,
    generateAiQuiz,
    deleteQuiz,
    getQuizQuestions,
    updateQuestion,
    deleteQuestion
};
