const db = require('../config/db');
const emailService = require('./email_service');

/**
 * Scan database for students with pending spaced repetition reviews and email them reminders.
 */
async function checkAndSendSRSReminders() {
    console.log('[Scheduler] Running Daily Spaced Repetition alerts check...');
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Find users with overdue items count
        const queryText = `
            SELECT u.id, u.email, u.first_name, COUNT(sr.id) as overdue_count
            FROM users u
            JOIN spaced_repetition sr ON u.id = sr.student_id
            WHERE sr.next_review_date <= $1
            GROUP BY u.id, u.email, u.first_name
        `;
        const result = await db.query(queryText, [todayStr]);

        console.log(`[Scheduler] Found ${result.rows.length} users with overdue reviews`);

        for (const row of result.rows) {
            const count = parseInt(row.overdue_count);
            if (count > 0) {
                await emailService.sendSpacedRepetitionReminder(row.email, row.first_name, count);
            }
        }
        console.log('[Scheduler] Spaced Repetition reminders scan finished successfully');
    } catch (err) {
        console.error('[Scheduler Error] checkAndSendSRSReminders:', err.message);
    }
}

/**
 * Scan database for students whose learning streaks are about to reset and send them warning alerts.
 */
async function checkAndSendStreakWarnings() {
    console.log('[Scheduler] Running Streak Protection warnings scan...');
    try {
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const todayStr = today.toISOString().split('T')[0];

        // Find users whose last active date was yesterday and have a streak count > 0,
        // and have not been active today.
        const queryText = `
            SELECT id, email, first_name, streak_count 
            FROM users
            WHERE streak_count > 0 
              AND last_active_date = $1
              AND id NOT IN (
                  SELECT id FROM users WHERE last_active_date = $2
              )
        `;
        const result = await db.query(queryText, [yesterday, todayStr]);

        console.log(`[Scheduler] Found ${result.rows.length} users whose streaks are expiring today`);

        for (const user of result.rows) {
            await emailService.sendStreakWarning(user.email, user.first_name, user.streak_count);
        }
        console.log('[Scheduler] Streak protection warnings scan finished successfully');
    } catch (err) {
        console.error('[Scheduler Error] checkAndSendStreakWarnings:', err.message);
    }
}

/**
 * Start the periodic background scheduler (simulating standard cron patterns)
 */
function startScheduler() {
    console.log('Background Alert Scheduler service initialized successfully');
    
    // Run checks once on server boot (after a 5 second delay to let server connections resolve)
    setTimeout(() => {
        checkAndSendSRSReminders();
        checkAndSendStreakWarnings();
    }, 5000);

    // Schedule to run every 12 hours (43,200,000 milliseconds)
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
    setInterval(() => {
        checkAndSendSRSReminders();
        checkAndSendStreakWarnings();
    }, TWELVE_HOURS_MS);
}

module.exports = {
    checkAndSendSRSReminders,
    checkAndSendStreakWarnings,
    startScheduler
};
