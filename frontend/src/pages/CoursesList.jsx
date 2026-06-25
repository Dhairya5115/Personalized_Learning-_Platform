import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BookOpen, CheckCircle, CreditCard } from 'lucide-react';

export default function CoursesList({ onSelectCourse }) {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [enrolledMap, setEnrolledMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        loadCoursesData();
    }, []);

    async function loadCoursesData() {
        setLoading(true);
        try {
            const allCourses = await api.getCourses();
            setCourses(allCourses);

            if (user.role === 'STUDENT') {
                const enrolled = await api.getEnrolledCourses();
                const map = {};
                enrolled.forEach(c => {
                    map[c.id] = c.payment_status;
                });
                setEnrolledMap(map);
            }
        } catch (err) {
            setError('Failed to load courses. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    const handleEnroll = async (course) => {
        setError('');
        setActionLoadingId(course.id);

        try {
            const enrollRes = await api.enrollInCourse(course.id);
            
            // Case 1: Enrollment free or direct
            if (!enrollRes.paymentRequired) {
                alert(enrollRes.message);
                loadCoursesData();
                return;
            }

            // Case 2: Checkout required via Razorpay
            // 1. Create Order
            const orderData = await api.createPaymentOrder(course.id);

            // 2. Configure Razorpay overlay options
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_dummy_id', // client-side fallback
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'Adaptify Edu',
                description: `Purchase Course: ${course.title}`,
                order_id: orderData.orderId,
                handler: async function (response) {
                    try {
                        const verifyRes = await api.verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });
                        
                        if (verifyRes.success) {
                            alert('Payment verified and course unlocked successfully!');
                            loadCoursesData();
                        }
                    } catch (verifyErr) {
                        alert(`Payment verification failed: ${verifyErr.message}`);
                    }
                },
                prefill: {
                    name: `${user.firstName} ${user.lastName}`,
                    email: user.email
                },
                theme: {
                    color: '#6366f1'
                }
            };

            if (!window.Razorpay) {
                throw new Error('Razorpay Checkout SDK is loading. Please try again in a few seconds.');
            }

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (err) {
            setError(err.message || 'Error occurred during enrollment check.');
        } finally {
            setActionLoadingId(null);
        }
    };

    if (loading) {
        return <div style={{ color: 'var(--text-muted)' }}>Loading course catalog...</div>;
    }

    return (
        <div>
            <h1 className="title-large">Browse Courses</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                {user.role === 'STUDENT' 
                    ? 'Enroll in customized streams matching your career goals.' 
                    : 'View all courses registered on the platform.'
                }
            </p>

            {error && (
                <div style={{ 
                    backgroundColor: 'rgba(244, 63, 94, 0.15)', 
                    color: 'var(--accent-rose)', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    marginBottom: '20px'
                }}>
                    {error}
                </div>
            )}

            <div className="course-grid">
                {courses.map(course => {
                    const isEnrolled = enrolledMap[course.id] !== undefined;
                    const paymentStatus = enrolledMap[course.id];

                    return (
                        <div key={course.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', padding: '10px', borderRadius: '10px' }}>
                                    <BookOpen size={24} color="var(--accent-indigo)" />
                                </div>
                                <span className="price-tag">
                                    {parseFloat(course.price) === 0 ? 'FREE' : `₹${course.price}`}
                                </span>
                            </div>

                            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{course.title}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px', flex: 1 }}>
                                {course.description || 'No description provided.'}
                            </p>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                    By {course.teacher_first_name} {course.teacher_last_name}
                                </span>

                                {user.role === 'STUDENT' ? (
                                    isEnrolled ? (
                                        <button 
                                            onClick={() => onSelectCourse(course)}
                                            className="btn btn-secondary"
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            <CheckCircle size={16} color="var(--accent-emerald)" />
                                            <span>Enter Course</span>
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleEnroll(course)}
                                            disabled={actionLoadingId === course.id}
                                            className="btn btn-primary"
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            <CreditCard size={16} />
                                            <span>{actionLoadingId === course.id ? 'Loading...' : 'Enroll Now'}</span>
                                        </button>
                                    )
                                ) : (
                                    <button 
                                        onClick={() => onSelectCourse(course)}
                                        className="btn btn-secondary"
                                    >
                                        Manage syllabus
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
