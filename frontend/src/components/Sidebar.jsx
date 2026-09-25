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
        <aside className="w-64 bg-[#ffffff] border-r border-[#edebe3] flex flex-col p-6 sticky top-0 h-screen transition-colors duration-200 select-none">
            {/* Logo */}
            <div 
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-3 mb-8 cursor-pointer group"
            >
                <div className="bg-[#00262b] p-2.5 rounded-xl text-[#04c5e7] shadow-sm group-hover:scale-105 transition-transform">
                    <BookOpen size={20} />
                </div>
                <span className="font-extrabold text-xl tracking-tight text-[#00262b]">
                    TailorLearn
                </span>
            </div>

            {/* Profile Overview */}
            <div className="pb-6 border-b border-[#f3f1ed] dark:border-[#004d57] mb-6 flex flex-col">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-bold text-sm text-[#00262b] dark:text-[#f9f8f6]">
                            {user.firstName} {user.lastName}
                        </p>
                        <span className="inline-block mt-1 text-[11px] font-bold px-3 py-1 rounded-[94px] uppercase tracking-wider bg-[#f3f1ed] dark:bg-[#004d57] text-[#00262b] dark:text-[#f9f8f6] border border-[#e1ddd1] dark:border-[#00606c]">
                            {user.role}
                        </span>
                    </div>
                </div>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 flex flex-col gap-2 overflow-y-auto scrollbar">
                {navItems
                    .filter(item => item.roles.includes(user.role))
                    .map(item => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path || (item.path === '/courses' && location.pathname.startsWith('/courses/'));
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-[94px] text-sm font-semibold transition-all duration-200 text-left w-full group ${
                                    isActive
                                        ? 'bg-[#04c5e7] text-[#00262b] shadow-sm font-bold'
                                        : 'text-[#00262b] dark:text-[#f9f8f6] hover:bg-[#f9f8f6] hover:text-[#00262b] dark:hover:bg-[#004d57] dark:hover:text-[#04c5e7]'
                                }`}
                            >
                                <Icon size={16} className={isActive ? 'text-[#00262b]' : 'text-[#52716c] dark:text-[#a5b6b1] group-hover:text-[#00262b] dark:group-hover:text-[#04c5e7]'} />
                                <span>{item.label}</span>
                            </button>
                        );
                    })
                }
            </nav>

            {/* Bottom Actions */}
            <div className="mt-auto pt-6 border-t border-[#f3f1ed] dark:border-[#004d57] flex flex-col gap-2">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="flex items-center justify-between w-full px-4 py-2.5 rounded-[94px] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] dark:hover:bg-[#004d57] hover:text-[var(--color-text)] dark:hover:text-[#04c5e7] transition-colors"
                >
                    <span className="flex items-center gap-3">
                        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                        <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                    </span>
                    <span className="w-8 h-4 bg-[var(--color-bg-neutral)] rounded-[94px] relative p-0.5 transition-colors border border-[var(--color-border)]">
                        <span className={`w-3 h-3 bg-[var(--color-primary)] rounded-full absolute top-0.5 transition-all duration-200 ${
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
                    className="flex items-center gap-3 px-4 py-2.5 rounded-[94px] text-sm font-semibold text-[#d64000] dark:text-[#ff7043] hover:bg-[#f9f8f6] dark:hover:bg-[#004d57] dark:hover:text-[#ff5722] transition-colors text-left w-full"
                >
                    <LogOut size={16} />
                    <span>Log Out</span>
                </button>
            </div>
        </aside>
    );
}
