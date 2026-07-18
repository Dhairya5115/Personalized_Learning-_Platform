const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { recalculateProgress } = require('../engines/progress_engine');

/**
 * Get all courses
 */
async function getAllCourses(req, res) {
    try {
        const queryText = `
            SELECT c.*, u.first_name as teacher_first_name, u.last_name as teacher_last_name
            FROM courses c
            LEFT JOIN users u ON c.teacher_id = u.id
            ORDER BY c.created_at DESC
        `;
        const result = await db.query(queryText);
        return res.json(result.rows);
    } catch (err) {
        console.error('Get all courses error:', err.message);
        return res.status(500).json({ error: 'Internal server error fetching courses' });
    }
}

/**
 * Get course details by ID
 */
async function getCourseById(req, res) {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT * FROM courses WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        return res.json(result.rows[0]);
    } catch (err) {
        console.error('Get course by id error:', err.message);
        return res.status(500).json({ error: 'Internal server error fetching course' });
    }
}

/**
 * Create a new course (Teacher or Admin)
 */
async function createCourse(req, res) {
    const { title, description, price } = req.body;
    const teacherId = req.user.id;

    if (!title) {
        return res.status(400).json({ error: 'Course title is required' });
    }

    const coursePrice = price ? parseFloat(price) : 0.00;

    try {
        const queryText = `
            INSERT INTO courses (title, description, price, teacher_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await db.query(queryText, [title, description, coursePrice, teacherId]);
        return res.status(201).json({ success: true, course: result.rows[0] });
    } catch (err) {
        console.error('Create course error:', err.message);
        return res.status(500).json({ error: 'Internal server error creating course' });
    }
}

/**
 * Get topics of a specific course
 */
async function getTopicsByCourse(req, res) {
    const { courseId } = req.params;
    const userId = req.user ? req.user.id : null;
    const userRole = req.user ? req.user.role : null;

    try {
        let queryText = '';
        let queryParams = [];

        if (userRole === 'STUDENT') {
            queryText = `
                SELECT t.*, 
                       COALESCE(p.skill_score, 0) as skill_score, 
                       COALESCE(p.completion_percentage, 0) as completion_percentage
                FROM topics t
                LEFT JOIN progress p ON t.id = p.topic_id AND p.student_id = $2
                WHERE t.course_id = $1
                ORDER BY t.sequence_order ASC
            `;
            queryParams = [courseId, userId];
        } else {
            queryText = `
                SELECT t.*, 0 as skill_score, 0 as completion_percentage
                FROM topics t
                WHERE t.course_id = $1
                ORDER BY t.sequence_order ASC
            `;
            queryParams = [courseId];
        }

        const result = await db.query(queryText, queryParams);
        return res.json(result.rows);
    } catch (err) {
        console.error('Get topics error:', err.message);
        return res.status(500).json({ error: 'Internal server error fetching topics' });
    }
}

/**
 * Create a new topic inside a course (Teacher or Admin)
 */
async function createTopic(req, res) {
    const { courseId } = req.params;
    const { title, description, sequenceOrder } = req.body;

    if (!title || sequenceOrder === undefined) {
        return res.status(400).json({ error: 'Topic title and sequenceOrder are required' });
    }

    try {
        // Validate course exists and teacher owns it
        const courseCheck = await db.query('SELECT teacher_id FROM courses WHERE id = $1', [courseId]);
        if (courseCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        if (courseCheck.rows[0].teacher_id !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'You are not authorized to add topics to this course' });
        }

        const queryText = `
            INSERT INTO topics (course_id, title, description, sequence_order)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await db.query(queryText, [courseId, title, description, sequenceOrder]);
        return res.status(201).json({ success: true, topic: result.rows[0] });
    } catch (err) {
        console.error('Create topic error:', err.message);
        return res.status(500).json({ error: 'Internal server error creating topic' });
    }
}

/**
 * Enroll a student in a course
 */
