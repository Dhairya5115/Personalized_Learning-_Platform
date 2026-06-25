import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Award, Flame, LogOut, Home, Compass } from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab }) {
    const { user, logout } = useAuth();

    if (!user) return null;

    return (
        <aside className="sidebar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
                <div style={{ backgroundColor: 'var(--accent-indigo)', padding: '8px', borderRadius: '8px' }}>
                    <BookOpen size={24} color="white" />
                </div>
                <span style={{ fontWeight: 700, fontSize: '18px' }}>Adaptify Edu</span>
            </div>

            {/* User Badges Profile Overview */}
            <div style={{ paddingBottom: '20px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
                <p style={{ fontWeight: 600, fontSize: '15px' }}>{user.firstName} {user.lastName}</p>
                <span className={`badge badge-${user.role.toLowerCase()}`} style={{ marginTop: '6px' }}>
                    {user.role}
                </span>

                {user.role === 'STUDENT' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                        <div className="streak-indicator" title="Consecutive day active streak">
                            <Flame size={16} fill="var(--accent-amber)" />
                            <span>{user.streakCount || 0}</span>
                        </div>
                        <div className="xp-indicator" title="Total Experience points earned">
                            <Award size={16} />
                            <span>{user.xpPoints || 0} XP</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs Navigation Links */}
            <nav className="nav-list">
                <button 
                    onClick={() => setCurrentTab('dashboard')} 
                    className={`nav-link btn-secondary ${currentTab === 'dashboard' ? 'active' : ''}`}
                    style={{ border: 'none', width: '100%', textAlign: 'left' }}
                >
                    <Home size={18} />
                    <span>Dashboard</span>
                </button>

                <button 
                    onClick={() => setCurrentTab('courses')} 
                    className={`nav-link btn-secondary ${currentTab === 'courses' ? 'active' : ''}`}
                    style={{ border: 'none', width: '100%', textAlign: 'left' }}
                >
                    <Compass size={18} />
                    <span>Browse Courses</span>
                </button>
            </nav>

            <button 
                onClick={logout} 
                className="nav-link btn-secondary" 
                style={{ border: 'none', marginTop: 'auto', color: 'var(--accent-rose)' }}
            >
                <LogOut size={18} />
                <span>Log Out</span>
            </button>
        </aside>
    );
}
