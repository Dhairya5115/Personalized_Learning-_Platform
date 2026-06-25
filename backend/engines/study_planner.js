const db = require('../config/db');

/**
 * Generate a personalized study plan for a student based on their goals, weak topics, and available time.
 * @param {string} studentId 
 * @param {string} goalText 
 * @param {number} availableHoursDaily 
 * @param {string} examDateStr YYYY-MM-DD
 */
async function generateStudyPlan(studentId, goalText, availableHoursDaily, examDateStr) {
    try {
        const today = new Date();
        today.setHours(0,0,0,0);
        const examDate = new Date(examDateStr);
        examDate.setHours(0,0,0,0);

        // 1. Calculate days remaining until the exam
        const diffTime = examDate - today;
        const daysToExam = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        // Exam Urgency Weight (closer to exam = higher weight, max weight is 100)
        // Formula: maps days remaining onto 0-100 score. E.g. <= 3 days = 100, 30 days = 10, > 30 days = 5
        let examUrgencyScore = 5;
        if (daysToExam <= 3) {
            examUrgencyScore = 100;
        } else if (daysToExam <= 10) {
            examUrgencyScore = 75;
        } else if (daysToExam <= 30) {
            examUrgencyScore = 40;
        } else if (daysToExam <= 60) {
            examUrgencyScore = 20;
        }

        // 2. Fetch all student enrollments and courses
        const enrollmentsRes = await db.query(
            `SELECT course_id FROM enrollments WHERE student_id = $1 AND payment_status IN ('FREE', 'PAID')`,
            [studentId]
        );

        if (enrollmentsRes.rows.length === 0) {
            throw new Error('Student is not enrolled in any courses. Cannot generate study plan.');
        }

        const courseIds = enrollmentsRes.rows.map(row => row.course_id);

        // 3. Fetch all topics for these courses
        const topicsRes = await db.query(
            `SELECT id, title, course_id, sequence_order FROM topics WHERE course_id = ANY($1)`,
            [courseIds]
        );

        if (topicsRes.rows.length === 0) {
            throw new Error('No topics found in enrolled courses.');
        }

        const topics = topicsRes.rows;

        // 4. Fetch student progress (skill scores) for these topics
        const progressRes = await db.query(
            `SELECT topic_id, skill_score FROM progress WHERE student_id = $1`,
            [studentId]
        );
        const skillScoreMap = {};
        progressRes.rows.forEach(p => {
            skillScoreMap[p.topic_id] = p.skill_score;
        });

        // 5. Fetch spaced repetition status (pending review counts per material/topic)
        const overdueSrsRes = await db.query(
            `SELECT m.topic_id, COUNT(sr.id) as count 
             FROM spaced_repetition sr
             JOIN materials m ON sr.material_id = m.id
             WHERE sr.student_id = $1 AND sr.next_review_date <= $2
             GROUP BY m.topic_id`,
            [studentId, today.toISOString().split('T')[0]]
        );
        const overdueSrsMap = {};
        overdueSrsRes.rows.forEach(item => {
            overdueSrsMap[item.topic_id] = parseInt(item.count) || 0;
        });

        // 6. Compute priority score for each topic
        // Priority Score = (0.40 * Urgency) + (0.35 * (100 - SkillScore)) + (0.25 * OverdueCount * 20)
        const prioritizedTopics = topics.map(topic => {
            const skillScore = skillScoreMap[topic.id] !== undefined ? skillScoreMap[topic.id] : 50;
            const overdueCount = overdueSrsMap[topic.id] || 0;

            const weaknessScore = 100 - skillScore; // Low skill score = high priority
            const srsUrgency = Math.min(100, overdueCount * 20); // Cap srs contribution at 100

            const priorityScore = (0.40 * examUrgencyScore) + (0.35 * weaknessScore) + (0.25 * srsUrgency);

            return {
                ...topic,
                skillScore,
                overdueCount,
                priorityScore: parseFloat(priorityScore.toFixed(2))
            };
        });

        // Sort topics: highest priority first
        prioritizedTopics.sort((a, b) => b.priorityScore - a.priorityScore);

        // 7. Schedule study sessions for a 7-day rolling window
        const schedule = [];
        const studyDays = 7;
        
        for (let dayOffset = 0; dayOffset < studyDays; dayOffset++) {
            const targetDate = new Date();
            targetDate.setDate(today.getDate() + dayOffset);
            const targetDateStr = targetDate.toISOString().split('T')[0];

            // Distribute available study time across top priority topics (cap at 2 topics per day to prevent overload)
            const dailyAllocation = [];
            const topicsToStudy = prioritizedTopics.slice(0, 2);

            if (topicsToStudy.length > 0) {
                const hoursPerTopic = parseFloat((availableHoursDaily / topicsToStudy.length).toFixed(1));
                topicsToStudy.forEach(topic => {
                    dailyAllocation.push({
                        topicId: topic.id,
                        topicTitle: topic.title,
                        hours: hoursPerTopic,
                        focusArea: topic.skillScore < 40 ? 'Foundational Notes' : topic.skillScore < 75 ? 'Practice Quizzes' : 'Advanced Explanations'
                    });
                });
            }

            schedule.push({
                date: targetDateStr,
                dayName: targetDate.toLocaleDateString('en-US', { weekday: 'long' }),
                allocation: dailyAllocation
            });
        }

        // 8. Save generated study plan to DB
        const startDateStr = today.toISOString().split('T')[0];
        const endDateStr = new Date(today.getTime() + (studyDays - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const insertQuery = `
            INSERT INTO study_plans (student_id, goal, available_hours_daily, start_date, end_date, plan_schedule)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, plan_schedule, created_at
        `;
        const result = await db.query(insertQuery, [
            studentId,
            goalText,
            availableHoursDaily,
            startDateStr,
            endDateStr,
            JSON.stringify(schedule)
        ]);

        return result.rows[0];

    } catch (err) {
        console.error('[Study Planner Error] generateStudyPlan:', err.message);
        throw err;
    }
}

module.exports = {
    generateStudyPlan
};
