import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BookOpen, CreditCard, Search, ArrowRight } from 'lucide-react';

export default function CoursesList({ onSelectCourse }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [enrolledMap, setEnrolledMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [taAssignedMap, setTaAssignedMap] = useState({});

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
            } else if (user.role === 'TA') {
                const assigned = await api.getTaAssignedCourses();
                const map = {};
                (assigned || []).forEach(c => {
                    map[c.id] = true;
                });
                setTaAssignedMap(map);
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
                if (window.showToast) {
                    window.showToast(enrollRes.message || 'Enrolled successfully!', 'success');
                }
                loadCoursesData();
                return;
            }

            // Case 2: Checkout required via Razorpay
            // 1. Create Order
            const orderData = await api.createPaymentOrder(course.id);

            // 2. Configure Razorpay overlay options
            const options = {
                key: orderData.key || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_dummy_id', // client-side fallback
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'TailorLearn',
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
                            if (window.showToast) {
                                window.showToast('Payment verified and course unlocked successfully!', 'success');
                            }
                            loadCoursesData();
                        }
                    } catch (verifyErr) {
                        if (window.showToast) {
                            window.showToast(`Payment verification failed: ${verifyErr.message}`, 'error');
                        }
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

    const filteredCourses = courses.filter(course => 
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.description && course.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-[#52716c]">
                <div className="w-8 h-8 rounded-full border-3 border-[#00262b] border-t-transparent animate-spin mb-4" />
                <span className="font-semibold text-sm">Loading courses...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-[#00262b] tracking-tight">
                        Explore Courses
                    </h1>
                    <p className="mt-2 text-sm font-medium text-[#52716c]">
                        {user.role === 'STUDENT' 
                            ? 'Join classes taught by expert teachers and mentors.' 
                            : 'See all courses available on the platform.'
                        }
                    </p>
                </div>

                {/* Search Bar */}
                <div className="relative max-w-xs w-full">
                    <Search className="absolute left-0.8 top-1/2 -translate-y-1/2 text-[#52716c]" size={18} />
                    <input 
                        type="text"
                        className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl pl-12 pr-4 py-2.5 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7] transition-all shadow-sm"
                        placeholder="Search courses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {error && (
                <div className="bg-[#f3f1ed] text-[#d64000] border border-[#d64000]/30 p-4 rounded-xl text-xs font-bold">
                    {error}
                </div>
            )}

            {filteredCourses.length === 0 ? (
                <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-8 text-center text-[#52716c] text-sm shadow-sm">
                    No courses found matching your query.
                </div>
            ) : (
                /* Course Cards Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map(course => {
                        const isEnrolled = enrolledMap[course.id] !== undefined;
                        const isFree = parseFloat(course.price) === 0;

                        return (
                            <div 
                                key={course.id} 
                                className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-shadow group h-full shadow-sm"
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-5">
                                        <div className="w-12 h-12 bg-[#00262b] rounded-2xl flex items-center justify-center text-[#04c5e7] transition-transform">
                                            <BookOpen size={22} />
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-[94px] tracking-wider uppercase bg-[#f3f1ed] text-[#00262b] border border-[#e1ddd1]">
                                                {isFree ? 'FREE' : 'PAID'}
                                            </span>
                                            {!isFree && (
                                                <span className="text-xs font-extrabold text-[#00262b] bg-[#f9f8f6] border border-[#edebe3] px-2.5 py-0.5 rounded-[94px]">
                                                    ₹{course.price}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <h3 className="font-extrabold text-xl text-[#00262b] mb-1 leading-tight">
                                        {course.title}
                                    </h3>
                                    <p className="text-[11px] font-bold text-[#52716c] uppercase tracking-widest mb-4">
                                        Teacher: {course.teacher_first_name} {course.teacher_last_name}
                                    </p>
                                    <p className="text-sm text-[#52716c] leading-relaxed mb-6 line-clamp-3">
                                        {course.description || 'No description provided.'}
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-[#f3f1ed]">
                                    {user.role === 'STUDENT' ? (
                                        isEnrolled ? (
                                            <button 
                                                onClick={() => {
                                                    if (onSelectCourse) onSelectCourse(course);
                                                    navigate(`/courses/${course.id}`);
                                                }}
                                                className="btn-primary w-full flex items-center justify-center gap-2 !text-xs !py-2.5"
                                            >
                                                <span>Go to Course</span>
                                                <ArrowRight size={16} />
                                            </button>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => {
                                                        if (onSelectCourse) onSelectCourse(course);
                                                        navigate(`/courses/${course.id}`);
                                                    }}
                                                    className="btn-ghost flex-1 !text-xs !py-2.5 flex items-center justify-center"
                                                >
                                                    <span>View Details</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleEnroll(course)}
                                                    disabled={actionLoadingId === course.id}
                                                    className="btn-primary flex-1 !text-xs !py-2.5 flex items-center justify-center gap-1.5"
                                                >
                                                    <CreditCard size={15} />
                                                    <span>{actionLoadingId === course.id ? 'Opening...' : isFree ? 'Join Course' : 'Buy Course'}</span>
                                                </button>
                                            </div>
                                        )
                                    ) : user.role === 'TA' ? (
                                        taAssignedMap[course.id] ? (
                                            <button 
                                                onClick={() => {
                                                    if (onSelectCourse) onSelectCourse(course);
                                                    navigate(`/courses/${course.id}`);
                                                }}
                                                className="btn-primary w-full flex items-center justify-center gap-2 !text-xs !py-2.5"
                                            >
                                                <span>Open Course (TA View)</span>
                                                <ArrowRight size={16} />
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => navigate('/ta-catalog')}
                                                className="btn-ghost w-full !text-xs !py-2.5"
                                            >
                                                Apply as TA for this Course
                                            </button>
                                        )
                                    ) : (
                                        course.teacher_id === user.id ? (
                                            <button 
                                                onClick={() => {
                                                    if (onSelectCourse) onSelectCourse(course);
                                                    navigate(`/courses/${course.id}`);
                                                }}
                                                className="btn-ghost w-full !text-xs !py-2.5"
                                            >
                                                Edit Syllabus
                                            </button>
                                        ) : (
                                            <div className="text-center text-xs text-[#52716c] italic py-2">
                                                Created by another teacher
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
