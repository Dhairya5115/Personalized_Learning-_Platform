/**
 * Calculates the next spaced repetition intervals based on the SuperMemo-2 (SM-2) algorithm.
 * @param {number} quality Recall quality evaluation (0-5)
 * @param {number} previousRepetitions Number of times card was successfully recalled consecutively
 * @param {number} previousInterval Previous study interval in days
 * @param {number|string} previousEF Previous Easiness Factor (EF)
 * @returns {object} { repetitions, interval (days), easinessFactor, nextReviewDate }
 */
function calculateNextSRS(quality, previousRepetitions, previousInterval, previousEF) {
    let repetitions = parseInt(previousRepetitions) || 0;
    let interval = parseInt(previousInterval) || 1;
    let ef = parseFloat(previousEF) || 2.5;

    // Boundary validation for quality (0 to 5)
    quality = Math.max(0, Math.min(5, parseInt(quality)));

    // Quality >= 3 represents a correct response
    if (quality >= 3) {
        if (repetitions === 0) {
            interval = 1;
        } else if (repetitions === 1) {
            interval = 6;
        } else {
            interval = Math.round(interval * ef);
        }
        repetitions++;
    } else {
        // Incorrect response: reset progress but retain EF
        repetitions = 0;
        interval = 1;
    }

    // Adjust Easiness Factor (EF) using the SuperMemo-2 formula
    ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    
    // Ensure EF does not fall below the floor value of 1.3
    if (ef < 1.3) {
        ef = 1.3;
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);
    // Strip time portion to keep comparison at day precision
    nextReviewDate.setHours(0, 0, 0, 0);

    return {
        repetitions,
        interval,
        easinessFactor: parseFloat(ef.toFixed(2)),
        nextReviewDate
    };
}

module.exports = {
    calculateNextSRS
};
