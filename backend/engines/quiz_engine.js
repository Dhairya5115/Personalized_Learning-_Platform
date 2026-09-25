const db = require('../config/db');
const { recalculateProgress } = require('./progress_engine');

/**
 * Fetch the next adaptive question for a student in a quiz.
 * @param {string} studentId 
 * @param {string} quizId 
 * @param {string} topicId 
 */
async function getNextQuestion(studentId, quizId, topicId, excludeIds = []) {
    try {
        // Find unanswered questions for this quiz
        let excludeFilter = '';
        let queryParams = [quizId];
        if (excludeIds && excludeIds.length > 0) {
            excludeFilter = ` AND NOT (q.id = ANY($2))`;
            queryParams.push(excludeIds);
        }

        const questionRes = await db.query(
            `SELECT q.id, q.content, q.options, q.difficulty 
             FROM questions q
             WHERE q.quiz_id = $1
               ${excludeFilter}
             ORDER BY RANDOM() LIMIT 1`,
            queryParams
        );

        return questionRes.rows.length > 0 ? questionRes.rows[0] : null;

    } catch (err) {
        console.error('[Quiz Engine Error] getNextQuestion:', err.message);
        throw err;
    }
}

/**
 * Process a finished quiz attempt, record responses, and update the student's topic skill score.
 * Also rewards XP and checks/updates streaks.
 * @param {string} studentId 
 * @param {string} quizId 
 * @param {string} topicId 
 * @param {Array} answers Array of objects: { questionId, selectedOptionId }
 */
