import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
    BookOpen, Award, Flame, LogOut, Home, Compass, 
    Calendar, Layers, HelpCircle, Trophy, BarChart2, Sun, Moon, 
    ClipboardList, ClipboardCheck, Users, Menu, X
} from 'lucide-react';

export default function Sidebar() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    // Close mobile drawer on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    // Close mobile drawer on Escape key press
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setMobileOpen(false);
            }
        };
        if (mobileOpen) {
            window.addEventListener('keydown', handleKeyDown);
            // Prevent body scroll when drawer is open
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [mobileOpen]);

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

    const allowedNavItems = navItems.filter(item => item.roles.includes(user.role));

    // Common nav list renderer
    const renderNavLinks = (onNavigate) => (
        <nav className="flex-1 flex flex-col gap-2 overflow-y-auto scrollbar">
            {allowedNavItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path === '/courses' && location.pathname.startsWith('/courses/'));
                return (
                    <button
                        key={item.path}
                        onClick={() => {
                            navigate(item.path);
                            if (onNavigate) onNavigate();
                        }}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-[94px] text-sm font-semibold transition-all duration-200 text-left w-full group min-h-[44px] ${
                            isActive
                                ? 'bg-[#04c5e7] text-[#00262b] shadow-sm font-bold'
                                : 'text-[#00262b] dark:text-[#f9f8f6] hover:bg-[#f9f8f6] hover:text-[#00262b] dark:hover:bg-[#004d57] dark:hover:text-[#04c5e7]'
                        }`}
                    >
                        <Icon size={18} className={isActive ? 'text-[#00262b]' : 'text-[#52716c] dark:text-[#a5b6b1] group-hover:text-[#00262b] dark:group-hover:text-[#04c5e7]'} />
                        <span>{item.label}</span>
                    </button>
                );
            })}
        </nav>
    );

    return (
        <>
            {/* Mobile / Tablet (<1024px) Sticky Top Bar */}
            <header className="lg:hidden sticky top-0 z-40 bg-[var(--color-bg-card)] border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between shadow-xs select-none">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setMobileOpen(true)}
                        aria-label="Open Navigation Menu"
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[var(--color-bg-subtle)] text-[var(--color-text)] hover:bg-[var(--color-bg-neutral)] transition-colors border border-[var(--color-border)]"
                    >
                        <Menu size={22} />
                    </button>
                    <div 
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 cursor-pointer"
                    >
                        <div className="bg-[#00262b] p-2 rounded-xl text-[#04c5e7] shadow-sm">
                            <BookOpen size={18} />
                        </div>
                        <span className="font-extrabold text-lg tracking-tight text-[#00262b] dark:text-[#f9f8f6]">
                            TailorLearn
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Quick Theme Toggle for Mobile */}
                    <button
                        onClick={toggleTheme}
                        aria-label="Toggle Theme"
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] dark:hover:text-[#04c5e7] transition-colors border border-[var(--color-border)]"
                    >
                        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                    </button>

                    {/* Role Pill */}
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-[94px] uppercase tracking-wider bg-[var(--color-bg-subtle)] text-[var(--color-text)] border border-[var(--color-border)]">
                        {user.role}
                    </span>
                </div>
            </header>

            {/* Mobile Off-Canvas Drawer Backdrop */}
            {mobileOpen && (
                <div 
                    onClick={() => setMobileOpen(false)}
                    aria-hidden="true"
                    className="lg:hidden fixed inset-0 z-50 bg-[#00262b]/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
                />
            )}

            {/* Mobile Off-Canvas Slide-Out Drawer */}
            <div 
                className={`lg:hidden fixed top-0 bottom-0 left-0 w-72 max-w-[85vw] bg-[#ffffff] dark:bg-[var(--color-bg-card)] border-r border-[#edebe3] dark:border-[var(--color-border)] z-50 flex flex-col p-6 shadow-2xl transition-transform duration-300 ease-in-out select-none ${
                    mobileOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                role="dialog"
                aria-modal="true"
                aria-label="Main Navigation Drawer"
            >
                {/* Drawer Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#f3f1ed] dark:border-[#004d57]">
                    <div 
                        onClick={() => {
                            navigate('/dashboard');
                            setMobileOpen(false);
                        }}
                        className="flex items-center gap-2.5 cursor-pointer"
                    >
                        <div className="bg-[#00262b] p-2 rounded-xl text-[#04c5e7] shadow-sm">
                            <BookOpen size={18} />
                        </div>
                        <span className="font-extrabold text-lg tracking-tight text-[#00262b] dark:text-[#f9f8f6]">
                            TailorLearn
                        </span>
                    </div>
                    <button
                        onClick={() => setMobileOpen(false)}
                        aria-label="Close Navigation Menu"
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Profile Overview in Drawer */}
                <div className="pb-4 border-b border-[#f3f1ed] dark:border-[#004d57] mb-4 flex flex-col">
                    <p className="font-bold text-sm text-[#00262b] dark:text-[#f9f8f6]">
                        {user.firstName} {user.lastName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-[94px] uppercase tracking-wider bg-[#f3f1ed] dark:bg-[#004d57] text-[#00262b] dark:text-[#f9f8f6] border border-[#e1ddd1] dark:border-[#00606c]">
                            {user.role}
                        </span>
                        <span className="text-xs text-[var(--color-text-secondary)] truncate">
                            {user.email}
                        </span>
                    </div>
                </div>

                {/* Nav Links */}
                {renderNavLinks(() => setMobileOpen(false))}

                {/* Drawer Bottom Actions */}
                <div className="mt-auto pt-4 border-t border-[#f3f1ed] dark:border-[#004d57] flex flex-col gap-2">
                    <button
                        onClick={toggleTheme}
                        className="flex items-center justify-between w-full px-4 py-2.5 rounded-[94px] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] dark:hover:bg-[#004d57] hover:text-[var(--color-text)] dark:hover:text-[#04c5e7] transition-colors min-h-[44px]"
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

                    <button 
                        onClick={() => {
                            logout();
                            setMobileOpen(false);
                            navigate('/login');
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-[94px] text-sm font-semibold text-[#d64000] dark:text-[#ff7043] hover:bg-[#f9f8f6] dark:hover:bg-[#004d57] dark:hover:text-[#ff5722] transition-colors text-left w-full min-h-[44px]"
                    >
                        <LogOut size={16} />
                        <span>Log Out</span>
                    </button>
                </div>
            </div>

            {/* Desktop Sticky Sidebar (>= 1024px) */}
            <aside className="hidden lg:flex w-64 bg-[#ffffff] dark:bg-[var(--color-bg-card)] border-r border-[#edebe3] dark:border-[var(--color-border)] flex-col p-6 sticky top-0 h-screen transition-colors duration-200 select-none">
                {/* Logo */}
                <div 
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-3 mb-8 cursor-pointer group"
                >
                    <div className="bg-[#00262b] p-2.5 rounded-xl text-[#04c5e7] shadow-sm group-hover:scale-105 transition-transform">
                        <BookOpen size={20} />
                    </div>
                    <span className="font-extrabold text-xl tracking-tight text-[#00262b] dark:text-[#f9f8f6]">
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
                {renderNavLinks()}

                {/* Bottom Actions */}
                <div className="mt-auto pt-6 border-t border-[#f3f1ed] dark:border-[#004d57] flex flex-col gap-2">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="flex items-center justify-between w-full px-4 py-2.5 rounded-[94px] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] dark:hover:bg-[#004d57] hover:text-[var(--color-text)] dark:hover:text-[#04c5e7] transition-colors min-h-[44px]"
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
                        className="flex items-center gap-3 px-4 py-2.5 rounded-[94px] text-sm font-semibold text-[#d64000] dark:text-[#ff7043] hover:bg-[#f9f8f6] dark:hover:bg-[#004d57] dark:hover:text-[#ff5722] transition-colors text-left w-full min-h-[44px]"
                    >
                        <LogOut size={16} />
                        <span>Log Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
