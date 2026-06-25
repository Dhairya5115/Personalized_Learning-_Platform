const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Register a new User
 */
async function register(req, res) {
    const { email, password, firstName, lastName, role } = req.body;

    if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: 'All fields (email, password, firstName, lastName) are required' });
    }

    const assignedRole = role && ['STUDENT', 'TEACHER', 'ADMIN'].includes(role.toUpperCase()) 
        ? role.toUpperCase() 
        : 'STUDENT';

    try {
        // 1. Check if user already exists
        const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }

        // 2. Hash the password
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);

        // 3. Create user record
        const insertQuery = `
            INSERT INTO users (email, password_hash, first_name, last_name, role)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, email, first_name, last_name, role, xp_points, streak_count
        `;
        const result = await db.query(insertQuery, [
            email.toLowerCase().trim(),
            passwordHash,
            firstName.trim(),
            lastName.trim(),
            assignedRole
        ]);

        const user = result.rows[0];

        // 4. Generate JWT Token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return res.status(201).json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                xpPoints: user.xp_points,
                streakCount: user.streak_count
            }
        });
    } catch (err) {
        console.error('Registration error:', err.message);
        return res.status(500).json({ error: 'Internal server error during registration' });
    }
}

/**
 * Login an existing User
 */
async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // 1. Check if user exists
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];

        // 2. Check password matches
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last active date to track streaks
        const todayStr = new Date().toISOString().split('T')[0];
        await db.query('UPDATE users SET last_active_date = $1 WHERE id = $2', [todayStr, user.id]);

        // 3. Generate JWT Token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                xpPoints: user.xp_points,
                streakCount: user.streak_count
            }
        });
    } catch (err) {
        console.error('Login error:', err.message);
        return res.status(500).json({ error: 'Internal server error during login' });
    }
}

/**
 * Fetch profile details of logged-in user
 */
async function getProfile(req, res) {
    try {
        const result = await db.query(
            'SELECT id, email, first_name, last_name, role, xp_points, streak_count, last_active_date, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = result.rows[0];
        return res.json({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            xpPoints: user.xp_points,
            streakCount: user.streak_count,
            lastActiveDate: user.last_active_date,
            createdAt: user.created_at
        });
    } catch (err) {
        console.error('Get profile error:', err.message);
        return res.status(500).json({ error: 'Internal server error fetching profile' });
    }
}

module.exports = {
    register,
    login,
    getProfile
};
