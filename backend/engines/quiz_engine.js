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

        let correctCount = 0;
        const totalQuestions = answers.length;
        const processedResponses = [];

        // 1. Evaluate answers
        for (const answer of answers) {
            const questionRes = await client.query(
                'SELECT correct_option_id, difficulty, content, options FROM questions WHERE id = $1',
                [answer.questionId]
            );

            if (questionRes.rows.length === 0) {
                throw new Error(`Question ${answer.questionId} not found`);
            }

            const { correct_option_id, difficulty, content, options } = questionRes.rows[0];
            const isCorrect = correct_option_id === answer.selectedOptionId;

            if (isCorrect) {
                correctCount++;
            }

            // Find the text of the correct option for review display
            const optionsArr = typeof options === 'string' ? JSON.parse(options) : options;
            const correctOption = optionsArr.find(o => o.id === correct_option_id);

            processedResponses.push({
                questionId: answer.questionId,
                content,
                isCorrect,
                difficulty,
                correctOptionText: correctOption ? correctOption.text : correct_option_id
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

        // 3. Bulk insert detailed responses for adaptive tracking
        for (const response of processedResponses) {
            const insertResponseQuery = `
                INSERT INTO question_responses (attempt_id, question_id, student_id, is_correct)
                VALUES ($1, $2, $3, $4)
            `;
            await client.query(insertResponseQuery, [attemptId, response.questionId, studentId, response.isCorrect]);
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

        // 6. Check for Achievements Unlocked
        const achievementsUnlocked = [];
        const achievementsRes = await client.query('SELECT * FROM achievements');
        for (const achievement of achievementsRes.rows) {
            let unlocked = false;

            if (achievement.condition_type === 'XP' && newXp >= achievement.condition_value) {
                unlocked = true;
            } else if (achievement.condition_type === 'STREAK' && newStreak >= achievement.condition_value) {
                unlocked = true;
            } else if (achievement.condition_type === 'QUIZ_PERFECT' && scorePercentage === 100) {
                unlocked = true;
            }

            if (unlocked) {
                // Check if user already unlocked it
                const userAchieveRes = await client.query(
                    'SELECT id FROM user_achievements WHERE student_id = $1 AND achievement_id = $2',
                    [studentId, achievement.id]
                );
                if (userAchieveRes.rows.length === 0) {
                    await client.query(
                        'INSERT INTO user_achievements (student_id, achievement_id) VALUES ($1, $2)',
                        [studentId, achievement.id]
                    );
                    achievementsUnlocked.push({
                        title: achievement.title,
                        description: achievement.description
                    });
                }
            }
        }

        await client.query('COMMIT');
        return {
            attemptId,
            score: scorePercentage,
            correctCount,
            totalQuestions,
            xpGained: xpReward,
            newStreak,
            achievementsUnlocked,
            questionReview: processedResponses.map(r => ({
                content: r.content,
                isCorrect: r.isCorrect,
                difficulty: r.difficulty,
                correctOptionText: r.correctOptionText
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
