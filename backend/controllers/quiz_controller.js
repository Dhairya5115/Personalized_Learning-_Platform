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

    // Role check: Only students can take quizzes
    if (req.user.role === 'TA' || req.user.role !== 'STUDENT') {
        return res.status(403).json({ error: 'Teaching Assistants cannot attempt or take quizzes.' });
    }

    try {
        // Find topic id and is_active status for the quiz
        const quizRes = await db.query('SELECT topic_id, is_active FROM quizzes WHERE id = $1', [quizId]);
        if (quizRes.rows.length === 0) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        if (req.user.role === 'STUDENT' && quizRes.rows[0].is_active === false) {
            return res.status(403).json({ error: 'This practice quiz is currently inactive and cannot be attempted.' });
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

    // Role check: Only students can submit quiz attempts
    if (req.user.role === 'TA' || req.user.role !== 'STUDENT') {
        return res.status(403).json({ error: 'Teaching Assistants cannot attempt or submit quizzes.' });
    }

    try {
        // Find topic id and is_active for the quiz
        const quizRes = await db.query('SELECT topic_id, is_active FROM quizzes WHERE id = $1', [quizId]);
        if (quizRes.rows.length === 0) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        if (req.user.role === 'STUDENT' && quizRes.rows[0].is_active === false) {
            return res.status(403).json({ error: 'This practice quiz is currently inactive.' });
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
    const userRole = req.user ? req.user.role : null;
    try {
        let queryText = 'SELECT id, topic_id, title, passing_score, is_active, created_at FROM quizzes WHERE topic_id = $1 ORDER BY created_at ASC';
        let queryParams = [topicId];
        if (userRole === 'STUDENT') {
            queryText = 'SELECT id, topic_id, title, passing_score, is_active, created_at FROM quizzes WHERE topic_id = $1 AND is_active = true ORDER BY created_at ASC';
        }
        const result = await db.query(queryText, queryParams);
        return res.json(result.rows);
    } catch (err) {
        console.error('Get quizzes by topic error:', err.message);
        return res.status(500).json({ error: 'Internal server error fetching quizzes' });
    }
}

/**
 * Toggle Quiz Active / Inactive state (Teacher / Admin)
 */
async function toggleQuizActive(req, res) {
    const { quizId } = req.params;
    const { isActive } = req.body;
    const teacherId = req.user.id;

    try {
        // Verify quiz exists and teacher owns the course
        const quizCheck = await db.query(`
            SELECT q.id, q.is_active, c.teacher_id 
            FROM quizzes q
            JOIN topics t ON q.topic_id = t.id
            JOIN courses c ON t.course_id = c.id
            WHERE q.id = $1
        `, [quizId]);

        if (quizCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        if (quizCheck.rows[0].teacher_id !== teacherId && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized to modify this quiz status' });
        }

        const newActiveState = typeof isActive === 'boolean' ? isActive : !quizCheck.rows[0].is_active;

        const result = await db.query(
            `UPDATE quizzes SET is_active = $1 WHERE id = $2 RETURNING *`,
            [newActiveState, quizId]
        );

        return res.json({
            success: true,
            message: `Quiz marked as ${newActiveState ? 'active' : 'inactive'}.`,
            quiz: result.rows[0]
        });
    } catch (err) {
        console.error('Toggle quiz active error:', err.message);
        return res.status(500).json({ error: 'Failed to update quiz active status' });
    }
}

const QUIZ_GEN_SYSTEM_PROMPT = `
You are an expert educational AI designed to generate adaptive, multiple-choice quizzes.
CRITICAL INSTRUCTION: You must output ONLY a valid JSON object. Do NOT include markdown code blocks, do NOT write \`\`\`json, and do NOT include any introductory or concluding text. Return pure JSON only.

The output JSON object structure must be EXACTLY:
{
  "title": "Topic Quiz Title",
  "passingScore": 60,
  "questions": [
    {
      "content": "Clear and specific question content?",
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
Generate 5 to 6 high-quality questions (balanced across EASY, MEDIUM, and HARD). The difficulty field must be exactly "EASY", "MEDIUM", or "HARD".
Do NOT include trailing commas before closing brackets or braces.
`;

/**
 * Defensively extracts and cleans JSON string from LLM output.
 * Handles markdown fences, surrounding text, and trailing commas.
 */
function extractJsonFromLlmOutput(text) {
    if (!text || typeof text !== 'string') return null;
    let s = text.trim();

    // 1. Strip markdown fences if present
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // 2. Find outermost matching braces { ... }
    const firstBrace = s.indexOf('{');
    const lastBrace = s.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        s = s.substring(firstBrace, lastBrace + 1);
    }

    // 3. Remove trailing commas before closing braces/brackets
    s = s.replace(/,\s*([\]}])/g, '$1');

    return s;
}

/**
 * Validates that parsed JSON complies with the required quiz schema.
 */
function validateQuizSchema(data) {
    if (!data || typeof data !== 'object') return false;
    if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) return false;

    for (const q of data.questions) {
        if (!q.content || typeof q.content !== 'string' || q.content.trim() === '') return false;
        if (!q.options || !Array.isArray(q.options) || q.options.length < 2) return false;
        if (!q.correctOptionId) return false;
        
        const optionIds = q.options.map(opt => opt.id);
        if (!optionIds.includes(q.correctOptionId)) return false;
    }
    return true;
}

/**
 * Automatically generate a quiz using OpenRouter AI based on topic details and materials
 * Includes defensive extraction, schema validation, and automatic retries (up to 2 extra attempts).
 */
