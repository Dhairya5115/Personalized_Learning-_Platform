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
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mb-4" />
                <span>Loading your study calendar parameters...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Study Schedule Planner
                </h1>
                <p className="mt-2 text-base text-slate-500 dark:text-slate-400">
                    Create a simple weekly study schedule to help you prepare for your exams and review your course topics.
                </p>
            </div>

            {error && (
                <div className="bg-rose-500/10 text-rose-500 border border-rose-500/20 p-4 rounded-xl text-sm">
                    {error}
                </div>
            )}

            {!hasPlan ? (
                /* Parameter Form card */
                <div className="bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm max-w-xl">
                    <h2 className="text-lg font-bold text-slate-850 dark:text-slate-200 mb-6 flex items-center gap-2">
                        <Target size={18} className="text-indigo-600 dark:text-indigo-400" />
                        <span>Create Your Study Plan</span>
                    </h2>

                    <form onSubmit={handleGenerate} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">What is your study goal?</label>
                            <input 
                                type="text" 
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-850 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                placeholder="e.g. Learn Java and prepare for my final exam"
                                value={goal}
                                onChange={(e) => setGoal(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">How many hours can you study each day?</label>
                                <input 
                                    type="number" 
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-850 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                    value={hours}
                                    onChange={(e) => setHours(e.target.value)}
                                    min="0.5"
                                    max="8"
                                    step="0.5"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">When is your exam?</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-850 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                    value={examDate}
                                    onChange={(e) => setExamDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-semibold transition-colors mt-2" 
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
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Your Study Goal</span>
                            <h3 className="text-lg font-bold text-slate-855 dark:text-slate-100">{plan.goal}</h3>
                            <p className="text-xs text-slate-400">
                                Time limit: {plan.available_hours_daily} hrs/day • Dates: {new Date(plan.start_date).toLocaleDateString()} - {new Date(plan.end_date).toLocaleDateString()}
                            </p>
                        </div>
                        
                        <button 
                            onClick={() => setShowResetModal(true)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold border border-slate-200/50 dark:border-slate-700/50 transition-colors"
                        >
                            <RefreshCw size={12} />
                            <span>Create a New Plan</span>
                        </button>
                    </div>

                    {/* Google Calendar-like column schedule */}
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 text-sm">
                            <Calendar size={16} className="text-indigo-600 dark:text-indigo-400" />
                            <span>Your 7-Day Study Calendar</span>
                        </h3>

                        {/* Calendar Columns Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                            {plan.plan_schedule.map((day, index) => {
                                const formattedDate = new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                
                                return (
                                    <div key={index} className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col h-full min-h-[300px]">
                                        {/* Column Header */}
                                        <div className="border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-4 text-center">
                                            <p className="font-bold text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{day.dayName}</p>
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">{formattedDate}</p>
                                        </div>

                                        {/* Visual Day Time blocks */}
                                        <div className="flex-1 flex flex-col gap-3">
                                            {day.allocation.length === 0 ? (
                                                <div className="flex-1 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-950/20">
                                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Day Off</span>
                                                </div>
                                            ) : (
                                                day.allocation.map((session, sIdx) => (
                                                    <div 
                                                        key={sIdx} 
                                                        className="bg-indigo-50/40 dark:bg-indigo-500/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/10 rounded-xl p-3 text-left transition-colors flex flex-col justify-between"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed">
                                                                {session.topicTitle}
                                                            </p>
                                                            <span className="inline-block bg-indigo-100/40 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-2">
                                                                {session.focusArea}
                                                            </span>
                                                        </div>
                                                        <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-semibold border-t border-indigo-100/30 dark:border-indigo-500/5 pt-2">
                                                            <Clock size={10} />
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-xl animate-in zoom-in-95 duration-200 text-center space-y-4">
                        <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center">
                            <AlertTriangle size={24} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reset Study Plan?</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Are you sure you want to clear your current schedule and goal? This will start a new plan.
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowResetModal(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
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
                                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-555 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
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