async function enrollInCourse(req, res) {
    const { courseId } = req.body;
    const studentId = req.user.id;

    try {
        // Check if course exists
        const courseResult = await db.query('SELECT * FROM courses WHERE id = $1', [courseId]);
        if (courseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        const course = courseResult.rows[0];

        // Check if already enrolled
        const enrollCheck = await db.query(
            'SELECT id, payment_status FROM enrollments WHERE student_id = $1 AND course_id = $2',
            [studentId, courseId]
        );

        if (enrollCheck.rows.length > 0) {
            return res.status(409).json({ 
                error: 'Already enrolled in this course', 
                paymentStatus: enrollCheck.rows[0].payment_status 
            });
        }

        // If course is free (price = 0), enroll directly
        if (parseFloat(course.price) === 0) {
            await db.query(
                'INSERT INTO enrollments (student_id, course_id, payment_status) VALUES ($1, $2, $3)',
                [studentId, courseId, 'FREE']
            );
            return res.status(201).json({ success: true, paymentRequired: false, message: 'Enrolled in free course successfully' });
        }

        // If paid, instruct student client to initialize Razorpay checkout order
        return res.json({ 
            success: true, 
            paymentRequired: true, 
            message: 'Course requires payment. Please initiate payment order.', 
            price: course.price 
        });

    } catch (err) {
        console.error('Enroll course error:', err.message);
        return res.status(500).json({ error: 'Internal server error during enrollment' });
    }
}

/**
 * Get all courses student is enrolled in
 */
async function getEnrolledCourses(req, res) {
    const studentId = req.user.id;
    try {
        const queryText = `
            SELECT c.*, e.payment_status, e.enrolled_at 
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.student_id = $1
        `;
        const result = await db.query(queryText, [studentId]);
        return res.json(result.rows);
    } catch (err) {
        console.error('Get enrolled courses error:', err.message);
        return res.status(500).json({ error: 'Internal server error fetching enrollments' });
    }
}

async function getMaterialsByTopic(req, res) {
    const { topicId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        let queryText = '';
        let queryParams = [];

        if (userRole === 'STUDENT') {
            queryText = `
                SELECT m.*, 
                       (sr.id IS NOT NULL) AS is_bookmarked,
                       (cm.id IS NOT NULL) AS is_completed,
                       (
                           NOT m.is_premium OR
                           COALESCE(e.payment_status, '') = 'PAID' OR
                           EXISTS(
                               SELECT 1 FROM payments p 
                               WHERE p.student_id = $2 AND p.material_id = m.id AND p.status = 'SUCCESS'
                           )
                       ) AS is_unlocked
                FROM materials m
                LEFT JOIN spaced_repetition sr ON m.id = sr.material_id AND sr.student_id = $2
                LEFT JOIN completed_materials cm ON m.id = cm.material_id AND cm.student_id = $2
                LEFT JOIN topics t ON m.topic_id = t.id
                LEFT JOIN enrollments e ON t.course_id = e.course_id AND e.student_id = $2
                WHERE m.topic_id = $1
                ORDER BY m.created_at ASC
            `;
            queryParams = [topicId, userId];
        } else {
            queryText = `
                SELECT m.*, false AS is_bookmarked, false AS is_completed, true AS is_unlocked
                FROM materials m
                WHERE m.topic_id = $1
                ORDER BY m.created_at ASC
            `;
            queryParams = [topicId];
        }

        const result = await db.query(queryText, queryParams);

        // Redact file_url for locked premium items for students
        const rows = result.rows.map(row => {
            if (userRole === 'STUDENT' && !row.is_unlocked) {
                return {
                    ...row,
                    file_url: '' // Redact url to prevent downloading without purchase
                };
            }
            return row;
        });

        return res.json(rows);
    } catch (err) {
        console.error('Get materials error:', err.message);
        return res.status(500).json({ error: 'Internal server error fetching materials' });
    }
}

async function createMaterial(req, res) {
    const { topicId } = req.params;
    const { title, type, fileUrl, isPremium, price } = req.body;

    if (!title || !type || !fileUrl) {
        return res.status(400).json({ error: 'Title, type (PDF/VIDEO), and fileUrl are required' });
    }

    const materialPrice = isPremium ? (price ? parseFloat(price) : 49.00) : 0.00;
    const materialIsPremium = !!isPremium;

    try {
        // Validate topic exists and teacher owns course
        const topicCheck = await db.query(`
            SELECT t.id, c.teacher_id 
            FROM topics t
            JOIN courses c ON t.course_id = c.id
            WHERE t.id = $1
        `, [topicId]);
        if (topicCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Topic not found' });
        }
        if (topicCheck.rows[0].teacher_id !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'You are not authorized to add materials to this topic' });
        }

        const queryText = `
            INSERT INTO materials (topic_id, title, type, file_url, is_premium, price)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const result = await db.query(queryText, [topicId, title, type, fileUrl, materialIsPremium, materialPrice]);
        return res.status(201).json({ success: true, material: result.rows[0] });
    } catch (err) {
        console.error('Create material error:', err.message);
        return res.status(500).json({ error: 'Internal server error creating material' });
    }
}

async function deleteMaterial(req, res) {
    const { id } = req.params;
    try {
        // Validate material exists and teacher owns course
        const materialCheck = await db.query(`
            SELECT m.id, c.teacher_id 
            FROM materials m
            JOIN topics t ON m.topic_id = t.id
            JOIN courses c ON t.course_id = c.id
            WHERE m.id = $1
        `, [id]);
        if (materialCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Material not found' });
        }
        if (materialCheck.rows[0].teacher_id !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'You are not authorized to delete this material' });
        }

        const result = await db.query('DELETE FROM materials WHERE id = $1 RETURNING *', [id]);
        return res.json({ success: true, message: 'Material deleted successfully', material: result.rows[0] });
    } catch (err) {
        console.error('Delete material error:', err.message);
        return res.status(500).json({ error: 'Internal server error deleting material' });
    }
}

async function completeMaterial(req, res) {
    const { id: materialId } = req.params;
    const studentId = req.user.id;

    try {
        // 1. Verify that the material exists, and check if it is unlocked
        const checkQuery = `
            SELECT m.topic_id,
                   (
                       NOT m.is_premium OR
                       COALESCE(e.payment_status, '') = 'PAID' OR
                       EXISTS(
                           SELECT 1 FROM payments p 
                           WHERE p.student_id = $2 AND p.material_id = m.id AND p.status = 'SUCCESS'
                       )
                   ) AS is_unlocked
            FROM materials m
            LEFT JOIN topics t ON m.topic_id = t.id
            LEFT JOIN enrollments e ON t.course_id = e.course_id AND e.student_id = $2
            WHERE m.id = $1
        `;
        const checkRes = await db.query(checkQuery, [materialId, studentId]);
        if (checkRes.rows.length === 0) {
            return res.status(404).json({ error: 'Material not found' });
        }
        const { topic_id: topicId, is_unlocked: isUnlocked } = checkRes.rows[0];

        if (!isUnlocked) {
            return res.status(403).json({ error: 'This material is premium and locked. You must purchase it first.' });
        }

        // 2. Mark as completed
        const insertQuery = `
            INSERT INTO completed_materials (student_id, material_id)
            VALUES ($1, $2)
            ON CONFLICT (student_id, material_id) DO NOTHING
        `;
        await db.query(insertQuery, [studentId, materialId]);

        // 3. Recalculate progress for this student and topic
        const newProgress = await recalculateProgress(studentId, topicId);

        return res.json({
            success: true,
            message: 'Material marked as completed',
            completionPercentage: newProgress
        });
    } catch (err) {
        console.error('Complete material error:', err.message);
        return res.status(500).json({ error: 'Internal server error completing material' });
    }
}

/**
 * Handle direct local file upload via base64 payloads
 */
async function uploadLocalFile(req, res) {
    const { filename, fileData } = req.body;

    if (!filename || !fileData) {
        return res.status(400).json({ error: 'Filename and base64 fileData are required' });
    }

    try {
        // Create directory public/uploads if not exists
        const dir = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }

        // Clean filename to prevent path traversal
        const safeName = Date.now() + '_' + path.basename(filename);
        const filePath = path.join(dir, safeName);

        // Convert base64 data to buffer and write
        const base64Content = fileData.split(';base64,').pop();
        fs.writeFileSync(filePath, base64Content, { encoding: 'base64' });

        const fileUrl = `http://localhost:5000/uploads/${safeName}`;
        return res.json({ success: true, fileUrl });
    } catch (err) {
        console.error('Local file upload error:', err.message);
        return res.status(500).json({ error: 'Failed to write local file' });
    }
}

