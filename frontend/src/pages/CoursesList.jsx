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
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mb-4" />
                <span>Loading courses...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Explore Courses
                    </h1>
                    <p className="mt-2 text-base font-medium text-slate-500 dark:text-slate-450">
                        {user.role === 'STUDENT' 
                            ? 'Join classes taught by great teachers.' 
                            : 'See all courses available on the platform.'
                        }
                    </p>
                </div>

                {/* Minimalist Search Bar */}
                <div className="relative max-w-xs w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-550" size={18} />
                    <input 
                        type="text"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                        placeholder="Search courses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {error && (
                <div className="bg-rose-500/10 text-rose-500 border border-rose-500/20 p-4 rounded-xl text-sm">
                    {error}
                </div>
            )}

            {filteredCourses.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                    No courses found matching your query.
                </div>
            ) : (
                /* Course Cards Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredCourses.map(course => {
                        const isEnrolled = enrolledMap[course.id] !== undefined;
                        const isFree = parseFloat(course.price) === 0;

                        return (
                            <div 
                                key={course.id} 
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-8 flex flex-col justify-between hover:shadow-md transition-shadow group h-full"
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                            <BookOpen size={24} />
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded tracking-wider uppercase ${
                                                isFree ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                                            }`}>
                                                {isFree ? 'FREE' : 'PAID'}
                                            </span>
                                            {!isFree && (
                                                <span className="text-[10px] font-black text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                                    ₹{course.price}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 mb-1 leading-tight">
                                        {course.title}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">
                                        Teacher: {course.teacher_first_name} {course.teacher_last_name}
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8 line-clamp-3">
                                        {course.description || 'No description provided.'}
                                    </p>
                                </div>

                                <div className="pt-6 border-t border-slate-55 dark:border-slate-800/80">
                                    {user.role === 'STUDENT' ? (
                                        isEnrolled ? (
                                            <button 
                                                onClick={() => {
                                                    if (onSelectCourse) onSelectCourse(course);
                                                    navigate(`/courses/${course.id}`);
                                                }}
                                                className="w-full group/btn flex items-center justify-center gap-2 py-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                            >
                                                <span>Go to Course</span>
                                                <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                                            </button>
                                        ) : (
                                            <div className="flex gap-3">
                                                <button 
                                                    onClick={() => {
                                                        if (onSelectCourse) onSelectCourse(course);
                                                        navigate(`/courses/${course.id}`);
                                                    }}
                                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 rounded-lg text-sm font-bold flex items-center justify-center transition-colors"
                                                >
                                                    <span>View Course</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleEnroll(course)}
                                                    disabled={actionLoadingId === course.id}
                                                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                                                >
                                                    <CreditCard size={18} />
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
                                                className="w-full group/btn flex items-center justify-center gap-2 py-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                            >
                                                <span>Open Course (TA View)</span>
                                                <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => navigate('/ta-catalog')}
                                                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
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
                                                className="w-full py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
                                            >
                                                Edit Syllabus
                                            </button>
                                        ) : (
                                            <div className="text-center text-xs text-slate-400 dark:text-slate-500 italic py-2">
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
