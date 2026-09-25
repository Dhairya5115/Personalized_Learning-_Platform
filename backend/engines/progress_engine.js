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
        // Push counts and percentage calculation directly into PostgreSQL via CTE + atomic upsert
        const recalculateQuery = `
            WITH stats AS (
                SELECT 
                    (SELECT COUNT(*)::integer FROM materials WHERE topic_id = $2) AS total_materials,
                    (SELECT COUNT(DISTINCT cm.material_id)::integer 
                     FROM completed_materials cm 
                     JOIN materials m ON cm.material_id = m.id 
                     WHERE cm.student_id = $1 AND m.topic_id = $2) AS completed_materials,
                    (SELECT COUNT(*)::integer FROM quizzes WHERE topic_id = $2) AS total_quizzes,
                    (SELECT COUNT(DISTINCT qa.quiz_id)::integer 
                     FROM quiz_attempts qa 
                     JOIN quizzes q ON qa.quiz_id = q.id 
                     WHERE qa.student_id = $1 AND q.topic_id = $2) AS attempted_quizzes
            ),
            computed AS (
                SELECT 
                    CASE 
                        WHEN (total_materials + total_quizzes) > 0 
                        THEN LEAST(100, GREATEST(0, ROUND(((completed_materials + attempted_quizzes)::numeric / (total_materials + total_quizzes)::numeric) * 100)))::integer
                        ELSE 0 
                    END AS completion_percentage
                FROM stats
            )
            INSERT INTO progress (student_id, topic_id, completion_percentage, last_studied_at)
            VALUES ($1, $2, (SELECT completion_percentage FROM computed), CURRENT_TIMESTAMP)
            ON CONFLICT (student_id, topic_id)
            DO UPDATE SET completion_percentage = EXCLUDED.completion_percentage,
                          last_studied_at = CURRENT_TIMESTAMP
            RETURNING completion_percentage;
        `;
        const updateRes = await dbClient.query(recalculateQuery, [studentId, topicId]);
        return updateRes.rows[0].completion_percentage;
    } catch (err) {
        console.error(`[Progress Engine Error] failed to recalculate progress for student ${studentId}, topic ${topicId}:`, err.message);
        throw err;
    }
}

module.exports = {
    recalculateProgress
};