/**
 * Get comprehensive student progress metrics for courses taught by the teacher
 */
async function getTeacherStudentProgress(req, res) {
    const teacherId = req.user.id;

    try {
        // 1. Get courses taught by this teacher
        const coursesRes = await db.query(
            'SELECT id, title, description, price FROM courses WHERE teacher_id = $1',
            [teacherId]
        );
        const courses = coursesRes.rows;
        const courseIds = courses.map(c => c.id);

        if (courseIds.length === 0) {
            return res.json({ success: true, students: [], courses: [] });
        }

        // 2. Get enrolled students
        const enrollmentsRes = await db.query(`
            SELECT 
                e.id AS enrollment_id,
                e.course_id,
                c.title AS course_title,
                e.student_id,
                u.first_name,
                u.last_name,
                u.email,
                u.xp_points,
                u.streak_count,
                e.enrolled_at,
                e.payment_status
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            JOIN users u ON e.student_id = u.id
            WHERE c.teacher_id = $1
            ORDER BY u.last_name, u.first_name
        `, [teacherId]);
        const enrollments = enrollmentsRes.rows;
        const studentIds = [...new Set(enrollments.map(e => e.student_id))];

        // 3. Get all topics for these courses
        const topicsRes = await db.query(`
            SELECT t.id, t.course_id, t.title, t.sequence_order
            FROM topics t
            WHERE t.course_id = ANY($1)
            ORDER BY t.course_id, t.sequence_order
        `, [courseIds]);
        const topics = topicsRes.rows;

        // 4. Get progress records for these students
        let progressRecords = [];
        if (studentIds.length > 0) {
            const progressRes = await db.query(`
                SELECT student_id, topic_id, skill_score, completion_percentage, last_studied_at
                FROM progress
                WHERE student_id = ANY($1) AND topic_id = ANY($2)
            `, [studentIds, topics.map(t => t.id)]);
            progressRecords = progressRes.rows;
        }

        // 5. Get quizzes and quiz attempts
        const quizzesRes = await db.query(`
            SELECT q.id, q.topic_id, q.title, q.passing_score
            FROM quizzes q
            JOIN topics t ON q.topic_id = t.id
            WHERE t.course_id = ANY($1)
        `, [courseIds]);
        const quizzes = quizzesRes.rows;

        let quizAttempts = [];
        if (studentIds.length > 0 && quizzes.length > 0) {
            const attemptsRes = await db.query(`
                SELECT student_id, quiz_id, MAX(score) AS best_score, COUNT(id) AS attempts_count
                FROM quiz_attempts
                WHERE student_id = ANY($1) AND quiz_id = ANY($2)
                GROUP BY student_id, quiz_id
            `, [studentIds, quizzes.map(q => q.id)]);
            quizAttempts = attemptsRes.rows;
        }

        // Aggregate data in memory
        const studentsData = enrollments.map(e => {
            const courseTopics = topics.filter(t => t.course_id === e.course_id);
            const courseTopicIds = courseTopics.map(t => t.id);

            // Filter progress records of this student for this course
            const studentProgress = progressRecords.filter(p => p.student_id === e.student_id && courseTopicIds.includes(p.topic_id));

            // Calculate overall course progress (average completion percent of topics studied)
            let overallProgress = 0;
            let averageSkillScore = 0;
            if (courseTopics.length > 0) {
                const totalProgress = studentProgress.reduce((sum, p) => sum + (p.completion_percentage || 0), 0);
                const totalSkill = studentProgress.reduce((sum, p) => sum + (p.skill_score || 0), 0);
                overallProgress = Math.round(totalProgress / courseTopics.length);
                averageSkillScore = Math.round(totalSkill / courseTopics.length);
            }

            // Map topic details
            const topicProgress = courseTopics.map(t => {
                const record = studentProgress.find(p => p.topic_id === t.id);
                return {
                    topicId: t.id,
                    topicTitle: t.title,
                    completion: record ? record.completion_percentage : 0,
                    skill: record ? record.skill_score : 0,
                    lastStudiedAt: record ? record.last_studied_at : null
                };
            });

            // Map quizzes details
            const courseQuizzes = quizzes.filter(q => courseTopicIds.includes(q.topic_id));
            const studentQuizzes = courseQuizzes.map(q => {
                const attempt = quizAttempts.find(qa => qa.student_id === e.student_id && qa.quiz_id === q.id);
                return {
                    quizId: q.id,
                    quizTitle: q.title,
                    passingScore: q.passing_score,
                    bestScore: attempt ? attempt.best_score : null,
                    attemptsCount: attempt ? parseInt(attempt.attempts_count) : 0
                };
            });

            return {
                studentId: e.student_id,
                firstName: e.first_name,
                lastName: e.last_name,
                email: e.email,
                xpPoints: e.xp_points,
                streakCount: e.streak_count,
                courseId: e.course_id,
                courseTitle: e.course_title,
                enrolledAt: e.enrolled_at,
                paymentStatus: e.payment_status,
                overallProgress,
                averageSkillScore,
                topicProgress,
                quizzes: studentQuizzes
            };
        });

        return res.json({
            success: true,
            students: studentsData,
            courses
        });
    } catch (err) {
        console.error('Error fetching teacher student progress:', err.message);
        return res.status(500).json({ error: 'Internal server error fetching progress analytics' });
    }
}

