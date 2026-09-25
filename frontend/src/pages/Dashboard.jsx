import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { BookOpen, Plus, ChevronRight, Trophy, LineChart, Users, UserCheck, HelpCircle, ArrowUpDown } from 'lucide-react';

export default function Dashboard({ onSelectCourse: onSelectCourseProp, onGoToCatalog: onGoToCatalogProp }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const onSelectCourse = onSelectCourseProp || ((c) => navigate(`/courses/${c.id}`));
    const onGoToCatalog = onGoToCatalogProp || (() => navigate('/courses'));
    const [enrolled, setEnrolled] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    // Teacher forms
    const [newCourseTitle, setNewCourseTitle] = useState('');
    const [newCourseDesc, setNewCourseDesc] = useState('');
    const [newCoursePrice, setNewCoursePrice] = useState('0');
    const [createSuccess, setCreateSuccess] = useState(false);
    const [error, setError] = useState('');

    const [taOverview, setTaOverview] = useState([]);
    const [taStats, setTaStats] = useState(null);
    const [taApplications, setTaApplications] = useState([]);
    const [sortAsc, setSortAsc] = useState(false);

    useEffect(() => {
        if (user) {
            loadDashboardData();
        }
    }, [user]);

    async function loadDashboardData() {
        if (!user) return;
        setLoading(true);
        try {
            if (user.role === 'STUDENT') {
                const list = await api.getEnrolledCourses();
                setEnrolled(list || []);
                const report = await api.getAnalytics();
                setAnalytics(report);
            } else if (user.role === 'TA') {
                const [stats, courses, apps] = await Promise.all([
                    api.getTaDashboardStats().catch(() => null),
                    api.getTaAssignedCourses().catch(() => []),
                    api.getTaApplications().catch(() => [])
                ]);
                setTaStats(stats);
                setEnrolled(courses || []);
                setTaApplications(apps || []);
            } else {
                // TEACHER or ADMIN
                const list = await api.getCourses();
                const filtered = (list || []).filter(c => c.teacher_id === user.id);
                setEnrolled(filtered);

                // Fetch Teacher TA Overview
                const overviewData = await api.getTeacherTaOverview().catch(() => []);
                setTaOverview(overviewData || []);
            }
        } catch (err) {
            console.error('Error loading dashboard:', err.message);
        } finally {
            setLoading(false);
        }
    }

    const handleSort = () => {
        const nextSortAsc = !sortAsc;
        setSortAsc(nextSortAsc);
        setTaOverview(prev => [...prev].sort((a, b) => {
            const countA = Number(a.distinct_student_count || 0);
            const countB = Number(b.distinct_student_count || 0);
            return nextSortAsc ? countA - countB : countB - countA;
        }));
    };

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
            setNewCourseTitle(''); setNewCourseDesc(''); setNewCoursePrice('0');
            loadDashboardData();
        } catch (err) { setError(err.message || 'Failed to create course'); }
    };

    const renderHeatmap = () => {
        const heatmapData = analytics?.studyHeatmap || [];
        const map = {};
        heatmapData.forEach(item => { const d = item.activity_date.split('T')[0]; map[d] = item.count; });
        const today = new Date();
        const startDate = new Date();
        startDate.setDate(today.getDate() - 84);
        startDate.setDate(startDate.getDate() - startDate.getDay());
        const gridCells = [];
        const tempDate = new Date(startDate);
        while (tempDate <= today) {
            const dateStr = tempDate.toISOString().split('T')[0];
            gridCells.push({ date: dateStr, count: map[dateStr] || 0 });
            tempDate.setDate(tempDate.getDate() + 1);
        }
        return (
            <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-6 shadow-sm h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-[#f9f8f6] text-[#00262b]">
                        <LineChart size={20} />
                    </div>
                    <h2 className="text-lg font-bold text-[#00262b]">Study Activity Grid</h2>
                </div>
                <div className="flex gap-1.5 overflow-x-auto py-1 flex-1">
                    <div className="grid grid-flow-col grid-rows-7 gap-1">
                        {gridCells.map((cell, idx) => {
                            let c = 'bg-[#f3f1ed]';
                            if (cell.count > 0 && cell.count <= 1) c = 'bg-[#04c5e7]/40';
                            else if (cell.count > 1 && cell.count <= 3) c = 'bg-[#04c5e7]/70';
                            else if (cell.count > 3) c = 'bg-[#04c5e7]';
                            return (
                                <div key={idx} className={`w-[13px] h-[13px] rounded-[3px] cursor-pointer transition-all hover:ring-1 hover:ring-[#00262b] ${c}`}
                                    title={`${new Date(cell.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}: ${cell.count} steps`} />
                            );
                        })}
                    </div>
                </div>
                <div className="flex items-center justify-between mt-4 text-[10px] font-bold text-[#52716c] uppercase tracking-wider">
                    <span>90-day study frequency heatmap</span>
                    <div className="flex items-center gap-1.5 ml-8">
                        <span>Less</span>
                        <div className="w-2.5 h-2.5 rounded-[3px] bg-[#f3f1ed]" />
                        <div className="w-2.5 h-2.5 rounded-[3px] bg-[#04c5e7]/40" />
                        <div className="w-2.5 h-2.5 rounded-[3px] bg-[#04c5e7]/70" />
                        <div className="w-2.5 h-2.5 rounded-[3px] bg-[#04c5e7]" />
                        <span>More</span>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 text-[#52716c]">
            <div className="w-8 h-8 rounded-full border-3 border-[#00262b] border-t-transparent animate-spin mb-4" />
            <span className="font-semibold text-sm">Loading your learning dashboard...</span>
        </div>
    );

    return (
        <div className="space-y-10 max-w-6xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-[#00262b]">
                    Welcome back, {user?.firstName || user?.first_name || user?.email || 'User'}!
                </h1>
                <p className="mt-2 text-sm font-medium text-[#52716c]">
                    {user?.role === 'STUDENT'
                        ? 'Track your daily study goals and see your courses.'
                        : user?.role === 'TA'
                            ? 'Assist students in your assigned courses and review doubt requests.'
                            : 'Create courses and see how your students are doing.'}
                </p>
            </div>

            {user?.role === 'STUDENT' ? (
                <>
                    {/* KPI Cards + Heatmap */}
                    <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                        <div className="flex-1 space-y-4">
                            <div className="bg-[#ffffff] border border-[#edebe3] p-7 rounded-2xl flex items-center gap-5 shadow-sm">
                                <div className="w-14 h-14 bg-[#00262b] rounded-2xl shadow-sm flex items-center justify-center text-[#04c5e7] flex-shrink-0">
                                    <Trophy size={26} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-[#52716c] uppercase tracking-widest mb-1">Total Points</p>
                                    <p className="text-3xl font-extrabold text-[#00262b]">
                                        {user.xpPoints || 0}
                                        <span className="text-base font-bold text-[#52716c] ml-1.5">XP</span>
                                    </p>
                                </div>
                            </div>
                            <div className="bg-[#ffffff] border border-[#edebe3] p-7 rounded-2xl flex items-center gap-5 shadow-sm">
                                <div className="w-14 h-14 bg-[#f9f8f6] rounded-2xl flex items-center justify-center text-[#00262b] border border-[#e1ddd1] flex-shrink-0">
                                    <BookOpen size={26} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-[#52716c] uppercase tracking-widest mb-1">Courses</p>
                                    <p className="text-3xl font-extrabold text-[#00262b]">
                                        {enrolled.length}
                                        <span className="text-base font-bold text-[#52716c] ml-1.5">Joined</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="w-full lg:w-fit flex-shrink-0">
                            {renderHeatmap()}
                        </div>
                    </div>

                    {/* My Courses */}
                    <section>
                        <div className="flex items-end justify-between mb-6">
                            <h2 className="text-2xl font-extrabold text-[#00262b]">My Courses</h2>
                            {enrolled.length > 0 && (
                                <button onClick={onGoToCatalog} className="text-sm font-bold text-[#04c5e7] hover:text-[#00262b] transition-colors hover:underline">
                                    Explore Courses
                                </button>
                            )}
                        </div>
                        {enrolled.length === 0 ? (
                            <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-10 text-center flex flex-col items-center shadow-sm">
                                <div className="w-14 h-14 rounded-2xl bg-[#f9f8f6] flex items-center justify-center mb-4 text-[#52716c]">
                                    <BookOpen size={28} />
                                </div>
                                <p className="text-[#52716c] text-sm mb-5">You haven't joined any courses yet.</p>
                                <button onClick={onGoToCatalog} className="btn-primary">
                                    Explore Courses
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {enrolled.map(course => (
                                    <div key={course.id} className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-shadow shadow-sm">
                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="font-extrabold text-xl text-[#00262b] leading-tight">{course.title}</h3>
                                                <span className="text-[11px] font-bold px-3 py-1 rounded-[94px] ml-3 flex-shrink-0 bg-[#f3f1ed] text-[#00262b] border border-[#e1ddd1]">
                                                    {course.payment_status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-[#52716c] line-clamp-2 leading-relaxed">
                                                {course.description || 'No description provided.'}
                                            </p>
                                        </div>
                                        <div className="flex justify-between items-center pt-4 mt-4 border-t border-[#f3f1ed]">
                                            <span className="text-xs font-medium text-[#52716c]">Course Path</span>
                                            <button onClick={() => onSelectCourse(course)}
                                                className="btn-ghost !text-xs !py-1.5 !px-3.5">
                                                Open Class <ChevronRight size={15} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            ) : user?.role === 'TA' ? (
                /* TA Dashboard View */
                <div className="space-y-8">
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="bg-[#ffffff] border border-[#edebe3] p-6 rounded-2xl flex items-center gap-4 shadow-sm">
                            <div className="w-12 h-12 rounded-2xl bg-[#f9f8f6] text-[#00262b] border border-[#e1ddd1] flex items-center justify-center">
                                <Users size={24} />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[#52716c]">Students Handled</span>
                                <h3 className="text-2xl font-extrabold text-[#00262b] mt-0.5">
                                    {taStats?.totalStudents || 0}
                                </h3>
                            </div>
                        </div>

                        <div className="bg-[#ffffff] border border-[#edebe3] p-6 rounded-2xl flex items-center gap-4 shadow-sm">
                            <div className="w-12 h-12 rounded-2xl bg-[#00262b] text-[#04c5e7] flex items-center justify-center">
                                <BookOpen size={24} />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[#52716c]">Assigned Courses</span>
                                <h3 className="text-2xl font-extrabold text-[#00262b] mt-0.5">
                                    {taStats?.totalCourses || 0}
                                </h3>
                            </div>
                        </div>

                        <div className="bg-[#ffffff] border border-[#edebe3] p-6 rounded-2xl flex items-center gap-4 shadow-sm">
                            <div className="w-12 h-12 rounded-2xl bg-[#f3f1ed] text-[#d64000] border border-[#e1ddd1] flex items-center justify-center">
                                <HelpCircle size={24} />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[#52716c]">Pending Doubts</span>
                                <h3 className="text-2xl font-extrabold text-[#00262b] mt-0.5">
                                    {taStats?.pendingDoubts || 0}
                                </h3>
                            </div>
                        </div>
                    </div>

                    {/* Assigned Courses Roster */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-extrabold text-[#00262b] flex items-center gap-2">
                                <BookOpen size={22} className="text-[#04c5e7]" />
                                <span>My Assigned Courses</span>
                            </h2>
                            <button 
                                onClick={() => navigate('/ta-catalog')}
                                className="text-xs font-bold text-[#04c5e7] hover:text-[#00262b] hover:underline"
                            >
                                Apply for More Courses
                            </button>
                        </div>

                        {enrolled.length === 0 ? (
                            <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-8 text-center text-[#52716c] text-sm shadow-sm">
                                You are not assigned to any courses yet. Apply for open courses from the TA Catalog.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {enrolled.map(course => (
                                    <div key={course.id} className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-5 flex items-center justify-between shadow-sm">
                                        <div>
                                            <h3 className="font-bold text-[#00262b] text-base">{course.title}</h3>
                                            <p className="text-xs text-[#52716c] mt-1 line-clamp-1">{course.description || 'Course Assistant'}</p>
                                        </div>
                                        <button 
                                            onClick={() => navigate('/ta-assigned')}
                                            className="btn-primary !text-xs !py-2 !px-4"
                                        >
                                            View Students
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Teacher Dashboard */
                <div className="space-y-10">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                        <div className="lg:col-span-2 bg-[#ffffff] border border-[#edebe3] rounded-2xl p-6 shadow-sm">
                            <h2 className="text-lg font-extrabold text-[#00262b] mb-6 flex items-center gap-2">
                                <Plus size={20} className="text-[#04c5e7]" />
                                <span>Create a New Course</span>
                            </h2>
                            {error && <div className="bg-[#f3f1ed] text-[#d64000] border border-[#d64000]/20 p-3 rounded-xl text-xs mb-4 font-bold">{error}</div>}
                            {createSuccess && <div className="bg-[#f3f1ed] text-[#00262b] border border-[#04c5e7] p-3 rounded-xl text-xs mb-4 font-bold">Course created successfully!</div>}
                            <form onSubmit={handleCreateCourse} className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#52716c] mb-2">Course Name</label>
                                    <input type="text" className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl px-4 py-2.5 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7]"
                                        placeholder="e.g. Easy English for Beginners" value={newCourseTitle} onChange={(e) => setNewCourseTitle(e.target.value)} required />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#52716c] mb-2">Description</label>
                                    <textarea className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl px-4 py-2.5 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7]"
                                        rows="3" placeholder="What is this course about?..." value={newCourseDesc} onChange={(e) => setNewCourseDesc(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#52716c] mb-2">Price (INR)</label>
                                    <input type="number" className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl px-4 py-2.5 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7]"
                                        value={newCoursePrice} onChange={(e) => setNewCoursePrice(e.target.value)} min="0" required />
                                    <span className="text-[11px] text-[#52716c] mt-1 block">Enter 0 to make this course free.</span>
                                </div>
                                <button type="submit" className="btn-primary w-full mt-2">
                                    Create Course
                                </button>
                            </form>
                        </div>
                        <div className="lg:col-span-3 space-y-4">
                            <h2 className="text-lg font-extrabold text-[#00262b] flex items-center gap-2">
                                <BookOpen size={20} className="text-[#04c5e7]" />
                                <span>Courses You Teach</span>
                            </h2>
                            {enrolled.length === 0 ? (
                                <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-8 text-center text-[#52716c] text-sm shadow-sm">
                                    You haven't created any courses yet.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {enrolled.map(course => (
                                        <div key={course.id} className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-5 flex items-center justify-between hover:shadow-md transition-shadow shadow-sm">
                                            <div>
                                                <h3 className="font-bold text-[#00262b] text-base">{course.title}</h3>
                                                <p className="text-xs text-[#52716c] mt-1">
                                                    Price: ₹{course.price} &nbsp; &nbsp; Created: {new Date(course.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <button onClick={() => onSelectCourse(course)}
                                                className="btn-ghost !text-xs !py-1.5 !px-3.5 ml-4 flex-shrink-0">
                                                Edit Syllabus <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Teacher Dashboard TA Overview Widget */}
                    <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-6 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f3f1ed] pb-4">
                            <div>
                                <h2 className="text-xl font-extrabold text-[#00262b] flex items-center gap-2">
                                    <UserCheck size={22} className="text-[#04c5e7]" />
                                    <span>Teaching Assistants (TA) Overview</span>
                                </h2>
                                <p className="text-xs text-[#52716c] mt-0.5">
                                    Active TAs assisting with your courses and distinct student counts handled.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleSort}
                                    className="btn-ghost !text-xs !py-2 !px-4 flex items-center gap-1.5"
                                >
                                    <ArrowUpDown size={12} />
                                    <span>Sort by Students ({sortAsc ? 'Asc' : 'Desc'})</span>
                                </button>
                                <button 
                                    onClick={() => navigate('/teacher-ta-reviews?status=PENDING')}
                                    className="btn-primary !text-xs !py-2 !px-4"
                                >
                                    Review Applications
                                </button>
                            </div>
                        </div>

                        {taOverview.length === 0 ? (
                            <div className="p-8 text-center bg-[#f9f8f6] rounded-xl border border-[#edebe3] text-[#52716c] text-xs">
                                No active TAs assigned to your courses yet. Approve pending applications from the TA Review page.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-[#00262b]">
                                    <thead className="bg-[#f9f8f6] text-[#52716c] uppercase text-[10px] font-bold tracking-wider border-b border-[#edebe3]">
                                        <tr>
                                            <th className="p-3">TA Name & Email</th>
                                            <th className="p-3">Assigned Course</th>
                                            <th className="p-3 text-center">Students Handled</th>
                                            <th className="p-3 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#f3f1ed]">
                                        {taOverview.map(ta => (
                                            <tr key={ta.link_id} className="hover:bg-[#f9f8f6] transition-colors">
                                                <td className="p-3 font-semibold text-[#00262b]">
                                                    <div>{ta.ta_first_name} {ta.ta_last_name}</div>
                                                    <div className="text-[10px] font-normal text-[#52716c]">{ta.ta_email}</div>
                                                </td>
                                                <td className="p-3 font-medium text-[#00262b]">{ta.course_title}</td>
                                                <td className="p-3 text-center font-bold text-[#00262b]">{ta.distinct_student_count || 0}</td>
                                                <td className="p-3 text-right">
                                                    <span className="px-3 py-1 bg-[#f3f1ed] text-[#00262b] border border-[#e1ddd1] rounded-[94px] text-[10px] font-bold uppercase tracking-wider">
                                                        {ta.current_status || 'Active'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
