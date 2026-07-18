import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CoursesList from './pages/CoursesList';
import CourseView from './pages/CourseView';
import StudyPlanner from './pages/StudyPlanner';
import DoubtSolver from './pages/DoubtSolver';
import Leaderboard from './pages/Leaderboard';
import Analytics from './pages/Analytics';
import QuizView from './pages/QuizView';
import Loader from './components/Loader';
import StudentProgressTracker from './pages/StudentProgressTracker';

function MainAppContent() {
    const { user, loading } = useAuth();
    const [loaderFinished, setLoaderFinished] = useState(false);
    const [currentTab, setCurrentTab] = useState('dashboard');
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [doubtSolverContext, setDoubtSolverContext] = useState(null);

    useEffect(() => {
        if (user) {
            setLoaderFinished(false);
        } else {
            setLoaderFinished(true);
        }
    }, [user]);

    if (loading || !loaderFinished) {
        return <Loader onFinished={() => setLoaderFinished(true)} />;
    }

    if (!user) {
        return <Login />;
    }

    const handleSelectCourse = (course) => {
        setSelectedCourse(course);
        setCurrentTab('courseDetail');
    };

    const handleSelectQuiz = (quiz) => {
        setSelectedQuiz(quiz);
        setCurrentTab('quiz');
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
                        onSelectQuiz={handleSelectQuiz}
                        onAskTutor={(courseId, courseTitle, topicId = null, topicTitle = null) => {
                            setDoubtSolverContext({ courseId, courseTitle, topicId, topicTitle });
                            setCurrentTab('doubtSolver');
                        }}
                    />
                );
            case 'planner':
                return <StudyPlanner />;
            case 'doubtSolver':
                return (
                    <DoubtSolver 
                        context={doubtSolverContext} 
                        onClearContext={() => setDoubtSolverContext(null)} 
                    />
                );
            case 'leaderboard':
                return <Leaderboard />;
            case 'analytics':
                return <Analytics />;
            case 'studentTracker':
                return <StudentProgressTracker />;
            case 'quiz':
                return (
                    <QuizView 
                        quiz={selectedQuiz} 
                        onBack={() => setCurrentTab('courseDetail')} 
                    />
                );
            default:
                return <Dashboard onSelectCourse={handleSelectCourse} />;
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
            <Sidebar currentTab={currentTab} setCurrentTab={(tab) => {
                if (tab === 'doubtSolver') {
                    setDoubtSolverContext(null);
                }
                setCurrentTab(tab);
            }} />
            <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
                {renderActiveTab()}
            </main>
        </div>
    );
}

export default function App() {
    const [toast, setToast] = useState(null);

    useEffect(() => {
        window.showToast = (message, type = 'success') => {
            setToast({ message, type });
        };
        return () => {
            window.showToast = null;
        };
    }, []);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3500);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    return (
        <AuthProvider>
            <ThemeProvider>
                {toast && (
                    <div className={`fixed bottom-6 right-6 z-[99999] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg animate-in slide-in-from-bottom-5 duration-200 select-none ${
                        toast.type === 'error' 
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400' 
                            : toast.type === 'warning'
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-450'
                    }`}>
                        <span className="text-sm font-semibold">{toast.message}</span>
                    </div>
                )}
                <MainAppContent />
            </ThemeProvider>
        </AuthProvider>
    );
}