async function generateAiQuiz(req, res) {
    const { topicId } = req.params;

    try {
        // 1. Fetch topic details, course details, and course teacher
        const topicRes = await db.query(`
            SELECT t.title AS topic_title, t.description AS topic_description, 
                   c.title AS course_title, c.description AS course_description, 
                   c.teacher_id 
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

        const userPrompt = `Generate a 5 to 6 question adaptive practice quiz for the topic "${topic.topic_title}" in the course "${topic.course_title}".
Course Description: "${topic.course_description || 'N/A'}"
Topic Description: "${topic.topic_description || 'No description provided'}"
Study materials for this topic:
${materialsList || 'No specific materials listed.'}

CRITICAL: Return ONLY valid JSON matching the schema. Every question must have exactly 4 choices (A, B, C, D) and a valid correctOptionId.`;

        // Attempt generation with automatic retries (up to 2 retries = 3 total attempts)
        const MAX_ATTEMPTS = 3;
        let lastError = null;
        let quizData = null;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            console.log(`[AI Quiz Gen] Attempt ${attempt}/${MAX_ATTEMPTS} calling ${requestModel} for topic "${topic.topic_title}"`);
            
            try {
                const response = await fetch(apiEndpoint, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        model: requestModel,
                        messages: [
                            { role: 'system', content: QUIZ_GEN_SYSTEM_PROMPT },
                            { role: 'user', content: userPrompt }
                        ],
                        temperature: 0.6,
                        max_tokens: 4000,
                        response_format: { type: 'json_object' }
                    })
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.error?.message || `AI completion failed with HTTP status ${response.status}`);
                }

                const data = await response.json();
                const contentString = data.choices?.[0]?.message?.content;
                if (!contentString) {
                    throw new Error('AI returned empty response content');
                }

                const cleanedJsonStr = extractJsonFromLlmOutput(contentString);
                if (!cleanedJsonStr) {
                    console.warn(`[AI Quiz Gen Attempt ${attempt}] Could not locate JSON boundaries in response:`, contentString);
                    throw new Error('Could not locate JSON in AI response');
                }

                let parsed;
                try {
                    parsed = JSON.parse(cleanedJsonStr);
                } catch (pe) {
                    console.warn(`[AI Quiz Gen Attempt ${attempt}] JSON.parse failed. Raw:`, contentString);
                    throw new Error(`JSON parse error: ${pe.message}`);
                }

                if (!validateQuizSchema(parsed)) {
                    console.warn(`[AI Quiz Gen Attempt ${attempt}] Schema validation failed:`, parsed);
                    throw new Error('AI output did not match expected quiz schema');
                }

                // Success!
                quizData = parsed;
                break;

            } catch (attemptErr) {
                lastError = attemptErr;
                console.warn(`[AI Quiz Gen Attempt ${attempt} failed]:`, attemptErr.message);
                if (attempt < MAX_ATTEMPTS) {
                    // Small delay before retrying
                    await new Promise(r => setTimeout(r, 600));
                }
            }
        }

        if (!quizData) {
            console.error('[AI Quiz Gen] All generation attempts exhausted. Last error:', lastError?.message);
            return res.status(500).json({ 
                error: 'AI generated invalid JSON output format. Please try generating again.',
                details: lastError?.message 
            });
        }

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
                quizData.title || `${topic.topic_title} (${topic.course_title}) AI Quiz`,
                quizData.passingScore || 60
            ]);
            const createdQuiz = quizRes.rows[0];

            const questions = quizData.questions || [];
            let createdQuestions = [];

            if (questions.length > 0) {
                const values = [];
                const placeholders = [];
                let paramIdx = 1;

                for (const q of questions) {
                    const assignedDifficulty = ['EASY', 'MEDIUM', 'HARD'].includes(q.difficulty?.toUpperCase())
                        ? q.difficulty.toUpperCase()
                        : 'MEDIUM';

                    placeholders.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4})`);
                    values.push(
                        createdQuiz.id,
                        q.content,
                        JSON.stringify(q.options),
                        q.correctOptionId,
                        assignedDifficulty
                    );
                    paramIdx += 5;
                }

                const questionBatchInsertQuery = `
                    INSERT INTO questions (quiz_id, content, options, correct_option_id, difficulty)
                    VALUES ${placeholders.join(', ')}
                    RETURNING *
                `;
                const qRes = await client.query(questionBatchInsertQuery, values);
                createdQuestions = qRes.rows;
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
        const result = await db.query('SELECT id, quiz_id, content, options, correct_option_id, difficulty, created_at FROM questions WHERE quiz_id = $1 ORDER BY difficulty DESC, created_at ASC', [quizId]);
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

/**
 * Fetch a single quiz by ID with topic and course details
 */
async function getQuizById(req, res) {
    const { quizId } = req.params;
    try {
        const result = await db.query(`
            SELECT q.id, q.topic_id, q.title, q.passing_score, q.is_active, q.created_at, 
                   t.title as topic_title, t.course_id, c.title as course_title
            FROM quizzes q
            JOIN topics t ON q.topic_id = t.id
            JOIN courses c ON t.course_id = c.id
            WHERE q.id = $1
        `, [quizId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Quiz not found' });
        }

        return res.json(result.rows[0]);
    } catch (err) {
        console.error('Get quiz by ID error:', err.message);
        return res.status(500).json({ error: 'Internal server error fetching quiz details' });
    }
}

module.exports = {
    getNextAdaptiveQuestion,
    submitQuiz,
    createQuiz,
    addQuestionToQuiz,
    getQuizzesByTopic,
    toggleQuizActive,
    generateAiQuiz,
    deleteQuiz,
    getQuizQuestions,
    getQuizById,
    updateQuestion,
    deleteQuestion
};
