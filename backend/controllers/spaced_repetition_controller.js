const srsEngine = require('../engines/spaced_repetition');
const db = require('../config/db');

/**
 * Fetch all learning materials overdue for review for this student
 */
async function getOverdueReviews(req, res) {
    const studentId = req.user.id;
    const todayStr = new Date().toISOString().split('T')[0];

    try {
        const queryText = `
            SELECT sr.*, m.title as material_title, m.type as material_type, m.file_url, t.title as topic_title
            FROM spaced_repetition sr
            JOIN materials m ON sr.material_id = m.id
            JOIN topics t ON m.topic_id = t.id
            WHERE sr.student_id = $1 AND sr.next_review_date <= $2
            ORDER BY sr.next_review_date ASC
        `;
        const result = await db.query(queryText, [studentId, todayStr]);
        return res.json(result.rows);
    } catch (err) {
        console.error('Fetch overdue reviews error:', err.message);
        return res.status(500).json({ error: 'Internal server error fetching overdue reviews' });
    }
}

/**
 * Submit study review evaluation (rating: 0 to 5) for a card/material
 */
async function submitReview(req, res) {
    const { materialId, quality } = req.body;
    const studentId = req.user.id;

    if (!materialId || quality === undefined) {
        return res.status(400).json({ error: 'materialId and review quality (0-5) are required' });
    }

    const reviewQuality = parseInt(quality);
    if (reviewQuality < 0 || reviewQuality > 5) {
        return res.status(400).json({ error: 'Review quality must be an integer between 0 and 5 inclusive' });
    }

    try {
        // Fetch existing spaced repetition record
        const cardRes = await db.query(
            'SELECT * FROM spaced_repetition WHERE student_id = $1 AND material_id = $2',
            [studentId, materialId]
        );

        let previousRepetitions = 0;
        let previousInterval = 1;
        let previousEF = 2.5;
        let cardExists = false;

        if (cardRes.rows.length > 0) {
            const card = cardRes.rows[0];
            previousRepetitions = card.repetitions;
            previousInterval = card.interval_days;
            previousEF = parseFloat(card.easiness_factor);
            cardExists = true;
        }

        // Calculate next scheduling parameters
        const nextSrs = srsEngine.calculateNextSRS(
            reviewQuality,
            previousRepetitions,
            previousInterval,
            previousEF
        );

        let resultCard;
        if (cardExists) {
            const updateQuery = `
                UPDATE spaced_repetition 
                SET repetitions = $1, interval_days = $2, easiness_factor = $3, next_review_date = $4, last_reviewed_at = CURRENT_TIMESTAMP
                WHERE student_id = $5 AND material_id = $6
                RETURNING *
            `;
            const updateRes = await db.query(updateQuery, [
                nextSrs.repetitions,
                nextSrs.interval,
                nextSrs.easinessFactor,
                nextSrs.nextReviewDate.toISOString().split('T')[0],
                studentId,
                materialId
            ]);
            resultCard = updateRes.rows[0];
        } else {
            const insertQuery = `
                INSERT INTO spaced_repetition (student_id, material_id, repetitions, interval_days, easiness_factor, next_review_date)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            const insertRes = await db.query(insertQuery, [
                studentId,
                materialId,
                nextSrs.repetitions,
                nextSrs.interval,
                nextSrs.easinessFactor,
                nextSrs.nextReviewDate.toISOString().split('T')[0]
            ]);
            resultCard = insertRes.rows[0];
        }

        // Award small XP points reward (e.g. 5 XP) on successful recalls
        let xpGained = 0;
        if (reviewQuality >= 3) {
            xpGained = 5;
            await db.query('UPDATE users SET xp_points = xp_points + $1 WHERE id = $2', [xpGained, studentId]);
        }

        return res.json({
            success: true,
            message: 'Concept review status recorded successfully',
            xpGained,
            card: {
                id: resultCard.id,
                repetitions: resultCard.repetitions,
                intervalDays: resultCard.interval_days,
                easinessFactor: parseFloat(resultCard.easiness_factor),
                nextReviewDate: resultCard.next_review_date
            }
        });

    } catch (err) {
        console.error('Submit review controller error:', err.message);
        return res.status(500).json({ error: 'Internal server error processing review submission' });
    }
}

/**
 * Register a learning material to a student's Spaced Repetition card-deck (Student bookmarks it)
 */
async function registerMaterialForSrs(req, res) {
    const { materialId } = req.body;
    const studentId = req.user.id;

    if (!materialId) {
        return res.status(400).json({ error: 'materialId is required' });
    }

    try {
        // Validate material exists
        const matRes = await db.query('SELECT id FROM materials WHERE id = $1', [materialId]);
        if (matRes.rows.length === 0) {
            return res.status(404).json({ error: 'Material not found' });
        }

        // Check if already registered
        const checkRes = await db.query(
            'SELECT id FROM spaced_repetition WHERE student_id = $1 AND material_id = $2',
            [studentId, materialId]
        );

        if (checkRes.rows.length > 0) {
            return res.status(409).json({ error: 'Material is already in your review deck' });
        }

        // Register default review details
        const todayStr = new Date().toISOString().split('T')[0];
        const insertQuery = `
            INSERT INTO spaced_repetition (student_id, material_id, repetitions, interval_days, easiness_factor, next_review_date)
            VALUES ($1, $2, 0, 1, 2.50, $3)
            RETURNING *
        `;
        const result = await db.query(insertQuery, [studentId, materialId, todayStr]);

        return res.status(201).json({
            success: true,
            message: 'Material bookmarked for spaced reviews',
            card: result.rows[0]
        });

    } catch (err) {
        console.error('Register material review error:', err.message);
        return res.status(500).json({ error: 'Internal server error adding material reviews' });
    }
}

module.exports = {
    getOverdueReviews,
    submitReview,
    registerMaterialForSrs
};
