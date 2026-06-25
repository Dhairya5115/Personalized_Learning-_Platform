const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth_routes');
const courseRoutes = require('./routes/course_routes');
const paymentRoutes = require('./routes/payment_routes');
const quizRoutes = require('./routes/quiz_routes');
const plannerRoutes = require('./routes/study_planner_routes');
const reviewRoutes = require('./routes/spaced_repetition_routes');
const cronScheduler = require('./services/cron_scheduler');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with optional client source validation
const corsOptions = {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// Routes Mounts
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/reviews', reviewRoutes);

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

app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  Server booting on port: ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`  Health Check: http://localhost:${PORT}/health`);
    console.log(`====================================================`);
    
    // Boot the background notification scheduler
    cronScheduler.startScheduler();
});
