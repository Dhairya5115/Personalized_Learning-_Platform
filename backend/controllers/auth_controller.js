const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const emailService = require('../services/email_service');
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

    const assignedRole = role && ['STUDENT', 'TEACHER', 'TA'].includes(role.toUpperCase()) 
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
        const result = await db.query(
            'SELECT id, email, password_hash, first_name, last_name, role, xp_points, streak_count, last_active_date FROM users WHERE email = $1',
            [email.toLowerCase().trim()]
        );
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
        const getLocalDateString = (date) => {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const todayStr = getLocalDateString(new Date());
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

/**
 * Fetch leaderboard ranking list (top students by XP)
 */
async function getLeaderboard(req, res) {
    try {
        const queryText = `
            SELECT id, first_name, last_name, xp_points, streak_count 
            FROM users 
            WHERE role = 'STUDENT'
            ORDER BY xp_points DESC 
            LIMIT 10
        `;
        const result = await db.query(queryText);
        return res.json(result.rows);
    } catch (err) {
        console.error('Get leaderboard error:', err.message);
        return res.status(500).json({ error: 'Internal server error fetching leaderboard' });
    }
}

/**
 * Initiate Forgot Password Token & Email reset link
 */
async function forgotPassword(req, res) {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email address is required' });
    }

    try {
        const userRes = await db.query('SELECT id, first_name FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        if (userRes.rows.length === 0) {
            return res.json({ success: true, message: 'If email exists, reset instructions have been sent.' });
        }

        const user = userRes.rows[0];
        const token = crypto.randomBytes(24).toString('hex');
        const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

        await db.query(
            'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
            [token, tokenExpiry, user.id]
        );

        emailService.sendPasswordReset(email.toLowerCase().trim(), token);

        return res.json({ success: true, message: 'Password reset email template dispatched successfully.' });

    } catch (err) {
        console.error('Forgot password error:', err.message);
        return res.status(500).json({ error: 'Internal server error processing forgot password token generation' });
    }
}

/**
 * Verify reset token & apply new password changes
 */
async function resetPassword(req, res) {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res.status(400).json({ error: 'Reset token and newPassword string are required' });
    }

    try {
        const todayStr = new Date();
        const userRes = await db.query(
            'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expiry > $2',
            [token, todayStr]
        );

        if (userRes.rows.length === 0) {
            return res.status(400).json({ error: 'Token is invalid or has expired.' });
        }

        const user = userRes.rows[0];

        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await db.query(
            'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
            [passwordHash, user.id]
        );

        return res.json({ success: true, message: 'Password has been reset successfully.' });

    } catch (err) {
        console.error('Reset password error:', err.message);
        return res.status(500).json({ error: 'Internal server error writing new password hash' });
    }
}

/**
 * Refresh an existing JWT token
 */
async function refreshToken(req, res) {
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.split(' ')[1];
    const token = bearerToken || (req.body && req.body.token);

    if (!token) {
        return res.status(401).json({ error: 'Token is required for refresh' });
    }

    try {
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (jwtErr) {
            decoded = jwt.decode(token);
            if (!decoded || !decoded.id) {
                return res.status(401).json({ error: 'Invalid or malformed token' });
            }
        }

        const userRes = await db.query(
            'SELECT id, email, first_name, last_name, role, xp_points, streak_count, last_active_date FROM users WHERE id = $1',
            [decoded.id]
        );

        if (userRes.rows.length === 0) {
            return res.status(401).json({ error: 'User account not found' });
        }

        const user = userRes.rows[0];

        const newToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return res.json({
            success: true,
            token: newToken,
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
        console.error('Refresh token error:', err.message);
        return res.status(500).json({ error: 'Failed to refresh token' });
    }
}

module.exports = {
    register,
    login,
    getProfile,
    getLeaderboard,
    forgotPassword,
    resetPassword,
    refreshToken
};

