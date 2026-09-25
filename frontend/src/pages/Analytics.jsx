import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Award, Flame, Target, CheckCircle, BarChart2, TrendingUp, Users, BookOpen, AlertTriangle, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { calculateAverageScore } from '../utils/scoreUtils';

export default function Analytics() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user.role === 'STUDENT') {
            loadAnalytics();
        }
    }, []);

    if (user.role !== 'STUDENT') {
        return null;
    }

    async function loadAnalytics() {
        setLoading(true);
        try {
            const report = await api.getAnalytics();
            setData(report);
        } catch (err) {
            console.error('Error fetching analytics report:', err.message);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-[#52716c]">
                <div className="w-8 h-8 rounded-full border-3 border-[#00262b] border-t-transparent animate-spin mb-4" />
                <span className="font-semibold text-sm">Compiling performance analytics reports...</span>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-12 bg-[#ffffff] border border-[#edebe3] rounded-2xl p-6 shadow-sm">
                <p className="text-[#52716c]">No learning analytics records logged yet.</p>
            </div>
        );
    }

    // ==========================================
    // TEACHER VIEW RENDER
    // ==========================================
    if (user.role === 'TEACHER') {
        const { summary, weakestTopics, studentGrades } = data;

        const renderWeakestTopicsChart = () => {
            if (!weakestTopics || weakestTopics.length === 0) {
                return (
                    <p className="text-xs text-slate-400 dark:text-slate-500 p-8 text-center italic">
                        No student activity recorded to compile weak spots.
                    </p>
                );
            }

            const width = 500;
            const height = 200;
            const padding = 30;

            return (
                <div className="w-full overflow-x-auto">
                    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible select-none min-w-[320px]">
                        {/* Grid lines */}
                        {[0, 25, 50, 75, 100].map(val => {
                            const y = height - padding - (val * (height - padding * 2)) / 100;
                            return (
                                <g key={val}>
                                    <line x1={padding} y1={y} x2={width - padding} y2={y} className="stroke-slate-100 dark:stroke-slate-800/60" />
                                    <text x={padding - 8} y={y + 4} className="fill-slate-400 text-[10px]" textAnchor="end">{val}</text>
                                </g>
                            );
                        })}

                        {/* Column bars */}
                        {weakestTopics.map((t, idx) => {
                            const barWidth = 32;
                            const gap = (width - padding * 2) / weakestTopics.length;
                            const x = padding + idx * gap + (gap - barWidth) / 2;
                            const barHeight = (t.avg_skill_score * (height - padding * 2)) / 100;
                            const y = height - padding - barHeight;

                            return (
                                <g key={idx}>
                                    <rect 
                                        x={x} 
                                        y={y} 
                                        width={barWidth} 
                                        height={barHeight} 
                                        fill="url(#weakBarGradient)" 
                                        rx="4" 
                                    />
                                    <text x={x + barWidth / 2} y={y - 8} className="fill-slate-800 dark:fill-slate-200 text-[10px] font-bold" textAnchor="middle">{t.avg_skill_score}%</text>
                                    <text x={x + barWidth / 2} y={height - 10} className="fill-slate-400 dark:fill-slate-500 text-[9px]" textAnchor="middle">
                                        {t.topic_title.length > 8 ? `${t.topic_title.substring(0, 8)}...` : t.topic_title}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Gradient */}
                        <defs>
                            <linearGradient id="weakBarGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f43f5e" />
                                <stop offset="100%" stopColor="rgba(244, 63, 94, 0.15)" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
            );
        };

        return (
            <div className="space-y-8 max-w-6xl mx-auto">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Instructor Analytics
                    </h1>
                    <p className="mt-2 text-base text-slate-500 dark:text-slate-400">
                        Monitor course enrollments, weaknesses, and average quiz standings.
                    </p>
                </div>

                {/* KPI stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                        <div className="bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Courses Published</span>
                            <h2 className="text-2xl font-bold text-slate-850 dark:text-slate-100 mt-1">{summary.totalCourses} Courses</h2>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                        <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-xl text-emerald-600 dark:text-emerald-400">
                            <Users size={24} />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Students</span>
                            <h2 className="text-2xl font-bold text-slate-850 dark:text-slate-100 mt-1">{summary.totalStudents} Enrollments</h2>
                        </div>
                    </div>
                </div>



                {/* Directory Table */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-805 dark:text-slate-200">
                        Student Directory &amp; Performance
                    </h2>
                    
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800/80 text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-wider">
                                        <th className="px-6 py-4">Student Name</th>
                                        <th className="px-6 py-4">Email</th>
                                        <th className="px-6 py-4">Courses Enrolled</th>
                                        <th className="px-6 py-4">Avg Quiz Grade</th>
                                        <th className="px-6 py-4 text-right">XP Gained</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-350">
                                    {studentGrades.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-10 text-center text-slate-400">
                                                No active enrollments recorded.
                                            </td>
                                        </tr>
                                    ) : (
                                        studentGrades.map((student) => (
                                            <tr key={student.student_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors">
                                                <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                                                    {student.first_name} {student.last_name}
                                                </td>
                                                <td className="px-6 py-4 text-slate-400">
                                                    {student.email}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {student.course_count} Course(s)
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`font-bold ${
                                                        student.avg_quiz_score >= 75 ? 'text-emerald-600 dark:text-emerald-400' : student.avg_quiz_score >= 40 ? 'text-amber-500' : 'text-rose-500'
                                                    }`}>
                                                        {student.avg_quiz_score}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-indigo-600 dark:text-indigo-400">
                                                    {student.xp_points} XP
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // STUDENT VIEW RENDER
    // ==========================================
    const { summary, quizTrends } = data;

    const renderQuizTrendsChart = () => {
        if (!quizTrends || quizTrends.length === 0) {
            return (
                <p className="text-xs text-[#52716c] py-8 text-center italic">
                    Complete your first quiz to compile performance trends.
                </p>
            );
        }

        const width = 500;
        const height = 200;
        const padding = 30;
        
        const points = quizTrends.map((t, idx) => {
            const x = padding + (idx * (width - padding * 2)) / Math.max(1, quizTrends.length - 1);
            const y = height - padding - (t.score * (height - padding * 2)) / 100;
            return { x, y, score: t.score, label: t.label };
        });

        const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

        return (
            <div className="w-full overflow-x-auto">
                <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible min-w-[320px]">
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map(val => {
                        const y = height - padding - (val * (height - padding * 2)) / 100;
                        return (
                            <g key={val}>
                                <line x1={padding} y1={y} x2={width - padding} y2={y} className="stroke-[#edebe3] dark:stroke-[#004d57]" strokeDasharray="3" />
                                <text x={padding - 8} y={y + 4} className="fill-[#52716c] dark:fill-[#a5b6b1] text-[10px]" textAnchor="end">{val}%</text>
                            </g>
                        );
                    })}

                    {/* Trend Line */}
                    <path d={linePath} fill="none" className="stroke-[#00262b] dark:stroke-[#04c5e7]" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Dots */}
                    {points.map((p, idx) => (
                        <g key={idx}>
                            <circle cx={p.x} cy={p.y} r="5" className="fill-[#ffffff] dark:fill-[#00262b] stroke-[#04c5e7]" strokeWidth="3" />
                            <text x={p.x} y={p.y - 12} data-chart-score="true" className="chart-score fill-[#00262b] dark:fill-[#f9f8f6] text-[9px] font-bold" textAnchor="middle">{p.score}%</text>
                            <text x={p.x} y={height - 10} className="fill-[#52716c] dark:fill-[#a5b6b1] text-[9px]" textAnchor="middle">{p.label}</text>
                        </g>
                    ))}
                </svg>
            </div>
        );
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#00262b]">
                    My Learning Progress
                </h1>
                <p className="mt-2 text-sm font-medium text-[#52716c]">
                    See your quiz scores, total points, and daily streak.
                </p>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                    <div className="bg-[#00262b] p-3 rounded-2xl text-[#04c5e7]">
                        <Award size={22} />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#52716c]">Total Points</span>
                        <h3 className="text-xl font-extrabold text-[#00262b] mt-0.5">{summary.xpPoints} XP</h3>
                    </div>
                </div>

                <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                    <div className="bg-[#f3f1ed] border border-[#e1ddd1] p-3 rounded-2xl text-[#d64000]">
                        <Flame size={22} fill="currentColor" />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#52716c]">Daily Streak</span>
                        <h3 className="text-xl font-extrabold text-[#00262b] mt-0.5">{summary.streakCount} Days</h3>
                    </div>
                </div>

                <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                    <div className="bg-[#f9f8f6] border border-[#e1ddd1] p-3 rounded-2xl text-[#00262b]">
                        <Target size={22} />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#52716c]">Average Quiz Score</span>
                        <h3 className="text-xl font-extrabold text-[#00262b] mt-0.5">{summary.averageScore}%</h3>
                    </div>
                </div>

                <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                    <div className="bg-[#00262b] p-3 rounded-2xl text-[#04c5e7]">
                        <CheckCircle size={22} />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#52716c]">Quizzes Taken</span>
                        <h3 className="text-xl font-extrabold text-[#00262b] mt-0.5">{summary.totalAttempts} Quizzes</h3>
                    </div>
                </div>
            </div>

            {/* SVG Charts */}
            <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-6 shadow-sm">
                <h3 className="font-extrabold text-base text-[#00262b] mb-4 flex items-center gap-2">
                    <TrendingUp className="text-[#04c5e7]" size={18} />
                    <span>Quiz Scores Over Time</span>
                </h3>
                <div className="mt-4">
                    {renderQuizTrendsChart()}
                </div>
            </div>

            {/* Recent Quiz Attempts & Performance Details */}
            <div className="space-y-4">
                <h3 className="font-extrabold text-[#00262b] text-base">
                    Recent Quiz Performance History
                </h3>

                <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-[#f9f8f6] border-b border-[#edebe3] text-[#52716c] font-bold text-xs uppercase tracking-wider">
                                    <th className="px-6 py-4">Quiz Title</th>
                                    <th className="px-6 py-4">Completed Date</th>
                                    <th className="px-6 py-4">Correct Answers</th>
                                    <th className="px-6 py-4">Incorrect Answers</th>
                                    <th className="px-6 py-4">Score</th>
                                    <th className="px-6 py-4 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f3f1ed] text-[#00262b]">
                                {!data.recentAttempts || data.recentAttempts.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-10 text-center text-[#52716c]">
                                            No quizzes attempted yet. Open course outline to take your first quiz!
                                        </td>
                                    </tr>
                                ) : (
                                    data.recentAttempts.map((attempt) => {
                                        const total = attempt.total_questions || 0;
                                        const correct = attempt.correct_count || 0;
                                        const incorrect = Math.max(0, total - correct);
                                        const pass = attempt.score >= attempt.passing_score;

                                        return (
                                            <tr key={attempt.id} className="hover:bg-[#f9f8f6] transition-colors">
                                                <td className="px-6 py-4 font-bold text-[#00262b]">
                                                    {attempt.quiz_title}
                                                </td>
                                                <td className="px-6 py-4 text-[#52716c]">
                                                    {new Date(attempt.completed_at).toLocaleDateString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1 text-[#00262b] font-bold">
                                                        ✓ {correct}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1 text-[#d64000] font-bold">
                                                        ✗ {incorrect}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-extrabold text-[#00262b]">
                                                    {attempt.score}%
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-[94px] uppercase tracking-wider border ${
                                                        pass 
                                                            ? 'bg-[#f3f1ed] text-[#00262b] border-[#04c5e7]' 
                                                            : 'bg-[#f3f1ed] text-[#d64000] border-[#d64000]/40'
                                                    }`}>
                                                        {pass ? 'Pass' : 'Fail'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    );
}
