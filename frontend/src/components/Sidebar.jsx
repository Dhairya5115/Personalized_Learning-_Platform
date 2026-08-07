import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
    BookOpen, Award, Flame, LogOut, Home, Compass, 
    Calendar, Layers, HelpCircle, Trophy, BarChart2, Sun, Moon, 
    ClipboardList, ClipboardCheck, Users
} from 'lucide-react';

export default function Sidebar() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    if (!user) return null;

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: Home, roles: ['STUDENT', 'TEACHER', 'ADMIN', 'TA'] },
        { path: '/courses', label: 'Browse Courses', icon: Compass, roles: ['STUDENT', 'TEACHER', 'ADMIN'] },
        { path: '/ta-catalog', label: 'Available Courses', icon: Compass, roles: ['TA'] },
        { path: '/ta-applications', label: 'My Applications', icon: ClipboardList, roles: ['TA'] },
        { path: '/ta-assigned', label: 'Assigned Students', icon: Users, roles: ['TA'] },
        { path: '/ta-requests', label: 'Doubt Requests', icon: HelpCircle, roles: ['TA'] },
        { path: '/teacher-ta-reviews', label: 'TA Applications', icon: ClipboardCheck, roles: ['TEACHER'] },
        { path: '/planner', label: 'Study Planner', icon: Calendar, roles: ['STUDENT'] },
        { path: '/doubt-solver', label: 'Doubt Solver', icon: HelpCircle, roles: ['STUDENT'] },
        { path: '/leaderboard', label: 'Leaderboard', icon: Trophy, roles: ['STUDENT'] },
        { path: '/analytics', label: 'Performance', icon: BarChart2, roles: ['STUDENT'] },
        { path: '/student-tracker', label: 'Student Progress', icon: BarChart2, roles: ['TEACHER'] },
    ];

    return (
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col p-6 sticky top-0 h-screen transition-colors duration-200 select-none">
            {/* Logo */}
            <div 
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-3 mb-8 cursor-pointer group"
            >
                <div className="bg-indigo-600 dark:bg-indigo-500 p-2 rounded-xl text-white shadow-sm shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                    <BookOpen size={20} />
                </div>
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
                    TailorLearn
                </span>
            </div>

            {/* Profile Overview */}
            <div className="pb-6 border-b border-slate-100 dark:border-slate-800/80 mb-6 flex flex-col">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                            {user.firstName} {user.lastName}
                        </p>
                        <span className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            user.role === 'TEACHER' 
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' 
                                : user.role === 'TA'
                                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                                    : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                        }`}>
                            {user.role}
                        </span>
                    </div>
                </div>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 flex flex-col gap-1.5 overflow-y-auto scrollbar">
                {navItems
                    .filter(item => item.roles.includes(user.role))
                    .map(item => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path || (item.path === '/courses' && location.pathname.startsWith('/courses/'));
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left w-full ${
                                    isActive
                                        ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                <Icon size={16} className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} />
                                <span>{item.label}</span>
                            </button>
                        );
                    })
                }
            </nav>

            {/* Bottom Actions */}
            <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="flex items-center justify-between w-full px-4 py-2 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                    <span className="flex items-center gap-3">
                        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                        <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                    </span>
                    <span className="w-8 h-4 bg-slate-200 dark:bg-slate-700 rounded-full relative p-0.5 transition-colors">
                        <span className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all duration-200 ${
                            theme === 'dark' ? 'left-[16px]' : 'left-0.5'
                        }`} />
                    </span>
                </button>

                {/* Log Out */}
                <button 
                    onClick={() => {
                        logout();
                        navigate('/login');
                    }}
                    className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-left w-full"
                >
                    <LogOut size={16} />
                    <span>Log Out</span>
                </button>
            </div>
        </aside>
    );
}
