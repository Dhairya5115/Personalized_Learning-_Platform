const express = require('express');
const cors = require('cors');
const path = require('path');
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

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with optional client source validation
const corsOptions = {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
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

// Centralized error handler
app.use((err, req, res, next) => {
    console.error('[Global Error handler]', err.stack);
    res.status(500).json({ error: 'Something went wrong on the server' });
});

const server = app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  Server booting on port: ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`  Health Check: http://localhost:${PORT}/health`);
    console.log(`====================================================`);
    
    // Boot the background notification scheduler
    cronScheduler.startScheduler();
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
