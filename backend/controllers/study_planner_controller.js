const plannerEngine = require('../engines/study_planner');
const db = require('../config/db');

/**
 * Generate a study plan for the logged-in student
 */
async function generatePlan(req, res) {
    const { goal, availableHours, examDate } = req.body;
    const studentId = req.user.id;

    if (!goal || !availableHours || !examDate) {
        return res.status(400).json({ error: 'goal, availableHours, and examDate (YYYY-MM-DD) are required' });
    }

    try {
        const plan = await plannerEngine.generateStudyPlan(
            studentId,
            goal,
            parseFloat(availableHours),
            examDate
        );

        return res.status(201).json({
            success: true,
            message: 'Study planner generated successfully',
            plan
        });
    } catch (err) {
        console.error('Generate plan controller error:', err.message);
        return res.status(500).json({ error: err.message || 'Internal server error generating study planner' });
    }
}

/**
 * Fetch the latest generated plan for the student
 */
async function getLatestPlan(req, res) {
    const studentId = req.user.id;

    try {
        const queryText = `
            SELECT * FROM study_plans
            WHERE student_id = $1
            ORDER BY created_at DESC
            LIMIT 1
        `;
        const result = await db.query(queryText, [studentId]);

        if (result.rows.length === 0) {
            return res.json({ 
                success: true, 
                hasPlan: false, 
                message: 'No study plan generated yet.' 
            });
        }

        return res.json({
            success: true,
            hasPlan: true,
            plan: result.rows[0]
        });

    } catch (err) {
        console.error('Fetch latest plan error:', err.message);
        return res.status(500).json({ error: 'Internal server error fetching study plan' });
    }
}

module.exports = {
    generatePlan,
    getLatestPlan
};