async function processQuizSubmission(studentId, quizId, topicId, answers) {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Check student role to strictly reject TAs or teachers from submitting quiz attempts
        const userCheck = await client.query('SELECT role FROM users WHERE id = $1', [studentId]);
        if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'STUDENT') {
            const roleName = userCheck.rows[0]?.role || 'USER';
            throw new Error(`${roleName}s cannot submit quiz attempts.`);
        }

        let correctCount = 0;
        const totalQuestions = answers.length;
        const processedResponses = [];

        // 1. Batch fetch questions to eliminate N+1 SELECT queries
        const questionIds = answers.map(a => a.questionId);
        const questionsRes = await client.query(
            'SELECT id, correct_option_id, difficulty, content, options FROM questions WHERE id = ANY($1)',
            [questionIds]
        );
        const questionMap = new Map();
        for (const q of questionsRes.rows) {
            questionMap.set(q.id, q);
        }

        // Evaluate answers using in-memory question map
        for (const answer of answers) {
            const question = questionMap.get(answer.questionId);
            if (!question) {
                throw new Error(`Question ${answer.questionId} not found`);
            }

            const { correct_option_id, difficulty, content, options } = question;
            const isCorrect = correct_option_id === answer.selectedOptionId;

            if (isCorrect) {
                correctCount++;
            }

            // Find the text of the correct option and selected option for review display
            const optionsArr = typeof options === 'string' ? JSON.parse(options) : options;
            const correctOption = optionsArr.find(o => o.id === correct_option_id);
            const selectedOption = optionsArr.find(o => o.id === answer.selectedOptionId);

            processedResponses.push({
                questionId: answer.questionId,
                content,
                options: optionsArr,
                selectedOptionId: answer.selectedOptionId,
                selectedOptionText: selectedOption ? selectedOption.text : answer.selectedOptionId,
                correctOptionId: correct_option_id,
                correctOptionText: correctOption ? correctOption.text : correct_option_id,
                isCorrect,
                difficulty
            });
        }

        const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

        // 2. Insert Quiz Attempt record
        const insertAttemptQuery = `
            INSERT INTO quiz_attempts (student_id, quiz_id, score)
            VALUES ($1, $2, $3)
            RETURNING id, completed_at
        `;
        const attemptRes = await client.query(insertAttemptQuery, [studentId, quizId, scorePercentage]);
        const attemptId = attemptRes.rows[0].id;

        // 3. Multi-row batch insert detailed responses for adaptive tracking (replaces loop with 1 query)
        if (processedResponses.length > 0) {
            const values = [];
            const placeholders = [];
            let paramIdx = 1;

            for (const response of processedResponses) {
                placeholders.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4})`);
                values.push(
                    attemptId,
                    response.questionId,
                    studentId,
                    response.isCorrect,
                    response.selectedOptionId
                );
                paramIdx += 5;
            }

            const insertResponsesQuery = `
                INSERT INTO question_responses (attempt_id, question_id, student_id, is_correct, selected_option_id)
                VALUES ${placeholders.join(', ')}
            `;
            await client.query(insertResponsesQuery, values);
        }

        // Recalculate dynamic completion percentage based on notes, videos and quiz attempts
        await recalculateProgress(studentId, topicId, client);

        // 5. Update user XP and maintain/update active streaks
        const userRes = await client.query(
            'SELECT xp_points, streak_count, last_active_date FROM users WHERE id = $1',
            [studentId]
        );
        const user = userRes.rows[0];

        // XP rewards: 10 XP for taking the quiz, plus 2 XP per correct answer
        const xpReward = 10 + (correctCount * 2);
        const newXp = user.xp_points + xpReward;

        // Streak computation
        let newStreak = user.streak_count;
        const getLocalDateString = (date) => {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const today = getLocalDateString(new Date());
        const lastActive = user.last_active_date ? getLocalDateString(user.last_active_date) : null;

        if (lastActive === null) {
            newStreak = 1;
        } else {
            const diffTime = Math.abs(new Date(today) - new Date(lastActive));
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                newStreak = user.streak_count + 1; // consecutive day
            } else if (diffDays > 1) {
                newStreak = 1; // streak broken, reset to 1
            }
            // If diffDays === 0, they already active today, keep same streak
        }

        await client.query(
            'UPDATE users SET xp_points = $1, streak_count = $2, last_active_date = $3 WHERE id = $4',
            [newXp, newStreak, today, studentId]
        );

        // 6. Check for Achievements Unlocked (Pre-fetch student's unlocked achievements to eliminate N queries)
        const achievementsUnlocked = [];
        const [achievementsRes, existingAchievementsRes] = await Promise.all([
            client.query('SELECT id, title, description, condition_type, condition_value FROM achievements'),
            client.query('SELECT achievement_id FROM user_achievements WHERE student_id = $1', [studentId])
        ]);
        const existingAchievementIds = new Set(existingAchievementsRes.rows.map(r => r.achievement_id));
        const newAchievementsToInsert = [];

        for (const achievement of achievementsRes.rows) {
            let unlocked = false;

            if (achievement.condition_type === 'XP' && newXp >= achievement.condition_value) {
                unlocked = true;
            } else if (achievement.condition_type === 'STREAK' && newStreak >= achievement.condition_value) {
                unlocked = true;
            } else if (achievement.condition_type === 'QUIZ_PERFECT' && scorePercentage === 100) {
                unlocked = true;
            }

            if (unlocked && !existingAchievementIds.has(achievement.id)) {
                newAchievementsToInsert.push(achievement);
                existingAchievementIds.add(achievement.id);
                achievementsUnlocked.push({
                    title: achievement.title,
                    description: achievement.description
                });
            }
        }

        if (newAchievementsToInsert.length > 0) {
            const values = [];
            const placeholders = [];
            let paramIdx = 1;
            for (const ach of newAchievementsToInsert) {
                placeholders.push(`($${paramIdx}, $${paramIdx + 1})`);
                values.push(studentId, ach.id);
                paramIdx += 2;
            }
            await client.query(
                `INSERT INTO user_achievements (student_id, achievement_id) VALUES ${placeholders.join(', ')}`,
                values
            );
        }

        // Calculate running average and attempts count using SQL aggregation
        const attemptsStatsRes = await client.query(
            'SELECT ROUND(AVG(score))::integer AS average_score, COUNT(id)::integer AS attempts_count FROM quiz_attempts WHERE student_id = $1 AND quiz_id = $2',
            [studentId, quizId]
        );
        const { average_score: avgFromDb, attempts_count: countFromDb } = attemptsStatsRes.rows[0] || {};
        const runningAverageScore = avgFromDb !== null && avgFromDb !== undefined ? avgFromDb : scorePercentage;
        const attemptsCount = countFromDb || 1;

        await client.query('COMMIT');
        return {
            attemptId,
            score: scorePercentage,
            averageScore: runningAverageScore,
            attemptsCount: attemptsCount,
            correctCount,
            totalQuestions,
            xpGained: xpReward,
            newStreak,
            achievementsUnlocked,
            questionReview: processedResponses.map(r => ({
                questionId: r.questionId,
                content: r.content,
                options: r.options,
                selectedOptionId: r.selectedOptionId,
                selectedOptionText: r.selectedOptionText,
                correctOptionId: r.correctOptionId,
                correctOptionText: r.correctOptionText,
                isCorrect: r.isCorrect,
                difficulty: r.difficulty
            }))
        };

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Quiz Engine Error] processQuizSubmission:', err.message);
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    getNextQuestion,
    processQuizSubmission
};
