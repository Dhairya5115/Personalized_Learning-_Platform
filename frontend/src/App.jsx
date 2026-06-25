import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CoursesList from './pages/CoursesList';
import CourseView from './pages/CourseView';

function MainAppContent() {
    const { user, loading } = useAuth();
    const [currentTab, setCurrentTab] = useState('dashboard');
    const [selectedCourse, setSelectedCourse] = useState(null);

    if (loading) {
        return (
            <div style={{ 
                minHeight: '100vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-main)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Initializing Session...</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Loading Adaptify Edu platform parameters</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Login />;
    }

    const handleSelectCourse = (course) => {
        setSelectedCourse(course);
        setCurrentTab('courseDetail');
    };

    const handleBackToCourses = () => {
        setSelectedCourse(null);
        setCurrentTab('courses');
    };

    const renderActiveTab = () => {
        switch (currentTab) {
            case 'dashboard':
                return (
                    <Dashboard 
                        onSelectCourse={handleSelectCourse} 
                        onGoToCatalog={() => setCurrentTab('courses')} 
                    />
                );
            case 'courses':
                return (
                    <CoursesList 
                        onSelectCourse={handleSelectCourse} 
                    />
                );
            case 'courseDetail':
                return (
                    <CourseView 
                        course={selectedCourse} 
                        onBack={handleBackToCourses} 
                    />
                );
            default:
                return <Dashboard onSelectCourse={handleSelectCourse} />;
        }
    };

    return (
        <div className="app-container">
            <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
            <main className="main-content">
                {renderActiveTab()}
            </main>
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <MainAppContent />
        </AuthProvider>
    );
}
