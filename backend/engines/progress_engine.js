const db = require('../config/db');

/**
 * Recalculate progress for a student on a specific topic.
 * Formula: completion_percentage = ((completed_materials + attempted_quizzes) / (total_materials + total_quizzes)) * 100
 * @param {string} studentId 
 * @param {string} topicId 
 * @param {object} [client] Optional pg Client for running inside a transaction
 */
async function recalculateProgress(studentId, topicId, client) {
    const dbClient = client || db;

    try {
        // 1. Get total materials for this topic
        const materialsCountRes = await dbClient.query(
            'SELECT COUNT(*)::integer as count FROM materials WHERE topic_id = $1',
            [topicId]
        );
        const totalMaterials = materialsCountRes.rows[0].count;

        // 2. Get completed materials for this student on this topic
        const completedMaterialsRes = await dbClient.query(
            `SELECT COUNT(DISTINCT cm.material_id)::integer as count 
             FROM completed_materials cm 
             JOIN materials m ON cm.material_id = m.id 
             WHERE cm.student_id = $1 AND m.topic_id = $2`,
            [studentId, topicId]
        );
        const completedMaterials = completedMaterialsRes.rows[0].count;

        // 3. Get total quizzes for this topic
        const quizzesCountRes = await dbClient.query(
            'SELECT COUNT(*)::integer as count FROM quizzes WHERE topic_id = $1',
            [topicId]
        );
        const totalQuizzes = quizzesCountRes.rows[0].count;

        // 4. Get attempted quizzes for this student on this topic
        const attemptedQuizzesRes = await dbClient.query(
            `SELECT COUNT(DISTINCT qa.quiz_id)::integer as count 
             FROM quiz_attempts qa 
             JOIN quizzes q ON qa.quiz_id = q.id 
             WHERE qa.student_id = $1 AND q.topic_id = $2`,
            [studentId, topicId]
        );
        const attemptedQuizzes = attemptedQuizzesRes.rows[0].count;

        const totalItems = totalMaterials + totalQuizzes;
        let completionPercentage = 0;

        if (totalItems > 0) {
            completionPercentage = Math.round(((completedMaterials + attemptedQuizzes) / totalItems) * 100);
            completionPercentage = Math.min(100, Math.max(0, completionPercentage));
        }

        // 5. Update or insert the progress row
        const updateQuery = `
            INSERT INTO progress (student_id, topic_id, completion_percentage, last_studied_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            ON CONFLICT (student_id, topic_id)
            DO UPDATE SET completion_percentage = EXCLUDED.completion_percentage,
                          last_studied_at = CURRENT_TIMESTAMP
            RETURNING completion_percentage
        `;
        const updateRes = await dbClient.query(updateQuery, [studentId, topicId, completionPercentage]);
        return updateRes.rows[0].completion_percentage;
    } catch (err) {
        console.error(`[Progress Engine Error] failed to recalculate progress for student ${studentId}, topic ${topicId}:`, err.message);
        throw err;
    }
}

module.exports = {
    recalculateProgress
};
