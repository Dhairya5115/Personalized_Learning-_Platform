const API_BASE_URL = 'http://localhost:5000/api';

// Mutex promise to handle concurrent 401s during silent refresh (per-tab)
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
    refreshSubscribers.push(cb);
}

function onRefreshed(newToken) {
    refreshSubscribers.forEach(cb => cb(newToken));
    refreshSubscribers = [];
}

function onRefreshFailed() {
    refreshSubscribers.forEach(cb => cb(null));
    refreshSubscribers = [];
}

/**
 * Custom request wrapper for calling backend endpoints
 * Automatically adds the Authorization JWT Bearer token from tab-scoped sessionStorage
 * Performs silent token refresh on 401 before giving up
 * @param {string} endpoint e.g., '/auth/login'
 * @param {object} options fetch options
 * @param {boolean} isRetry whether this call is already a retry attempt
 */
async function apiCall(endpoint, options = {}, isRetry = false) {
    const token = sessionStorage.getItem('token');
    
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
        
        // Handle 401 Unauthorized
        if (response.status === 401) {
            const isAuthEndpoint = endpoint.startsWith('/auth/login') || 
                                   endpoint.startsWith('/auth/register') || 
                                   endpoint.startsWith('/auth/refresh') ||
                                   endpoint.startsWith('/auth/forgot-password') ||
                                   endpoint.startsWith('/auth/reset-password');

            // If not an auth endpoint and not already a retry, try silent refresh in this tab
            if (!isAuthEndpoint && !isRetry) {
                const currentToken = sessionStorage.getItem('token');

                if (currentToken) {
                    if (!isRefreshing) {
                        isRefreshing = true;

                        try {
                            const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${currentToken}`
                                },
                                body: JSON.stringify({ token: currentToken })
                            });

                            if (refreshRes.ok) {
                                const refreshData = await refreshRes.json();
                                if (refreshData && refreshData.token) {
                                    sessionStorage.setItem('token', refreshData.token);
                                    if (refreshData.user) {
                                        sessionStorage.setItem('user', JSON.stringify(refreshData.user));
                                    }
                                    isRefreshing = false;
                                    onRefreshed(refreshData.token);
                                    
                                    // Retry the original request with new token
                                    return apiCall(endpoint, options, true);
                                }
                            }
                            // If refresh response not ok, fail refresh
                            throw new Error('Token refresh rejected');
                        } catch (refreshErr) {
                            isRefreshing = false;
                            onRefreshFailed();
                            sessionStorage.removeItem('token');
                            sessionStorage.removeItem('user');
                            
                            if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
                                window.location.href = '/login';
                            }
                            throw new Error('Session expired. Please log in again.');
                        }
                    } else {
                        // Another call in this tab is already refreshing the token; queue this request
                        return new Promise((resolve, reject) => {
                            subscribeTokenRefresh((newToken) => {
                                if (newToken) {
                                    resolve(apiCall(endpoint, options, true));
                                } else {
                                    reject(new Error('Session expired'));
                                }
                            });
                        });
                    }
                } else {
                    // No token present in this tab
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('user');
                    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
                        window.location.href = '/login';
                    }
                }
            }
        }

        const data = await response.json();
        
        if (!response.ok) {
            const err = new Error(data.error || 'Request failed');
            err.status = response.status;
            throw err;
        }

        return data;
    } catch (err) {
        if (!endpoint.startsWith('/auth/profile')) {
            console.error(`[API Call Error] ${endpoint}:`, err.message);
        }
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
    refreshToken: (token) => apiCall('/auth/refresh', {
        method: 'POST',
        body: { token }
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
    getQuizDetails: (quizId) => apiCall(`/quiz/${quizId}`),
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
    toggleQuizActive: (quizId, isActive) => apiCall(`/quiz/${quizId}/toggle-active`, {
        method: 'PATCH',
        body: { isActive }
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

    // Teaching Assistant (TA) APIs
    applyForTaCourse: (data) => apiCall('/ta/applications', {
        method: 'POST',
        body: typeof data === 'object' ? data : { courseId: data }
    }),
    getTaApplications: () => apiCall('/ta/applications/my'),
    getTeacherPendingTaApplications: () => apiCall('/ta/applications/teacher'),
    reviewTaApplication: (applicationId, status) => apiCall(`/ta/applications/${applicationId}/review`, {
        method: 'PUT',
        body: { status }
    }),
    getTeacherTaOverview: () => apiCall('/ta/teacher-overview'),
    getTaDashboardStats: () => apiCall('/ta/dashboard-stats'),
    getTaAssignedCourses: () => apiCall('/ta/my-courses'),
    getTaAssignedCourseStudents: (courseId) => apiCall(`/ta/courses/${courseId}/students`),
    getAvailableTasForStudent: () => apiCall('/ta/available-for-student'),
    createTaDoubtRequest: (taId, courseId, subject, description) => apiCall('/ta/requests', {
        method: 'POST',
        body: { taId, courseId, subject, description }
    }),
    getStudentTaRequests: () => apiCall('/ta/requests/student'),
    getTaIncomingRequests: () => apiCall('/ta/requests/ta'),
    scheduleTaDoubtRequest: (requestId, meetingLink, scheduledAt) => apiCall(`/ta/requests/${requestId}/schedule`, {
        method: 'PUT',
        body: { meetingLink, scheduledAt }
    }),
    updateTaRequestStatus: (requestId, status) => apiCall(`/ta/requests/${requestId}/status`, {
        method: 'PUT',
        body: { status }
    }),
};

export default api;
export { API_BASE_URL };
