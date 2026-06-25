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
    getProfile: () => apiCall('/auth/profile'),

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
    enrollInCourse: (courseId) => apiCall('/courses/enroll', {
        method: 'POST',
        body: { courseId }
    }),
    getEnrolledCourses: () => apiCall('/courses/enrolled'),

    // Payments
    createPaymentOrder: (courseId) => apiCall('/payments/create-order', {
        method: 'POST',
        body: { courseId }
    }),
    verifyPayment: (payload) => apiCall('/payments/verify', {
        method: 'POST',
        body: payload
    })
};

export default api;
export { API_BASE_URL };
