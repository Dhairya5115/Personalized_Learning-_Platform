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
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                    <LineChart className="text-indigo-600 dark:text-indigo-400" size={20} />
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Study Activity Grid</h2>
                </div>
                <div className="flex gap-1.5 overflow-x-auto py-1 flex-1">
                    <div className="grid grid-flow-col grid-rows-7 gap-1">
                        {gridCells.map((cell, idx) => {
                            let c = 'bg-slate-100 dark:bg-slate-800';
                            if (cell.count > 0 && cell.count <= 1) c = 'bg-indigo-200 dark:bg-indigo-900/60';
                            else if (cell.count > 1 && cell.count <= 3) c = 'bg-indigo-400 dark:bg-indigo-600/70';
                            else if (cell.count > 3) c = 'bg-indigo-600 dark:bg-indigo-500';
                            return (
                                <div key={idx} className={`w-[13px] h-[13px] rounded-[3px] cursor-pointer transition-all hover:ring-1 hover:ring-indigo-400 ${c}`}
                                    title={`${new Date(cell.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}: ${cell.count} steps`} />
                            );
                        })}
                    </div>
                </div>
                <div className="flex items-center justify-between mt-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <span>90-day study frequency heatmap</span>
                    <div className="flex items-center gap-1.5 ml-8">
                        <span>Less</span>
                        <div className="w-2.5 h-2.5 rounded-[3px] bg-slate-100 dark:bg-slate-800" />
                        <div className="w-2.5 h-2.5 rounded-[3px] bg-indigo-200 dark:bg-indigo-900/60" />
                        <div className="w-2.5 h-2.5 rounded-[3px] bg-indigo-400 dark:bg-indigo-600/70" />
                        <div className="w-2.5 h-2.5 rounded-[3px] bg-indigo-600 dark:bg-indigo-500" />
                        <span>More</span>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mb-4" />
            <span>Loading your learning dashboard...</span>
        </div>
    );

    return (
        <div className="space-y-10 max-w-6xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                    Welcome back, {user?.firstName || user?.first_name || user?.email || 'User'}!
                </h1>
                <p className="mt-2 text-base font-medium text-slate-500 dark:text-slate-400">
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
                            <div className="bg-[#eef2ff] dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 p-7 rounded-2xl flex items-center gap-5">
                                <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-xl shadow-sm flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                                    <Trophy size={26} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Total Points</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">
                                        {user.xpPoints || 0}
                                        <span className="text-xl font-bold text-slate-500 dark:text-slate-400 ml-1.5">XP</span>
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-7 rounded-2xl flex items-center gap-5 shadow-sm">
                                <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 flex-shrink-0">
                                    <BookOpen size={26} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Courses</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">
                                        {enrolled.length}
                                        <span className="text-xl font-bold text-slate-500 dark:text-slate-400 ml-1.5">Joined</span>
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
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">My Courses</h2>
                            {enrolled.length > 0 && (
                                <button onClick={onGoToCatalog} className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                                    Explore Courses
                                </button>
                            )}
                        </div>
                        {enrolled.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center">
                                <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-300 dark:text-slate-600">
                                    <BookOpen size={28} />
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">You haven't joined any courses yet.</p>
                                <button onClick={onGoToCatalog} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-colors shadow-sm">
                                    Explore Courses
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {enrolled.map(course => (
                                    <div key={course.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 leading-tight">{course.title}</h3>
                                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ml-3 flex-shrink-0 ${
                                                    course.payment_status === 'FREE'
                                                        ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                        : 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
                                                }`}>{course.payment_status}</span>
                                            </div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                                {course.description || 'No description provided.'}
                                            </p>
                                        </div>
                                        <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                                            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Course Path</span>
                                            <button onClick={() => onSelectCourse(course)}
                                                className="flex items-center gap-1 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
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
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <Users size={24} />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Students Handled</span>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                                    {taStats?.totalStudents || 0}
                                </h3>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <BookOpen size={24} />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Courses</span>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                                    {taStats?.totalCourses || 0}
                                </h3>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex items-center gap-4 shadow-sm">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                <HelpCircle size={24} />
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Doubts</span>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                                    {taStats?.pendingDoubts || 0}
                                </h3>
                            </div>
                        </div>
                    </div>

                    {/* Assigned Courses Roster */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <BookOpen size={20} className="text-indigo-600 dark:text-indigo-400" />
                                <span>My Assigned Courses</span>
                            </h2>
                            <button 
                                onClick={() => navigate('/ta-catalog')}
                                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                Apply for More Courses
                            </button>
                        </div>

                        {enrolled.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-sm">
                                You are not assigned to any courses yet. Apply for open courses from the TA Catalog.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {enrolled.map(course => (
                                    <div key={course.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white text-base">{course.title}</h3>
                                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">{course.description || 'Course Assistant'}</p>
                                        </div>
                                        <button 
                                            onClick={() => navigate('/ta-assigned')}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors"
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
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                                <Plus size={18} className="text-indigo-600 dark:text-indigo-400" />
                                <span>Create a New Course</span>
                            </h2>
                            {error && <div className="bg-rose-500/10 text-rose-500 border border-rose-500/20 p-3 rounded-xl text-xs mb-4">{error}</div>}
                            {createSuccess && <div className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 p-3 rounded-xl text-xs mb-4">Course created successfully!</div>}
                            <form onSubmit={handleCreateCourse} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Course Name</label>
                                    <input type="text" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                                        placeholder="e.g. Easy English for Beginners" value={newCourseTitle} onChange={(e) => setNewCourseTitle(e.target.value)} required />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Description</label>
                                    <textarea className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                                        rows="3" placeholder="What is this course about?..." value={newCourseDesc} onChange={(e) => setNewCourseDesc(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Price (INR)</label>
                                    <input type="number" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                                        value={newCoursePrice} onChange={(e) => setNewCoursePrice(e.target.value)} min="0" required />
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">Enter 0 to make this course free.</span>
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 text-sm font-bold transition-colors shadow-sm shadow-indigo-500/20">
                                    Create Course
                                </button>
                            </form>
                        </div>
                        <div className="lg:col-span-3 space-y-4">
                            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <BookOpen size={18} className="text-indigo-600 dark:text-indigo-400" />
                                <span>Courses You Teach</span>
                            </h2>
                            {enrolled.length === 0 ? (
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                                    You haven't created any courses yet.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {enrolled.map(course => (
                                        <div key={course.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between hover:shadow-sm transition-shadow">
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{course.title}</h3>
                                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                                    Price: ₹{course.price} &nbsp; &nbsp; Created: {new Date(course.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <button onClick={() => onSelectCourse(course)}
                                                className="flex items-center gap-1 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 rounded-xl text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors ml-4 flex-shrink-0">
                                                Edit Syllabus <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Teacher Dashboard TA Overview Widget (Requirement 3) */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <UserCheck size={20} className="text-indigo-600 dark:text-indigo-400" />
                                    <span>Teaching Assistants (TA) Overview</span>
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Active TAs assisting with your courses and distinct student counts handled.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleSort}
                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <ArrowUpDown size={12} />
                                    <span>Sort by Students ({sortAsc ? 'Asc' : 'Desc'})</span>
                                </button>
                                <button 
                                    onClick={() => navigate('/teacher-ta-reviews?status=PENDING')}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                                >
                                    Review Applications
                                </button>
                            </div>
                        </div>

                        {taOverview.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-400 text-xs">
                                No active TAs assigned to your courses yet. Approve pending applications from the TA Review page.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100 dark:border-slate-800">
                                        <tr>
                                            <th className="p-3">TA Name & Email</th>
                                            <th className="p-3">Assigned Course</th>
                                            <th className="p-3 text-center">Students Handled</th>
                                            <th className="p-3 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {taOverview.map(ta => (
                                            <tr key={ta.link_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                                                <td className="p-3 font-semibold text-slate-900 dark:text-white">
                                                    <div>{ta.ta_first_name} {ta.ta_last_name}</div>
                                                    <div className="text-[10px] font-normal text-slate-400">{ta.ta_email}</div>
                                                </td>
                                                <td className="p-3 font-medium text-indigo-600 dark:text-indigo-400">{ta.course_title}</td>
                                                <td className="p-3 text-center font-bold text-slate-900 dark:text-white">{ta.distinct_student_count || 0}</td>
                                                <td className="p-3 text-right">
                                                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
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
