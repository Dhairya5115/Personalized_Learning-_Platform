const db = require('../config/db');

/**
 * Fetch the next adaptive question for a student in a quiz.
 * @param {string} studentId 
 * @param {string} quizId 
 * @param {string} topicId 
 */
async function getNextQuestion(studentId, quizId, topicId) {
    try {
        // 1. Get the current skill score for this student and topic (default to 50 if new)
        const progressRes = await db.query(
            'SELECT skill_score FROM progress WHERE student_id = $1 AND topic_id = $2',
            [studentId, topicId]
        );
        const skillScore = progressRes.rows.length > 0 ? progressRes.rows[0].skill_score : 50;

        // 2. Map score to target difficulty
        let targetDifficulty = 'MEDIUM';
        if (skillScore < 40) {
            targetDifficulty = 'EASY';
        } else if (skillScore > 75) {
            targetDifficulty = 'HARD';
        }

        // 3. Find unanswered questions of this difficulty for this quiz
        let questionRes = await db.query(
            `SELECT q.id, q.content, q.options, q.difficulty 
             FROM questions q
             WHERE q.quiz_id = $1 AND q.difficulty = $2
               AND q.id NOT IN (
                   SELECT qr.question_id 
                   FROM question_responses qr
                   WHERE qr.student_id = $3
               )
             ORDER BY RANDOM() LIMIT 1`,
            [quizId, targetDifficulty, studentId]
        );

        // Fallback: If no unanswered questions exist in target tier, load from any difficulty
        if (questionRes.rows.length === 0) {
            questionRes = await db.query(
                `SELECT q.id, q.content, q.options, q.difficulty 
                 FROM questions q
                 WHERE q.quiz_id = $1
                   AND q.id NOT IN (
                       SELECT qr.question_id 
                       FROM question_responses qr
                       WHERE qr.student_id = $2
                   )
                 ORDER BY RANDOM() LIMIT 1`,
                [quizId, studentId]
            );
        }

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
                'SELECT correct_option_id, difficulty FROM questions WHERE id = $1',
                [answer.questionId]
            );

            if (questionRes.rows.length === 0) {
                throw new Error(`Question ${answer.questionId} not found`);
            }

            const { correct_option_id, difficulty } = questionRes.rows[0];
            const isCorrect = correct_option_id === answer.selectedOptionId;

            if (isCorrect) {
                correctCount++;
            }

            processedResponses.push({
                questionId: answer.questionId,
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

        // 3. Bulk insert detailed responses for adaptive tracking
        for (const response of processedResponses) {
            const insertResponseQuery = `
                INSERT INTO question_responses (attempt_id, question_id, student_id, is_correct)
                VALUES ($1, $2, $3, $4)
            `;
            await client.query(insertResponseQuery, [attemptId, response.questionId, studentId, response.isCorrect]);
        }

        // 4. Update topic skill score based on accuracy
        const progressRes = await client.query(
            'SELECT skill_score FROM progress WHERE student_id = $1 AND topic_id = $2',
            [studentId, topicId]
        );

        let currentSkill = progressRes.rows.length > 0 ? progressRes.rows[0].skill_score : 50;
        let newSkill = currentSkill;

        if (scorePercentage > 80) {
            newSkill = Math.min(100, currentSkill + 10);
        } else if (scorePercentage < 50) {
            newSkill = Math.max(0, currentSkill - 10);
        } else {
            newSkill = Math.min(100, currentSkill + 2); // completion reward
        }

        const updateProgressQuery = `
            INSERT INTO progress (student_id, topic_id, skill_score, completion_percentage, last_studied_at)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT (student_id, topic_id)
            DO UPDATE SET skill_score = EXCLUDED.skill_score, 
                          completion_percentage = LEAST(100, progress.completion_percentage + 15),
                          last_studied_at = CURRENT_TIMESTAMP
            RETURNING skill_score
        `;
        await client.query(updateProgressQuery, [studentId, topicId, newSkill, 15]);

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
        const today = new Date().toISOString().split('T')[0];
        const lastActive = user.last_active_date ? new Date(user.last_active_date).toISOString().split('T')[0] : null;

        if (lastActive === null) {
            newStreak = 1;
        } else {
            const diffTime = Math.abs(new Date(today) - new Date(lastActive));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

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
            oldSkill: currentSkill,
            newSkill,
            xpGained: xpReward,
            newStreak,
            achievementsUnlocked
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
