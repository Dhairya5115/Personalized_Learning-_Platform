import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { calculateAverageScore, getRecentScore } from '../utils/scoreUtils';
import { 
    BookOpen, CheckCircle, Clock, XCircle, Send, Users, 
    Calendar, Link as LinkIcon, AlertCircle, FileText, ChevronRight,
    UserCheck, UserX, Award, ShieldCheck, Video, HelpCircle, Check,
    ArrowRight, Target, TrendingUp
} from 'lucide-react';

/* ====================================================================
   1. TA Available Courses & Application Modal Page
   ==================================================================== */
export function TaCourseCatalog() {
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState(null);

    // Application Form Fields
    const [fullName, setFullName] = useState('');
    const [contact, setContact] = useState('');
    const [qualification, setQualification] = useState('Computer Science / IT');
    const [motivation, setMotivation] = useState('');
    const [experience, setExperience] = useState('');
    const [resumeLink, setResumeLink] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [allCourses, myApps] = await Promise.all([
                api.getCourses(),
                api.getTaApplications()
            ]);
            setCourses(allCourses || []);
            setApplications(myApps || []);
        } catch (err) {
            console.error('Error loading TA catalog:', err);
        } finally {
            setLoading(false);
        }
    };

    const getAppStatus = (courseId) => {
        const app = applications.find(a => a.course_id === courseId && ['PENDING', 'APPROVED'].includes(a.status));
        return app ? app.status : null;
    };

    const handleApplySubmit = async (e) => {
        e.preventDefault();
        if (!selectedCourse) return;

        // Basic phone number format validation
        const phoneRegex = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s./0-9]{7,15}$/;
        if (!phoneRegex.test(contact.trim())) {
            setError('Please enter a valid contact phone number (at least 7 to 15 digits)');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            await api.applyForTaCourse({
                courseId: selectedCourse.id,
                fullName,
                contact,
                qualification,
                motivation,
                experience,
                resumeLink
            });
            if (window.showToast) window.showToast('TA Application submitted successfully!', 'success');
            setSelectedCourse(null);
            setFullName('');
            setContact('');
            setQualification('Computer Science / IT');
            setMotivation('');
            setExperience('');
            setResumeLink('');
            loadData();
        } catch (err) {
            setError(err.message || 'Failed to submit application');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 rounded-full border-3 border-[#00262b] border-t-transparent animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-[#00262b]">
                    Apply as Teaching Assistant
                </h1>
                <p className="text-sm text-[#52716c] mt-1">
                    Browse courses needing TAs and submit your application to assist teachers and mentor students.
                </p>
            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map(course => {
                    const status = getAppStatus(course.id);
                    return (
                        <div key={course.id} className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-all shadow-sm">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    {/* <span className="px-3 py-1 bg-[#f9f8f6] text-[#00262b] border border-[#e1ddd1] text-xs font-bold rounded-[94px]">
                                        Course ID: {course.id.slice(0, 8)}
                                    </span> */}
                                    {status && (
                                        <span className="px-3 py-1 rounded-[94px] text-xs font-bold bg-[#f3f1ed] text-[#00262b] border border-[#e1ddd1]">
                                            {status}
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-xl font-extrabold text-[#00262b] mb-2 line-clamp-1">
                                    {course.title}
                                </h3>
                                <p className="text-sm text-[#52716c] line-clamp-3 mb-6">
                                    {course.description || 'No detailed description provided.'}
                                </p>
                            </div>

                            <div className="pt-4 border-t border-[#f3f1ed] flex items-center justify-between">
                                <span className="text-xs text-[#52716c]">
                                    Teacher: {course.teacher_name || 'Assigned Instructor'}
                                </span>
                                {status === 'APPROVED' ? (
                                    <button 
                                        onClick={() => navigate(`/courses/${course.id}`)}
                                        className="btn-primary !text-xs !py-2 !px-4 inline-flex items-center gap-1.5"
                                    >
                                        <span>Open Course (TA View)</span>
                                        <ArrowRight size={14} />
                                    </button>
                                ) : status === 'PENDING' ? (
                                    <button 
                                        disabled 
                                        className="px-4 py-2 bg-[#f3f1ed] dark:bg-[#004d57] text-[#52716c] dark:text-[#a5b6b1] text-xs font-semibold rounded-[94px] cursor-not-allowed border border-[#e1ddd1] dark:border-[#00606c]"
                                    >
                                        Application Pending
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => setSelectedCourse(course)}
                                        className="btn-primary !text-xs !py-2 !px-4"
                                    >
                                        Apply as TA
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Application Modal */}
            {selectedCourse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#00262b]/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8">
                        <div className="flex items-center justify-between border-b border-[#f3f1ed] pb-4">
                            <div>
                                <h3 className="text-xl font-extrabold text-[#00262b]">
                                    Apply for {selectedCourse.title}
                                </h3>
                                <p className="text-xs text-[#52716c]">Submit your qualifications to the lead teacher.</p>
                            </div>
                            <button 
                                onClick={() => setSelectedCourse(null)}
                                className="text-[#52716c] hover:text-[#00262b] p-1 rounded-full hover:bg-[#f9f8f6]"
                            >
                                ✕
                            </button>
                        </div>

                        {error && (
                            <div className="p-3 bg-[#f3f1ed] border border-[#d64000]/30 text-[#d64000] text-xs rounded-xl flex items-center gap-2 font-bold">
                                <AlertCircle size={14} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleApplySubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-[#52716c] uppercase tracking-wider mb-1">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Jane Doe"
                                        className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl p-2.5 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7]"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[#52716c] uppercase tracking-wider mb-1">
                                        Contact Phone Number *
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="+1 555-0199 or 9876543210"
                                        className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl p-2.5 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7]"
                                        value={contact}
                                        onChange={(e) => setContact(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#52716c] uppercase tracking-wider mb-1">
                                    Qualification / Degree *
                                </label>
                                <select
                                    required
                                    className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl p-2.5 text-sm focus:outline-none focus:border-[#04c5e7] text-[#00262b]"
                                    value={qualification}
                                    onChange={(e) => setQualification(e.target.value)}
                                >
                                    <option value="B.Tech Computer Science">B.Tech Computer Science</option>
                                    <option value="M.Tech Software Engineering">M.Tech Software Engineering</option>
                                    <option value="B.S. Information Technology">B.S. Information Technology</option>
                                    <option value="M.S. Data Science / AI">M.S. Data Science / AI</option>
                                    <option value="Ph.D. Computer Science">Ph.D. Computer Science</option>
                                    <option value="Other Technical Qualification">Other Technical Qualification</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#52716c] uppercase tracking-wider mb-1">
                                    Why do you want to join? *
                                </label>
                                <textarea
                                    required
                                    rows="3"
                                    placeholder="Explain your passion and suitability for mentoring this course..."
                                    className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl p-2.5 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7]"
                                    value={motivation}
                                    onChange={(e) => setMotivation(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#52716c] uppercase tracking-wider mb-1">
                                    Relevant Past Experience (Optional)
                                </label>
                                <textarea
                                    rows="2"
                                    placeholder="Previous tutoring, projects, or subject expertise..."
                                    className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl p-2.5 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7]"
                                    value={experience}
                                    onChange={(e) => setExperience(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#52716c] uppercase tracking-wider mb-1">
                                    Resume / Portfolio Link (Optional)
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://linkedin.com/in/username"
                                    className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl p-2.5 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7]"
                                    value={resumeLink}
                                    onChange={(e) => setResumeLink(e.target.value)}
                                />
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#f3f1ed]">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCourse(null)}
                                    className="btn-ghost !text-xs !py-2 !px-4"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="btn-primary !text-xs !py-2 !px-5"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Application'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ====================================================================
   2. TA My Applications Status Page
   ==================================================================== */
export function TaApplications() {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            const data = await api.getTaApplications();
            setApplications(data || []);
        } catch (err) {
            console.error('Error fetching applications:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 rounded-full border-3 border-[#00262b] border-t-transparent animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-[#00262b]">
                    My TA Applications
                </h1>
                <p className="text-sm text-[#52716c] mt-1">
                    Track the status of your applications to serve as a Teaching Assistant.
                </p>
            </div>

            {applications.length === 0 ? (
                <div className="p-12 text-center bg-[#ffffff] border border-[#edebe3] rounded-2xl space-y-3 shadow-sm">
                    <FileText className="mx-auto text-[#52716c]" size={48} />
                    <p className="text-[#52716c] text-sm">No applications submitted yet.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {applications.map(app => (
                        <div key={app.id} className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-extrabold text-[#00262b] text-lg">
                                        {app.course_title}
                                    </h3>
                                    <span className={`px-3 py-1 rounded-[94px] text-xs font-bold uppercase tracking-wider border ${
                                        app.status === 'APPROVED'
                                            ? 'bg-[#f3f1ed] text-[#00262b] border-[#04c5e7]'
                                            : app.status === 'REJECTED'
                                                ? 'bg-[#f3f1ed] text-[#d64000] border-[#d64000]/40'
                                                : 'bg-[#f3f1ed] text-[#00262b] border-[#e1ddd1]'
                                    }`}>
                                        {app.status}
                                    </span>
                                </div>
                                <p className="text-xs text-[#52716c]">
                                    Submitted on: {new Date(app.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                </p>
                                <p className="text-sm text-[#00262b] mt-2">
                                    <strong>Cover Note:</strong> {app.motivation}
                                </p>
                                {app.experience && (
                                    <p className="text-xs text-[#52716c]">
                                        <strong>Qualifications:</strong> {app.experience}
                                    </p>
                                )}
                            </div>

                            {app.reviewed_at && (
                                <div className="text-xs text-[#52716c] border-t md:border-t-0 md:border-l border-[#f3f1ed] pt-3 md:pt-0 md:pl-6">
                                    Reviewed on: {new Date(app.reviewed_at).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ====================================================================
   3. TA Assigned Courses & Limited Student Data View
   ==================================================================== */
export function TaAssignedStudents() {
    const [assignedCourses, setAssignedCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState(null);
    const [students, setStudents] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [loadingStudents, setLoadingStudents] = useState(false);

    useEffect(() => {
        fetchAssignedCourses();
    }, []);

    const fetchAssignedCourses = async () => {
        try {
            const courses = await api.getTaAssignedCourses();
            setAssignedCourses(courses || []);
            if (courses && courses.length > 0) {
                setSelectedCourseId(courses[0].id);
                fetchStudentsForCourse(courses[0].id);
            }
        } catch (err) {
            console.error('Error fetching assigned courses:', err);
        } finally {
            setLoadingCourses(false);
        }
    };

    const fetchStudentsForCourse = async (courseId) => {
        setLoadingStudents(true);
        try {
            const data = await api.getTaAssignedCourseStudents(courseId);
            setStudents(data || []);
        } catch (err) {
            console.error('Error fetching students:', err);
            if (window.showToast) window.showToast(err.message, 'error');
        } finally {
            setLoadingStudents(false);
        }
    };

    if (loadingCourses) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 rounded-full border-3 border-[#00262b] border-t-transparent animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-[#00262b]">
                    Assigned Courses & Enrolled Students
                </h1>
                <p className="text-sm text-[#52716c] mt-1">
                    Access non-sensitive student progress and skill scores for your assigned courses.
                </p>
            </div>

            {assignedCourses.length === 0 ? (
                <div className="p-12 text-center bg-[#ffffff] border border-[#edebe3] rounded-2xl space-y-3 shadow-sm">
                    <ShieldCheck className="mx-auto text-[#52716c]" size={48} />
                    <h3 className="font-bold text-[#00262b]">No Assigned Courses Yet</h3>
                    <p className="text-[#52716c] text-xs">Apply for available courses and once approved by the lead teacher, your assigned courses will appear here.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Course Selector Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#edebe3]">
                        {assignedCourses.map(course => (
                            <button
                                key={course.id}
                                onClick={() => {
                                    setSelectedCourseId(course.id);
                                    fetchStudentsForCourse(course.id);
                                }}
                                className={`px-5 py-2.5 rounded-[94px] text-xs font-bold transition-all whitespace-nowrap ${
                                    selectedCourseId === course.id
                                        ? 'bg-[#04c5e7] text-[#00262b] shadow-sm'
                                        : 'btn-ghost'
                                }`}
                            >
                                {course.title}
                            </button>
                        ))}
                    </div>

                    {/* Students List */}
                    {loadingStudents ? (
                        <div className="py-12 text-center text-[#52716c] text-sm">Loading enrolled student records...</div>
                    ) : students.length === 0 ? (
                        <div className="p-8 text-center bg-[#ffffff] border border-[#edebe3] rounded-2xl text-[#52716c] text-sm shadow-sm">
                            No students enrolled in this course yet.
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {students.map(std => (
                                <div key={std.student_id} className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-6 space-y-4 shadow-sm">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#f3f1ed] pb-3">
                                        <div>
                                            <h4 className="font-bold text-[#00262b] text-base">
                                                {std.first_name} {std.last_name}
                                            </h4>
                                            <p className="text-xs text-[#52716c]">
                                                Email: {std.email} • Enrolled: {new Date(std.enrolled_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span className="px-3 py-1 bg-[#f3f1ed] border border-[#e1ddd1] text-[#00262b] text-xs font-bold rounded-[94px] self-start md:self-auto">
                                            Status: Active ({std.payment_status})
                                        </span>
                                    </div>

                                    {/* Student Performance Metrics: Average Score & Recent Score */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                                        <div className="p-3.5 bg-[#f9f8f6] dark:bg-[#00383f] border border-[#edebe3] dark:border-[#004d57] rounded-xl flex items-center justify-between">
                                            <div>
                                                <span className="block text-[10px] font-bold uppercase text-[#52716c] dark:text-[#a5b6b1] tracking-wider">Average Score</span>
                                                <span className="text-lg font-extrabold text-[#00262b] dark:text-[#f9f8f6] mt-0.5 block">
                                                    {std.average_score !== null ? `${std.average_score}%` : 'No attempts yet'}
                                                </span>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-[#f3f1ed] dark:bg-[#004d57] flex items-center justify-center text-[#00262b] dark:text-[#04c5e7]">
                                                <Target size={16} />
                                            </div>
                                        </div>

                                        <div className="p-3.5 bg-[#f9f8f6] dark:bg-[#00383f] border border-[#edebe3] dark:border-[#004d57] rounded-xl flex items-center justify-between">
                                            <div>
                                                <span className="block text-[10px] font-bold uppercase text-[#52716c] dark:text-[#a5b6b1] tracking-wider">Recent Score</span>
                                                <span className="text-lg font-extrabold text-[#00262b] dark:text-[#f9f8f6] mt-0.5 block">
                                                    {std.recent_score !== null ? `${std.recent_score}%` : 'No attempts yet'}
                                                </span>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-[#f3f1ed] dark:bg-[#004d57] flex items-center justify-center text-[#00262b] dark:text-[#04c5e7]">
                                                <TrendingUp size={16} />
                                            </div>
                                        </div>

                                        <div className="p-3.5 bg-[#f9f8f6] dark:bg-[#00383f] border border-[#edebe3] dark:border-[#004d57] rounded-xl flex items-center justify-between">
                                            <div>
                                                <span className="block text-[10px] font-bold uppercase text-[#52716c] dark:text-[#a5b6b1] tracking-wider">Total Attempts</span>
                                                <span className="text-lg font-extrabold text-[#00262b] dark:text-[#f9f8f6] mt-0.5 block">
                                                    {std.attempts_count || 0} Attempt{std.attempts_count === 1 ? '' : 's'}
                                                </span>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-[#f3f1ed] dark:bg-[#004d57] flex items-center justify-center text-[#00262b] dark:text-[#04c5e7]">
                                                <Award size={16} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Topic Breakdown (Average & Recent per topic) */}
                                    {std.topic_progress && std.topic_progress.length > 0 && (
                                        <div className="pt-2">
                                            <h5 className="text-[11px] font-bold text-[#52716c] dark:text-[#a5b6b1] uppercase tracking-wider mb-2.5">
                                                Topic Breakdown (Average & Recent Scores)
                                            </h5>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                                {std.topic_progress.map((tp, idx) => (
                                                    <div key={idx} className="p-3 bg-[#f9f8f6] dark:bg-[#00383f] border border-[#edebe3] dark:border-[#004d57] rounded-xl flex items-center justify-between gap-2">
                                                        <div className="truncate min-w-0">
                                                            <span className="text-xs font-bold text-[#00262b] dark:text-[#f9f8f6] block truncate" title={tp.topic_title}>
                                                                {tp.topic_title}
                                                            </span>
                                                            <span className="text-[10px] text-[#52716c] dark:text-[#a5b6b1]">
                                                                Progress: {tp.completion_percentage || 0}%
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-[94px] bg-[#f3f1ed] dark:bg-[#004d57] text-[#00262b] dark:text-[#f9f8f6] border border-[#e1ddd1] dark:border-[#00606c]" title="Average Score across attempts">
                                                                Avg: {tp.average_score !== null ? `${tp.average_score}%` : '—'}
                                                            </span>
                                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-[94px] bg-[#f3f1ed] dark:bg-[#004d57] text-[#52716c] dark:text-[#a5b6b1] border border-[#e1ddd1] dark:border-[#00606c]" title="Recent Score">
                                                                Rec: {tp.recent_score !== null ? `${tp.recent_score}%` : '—'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ====================================================================
   4. TA Pending Requests & Virtual Meeting Link Scheduler Page
   ==================================================================== */
export function TaPendingRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReq, setSelectedReq] = useState(null);
    const [meetingLink, setMeetingLink] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const data = await api.getTaIncomingRequests();
            setRequests(data || []);
        } catch (err) {
            console.error('Error fetching TA requests:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleScheduleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedReq) return;
        setSubmitting(true);
        setError('');

        try {
            await api.scheduleTaDoubtRequest(selectedReq.id, meetingLink, scheduledAt);
            if (window.showToast) window.showToast('Session scheduled & calendar invite emailed to student!', 'success');
            setSelectedReq(null);
            setMeetingLink('');
            setScheduledAt('');
            fetchRequests();
        } catch (err) {
            setError(err.message || 'Failed to schedule request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleResolve = async (reqId) => {
        try {
            await api.updateTaRequestStatus(reqId, 'RESOLVED');
            if (window.showToast) window.showToast('Doubt marked as resolved', 'success');
            fetchRequests();
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    const [filterStatus, setFilterStatus] = useState('ALL');

    const counts = {
        ALL: requests.length,
        PENDING: requests.filter(r => r.status === 'PENDING').length,
        SCHEDULED: requests.filter(r => r.status === 'SCHEDULED').length,
        RESOLVED: requests.filter(r => r.status === 'RESOLVED').length
    };

    const filteredRequests = requests.filter(req => {
        if (filterStatus === 'ALL') return true;
        return req.status === filterStatus;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 rounded-full border-3 border-[#00262b] border-t-transparent animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-[#00262b]">
                    Incoming Student Doubt Requests
                </h1>
                <p className="text-sm text-[#52716c] mt-1">
                    Review student questions and schedule 1-on-1 virtual meeting sessions.
                </p>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-2 border-b border-[#edebe3] pb-3 overflow-x-auto">
                {[
                    { id: 'ALL', label: 'All Requests', count: counts.ALL },
                    { id: 'PENDING', label: 'Pending', count: counts.PENDING },
                    { id: 'SCHEDULED', label: 'Scheduled', count: counts.SCHEDULED },
                    { id: 'RESOLVED', label: 'Resolved', count: counts.RESOLVED }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilterStatus(tab.id)}
                        className={`px-5 py-2.5 rounded-[94px] text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                            filterStatus === tab.id
                                ? 'bg-[#04c5e7] text-[#00262b] shadow-sm'
                                : 'btn-ghost'
                        }`}
                    >
                        <span>{tab.label}</span>
                        <span className={`px-2 py-0.5 rounded-[94px] text-[10px] font-black ${
                            filterStatus === tab.id ? 'bg-[#00262b] text-white' : 'bg-[#f3f1ed] text-[#00262b]'
                        }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {filteredRequests.length === 0 ? (
                <div className="p-12 text-center bg-[#ffffff] border border-[#edebe3] rounded-2xl space-y-3 shadow-sm">
                    <HelpCircle className="mx-auto text-[#52716c]" size={48} />
                    <p className="text-[#52716c] text-sm">
                        No {filterStatus !== 'ALL' ? filterStatus.toLowerCase() : ''} student doubt requests found.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredRequests.map(req => (
                        <div key={req.id} className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-6 space-y-4 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#f3f1ed] pb-3">
                                <div>
                                    <span className="text-xs font-bold text-[#04c5e7]">
                                        Course: {req.course_title}
                                    </span>
                                    <h3 className="font-extrabold text-[#00262b] text-lg">
                                        {req.subject}
                                    </h3>
                                    <p className="text-xs text-[#52716c]">
                                        From: {req.student_first_name} {req.student_last_name} ({req.student_email})
                                    </p>
                                </div>

                                <span className={`px-3 py-1 rounded-[94px] text-xs font-bold uppercase tracking-wider self-start md:self-auto border ${
                                    req.status === 'SCHEDULED'
                                        ? 'bg-[#f3f1ed] text-[#00262b] border-[#04c5e7]'
                                        : req.status === 'RESOLVED'
                                            ? 'bg-[#f3f1ed] text-[#00262b] border-[#e1ddd1]'
                                            : 'bg-[#f3f1ed] text-[#d64000] border-[#d64000]/40'
                                }`}>
                                    {req.status}
                                </span>
                            </div>

                            <p className="text-sm text-[#00262b] bg-[#f9f8f6] p-4 rounded-xl border border-[#edebe3]">
                                {req.description}
                            </p>

                            {/* Meeting Link only shown if SCHEDULED */}
                            {req.meeting_link && req.status === 'SCHEDULED' && (
                                <div className="p-3 bg-[#f9f8f6] border border-[#04c5e7] rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <span className="font-bold text-[#00262b]">Scheduled: </span>
                                        <span className="text-[#00262b]">{new Date(req.scheduled_at).toLocaleString()}</span>
                                    </div>
                                    <a href={req.meeting_link} target="_blank" rel="noreferrer" className="text-[#00262b] font-bold underline flex items-center gap-1 hover:text-[#04c5e7]">
                                        <Video size={14} /> Join Meeting
                                    </a>
                                </div>
                            )}

                            {req.status === 'RESOLVED' && (
                                <div className="p-3 bg-[#f9f8f6] border border-[#edebe3] rounded-xl text-xs flex items-center justify-between">
                                    <span className="font-bold text-[#00262b] flex items-center gap-1.5">
                                        <CheckCircle size={14} className="text-[#00262b]" /> Session Resolved
                                    </span>
                                    {req.scheduled_at && (
                                        <span className="text-[11px] text-[#52716c]">
                                            Completed: {new Date(req.scheduled_at).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-2">
                                {req.status === 'PENDING' && (
                                    <button
                                        onClick={() => {
                                            setSelectedReq(req);
                                            const defaultDate = new Date(Date.now() + 3600000);
                                            setScheduledAt(defaultDate.toISOString().slice(0, 16));
                                        }}
                                        className="btn-primary !text-xs !py-2 !px-4"
                                    >
                                        Schedule Virtual Meeting
                                    </button>
                                )}

                                {req.status === 'SCHEDULED' && (
                                    <button
                                        onClick={() => handleResolve(req.id)}
                                        className="btn-primary !text-xs !py-2 !px-4 flex items-center gap-1.5"
                                    >
                                        <Check size={14} /> Mark Resolved
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Scheduling Modal */}
            {selectedReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#00262b]/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
                        <div className="flex items-center justify-between border-b border-[#f3f1ed] pb-4">
                            <div>
                                <h3 className="text-xl font-extrabold text-[#00262b]">
                                    Schedule Session for {selectedReq.student_first_name}
                                </h3>
                                <p className="text-xs text-[#52716c]">Subject: {selectedReq.subject}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedReq(null)}
                                className="text-[#52716c] hover:text-[#00262b] p-1 rounded-full hover:bg-[#f9f8f6]"
                            >
                                ✕
                            </button>
                        </div>

                        {error && (
                            <div className="p-3 bg-[#f3f1ed] border border-[#d64000]/30 text-[#d64000] text-xs rounded-xl flex items-center gap-2 font-bold">
                                <AlertCircle size={14} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleScheduleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[#52716c] uppercase tracking-wider mb-1">
                                    Virtual Meeting URL (Google Meet / Zoom) *
                                </label>
                                <input
                                    type="url"
                                    required
                                    placeholder="https://meet.google.com/abc-defg-hij"
                                    className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl p-3 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7]"
                                    value={meetingLink}
                                    onChange={(e) => setMeetingLink(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#52716c] uppercase tracking-wider mb-1">
                                    Scheduled Date & Time *
                                </label>
                                <input
                                    type="datetime-local"
                                    required
                                    className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl p-3 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7]"
                                    value={scheduledAt}
                                    onChange={(e) => setScheduledAt(e.target.value)}
                                />
                            </div>

                            <div className="p-3 bg-[#f9f8f6] border border-[#e1ddd1] rounded-xl text-xs text-[#00262b]">
                                💡 An automated email notification with an attached <code>.ics</code> calendar event will be sent to <strong>{selectedReq.student_email}</strong> upon confirmation.
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#f3f1ed]">
                                <button
                                    type="button"
                                    onClick={() => setSelectedReq(null)}
                                    className="btn-ghost !text-xs !py-2 !px-4"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="btn-primary !text-xs !py-2 !px-5"
                                >
                                    {submitting ? 'Scheduling...' : 'Confirm Schedule & Send Invite'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ====================================================================
   5. Teacher TA Applications Review Page
   ==================================================================== */
export function TeacherTaReview() {
    const [searchParams] = useSearchParams();
    const initialFilter = (searchParams.get('status') || 'ALL').toUpperCase();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reviewingId, setReviewingId] = useState(null);
    const [filterStatus, setFilterStatus] = useState(initialFilter);
    const [removeTarget, setRemoveTarget] = useState(null);

    useEffect(() => {
        const paramStatus = searchParams.get('status');
        if (paramStatus) {
            setFilterStatus(paramStatus.toUpperCase());
        }
    }, [searchParams]);

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            const data = await api.getTeacherPendingTaApplications();
            setApplications(data || []);
        } catch (err) {
            console.error('Error fetching teacher TA applications:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (appId, status) => {
        setReviewingId(appId);
        try {
            await api.reviewTaApplication(appId, status);
            if (window.showToast) {
                window.showToast(
                    status === 'REMOVED'
                        ? 'TA removed and access revoked successfully'
                        : `Application ${status.toLowerCase()} successfully`,
                    'success'
                );
            }
            setApplications(prev => prev.map(app => app.id === appId ? { ...app, status, reviewed_at: new Date().toISOString() } : app));
        } catch (err) {
            console.error('Error reviewing application:', err);
            if (window.showToast) window.showToast(err.message, 'error');
        } finally {
            setReviewingId(null);
        }
    };

    const counts = {
        ALL: applications.length,
        PENDING: applications.filter(a => a.status === 'PENDING').length,
        APPROVED: applications.filter(a => a.status === 'APPROVED').length,
        REJECTED: applications.filter(a => a.status === 'REJECTED').length,
        REMOVED: applications.filter(a => a.status === 'REMOVED').length
    };

    const filteredApplications = applications.filter(app => {
        if (filterStatus === 'ALL') return true;
        return app.status === filterStatus;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 rounded-full border-3 border-[#00262b] border-t-transparent animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <ConfirmModal
                isOpen={!!removeTarget}
                title="Remove Teaching Assistant?"
                message={`Are you sure you want to remove ${removeTarget?.full_name || removeTarget?.ta_first_name || 'this TA'} from course "${removeTarget?.course_title}"? This will immediately revoke their student progress visibility and doubt request assignment.`}
                confirmText="Confirm Removal"
                cancelText="Cancel"
                confirmVariant="danger"
                onConfirm={async () => {
                    if (!removeTarget) return;
                    const targetId = removeTarget.id;
                    setRemoveTarget(null);
                    await handleReview(targetId, 'REMOVED');
                }}
                onCancel={() => setRemoveTarget(null)}
            />

            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-[#00262b]">
                    Review TA Applications
                </h1>
                <p className="text-sm text-[#52716c] mt-1">
                    Inspect cover notes, phone contact, qualifications, and experience of TA applicants for your courses.
                </p>
            </div>

            <div className="flex items-center gap-2 border-b border-[#edebe3] pb-3 overflow-x-auto">
                {[
                    { id: 'ALL', label: 'All Applications', count: counts.ALL },
                    { id: 'PENDING', label: 'Pending', count: counts.PENDING },
                    { id: 'APPROVED', label: 'Approved', count: counts.APPROVED },
                    { id: 'REJECTED', label: 'Rejected', count: counts.REJECTED },
                    { id: 'REMOVED', label: 'Removed', count: counts.REMOVED }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilterStatus(tab.id)}
                        className={`px-5 py-2.5 rounded-[94px] text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                            filterStatus === tab.id
                                ? 'bg-[#04c5e7] text-[#00262b] shadow-sm'
                                : 'btn-ghost'
                        }`}
                    >
                        <span>{tab.label}</span>
                        <span className={`px-2 py-0.5 rounded-[94px] text-[10px] font-black ${
                            filterStatus === tab.id ? 'bg-[#00262b] text-white' : 'bg-[#f3f1ed] text-[#00262b]'
                        }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {filteredApplications.length === 0 ? (
                <div className="p-12 text-center bg-[#ffffff] border border-[#edebe3] rounded-2xl space-y-3 shadow-sm">
                    <UserCheck className="mx-auto text-[#52716c]" size={48} />
                    <p className="text-[#52716c] text-sm">
                        No {filterStatus !== 'ALL' ? filterStatus.toLowerCase() : ''} TA applications found.
                    </p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {filteredApplications.map(app => {
                        const applicantName = app.full_name || `${app.ta_first_name || ''} ${app.ta_last_name || ''}`.trim() || 'Applicant';
                        return (
                            <div key={app.id} className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-6 space-y-4 shadow-sm">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#f3f1ed] pb-3">
                                    <div>
                                        <span className="text-xs font-bold text-[#04c5e7]">
                                            Course: {app.course_title}
                                        </span>
                                        <h3 className="font-extrabold text-[#00262b] text-xl mt-0.5">
                                            Applicant: {applicantName}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#52716c] mt-1">
                                            <span>Email: {app.ta_email}</span>
                                            {app.contact && <span>• Phone: {app.contact}</span>}
                                            {app.qualification && <span className="px-2.5 py-0.5 bg-[#f3f1ed] text-[#00262b] rounded-[94px] border border-[#e1ddd1] font-bold">{app.qualification}</span>}
                                        </div>
                                    </div>

                                    <span className={`px-3 py-1 rounded-[94px] text-xs font-bold uppercase tracking-wider self-start md:self-auto border ${
                                        app.status === 'APPROVED'
                                            ? 'bg-[#f3f1ed] text-[#00262b] border-[#04c5e7]'
                                            : app.status === 'REMOVED' || app.status === 'REJECTED'
                                                ? 'bg-[#f3f1ed] text-[#d64000] border-[#d64000]/40'
                                                : 'bg-[#f3f1ed] text-[#00262b] border-[#e1ddd1]'
                                    }`}>
                                        {app.status}
                                    </span>
                                </div>

                                <div className="space-y-3 text-sm text-[#00262b]">
                                    <div>
                                        <strong className="text-xs text-[#52716c] uppercase tracking-wider block mb-1">Motivation / Why Join:</strong>
                                        <p className="bg-[#f9f8f6] p-3.5 rounded-xl border border-[#edebe3]">{app.motivation || 'No motivation note provided.'}</p>
                                    </div>
                                    {app.experience && (
                                        <div>
                                            <strong className="text-xs text-[#52716c] uppercase tracking-wider block mb-1">Past Experience & Qualifications:</strong>
                                            <p className="bg-[#f9f8f6] p-3.5 rounded-xl border border-[#edebe3]">{app.experience}</p>
                                        </div>
                                    )}
                                    {app.resume_link && (
                                        <div className="pt-1">
                                            <a href={app.resume_link} target="_blank" rel="noreferrer" className="text-xs text-[#04c5e7] font-bold underline inline-flex items-center gap-1 hover:text-[#00262b]">
                                                <LinkIcon size={12} /> View Resume / Portfolio
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {app.status === 'PENDING' ? (
                                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f3f1ed]">
                                        <button
                                            disabled={reviewingId === app.id}
                                            onClick={() => handleReview(app.id, 'REJECTED')}
                                            className="btn-filled !text-xs !py-2 !px-4 flex items-center gap-1"
                                        >
                                            <UserX size={14} /> Reject Application
                                        </button>
                                        <button
                                            disabled={reviewingId === app.id}
                                            onClick={() => handleReview(app.id, 'APPROVED')}
                                            className="btn-primary !text-xs !py-2 !px-5 flex items-center gap-1"
                                        >
                                            <UserCheck size={14} /> Approve Application
                                        </button>
                                    </div>
                                ) : app.status === 'APPROVED' ? (
                                    <div className="flex items-center justify-between pt-3 border-t border-[#f3f1ed] text-xs">
                                        <span className="text-[#52716c]">
                                            {app.reviewed_at ? `Approved on ${new Date(app.reviewed_at).toLocaleDateString()}` : 'Status: Approved'}
                                        </span>
                                        <button
                                            disabled={reviewingId === app.id}
                                            onClick={() => setRemoveTarget(app)}
                                            className="btn-filled !text-xs !py-1.5 !px-3.5 flex items-center gap-1"
                                        >
                                            <UserX size={13} /> Remove TA
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between pt-3 border-t border-[#f3f1ed] text-xs text-[#52716c]">
                                        <span>Status: {app.status}</span>
                                        {app.reviewed_at && <span>Reviewed on {new Date(app.reviewed_at).toLocaleDateString()}</span>}
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
