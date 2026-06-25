import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ArrowLeft, BookOpen, Plus, ClipboardList } from 'lucide-react';

export default function CourseView({ course, onBack }) {
    const { user } = useAuth();
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);

    // Topic forms
    const [topicTitle, setTopicTitle] = useState('');
    const [topicDesc, setTopicDesc] = useState('');
    const [topicOrder, setTopicOrder] = useState('1');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        loadTopics();
    }, [course.id]);

    async function loadTopics() {
        setLoading(true);
        try {
            const list = await api.getTopics(course.id);
            setTopics(list);
        } catch (err) {
            console.error('Error fetching topics:', err.message);
        } finally {
            setLoading(false);
        }
    }

    const handleCreateTopic = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (!topicTitle) {
            setError('Topic title is required');
            return;
        }

        try {
            await api.createTopic(
                course.id, 
                topicTitle, 
                topicDesc, 
                parseInt(topicOrder)
            );
            setSuccess(true);
            setTopicTitle('');
            setTopicDesc('');
            setTopicOrder((topics.length + 2).toString());
            loadTopics();
        } catch (err) {
            setError(err.message || 'Failed to create topic');
        }
    };

    return (
        <div>
            {/* Back to courses navigation */}
            <button 
                onClick={onBack} 
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '24px', padding: '8px 16px' }}
            >
                <ArrowLeft size={16} />
                <span>Back to Courses</span>
            </button>

            <div className="card" style={{ padding: '30px', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>{course.title}</h1>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{course.description || 'No description provided for this course.'}</p>
                
                {user.role === 'STUDENT' && (
                    <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Status:</span>
                        <span className="badge badge-student" style={{ padding: '6px 12px' }}>In Progress</span>
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: user.role === 'TEACHER' ? '1.5fr 1fr' : '1fr', gap: '32px', alignItems: 'start' }}>
                
                {/* Topics List view */}
                <div>
                    <h2 className="title-medium" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                        <ClipboardList size={20} color="var(--accent-indigo)" />
                        <span>Curriculum Syllabus</span>
                    </h2>

                    {loading ? (
                        <div style={{ color: 'var(--text-muted)' }}>Loading syllabus topics...</div>
                    ) : topics.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                            <p style={{ color: 'var(--text-muted)' }}>No topics have been added to this course yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {topics.map((topic, index) => (
                                <div key={topic.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: 0 }}>
                                    <div style={{ 
                                        backgroundColor: 'var(--bg-tertiary)', 
                                        color: 'var(--text-main)', 
                                        width: '36px', 
                                        height: '36px', 
                                        borderRadius: '50%', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        flexShrink: 0
                                    }}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '6px' }}>{topic.title}</h3>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>
                                            {topic.description || 'No topic details listed.'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add Topic Form (Teacher view only) */}
                {user.role === 'TEACHER' && (
                    <div className="card">
                        <h2 className="title-medium" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={20} color="var(--accent-indigo)" />
                            <span>Add Curriculum Topic</span>
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

                        {success && (
                            <div style={{ 
                                backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                                color: 'var(--accent-emerald)', 
                                padding: '10px', 
                                borderRadius: '6px', 
                                marginBottom: '14px',
                                fontSize: '14px'
                            }}>
                                Topic added successfully!
                            </div>
                        )}

                        <form onSubmit={handleCreateTopic}>
                            <div className="form-group">
                                <label className="form-label">Topic Title</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    placeholder="e.g. Memory Allocation in C"
                                    value={topicTitle}
                                    onChange={(e) => setTopicTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Sequence Order</label>
                                <input 
                                    type="number" 
                                    className="form-input" 
                                    value={topicOrder}
                                    onChange={(e) => setTopicOrder(e.target.value)}
                                    min="1"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea 
                                    className="form-input" 
                                    rows="3"
                                    placeholder="Topic overview text..."
                                    value={topicDesc}
                                    onChange={(e) => setTopicDesc(e.target.value)}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>

                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                                Publish Topic Node
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
