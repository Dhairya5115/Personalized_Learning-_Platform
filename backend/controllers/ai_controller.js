const db = require('../config/db');
require('dotenv').config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const TUTOR_SYSTEM_PROMPT = `
You are a helpful and expert AI tutor on a Personalized Learning Platform.
Explain concepts clearly, answer questions directly, write high-quality markdown responses, and do not restrict your answer to any predefined templates, headings, or layouts. Answer the user's query naturally.

At the very end of your response, you MUST provide exactly 3 relevant, follow-up questions or next-step queries that the student might ask, formatted strictly like this:
[Suggestions: Suggestion 1 | Suggestion 2 | Suggestion 3]
`;

/**
 * Ask a question or explain a concept using OpenRouter or OpenAI
 */
async function solveDoubt(req, res) {
    const { query, topicId, courseId } = req.body;
    const studentId = req.user.id;

    if (!query) {
        return res.status(400).json({ error: 'Query prompt is required' });
    }

    const cleanQuery = query.toLowerCase().trim();
    // Cache key incorporates courseId and topicId to make it context-sensitive
    const cacheKey = `${courseId || ''}:${topicId || ''}:${cleanQuery}`;

    try {
        // 1. Semantic Cache check (Exact match lookup using context-based key)
        const cacheRes = await db.query(
            'SELECT answer_text FROM ai_query_cache WHERE LOWER(TRIM(query_text)) = $1',
            [cacheKey]
        );

        if (cacheRes.rows.length > 0) {
            console.log('[AI Cache] Serving cached response for key:', cacheKey);
            return res.json({
                success: true,
                source: 'cache',
                answer: cacheRes.rows[0].answer_text
            });
        }

        // Fetch context info if topicId or courseId is specified
        let contextPrefix = '';
        if (topicId) {
            const topicRes = await db.query(`
                SELECT t.title as topic_title, t.description as topic_description, c.title as course_title
                FROM topics t
                JOIN courses c ON t.course_id = c.id
                WHERE t.id = $1
            `, [topicId]);
            
            if (topicRes.rows.length > 0) {
                const row = topicRes.rows[0];
                const matRes = await db.query(`
                    SELECT title, type FROM materials WHERE topic_id = $1
                `, [topicId]);
                const materialsStr = matRes.rows.map(m => `"${m.title}" (${m.type})`).join(', ') || 'None';
                
                contextPrefix = `[Course Context]
You are tutoring the student for the course "${row.course_title}" on the topic "${row.topic_title}".
Topic description: "${row.topic_description || ''}"
Learning materials available for this topic: ${materialsStr}
---
`;
            }
        } else if (courseId) {
            const courseRes = await db.query(`
                SELECT title, description FROM courses WHERE id = $1
            `, [courseId]);
            if (courseRes.rows.length > 0) {
                const row = courseRes.rows[0];
                contextPrefix = `[Course Context]
You are tutoring the student for the course "${row.title}".
Course description: "${row.description || ''}"
---
`;
            }
        }

        const finalApiKey = OPENROUTER_API_KEY || OPENAI_API_KEY;
        const isOpenRouter = !!OPENROUTER_API_KEY || finalApiKey.startsWith('sk-or-');
        const openrouterModel = process.env.OPENROUTER_MODEL || 'openrouter/free';

        // 2. Fallback: call AI completion API
        if (!finalApiKey) {
            // Dummy response if API key is not configured in env file
            const dummyAnswer = `
You asked: **"${query}"**.

*(Note: AI API Key is not configured on the backend server. Running in simulated offline tutor mode).*

Adaptive learning algorithms route student profile milestones and quiz attempts to personalize study curves.

[Suggestions: How do adaptive quizzes work? | How do quiz attempts update my score? | Can you show me an example study schedule?]
`;
            // Write simulation answer to cache
            await db.query(
                'INSERT INTO ai_query_cache (query_text, answer_text) VALUES ($1, $2) ON CONFLICT (query_text) DO NOTHING',
                [cacheKey, dummyAnswer]
            );

            return res.json({
                success: true,
                source: 'simulation',
                answer: dummyAnswer
            });
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
            console.log('[AI API] Fetching completions from OpenRouter model:', requestModel);
        } else {
            console.log('[AI API] Fetching completions from OpenAI model:', requestModel);
        }

        const systemMessageContent = contextPrefix ? `${contextPrefix}\n${TUTOR_SYSTEM_PROMPT}` : TUTOR_SYSTEM_PROMPT;

        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: requestModel,
                messages: [
                    { role: 'system', content: systemMessageContent },
                    { role: 'user', content: query }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || 'AI completion request failed');
        }

        const data = await response.json();
        const answer = data.choices[0].message.content;

        // 3. Write response to semantic cache
        await db.query(
            'INSERT INTO ai_query_cache (query_text, answer_text) VALUES ($1, $2) ON CONFLICT (query_text) DO NOTHING',
            [cacheKey, answer]
        );

        return res.json({
            success: true,
            source: isOpenRouter ? 'openrouter' : 'openai',
            answer
        });

    } catch (err) {
        console.error('[AI Error] solveDoubt controller:', err.message);
        
        const fallbackText = `
> [!WARNING]
> **Tutor Alert**: The completions API returned an error: *"${err.message}"*. Running in offline simulated tutor mode.

You asked: **"${query}"**.

Adaptive learning systems optimize study times and customize quiz sequences.

[Suggestions: Try asking again | Tell me about platform capabilities | How are course paths customized?]
`;
        return res.json({
            success: true,
            source: 'simulation-fallback',
            answer: fallbackText
        });
    }
}

module.exports = {
    solveDoubt
};
