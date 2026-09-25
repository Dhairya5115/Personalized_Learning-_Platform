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
            <div className="flex flex-col items-center justify-center py-20 text-[#52716c]">
                <div className="w-8 h-8 rounded-full border-3 border-[#00262b] border-t-transparent animate-spin mb-4" />
                <span className="font-semibold text-sm">Loading student progress analytics...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#00262b]">
                        Student Progress Tracker
                    </h1>
                    <p className="mt-2 text-sm font-medium text-[#52716c]">
                        Check how your students are doing, view their quiz scores, and monitor their learning progress.
                    </p>
                </div>
                <button 
                    onClick={loadTrackerData}
                    className="btn-ghost !text-xs !py-2 !px-4 inline-flex items-center gap-2"
                >
                    <RefreshCw size={14} />
                    <span>Refresh Data</span>
                </button>
            </div>

            {error && (
                <div className="bg-[#f3f1ed] text-[#d64000] border border-[#d64000]/30 p-4 rounded-xl text-xs font-bold">
                    {error}
                </div>
            )}

            {/* KPI Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-6 shadow-sm flex items-center gap-4">
                    <div className="bg-[#00262b] p-3.5 rounded-2xl text-[#04c5e7] shadow-sm">
                        <Users size={24} />
                    </div>
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#52716c]">Total Students</span>
                        <h3 className="text-2xl font-extrabold text-[#00262b] mt-0.5">{totalStudents}</h3>
                    </div>
                </div>

                <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-6 shadow-sm flex items-center gap-4">
                    <div className="bg-[#f9f8f6] border border-[#e1ddd1] p-3.5 rounded-2xl text-[#00262b]">
                        <Activity size={24} />
                    </div>
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#52716c]">Average Progress</span>
                        <h3 className="text-2xl font-extrabold text-[#00262b] mt-0.5">{avgProgress}%</h3>
                    </div>
                </div>

                <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-6 shadow-sm flex items-center gap-4">
                    <div className="bg-[#f3f1ed] border border-[#e1ddd1] p-3.5 rounded-2xl text-[#d64000]">
                        <Award size={24} />
                    </div>
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#52716c]">Average Score</span>
                        <h3 className="text-2xl font-extrabold text-[#00262b] mt-0.5">{avgSkill}%</h3>
                    </div>
                </div>
            </div>

            {/* Filter controls bar */}
            <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center shadow-sm">
                {/* Search query box */}
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-0.95 top-1/2 transform -translate-y-1/2 text-[#52716c]" size={16} />
                    <input 
                        type="text"
                        placeholder="Search student name or email..."
                        className="w-full bg-[#ffffff] border border-[#e1ddd1] pl-10 pr-4 py-2.5 rounded-xl text-xs text-[#00262b] focus:outline-none focus:border-[#04c5e7]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Course filter select box */}
                <div className="relative w-full sm:w-64 flex items-center gap-2 bg-[#ffffff] border border-[#e1ddd1] rounded-xl px-3 py-2 text-[#52716c]">
                    <Filter size={14} className="text-[#52716c]" />
                    <select
                        className="w-full bg-transparent text-xs text-[#00262b] focus:outline-none border-none cursor-pointer"
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                    >
                        <option value="" className="bg-[#ffffff] text-[#00262b]">All Taught Courses</option>
                        {courses.map(c => (
                            <option key={c.id} value={c.id} className="bg-[#ffffff] text-[#00262b]">{c.title}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Students Table Grid list */}
            {filteredStudents.length === 0 ? (
                <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
                    <Users size={32} className="text-[#52716c] mb-3" />
                    <h3 className="font-extrabold text-base text-[#00262b]">No students found</h3>
                    <p className="text-xs text-[#52716c] mt-1">
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
                                className="bg-[#ffffff] border border-[#edebe3] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                            >
                                {/* Student Summary Row */}
                                <div 
                                    onClick={() => toggleExpand(student.studentId, student.courseId)}
                                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                                >
                                    <div className="flex flex-col">
                                        <span className="font-extrabold text-base text-[#00262b]">
                                            {student.firstName} {student.lastName}
                                        </span>
                                        <span className="text-[11px] text-[#52716c] mt-0.5">
                                            {student.email} • Enrolled {new Date(student.enrolledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-6 sm:gap-10">
                                        {/* Course Path column */}
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#52716c]">Course Template</span>
                                            <span className="text-xs text-[#00262b] mt-0.5 font-bold">
                                                {student.courseTitle}
                                            </span>
                                        </div>

                                        {/* Progress Bar completion */}
                                        <div className="flex flex-col w-32">
                                            <div className="flex justify-between items-center text-[10px] font-bold text-[#52716c] mb-1">
                                                <span>PROGRESS</span>
                                                <span className="text-[#00262b] font-extrabold">{student.overallProgress}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-[#f3f1ed] border border-[#edebe3] rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-[#04c5e7] rounded-full" 
                                                    style={{ width: `${student.overallProgress}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Average skill level */}
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#52716c]">Avg Skill Level</span>
                                            <span className="text-xs text-[#00262b] mt-0.5 font-extrabold flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-[#04c5e7]" />
                                                <span>{student.averageSkillScore}%</span>
                                            </span>
                                        </div>

                                        {/* Chevron Toggle */}
                                        <div className="text-[#52716c] self-center">
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded profile metrics */}
                                {isExpanded && (
                                    <div className="px-5 pb-6 pt-2 border-t border-[#f3f1ed] bg-[#ffffff] space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            
                                            {/* Left: Topic Breakdowns */}
                                            <div className="space-y-3 bg-[#f9f8f6] border border-[#edebe3] p-4 rounded-xl">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-[#52716c] mb-2">📚 Topic Syllabus Scores</h4>
                                                
                                                {student.topicProgress.length === 0 ? (
                                                    <p className="text-xs text-[#52716c] italic">No topics studied yet.</p>
                                                ) : (
                                                    <div className="space-y-3 divide-y divide-[#edebe3]">
                                                        {student.topicProgress.map((tp, tpIdx) => (
                                                            <div key={tp.topicId} className={`pt-3 ${tpIdx === 0 ? 'pt-0' : ''} flex items-center justify-between gap-4`}>
                                                                <div className="flex-1 min-w-0">
                                                                    <span className="text-xs font-bold text-[#00262b] block truncate">
                                                                        {tp.topicTitle}
                                                                    </span>
                                                                    <span className="text-[10px] text-[#52716c] block mt-0.5">
                                                                        Completion: {tp.completion}%
                                                                    </span>    
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right: Quiz High Scores logs */}
                                            <div className="space-y-3 bg-[#f9f8f6] border border-[#edebe3] p-4 rounded-xl">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-[#52716c] mb-2">📝 Quiz Evaluations</h4>
                                                
                                                {student.quizzes.length === 0 ? (
                                                    <p className="text-xs text-[#52716c] italic">No quizzes created for this course yet.</p>
                                                ) : (
                                                    <div className="space-y-3.5">
                                                        {student.quizzes.map(q => {
                                                            const hasAttempted = q.attemptsCount > 0;
                                                            const isPassing = hasAttempted && q.bestScore >= q.passingScore;

                                                            return (
                                                                <div key={q.quizId} className="flex items-center justify-between border-b border-[#edebe3] pb-2 gap-4">
                                                                    <div className="min-w-0">
                                                                        <span className="text-xs font-bold text-[#00262b] block truncate">
                                                                            {q.quizTitle}
                                                                        </span>
                                                                        <span className="text-[10px] text-[#52716c] block mt-0.5">
                                                                            Passing Limit: {q.passingScore}% • Attempts: {q.attemptsCount}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                                        {hasAttempted ? (
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="text-xs font-extrabold text-[#00262b]">
                                                                                    {q.bestScore}%
                                                                                </span>
                                                                                {isPassing ? (
                                                                                    <CheckCircle size={14} className="text-[#00262b]" />
                                                                                ) : (
                                                                                    <XCircle size={14} className="text-[#d64000]" />
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-[10px] text-[#52716c] italic">No attempts</span>
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
