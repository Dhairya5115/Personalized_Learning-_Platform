import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
    Users, Award, Activity, Search, Filter, 
    ChevronDown, ChevronUp, CheckCircle, XCircle, RefreshCw 
} from 'lucide-react';

export default function StudentProgressTracker() {
    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [expandedStudentId, setExpandedStudentId] = useState(null);

    useEffect(() => {
        loadTrackerData();
    }, []);

    async function loadTrackerData() {
        setLoading(true);
        setError('');
        try {
            const data = await api.getTeacherStudentProgress();
            if (data.success) {
                setStudents(data.students);
                setCourses(data.courses);
            }
        } catch (err) {
            setError(err.message || 'Failed to fetch student progress analytics.');
        } finally {
            setLoading(false);
        }
    }

    const toggleExpand = (studentId, courseId) => {
        const uniqueKey = `${studentId}-${courseId}`;
        if (expandedStudentId === uniqueKey) {
            setExpandedStudentId(null);
        } else {
            setExpandedStudentId(uniqueKey);
        }
    };

    // Filter students logic
    const filteredStudents = students.filter(student => {
        const matchesSearch = 
            `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.email.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesCourse = selectedCourseId === '' || student.courseId === selectedCourseId;
        
        return matchesSearch && matchesCourse;
    });

    // Deduplicate count by distinct student email addresses
    const uniqueStudentEmails = Array.from(new Set(filteredStudents.map(s => s.email.toLowerCase())));
    const totalStudents = uniqueStudentEmails.length;

    const avgProgress = filteredStudents.length > 0 
        ? Math.round(filteredStudents.reduce((sum, s) => sum + s.overallProgress, 0) / filteredStudents.length)
        : 0;
    const avgSkill = filteredStudents.length > 0 
        ? Math.round(filteredStudents.reduce((sum, s) => sum + s.averageSkillScore, 0) / filteredStudents.length)
        : 0;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mb-4" />
                <span>Loading student progress analytics...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Student Progress Tracker
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Check how your students are doing, view their quiz scores, and monitor their learning progress.
                    </p>
                </div>
                <button 
                    onClick={loadTrackerData}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors bg-white dark:bg-slate-900"
                >
                    <RefreshCw size={12} />
                    <span>Refresh Data</span>
                </button>
            </div>

            {error && (
                <div className="bg-rose-500/10 text-rose-500 border border-rose-500/20 p-4 rounded-xl text-sm">
                    {error}
                </div>
            )}

            {/* KPI Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center gap-4">
                    <div className="bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <Users size={22} />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Total Students</span>
                        <h3 className="text-xl font-bold text-slate-855 dark:text-slate-100 mt-0.5">{totalStudents}</h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center gap-4">
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-xl text-emerald-600 dark:text-emerald-450">
                        <Activity size={22} />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Average Progress</span>
                        <h3 className="text-xl font-bold text-slate-855 dark:text-slate-100 mt-0.5">{avgProgress}%</h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center gap-4">
                    <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl text-amber-500">
                        <Award size={22} />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Average Score</span>
                        <h3 className="text-xl font-bold text-slate-855 dark:text-slate-100 mt-0.5">{avgSkill}%</h3>
                    </div>
                </div>
            </div>

            {/* Filter controls bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center shadow-xs">
                {/* Search query box */}
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
                    <input 
                        type="text"
                        placeholder="Search student name or email..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 pl-10 pr-4 py-2 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Course filter select box */}
                <div className="relative w-full sm:w-64 flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-slate-400">
                    <Filter size={14} className="text-slate-400" />
                    <select
                        className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 focus:outline-none border-none cursor-pointer dark:bg-slate-950"
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                    >
                        <option value="" className="bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-100">All Taught Courses</option>
                        {courses.map(c => (
                            <option key={c.id} value={c.id} className="bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-100">{c.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Students Table Grid list */}
            {filteredStudents.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
                    <Users size={32} className="text-slate-400 mb-3" />
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No students found</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Ensure you are checking the correct course parameters or query criteria.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredStudents.map(student => {
                        const uniqueKey = `${student.studentId}-${student.courseId}`;
                        const isExpanded = expandedStudentId === uniqueKey;

                        return (
                            <div 
                                key={uniqueKey} 
                                className="bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 dark:hover:border-slate-700/80 transition-colors"
                            >
                                {/* Student Summary Row */}
                                <div 
                                    onClick={() => toggleExpand(student.studentId, student.courseId)}
                                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                                >
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm text-slate-850 dark:text-slate-100">
                                            {student.firstName} {student.lastName}
                                        </span>
                                        <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                            {student.email} • Enrolled {new Date(student.enrolledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-6 sm:gap-10">
                                        {/* Course Path column */}
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Course Template</span>
                                            <span className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 font-semibold">
                                                {student.courseTitle}
                                            </span>
                                        </div>

                                        {/* Progress Bar completion */}
                                        <div className="flex flex-col w-32">
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-1">
                                                <span>PROGRESS</span>
                                                <span className="text-slate-600 dark:text-slate-350">{student.overallProgress}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-indigo-600 rounded-full" 
                                                    style={{ width: `${student.overallProgress}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Average skill level */}
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Skill Level</span>
                                            <span className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 font-bold flex items-center gap-1.5">
                                                <div className={`w-2 h-2 rounded-full ${
                                                    student.averageSkillScore >= 80 
                                                        ? 'bg-emerald-500' 
                                                        : student.averageSkillScore >= 50 
                                                            ? 'bg-amber-500' 
                                                            : 'bg-rose-500'
                                                }`} />
                                                <span>{student.averageSkillScore}%</span>
                                            </span>
                                        </div>

                                        {/* Chevron Toggle */}
                                        <div className="text-slate-400 self-center">
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded profile metrics */}
                                {isExpanded && (
                                    <div className="px-5 pb-6 pt-2 border-t border-slate-50 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-950/10 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            
                                            {/* Left: Topic Breakdowns */}
                                            <div className="space-y-3 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">📚 Topic Syllabus Scores</h4>
                                                
                                                {student.topicProgress.length === 0 ? (
                                                    <p className="text-xs text-slate-400 italic">No topics studied yet.</p>
                                                ) : (
                                                    <div className="space-y-3 divide-y divide-slate-50 dark:divide-slate-800/50">
                                                        {student.topicProgress.map((tp, tpIdx) => (
                                                            <div key={tp.topicId} className={`pt-3 ${tpIdx === 0 ? 'pt-0' : ''} flex items-center justify-between gap-4`}>
                                                                <div className="flex-1 min-w-0">
                                                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate">
                                                                        {tp.topicTitle}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 block mt-0.5">
                                                                        Completion: {tp.completion}%
                                                                    </span>    
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right: Quiz High Scores logs */}
                                            <div className="space-y-3 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">📝 Quiz Evaluations</h4>
                                                
                                                {student.quizzes.length === 0 ? (
                                                    <p className="text-xs text-slate-400 italic">No quizzes created for this course yet.</p>
                                                ) : (
                                                    <div className="space-y-3.5">
                                                        {student.quizzes.map(q => {
                                                            const hasAttempted = q.attemptsCount > 0;
                                                            const isPassing = hasAttempted && q.bestScore >= q.passingScore;

                                                            return (
                                                                <div key={q.quizId} className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800/30 pb-2 gap-4">
                                                                    <div className="min-w-0">
                                                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block truncate">
                                                                            {q.quizTitle}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-400 block mt-0.5">
                                                                            Passing Limit: {q.passingScore}% • Attempts: {q.attemptsCount}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                                        {hasAttempted ? (
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className={`text-xs font-bold ${
                                                                                    isPassing ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                                                                                }`}>
                                                                                    {q.bestScore}%
                                                                                </span>
                                                                                {isPassing ? (
                                                                                    <CheckCircle size={14} className="text-emerald-500" />
                                                                                ) : (
                                                                                    <XCircle size={14} className="text-rose-500" />
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-[10px] text-slate-450 italic">No attempts</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
