import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { BookOpen, Plus, Users, Award, Flame, Star } from 'lucide-react';

export default function Dashboard({ onSelectCourse, onGoToCatalog }) {
    const { user } = useAuth();
    const [enrolled, setEnrolled] = useState([]);
    const [loading, setLoading] = useState(true);

    // Teacher forms
    const [newCourseTitle, setNewCourseTitle] = useState('');
    const [newCourseDesc, setNewCourseDesc] = useState('');
    const [newCoursePrice, setNewCoursePrice] = useState('0');
    const [createSuccess, setCreateSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadDashboardData();
    }, []);

    async function loadDashboardData() {
        setLoading(true);
        try {
            if (user.role === 'STUDENT') {
                const list = await api.getEnrolledCourses();
                setEnrolled(list);
            } else {
                // For teachers, filter courses by teacher_id from all courses
                const list = await api.getCourses();
                const filtered = list.filter(c => c.teacher_id === user.id);
                setEnrolled(filtered);
            }
        } catch (err) {
            console.error('Error loading dashboard:', err.message);
        } finally {
            setLoading(false);
        }
    }

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        setError('');
        setCreateSuccess(false);

        if (!newCourseTitle) {
            setError('Course title is required');
            return;
        }

        try {
            await api.createCourse(newCourseTitle, newCourseDesc, newCoursePrice);
            setCreateSuccess(true);
            setNewCourseTitle('');
            setNewCourseDesc('');
            setNewCoursePrice('0');
            loadDashboardData();
        } catch (err) {
            setError(err.message || 'Failed to create course');
        }
    };

    if (loading) {
        return <div style={{ color: 'var(--text-muted)' }}>Loading dashboard panel...</div>;
    }

    return (
        <div>
            <h1 className="title-large">Welcome back, {user.firstName}!</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                {user.role === 'STUDENT' 
                    ? 'Here is your active personalized learning progress' 
                    : 'Manage your course catalogs and course outlines.'
                }
            </p>

            {user.role === 'STUDENT' ? (
                <>
                    {/* Student KPI Cards */}
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '32px' }}>
                        <div className="card" style={{ flex: 1, minWidth: '220px', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: '12px', borderRadius: '12px', color: 'var(--accent-amber)' }}>
                                <Flame size={28} fill="var(--accent-amber)" />
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Current Streak</span>
                                <h2 style={{ fontSize: '24px', fontWeight: 700 }}>{user.streakCount || 0} Days</h2>
                            </div>
                        </div>

                        <div className="card" style={{ flex: 1, minWidth: '220px', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', padding: '12px', borderRadius: '12px', color: 'var(--accent-indigo)' }}>
                                <Award size={28} />
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Total XP Gained</span>
                                <h2 style={{ fontSize: '24px', fontWeight: 700 }}>{user.xpPoints || 0} XP</h2>
                            </div>
                        </div>

                        <div className="card" style={{ flex: 1, minWidth: '220px', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '12px', borderRadius: '12px', color: 'var(--accent-emerald)' }}>
                                <BookOpen size={28} />
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Active Enrollments</span>
                                <h2 style={{ fontSize: '24px', fontWeight: 700 }}>{enrolled.length} Courses</h2>
                            </div>
                        </div>
                    </div>

                    <h2 className="title-medium">Your Active Courses</h2>
                    {enrolled.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <BookOpen size={48} color="var(--text-muted)" style={{ marginBottom: '16px', opacity: 0.5 }} />
                            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>You are not enrolled in any courses yet.</p>
                            <button onClick={onGoToCatalog} className="btn btn-primary">Browse Catalog</button>
                        </div>
                    ) : (
                        <div className="course-grid">
                            {enrolled.map(course => (
                                <div key={course.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{course.title}</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px', flex: 1 }}>
                                        {course.description}
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                                            Enrolled ({course.payment_status})
                                        </span>
                                        <button 
                                            onClick={() => onSelectCourse(course)}
                                            className="btn btn-secondary"
                                        >
                                            Enter Classroom
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                /* Teacher View Dashboard */
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px', alignItems: 'start' }}>
                    
                    {/* Create Course Form */}
                    <div className="card">
                        <h2 className="title-medium" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={20} color="var(--accent-indigo)" />
                            <span>Create a Course</span>
                        </h2>

                        {error && (
                            <div style={{ 
                                backgroundColor: 'rgba(244, 63, 94, 0.15)', 
                                color: 'var(--accent-rose)', 
                                padding: '10px', 
                                borderRadius: '6px', 
                                marginBottom: '14px',
                                fontSize: '14px'
                            }}>
                                {error}
                            </div>
                        )}

                        {createSuccess && (
                            <div style={{ 
                                backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                                color: 'var(--accent-emerald)', 
                                padding: '10px', 
                                borderRadius: '6px', 
                                marginBottom: '14px',
                                fontSize: '14px'
                            }}>
                                Course created successfully!
                            </div>
                        )}

                        <form onSubmit={handleCreateCourse}>
                            <div className="form-group">
                                <label className="form-label">Course Title</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    placeholder="e.g. Intro to Data Structures"
                                    value={newCourseTitle}
                                    onChange={(e) => setNewCourseTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea 
                                    className="form-input" 
                                    rows="3"
                                    placeholder="Brief summary of syllabus..."
                                    value={newCourseDesc}
                                    onChange={(e) => setNewCourseDesc(e.target.value)}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Price (INR)</label>
                                <input 
                                    type="number" 
                                    className="form-input" 
                                    value={newCoursePrice}
                                    onChange={(e) => setNewCoursePrice(e.target.value)}
                                    min="0"
                                    required
                                />
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                    Set to 0 to make the course free.
                                </span>
                            </div>

                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                                Create Course Template
                            </button>
                        </form>
                    </div>

                    {/* Teacher Course management */}
                    <div>
                        <h2 className="title-medium">Your Managed Courses</h2>
                        {enrolled.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                                <p style={{ color: 'var(--text-muted)' }}>You haven't created any courses yet.</p>
                            </div>
                        ) : (
                            enrolled.map(course => (
                                <div key={course.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{course.title}</h3>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                                            Price: ₹{course.price} | Created: {new Date(course.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => onSelectCourse(course)}
                                        className="btn btn-secondary"
                                    >
                                        Edit Syllabus
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