/**
 * Delete a course (Teacher who owns it, or Admin)
 */
async function deleteCourse(req, res) {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        const courseResult = await db.query('SELECT * FROM courses WHERE id = $1', [id]);
        if (courseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        const course = courseResult.rows[0];
        if (course.teacher_id !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'You are not authorized to delete this course' });
        }

        await db.query('DELETE FROM courses WHERE id = $1', [id]);
        return res.json({ success: true, message: 'Course deleted successfully' });
    } catch (err) {
        console.error('Delete course error:', err.message);
        return res.status(500).json({ error: 'Internal server error deleting course' });
    }
}

/**
 * Delete a topic (Teacher of the course, or Admin)
 */
async function deleteTopic(req, res) {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        const topicResult = await db.query(`
            SELECT t.*, c.teacher_id 
            FROM topics t
            JOIN courses c ON t.course_id = c.id
            WHERE t.id = $1
        `, [id]);

        if (topicResult.rows.length === 0) {
            return res.status(404).json({ error: 'Topic not found' });
        }

        const topic = topicResult.rows[0];
        if (topic.teacher_id !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'You are not authorized to delete this topic' });
        }

        await db.query('DELETE FROM topics WHERE id = $1', [id]);
        return res.json({ success: true, message: 'Topic deleted successfully' });
    } catch (err) {
        console.error('Delete topic error:', err.message);
        return res.status(500).json({ error: 'Internal server error deleting topic' });
    }
}

module.exports = {
    getAllCourses,
    getCourseById,
    createCourse,
    getTopicsByCourse,
    createTopic,
    enrollInCourse,
    getEnrolledCourses,
    getMaterialsByTopic,
    createMaterial,
    deleteMaterial,
    completeMaterial,
    uploadLocalFile,
    getTeacherStudentProgress,
    deleteCourse,
    deleteTopic
};
