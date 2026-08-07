import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { 
    BookOpen, CheckCircle, Clock, XCircle, Send, Users, 
    Calendar, Link as LinkIcon, AlertCircle, FileText, ChevronRight,
    UserCheck, UserX, Award, ShieldCheck, Video, HelpCircle, Check
} from 'lucide-react';

/* ====================================================================
   1. TA Available Courses & Application Modal Page
   ==================================================================== */
export function TaCourseCatalog() {
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
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Apply as Teaching Assistant
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Browse courses needing TAs and submit your application to assist teachers and mentor students.
                </p>
            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map(course => {
                    const status = getAppStatus(course.id);
                    return (
                        <div key={course.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:shadow-lg transition-all">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-full">
                                        Course ID: {course.id.slice(0, 8)}
                                    </span>
                                    {status && (
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                            status === 'APPROVED' 
                                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' 
                                                : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                                        }`}>
                                            {status}
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">
                                    {course.title}
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-6">
                                    {course.description || 'No detailed description provided.'}
                                </p>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <span className="text-xs text-slate-400">
                                    Teacher: {course.teacher_name || 'Assigned Instructor'}
                                </span>
                                {status ? (
                                    <button 
                                        disabled 
                                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-medium rounded-xl cursor-not-allowed"
                                    >
                                        {status === 'APPROVED' ? 'Assigned TA' : 'Application Pending'}
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => setSelectedCourse(course)}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Apply for {selectedCourse.title}
                                </h3>
                                <p className="text-xs text-slate-400">Submit your qualifications to the lead teacher.</p>
                            </div>
                            <button 
                                onClick={() => setSelectedCourse(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                ✕
                            </button>
                        </div>

                        {error && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
                                <AlertCircle size={14} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleApplySubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Jane Doe"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Contact Phone Number *
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="+1 555-0199 or 9876543210"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                        value={contact}
                                        onChange={(e) => setContact(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Qualification / Degree *
                                </label>
                                <select
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
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
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Why do you want to join? *
                                </label>
                                <textarea
                                    required
                                    rows={2}
                                    placeholder="Explain your motivation for assisting students in this course..."
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                    value={motivation}
                                    onChange={(e) => setMotivation(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Past Experience (Optional)
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Mention prior teaching assistantships, tutoring, or technical projects..."
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                    value={experience}
                                    onChange={(e) => setExperience(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Resume / Portfolio Link (Optional)
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://linkedin.com/in/username"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500"
                                    value={resumeLink}
                                    onChange={(e) => setResumeLink(e.target.value)}
                                />
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCourse(null)}
                                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
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
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    My TA Applications
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Track the status of your applications to serve as a Teaching Assistant.
                </p>
            </div>

            {applications.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
                    <FileText className="mx-auto text-slate-300 dark:text-slate-700" size={48} />
                    <p className="text-slate-600 dark:text-slate-400 text-sm">No applications submitted yet.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {applications.map(app => (
                        <div key={app.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                        {app.course_title}
                                    </h3>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                        app.status === 'APPROVED'
                                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                            : app.status === 'REJECTED'
                                                ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                                                : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                                    }`}>
                                        {app.status}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Submitted on: {new Date(app.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                                    <strong>Cover Note:</strong> {app.motivation}
                                </p>
                                {app.experience && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        <strong>Qualifications:</strong> {app.experience}
                                    </p>
                                )}
                            </div>

                            {app.reviewed_at && (
                                <div className="text-xs text-slate-400 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-3 md:pt-0 md:pl-6">
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
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Assigned Courses & Enrolled Students
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Access non-sensitive student progress and skill scores for your assigned courses.
                </p>
            </div>

            {assignedCourses.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
                    <ShieldCheck className="mx-auto text-slate-300 dark:text-slate-700" size={48} />
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">No Assigned Courses Yet</h3>
                    <p className="text-slate-500 text-xs">Apply for available courses and once approved by the lead teacher, your assigned courses will appear here.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Course Selector Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
                        {assignedCourses.map(course => (
                            <button
                                key={course.id}
                                onClick={() => {
                                    setSelectedCourseId(course.id);
                                    fetchStudentsForCourse(course.id);
                                }}
                                className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                                    selectedCourseId === course.id
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                            >
                                {course.title}
                            </button>
                        ))}
                    </div>

                    {/* Students List */}
                    {loadingStudents ? (
                        <div className="py-12 text-center text-slate-400 text-sm">Loading enrolled student records...</div>
                    ) : students.length === 0 ? (
                        <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-sm">
                            No students enrolled in this course yet.
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {students.map(std => (
                                <div key={std.student_id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white text-base">
                                                {std.first_name} {std.last_name}
                                            </h4>
                                            <p className="text-xs text-slate-400">
                                                Email: {std.email} • Enrolled: {new Date(std.enrolled_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-full self-start md:self-auto">
                                            Status: Active ({std.payment_status})
                                        </span>
                                    </div>

                                    {/* Topic Skill Scores */}
                                    <div>
                                        <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                                            Topic Skill Mastery Scores
                                        </h5>
                                        {(!std.topic_progress || std.topic_progress.length === 0) ? (
                                            <p className="text-xs text-slate-400 italic">No topic scores logged yet.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                {std.topic_progress.map((tp, idx) => (
                                                    <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                                                            {tp.topic_title}
                                                        </span>
                                                        <span className="text-xs font-bold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-lg">
                                                            {tp.skill_score} / 100
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
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
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Incoming Student Doubt Requests
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Review student questions and schedule 1-on-1 virtual meeting sessions.
                </p>
            </div>

            {/* Filter Controls (Requirement 5) */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
                {[
                    { id: 'ALL', label: 'All Requests', count: counts.ALL, color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
                    { id: 'PENDING', label: 'Pending', count: counts.PENDING, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
                    { id: 'SCHEDULED', label: 'Scheduled', count: counts.SCHEDULED, color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
                    { id: 'RESOLVED', label: 'Resolved', count: counts.RESOLVED, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilterStatus(tab.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                            filterStatus === tab.id
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        <span>{tab.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            filterStatus === tab.id ? 'bg-white/20 text-white' : tab.color
                        }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {filteredRequests.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
                    <HelpCircle className="mx-auto text-slate-300 dark:text-slate-700" size={48} />
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                        No {filterStatus !== 'ALL' ? filterStatus.toLowerCase() : ''} student doubt requests found.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredRequests.map(req => (
                        <div key={req.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div>
                                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                        Course: {req.course_title}
                                    </span>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                                        {req.subject}
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        From: {req.student_first_name} {req.student_last_name} ({req.student_email})
                                    </p>
                                </div>

                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider self-start md:self-auto ${
                                    req.status === 'SCHEDULED'
                                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                                        : req.status === 'RESOLVED'
                                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                            : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                                }`}>
                                    {req.status}
                                </span>
                            </div>

                            <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                {req.description}
                            </p>

                            {/* Meeting Link only shown if SCHEDULED (Requirement 6: hide link on RESOLVED) */}
                            {req.meeting_link && req.status === 'SCHEDULED' && (
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <span className="font-bold text-indigo-700 dark:text-indigo-300">Scheduled: </span>
                                        <span className="text-slate-700 dark:text-slate-300">{new Date(req.scheduled_at).toLocaleString()}</span>
                                    </div>
                                    <a href={req.meeting_link} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline flex items-center gap-1">
                                        <Video size={14} /> Join Meeting
                                    </a>
                                </div>
                            )}

                            {req.status === 'RESOLVED' && (
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs flex items-center justify-between">
                                    <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                                        <CheckCircle size={14} /> Session Resolved
                                    </span>
                                    {req.scheduled_at && (
                                        <span className="text-[11px] text-slate-400">
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
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
                                    >
                                        Schedule Virtual Meeting
                                    </button>
                                )}

                                {req.status === 'SCHEDULED' && (
                                    <button
                                        onClick={() => handleResolve(req.id)}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Schedule Session for {selectedReq.student_first_name}
                                </h3>
                                <p className="text-xs text-slate-400">Subject: {selectedReq.subject}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedReq(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                ✕
                            </button>
                        </div>

                        {error && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
                                <AlertCircle size={14} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleScheduleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Virtual Meeting URL (Google Meet / Zoom) *
                                </label>
                                <input
                                    type="url"
                                    required
                                    placeholder="https://meet.google.com/abc-defg-hij"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500"
                                    value={meetingLink}
                                    onChange={(e) => setMeetingLink(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Scheduled Date & Time *
                                </label>
                                <input
                                    type="datetime-local"
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500"
                                    value={scheduledAt}
                                    onChange={(e) => setScheduledAt(e.target.value)}
                                />
                            </div>

                            <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl text-xs text-indigo-700 dark:text-indigo-300">
                                💡 An automated email notification with an attached <code>.ics</code> calendar event will be sent to <strong>{selectedReq.student_email}</strong> upon confirmation.
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setSelectedReq(null)}
                                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
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
            if (window.showToast) window.showToast(`Application ${status.toLowerCase()} successfully`, 'success');
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
        REJECTED: applications.filter(a => a.status === 'REJECTED').length
    };

    const filteredApplications = applications.filter(app => {
        if (filterStatus === 'ALL') return true;
        return app.status === filterStatus;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Review TA Applications
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Inspect cover notes, phone contact, qualifications, and experience of TA applicants for your courses.
                </p>
            </div>

            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
                {[
                    { id: 'ALL', label: 'All Applications', count: counts.ALL, color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
                    { id: 'PENDING', label: 'Pending', count: counts.PENDING, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
                    { id: 'APPROVED', label: 'Approved', count: counts.APPROVED, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                    { id: 'REJECTED', label: 'Rejected', count: counts.REJECTED, color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilterStatus(tab.id)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                            filterStatus === tab.id
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        <span>{tab.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            filterStatus === tab.id ? 'bg-white/20 text-white' : tab.color
                        }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {filteredApplications.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
                    <UserCheck className="mx-auto text-slate-300 dark:text-slate-700" size={48} />
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                        No {filterStatus !== 'ALL' ? filterStatus.toLowerCase() : ''} TA applications found.
                    </p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {filteredApplications.map(app => {
                        const applicantName = app.full_name || `${app.ta_first_name || ''} ${app.ta_last_name || ''}`.trim() || 'Applicant';
                        return (
                            <div key={app.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <div>
                                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                            Course: {app.course_title}
                                        </span>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-lg mt-0.5">
                                            Applicant: {applicantName}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                                            <span>Email: {app.ta_email}</span>
                                            {app.contact && <span>• Phone: {app.contact}</span>}
                                            {app.qualification && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md font-medium">{app.qualification}</span>}
                                        </div>
                                    </div>

                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider self-start md:self-auto border ${
                                        app.status === 'APPROVED'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800/40'
                                            : app.status === 'REJECTED'
                                                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-800/40'
                                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-800/40'
                                    }`}>
                                        {app.status}
                                    </span>
                                </div>

                                <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                                    <div>
                                        <strong className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Motivation / Why Join:</strong>
                                        <p className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80">{app.motivation || 'No motivation note provided.'}</p>
                                    </div>
                                    {app.experience && (
                                        <div>
                                            <strong className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Past Experience & Qualifications:</strong>
                                            <p className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80">{app.experience}</p>
                                        </div>
                                    )}
                                    {app.resume_link && (
                                        <div className="pt-1">
                                            <a href={app.resume_link} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 font-bold underline inline-flex items-center gap-1">
                                                <LinkIcon size={12} /> View Resume / Portfolio
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {app.status === 'PENDING' ? (
                                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <button
                                            disabled={reviewingId === app.id}
                                            onClick={() => handleReview(app.id, 'REJECTED')}
                                            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1"
                                        >
                                            <UserX size={14} /> Reject Application
                                        </button>
                                        <button
                                            disabled={reviewingId === app.id}
                                            onClick={() => handleReview(app.id, 'APPROVED')}
                                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-1"
                                        >
                                            <UserCheck size={14} /> Approve Application
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
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
