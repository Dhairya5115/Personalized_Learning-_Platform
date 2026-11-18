const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth_routes');
const courseRoutes = require('./routes/course_routes');
const paymentRoutes = require('./routes/payment_routes');
const quizRoutes = require('./routes/quiz_routes');
const plannerRoutes = require('./routes/study_planner_routes');
const reviewRoutes = require('./routes/spaced_repetition_routes');
const aiRoutes = require('./routes/ai_routes');
const analyticsRoutes = require('./routes/analytics_routes');
const taRoutes = require('./routes/ta_routes');
const cronScheduler = require('./services/cron_scheduler');
const courseEventsService = require('./services/course_events_service');

const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS with allowed origins from environment
const isProduction = process.env.NODE_ENV === 'production';
const envOrigins = (process.env.FRONTEND_URL || process.env.CLIENT_URL || '')
    .split(',')
    .map(s => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

const allowedOrigins = [
    'https://tailorlearn.vercel.app',
    'https://personalized-learning-platform-ten.vercel.app',
    ...envOrigins
];

// In non-production environments only, allow local dev servers
if (!isProduction) {
    allowedOrigins.push('http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5000');
}

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        if (!isProduction && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Routes Mounts
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ta', taRoutes);

// Health Check route
app.get('/health', (req, res) => {
    res.json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        message: 'Personalized Learning Platform backend running correctly.'
    });
});

// Serve frontend static build in production (when built into ../frontend/dist)
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/health')) {
            return next();
        }
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
}

// Centralized error handler
app.use((err, req, res, next) => {
    console.error('[Global Error handler]', err.stack);
    res.status(500).json({ error: 'Something went wrong on the server' });
});

const server = app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  TailorLearn backend running on port: ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    console.log(`  Allowed Origins: ${allowedOrigins.join(', ')}`);
    console.log(`====================================================`);
    
    // Boot the background notification scheduler
    cronScheduler.startScheduler();

    // Boot PostgreSQL LISTEN/NOTIFY listener for real-time course events
    courseEventsService.initListener();
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n[Server Error] Port ${PORT} is already in use.`);
        console.error(`  → Run this command to free it: netstat -ano | findstr :${PORT}`);
        console.error(`  → Then kill the process:       taskkill /PID <PID> /F\n`);
        process.exit(1);
    } else {
        throw err;
    }
});
