/**
 * Shared Quiz Scoring & Performance Calculation Utilities
 * 
 * Used across:
 * - QuizView (post-quiz results)
 * - Analytics / Performance page
 * - TA Assigned Students view
 * - Leaderboard
 */

/**
 * Calculates the running average across attempt scores.
 * - 1st attempt: Average = that attempt's score
 * - 2nd attempt: mean of 1st and 2nd attempt scores
 * - Nth attempt: mean of all N attempt scores so far
 * 
 * @param {Array<number|{score: number}>} attempts - Array of numeric scores or attempt objects with a score field
 * @returns {number} Rounded average score (0 - 100), or 0 if no attempts
 */
export function calculateAverageScore(attempts) {
    if (!attempts || !Array.isArray(attempts) || attempts.length === 0) {
        return 0;
    }

    const scores = attempts.map(item => {
        if (typeof item === 'number') return item;
        if (item && typeof item.score === 'number') return item.score;
        if (item && !isNaN(parseFloat(item.score))) return parseFloat(item.score);
        return 0;
    });

    if (scores.length === 0) return 0;

    const sum = scores.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / scores.length);
}

/**
 * Gets the most recent quiz attempt's score from a list of attempts.
 * 
 * @param {Array<number|{score: number, completed_at?: string}>} attempts 
 * @returns {number|null} Most recent score, or null if no attempts
 */
export function getRecentScore(attempts) {
    if (!attempts || !Array.isArray(attempts) || attempts.length === 0) {
        return null;
    }

    const last = attempts[attempts.length - 1];
    if (typeof last === 'number') return last;
    if (last && typeof last.score === 'number') return last.score;
    if (last && !isNaN(parseFloat(last.score))) return parseFloat(last.score);
    return null;
}
