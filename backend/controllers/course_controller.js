const db = require('../config/db');

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
    try {
        const queryText = `
            SELECT * FROM topics 
            WHERE course_id = $1 
            ORDER BY sequence_order ASC
        `;
        const result = await db.query(queryText, [courseId]);
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
        // Validate course exists
        const courseCheck = await db.query('SELECT id FROM courses WHERE id = $1', [courseId]);
        if (courseCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
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

module.exports = {
    getAllCourses,
    getCourseById,
    createCourse,
    getTopicsByCourse,
    createTopic,
    enrollInCourse,
    getEnrolledCourses
};
