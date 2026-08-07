import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import { 
    TaCourseCatalog, 
    TaApplications, 
    TaAssignedStudents, 
    TaPendingRequests, 
    TeacherTaReview 
} from './pages/TaPages';

function MainAppContent() {
    const { user, loading } = useAuth();
    const [loaderFinished, setLoaderFinished] = useState(false);
    const navigate = useNavigate();

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

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
            <Sidebar />
            <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
                <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/courses" element={<CoursesList />} />
                    <Route path="/courses/:courseId" element={<CourseView />} />
                    <Route path="/quiz/:quizId" element={<QuizView />} />
                    <Route path="/planner" element={<StudyPlanner />} />
                    <Route path="/doubt-solver" element={<DoubtSolver />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/student-tracker" element={<StudentProgressTracker />} />
                    <Route path="/ta-catalog" element={<TaCourseCatalog />} />
                    <Route path="/ta-applications" element={<TaApplications />} />
                    <Route path="/ta-assigned" element={<TaAssignedStudents />} />
                    <Route path="/ta-requests" element={<TaPendingRequests />} />
                    <Route path="/teacher-ta-reviews" element={<TeacherTaReview />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
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
