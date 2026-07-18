const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Custom request wrapper for calling backend endpoints
 * Automatically adds the Authorization JWT Bearer token
 * @param {string} endpoint e.g., '/auth/login'
 * @param {object} options fetch options
 */
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
    };

    const config = {
        ...options,
        headers
    };

    if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        // Handle unauthorized token expiries
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // If they are not already on the login page, redirect them
            if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
                window.location.href = '/login';
            }
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (err) {
        console.error(`[API Call Error] ${endpoint}:`, err.message);
        throw err;
    }
}

const api = {
    // Auth
    login: (email, password) => apiCall('/auth/login', {
        method: 'POST',
        body: { email, password }
    }),
    register: (email, password, firstName, lastName, role) => apiCall('/auth/register', {
        method: 'POST',
        body: { email, password, firstName, lastName, role }
    }),
    forgotPassword: (email) => apiCall('/auth/forgot-password', {
        method: 'POST',
        body: { email }
    }),
    resetPassword: (token, newPassword) => apiCall('/auth/reset-password', {
        method: 'POST',
        body: { token, newPassword }
    }),
    getProfile: () => apiCall('/auth/profile'),
    getLeaderboard: () => apiCall('/auth/leaderboard'),

    // Courses
    getCourses: () => apiCall('/courses'),
    getCourseDetails: (id) => apiCall(`/courses/${id}`),
    createCourse: (title, description, price) => apiCall('/courses', {
        method: 'POST',
        body: { title, description, price }
    }),
    getTopics: (courseId) => apiCall(`/courses/${courseId}/topics`),
    createTopic: (courseId, title, description, sequenceOrder) => apiCall(`/courses/${courseId}/topics`, {
        method: 'POST',
        body: { title, description, sequenceOrder }
    }),
    getMaterials: (topicId) => apiCall(`/courses/topics/${topicId}/materials`),
    createMaterial: (topicId, title, type, fileUrl, isPremium, price) => apiCall(`/courses/topics/${topicId}/materials`, {
        method: 'POST',
        body: { title, type, fileUrl, isPremium, price }
    }),
    deleteMaterial: (id) => apiCall(`/courses/materials/${id}`, {
        method: 'DELETE'
    }),
    deleteCourse: (id) => apiCall(`/courses/${id}`, {
        method: 'DELETE'
    }),
    deleteTopic: (id) => apiCall(`/courses/topics/${id}`, {
        method: 'DELETE'
    }),
    completeMaterial: (id) => apiCall(`/courses/materials/${id}/complete`, {
        method: 'POST'
    }),
    enrollInCourse: (courseId) => apiCall('/courses/enroll', {
        method: 'POST',
        body: { courseId }
    }),
    getEnrolledCourses: () => apiCall('/courses/enrolled'),
    uploadLocal: (filename, fileData) => apiCall('/courses/upload-local', {
        method: 'POST',
        body: { filename, fileData }
    }),
    getTeacherStudentProgress: () => apiCall('/courses/teacher/student-progress'),

    // Payments
    createPaymentOrder: (courseIdOrPayload) => {
        const body = typeof courseIdOrPayload === 'object' ? courseIdOrPayload : { courseId: courseIdOrPayload };
        return apiCall('/payments/create-order', {
            method: 'POST',
            body
        });
    },
    verifyPayment: (payload) => apiCall('/payments/verify', {
        method: 'POST',
        body: payload
    }),

    // Quizzes
    getQuizzesByTopic: (topicId) => apiCall(`/quiz/topic/${topicId}`),
    getNextQuestion: (quizId, exclude) => apiCall(`/quiz/${quizId}/next${exclude ? `?exclude=${exclude}` : ''}`),
    submitQuiz: (quizId, responses) => apiCall('/quiz/submit', {
        method: 'POST',
        body: { quizId, responses }
    }),
    createQuiz: (topicId, title, passingScore) => apiCall('/quiz', {
        method: 'POST',
        body: { topicId, title, passingScore }
    }),
    addQuestionToQuiz: (quizId, questionData) => apiCall(`/quiz/${quizId}/questions`, {
        method: 'POST',
        body: questionData
    }),
    generateAiQuiz: (topicId) => apiCall(`/quiz/topic/${topicId}/generate-ai`, {
        method: 'POST'
    }),
    deleteQuiz: (quizId) => apiCall(`/quiz/${quizId}`, {
        method: 'DELETE'
    }),
    getQuizQuestions: (quizId) => apiCall(`/quiz/${quizId}/questions`),
    updateQuestion: (questionId, questionData) => apiCall(`/quiz/questions/${questionId}`, {
        method: 'PUT',
        body: questionData
    }),
    deleteQuestion: (questionId) => apiCall(`/quiz/questions/${questionId}`, {
        method: 'DELETE'
    }),

    // Planner
    generatePlan: (goal, availableHours, examDate) => apiCall('/planner/generate', {
        method: 'POST',
        body: { goal, availableHours, examDate }
    }),
    getLatestPlan: () => apiCall('/planner/latest'),
    resetPlan: () => apiCall('/planner/reset', {
        method: 'DELETE'
    }),

    // Spaced Repetition (SRS)
    getOverdueReviews: () => apiCall('/reviews/overdue'),
    submitReview: (materialId, quality) => apiCall('/reviews/review', {
        method: 'POST',
        body: { materialId, quality }
    }),
    registerMaterialForSrs: (materialId) => apiCall('/reviews/register', {
        method: 'POST',
        body: { materialId }
    }),

    // AI doubt solver
    solveDoubt: (query, courseId = null, topicId = null) => apiCall('/ai/doubt-solve', {
        method: 'POST',
        body: { query, courseId, topicId }
    }),

    // Analytics
    getAnalytics: () => apiCall('/analytics/report'),
    getTeacherAnalytics: () => apiCall('/analytics/teacher')
};

export default api;
export { API_BASE_URL };
