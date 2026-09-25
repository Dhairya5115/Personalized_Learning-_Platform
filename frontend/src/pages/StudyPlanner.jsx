import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Calendar, Clock, Target, Plus, CheckCircle, RefreshCw, Layers, AlertTriangle } from 'lucide-react';

export default function StudyPlanner() {
    const [plan, setPlan] = useState(null);
    const [hasPlan, setHasPlan] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showResetModal, setShowResetModal] = useState(false);

    // Form inputs
    const [goal, setGoal] = useState('');
    const [hours, setHours] = useState('2');
    const [examDate, setExamDate] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadLatestPlan();
    }, []);

    async function loadLatestPlan() {
        setLoading(true);
        try {
            const res = await api.getLatestPlan();
            if (res.hasPlan) {
                setPlan(res.plan);
                setHasPlan(true);
            } else {
                setHasPlan(false);
            }
        } catch (err) {
            console.error('Error fetching study plan:', err.message);
        } finally {
            setLoading(false);
        }
    }

    const handleGenerate = async (e) => {
        e.preventDefault();
        setError('');
        setFormLoading(true);

        try {
            const res = await api.generatePlan(goal, parseFloat(hours), examDate);
            setPlan(res.plan);
            setHasPlan(true);
            if (window.showToast) {
                window.showToast('Study planner calendar generated successfully!', 'success');
            }
        } catch (err) {
            setError(err.message || 'Failed to generate planner');
        } finally {
            setFormLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-[#52716c]">
                <div className="w-8 h-8 rounded-full border-3 border-[#00262b] border-t-transparent animate-spin mb-4" />
                <span className="font-semibold text-sm">Loading your study calendar parameters...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#00262b]">
                    Study Schedule Planner
                </h1>
                <p className="mt-2 text-sm font-medium text-[#52716c]">
                    Create a simple weekly study schedule to help you prepare for your exams and review your course topics.
                </p>
            </div>

            {error && (
                <div className="bg-[#f3f1ed] text-[#d64000] border border-[#d64000]/30 p-4 rounded-xl text-xs font-bold">
                    {error}
                </div>
            )}

            {!hasPlan ? (
                /* Parameter Form card */
                <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-8 shadow-sm max-w-xl">
                    <h2 className="text-xl font-extrabold text-[#00262b] mb-6 flex items-center gap-2">
                        <Target size={22} className="text-[#04c5e7]" />
                        <span>Create Your Study Plan</span>
                    </h2>

                    <form onSubmit={handleGenerate} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[#52716c] mb-2">What is your study goal?</label>
                            <input 
                                type="text" 
                                className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl px-4 py-3 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7]" 
                                placeholder="e.g. Learn Java and prepare for my final exam"
                                value={goal}
                                onChange={(e) => setGoal(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#52716c] mb-2">Daily Study Hours</label>
                                <input 
                                    type="number" 
                                    className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl px-4 py-3 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7]" 
                                    value={hours}
                                    onChange={(e) => setHours(e.target.value)}
                                    min="0.5"
                                    max="8"
                                    step="0.5"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#52716c] mb-2">When is your exam?</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl px-4 py-3 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7]" 
                                    value={examDate}
                                    onChange={(e) => setExamDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="btn-primary w-full !py-3 !text-sm mt-3" 
                            disabled={formLoading}
                        >
                            {formLoading ? 'Creating your schedule...' : 'Create My Study Schedule'}
                        </button>
                    </form>
                </div>
            ) : (
                /* Google Calendar visual time blocks */
                <div className="space-y-6">
                    
                    {/* Planner Details Metadata */}
                    <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-[#04c5e7] uppercase tracking-widest">Your Study Goal</span>
                            <h3 className="text-xl font-extrabold text-[#00262b]">{plan.goal}</h3>
                            <p className="text-xs text-[#52716c]">
                                Time limit: {plan.available_hours_daily} hrs/day • Dates: {new Date(plan.start_date).toLocaleDateString()} - {new Date(plan.end_date).toLocaleDateString()}
                            </p>
                        </div>
                        
                        <button 
                            onClick={() => setShowResetModal(true)}
                            className="btn-ghost !text-xs !py-2 !px-4 inline-flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={14} />
                            <span>Create a New Plan</span>
                        </button>
                    </div>

                    {/* Google Calendar-like column schedule */}
                    <div>
                        <h3 className="font-extrabold text-[#00262b] mb-4 flex items-center gap-2 text-base">
                            <Calendar size={18} className="text-[#04c5e7]" />
                            <span>Your 7-Day Study Calendar</span>
                        </h3>

                        {/* Calendar Columns Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                            {plan.plan_schedule.map((day, index) => {
                                const formattedDate = new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                
                                return (
                                    <div key={index} className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-4 flex flex-col h-full min-h-[300px] shadow-sm">
                                        {/* Column Header */}
                                        <div className="border-b border-[#f3f1ed] pb-3 mb-4 text-center">
                                            <p className="font-extrabold text-xs text-[#00262b] uppercase tracking-wider">{day.dayName}</p>
                                            <p className="text-[11px] text-[#52716c] font-semibold mt-0.5">{formattedDate}</p>
                                        </div>

                                        {/* Visual Day Time blocks */}
                                        <div className="flex-1 flex flex-col gap-3">
                                            {day.allocation.length === 0 ? (
                                                <div className="flex-1 flex items-center justify-center border border-dashed border-[#edebe3] rounded-xl p-3 bg-[#f9f8f6]">
                                                    <span className="text-[11px] text-[#52716c] font-medium">Day Off</span>
                                                </div>
                                            ) : (
                                                day.allocation.map((session, sIdx) => (
                                                    <div 
                                                        key={sIdx} 
                                                        className="bg-[#f9f8f6] hover:bg-[#f3f1ed] border border-[#edebe3] rounded-xl p-3 text-left transition-colors flex flex-col justify-between"
                                                    >
                                                        <div>
                                                            <p className="font-extrabold text-xs text-[#00262b] line-clamp-2 leading-relaxed">
                                                                {session.topicTitle}
                                                            </p>
                                                            <span className="inline-block bg-[#ffffff] border border-[#edebe3] text-[#00262b] text-[10px] font-bold px-2 py-0.5 rounded-[94px] mt-2">
                                                                {session.focusArea}
                                                            </span>
                                                        </div>
                                                        <div className="mt-3 flex items-center gap-1 text-[10px] text-[#52716c] font-semibold border-t border-[#edebe3] pt-2">
                                                            <Clock size={12} />
                                                            <span>{session.hours} hrs</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            )}

            {showResetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#00262b]/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 text-center space-y-4">
                        <div className="mx-auto w-12 h-12 bg-[#f3f1ed] text-[#d64000] border border-[#d64000]/30 rounded-2xl flex items-center justify-center">
                            <AlertTriangle size={24} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-extrabold text-[#00262b]">Reset Study Plan?</h3>
                            <p className="text-xs text-[#52716c] leading-relaxed">
                                Are you sure you want to clear your current schedule and goal? This will start a new plan.
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowResetModal(false)}
                                className="btn-ghost flex-1 !text-xs !py-2"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    setShowResetModal(false);
                                    try {
                                        await api.resetPlan();
                                        setHasPlan(false);
                                        setPlan(null);
                                        if (window.showToast) {
                                            window.showToast("Study plan has been reset.", "success");
                                        }
                                    } catch (err) {
                                        console.error('Failed to reset study plan:', err);
                                        if (window.showToast) {
                                            window.showToast(err.message || 'Failed to reset plan parameters', 'error');
                                        }
                                    }
                                }}
                                className="btn-filled flex-1 !text-xs !py-2"
                            >
                                Reset Plan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
