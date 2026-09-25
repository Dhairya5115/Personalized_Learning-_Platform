import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
    ArrowLeft, Check, AlertCircle, Award, CheckCircle, X, 
    Sparkles, ShieldCheck, Eye, ClipboardList, BookOpen 
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

export default function QuizView({ quiz: quizProp, onBack: onBackProp }) {
    const { quizId: paramQuizId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const isTa = user?.role === 'TA';

    const [fetchedQuiz, setFetchedQuiz] = useState(null);
    const quiz = quizProp || fetchedQuiz || { id: paramQuizId, title: 'Adaptive Practice Quiz' };
    const onBack = onBackProp || (() => navigate(-1));

    // TA Read-Only state
    const [taQuestions, setTaQuestions] = useState([]);
    const [taLoading, setTaLoading] = useState(isTa);

    // Student Attempt state
    const [question, setQuestion] = useState(null);
    const [loading, setLoading] = useState(!isTa);
    const [selectedOptionId, setSelectedOptionId] = useState('');
    const [showExitModal, setShowExitModal] = useState(false);
    
    // Use a ref to hold responses so finishQuiz always gets the latest list (avoids stale closure)
    const responsesRef = useRef([]);
    const [responseCount, setResponseCount] = useState(0);
    const [quizFinished, setQuizFinished] = useState(false);
    const [results, setResults] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!quizProp && paramQuizId) {
            api.getQuizDetails(paramQuizId)
                .then(q => setFetchedQuiz(q))
                .catch(err => console.error('Error fetching quiz details:', err));
        }
    }, [quizProp, paramQuizId]);

    // TA read-only question fetching
    useEffect(() => {
        if (isTa && quiz?.id) {
            setTaLoading(true);
            api.getQuizQuestions(quiz.id)
                .then(qs => {
                    setTaQuestions(qs || []);
                })
                .catch(err => {
                    console.error('Error fetching questions for TA preview:', err);
                    if (window.showToast) window.showToast('Failed to load quiz questions', 'error');
                })
                .finally(() => setTaLoading(false));
        }
    }, [isTa, quiz?.id]);

    // Student adaptive question loading
    useEffect(() => {
        if (!isTa && quiz?.id) {
            responsesRef.current = [];
            setResponseCount(0);
            loadNextQuestion();
        }
    }, [isTa, quiz?.id]);

    async function loadNextQuestion(currentResponses) {
        if (isTa) return;
        setLoading(true);
        setSelectedOptionId('');
        try {
            const list = currentResponses || responsesRef.current;
            const excludeIds = list.map(r => r.questionId).join(',');
            const data = await api.getNextQuestion(quiz.id, excludeIds);
            if (data.completed) {
                // Pass the definitive responses to avoid stale closure
                await finishQuiz(currentResponses || responsesRef.current);
            } else {
                setQuestion(data.question);
            }
        } catch (err) {
            console.error('Error loading next adaptive question:', err.message);
            if (window.showToast) {
                window.showToast(err.message || 'Error loading next question', 'error');
            }
        } finally {
            setLoading(false);
        }
    }

    const handleNext = () => {
        if (isTa || !selectedOptionId) return;

        // Build updated list and store in ref immediately (sync)
        const newResponses = [
            ...responsesRef.current,
            { questionId: question.id, selectedOptionId }
        ];
        responsesRef.current = newResponses;
        setResponseCount(newResponses.length);

        // Pass latest list so finishQuiz gets it even on immediate completion
        loadNextQuestion(newResponses);
    };

    const finishQuiz = async (finalResponses) => {
        if (isTa) {
            if (window.showToast) {
                window.showToast('TAs cannot submit quiz attempts.', 'error');
            }
            return;
        }

        setSubmitting(true);
        try {
            if (!finalResponses || finalResponses.length === 0) {
                if (window.showToast) {
                    window.showToast('No responses were recorded. Please answer at least one question.', 'error');
                }
                setSubmitting(false);
                return;
            }
            const res = await api.submitQuiz(quiz.id, finalResponses);
            setResults(res.results);
            setQuizFinished(true);
            if (window.showToast) {
                window.showToast('Quiz responses recorded!', 'success');
            }
        } catch (err) {
            console.error('Quiz submit error:', err);
            if (window.showToast) {
                window.showToast(err.message || 'Failed to submit quiz results. Please try again.', 'error');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleExitEarly = () => {
        if (isTa) {
            onBack();
            return;
        }
        const answersSoFar = responsesRef.current;
        if (answersSoFar.length > 0) {
            setShowExitModal(true);
        } else {
            onBack();
        }
    };

    const handleConfirmSubmitAndExit = async () => {
        setShowExitModal(false);
        await finishQuiz(responsesRef.current);
    };

    // Safely parse options array from string or object
    const currentQuestionOptions = question && question.options 
        ? (typeof question.options === 'string' ? JSON.parse(question.options) : question.options)
        : [];

    // ==========================================
    // TA READ-ONLY VIEW
    // ==========================================
    if (isTa) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
                {/* Header bar */}
                <div className="flex items-center justify-between bg-[#ffffff] dark:bg-slate-900 border border-[#edebe3] dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                    <button
                        onClick={onBack}
                        className="btn-ghost !text-xs !py-2 !px-4 inline-flex items-center gap-2"
                    >
                        <ArrowLeft size={16} />
                        <span>Back to Course</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold px-3 py-1 bg-[#f3f1ed] dark:bg-slate-800 text-[#00262b] dark:text-[#04c5e7] rounded-[94px] border border-[#04c5e7]/40 uppercase tracking-wider inline-flex items-center gap-1.5">
                            <Eye size={12} />
                            <span>TA View-Only Mode</span>
                        </span>
                    </div>
                </div>

                {/* TA Notice Badge Banner */}
                <div className="bg-[#f3f1ed] dark:bg-slate-900/90 border border-[#e1ddd1] dark:border-slate-800 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
                    <div className="p-2.5 rounded-xl bg-[#00262b] text-[#04c5e7] shrink-0">
                        <ShieldCheck size={20} />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-extrabold text-[#00262b] dark:text-slate-100">
                                View only — TAs cannot attempt quizzes
                            </h3>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#edebe3] dark:bg-slate-800 text-[#52716c] dark:text-slate-300 px-2 py-0.5 rounded-md border border-[#e1ddd1] dark:border-slate-700">
                                Read Only
                            </span>
                        </div>
                        <p className="text-xs text-[#52716c] dark:text-slate-400 leading-relaxed">
                            As an approved Teaching Assistant, you have full visibility into the quiz structure and question bank to assist students. However, attempt creation and answer submissions are disabled to prevent conflict with student scoring metrics.
                        </p>
                    </div>
                </div>

                {/* Quiz Info Header */}
                <div className="bg-[#ffffff] dark:bg-slate-900 border border-[#edebe3] dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-extrabold text-[#00262b] dark:text-slate-100">
                            {quiz.title}
                        </h2>
                        {quiz.topic_title && (
                            <p className="text-xs text-[#52716c] dark:text-slate-400 mt-1 font-medium">
                                Topic: {quiz.topic_title} {quiz.course_title ? `• Course: ${quiz.course_title}` : ''}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold text-[#52716c] dark:text-slate-400">
                        <div className="px-3 py-1.5 bg-[#f9f8f6] dark:bg-slate-800 rounded-xl border border-[#edebe3] dark:border-slate-700">
                            Questions: <strong className="text-[#00262b] dark:text-slate-200">{taQuestions.length}</strong>
                        </div>
                        <div className="px-3 py-1.5 bg-[#f9f8f6] dark:bg-slate-800 rounded-xl border border-[#edebe3] dark:border-slate-700">
                            Passing: <strong className="text-[#00262b] dark:text-slate-200">{quiz.passing_score || 50}%</strong>
                        </div>
                    </div>
                </div>

                {/* Questions List */}
                {taLoading ? (
                    <div className="bg-[#ffffff] dark:bg-slate-900 border border-[#edebe3] dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
                        <div className="w-8 h-8 mx-auto border-3 border-[#00262b] border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-xs text-[#52716c] dark:text-slate-400 font-medium">Loading quiz questions for review...</p>
                    </div>
                ) : taQuestions.length === 0 ? (
                    <div className="bg-[#ffffff] dark:bg-slate-900 border border-[#edebe3] dark:border-slate-800 rounded-2xl p-8 text-center text-[#52716c] dark:text-slate-400 text-sm shadow-sm">
                        No questions have been configured for this quiz yet.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {taQuestions.map((q, qIndex) => {
                            const qOpts = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []);
                            return (
                                <div 
                                    key={q.id || qIndex} 
                                    className="bg-[#ffffff] dark:bg-slate-900 border border-[#edebe3] dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-[#f3f1ed] dark:bg-slate-800 text-[#00262b] dark:text-[#04c5e7] flex items-center justify-center text-xs font-bold border border-[#e1ddd1] dark:border-slate-700">
                                                {qIndex + 1}
                                            </span>
                                            <span className="text-xs font-bold uppercase tracking-wider text-[#52716c] dark:text-slate-400">
                                                Question {qIndex + 1}
                                            </span>
                                        </div>
                                        <span className={`px-2.5 py-0.5 rounded-[94px] text-[10px] font-bold tracking-wider uppercase border ${
                                            q.difficulty === 'EASY'
                                                ? 'bg-[#f3f1ed] dark:bg-slate-800 text-[#00262b] dark:text-[#04c5e7] border-[#04c5e7]'
                                                : q.difficulty === 'HARD'
                                                    ? 'bg-[#f3f1ed] dark:bg-slate-800 text-[#d64000] dark:text-rose-400 border-[#d64000]/40'
                                                    : 'bg-[#f3f1ed] dark:bg-slate-800 text-[#00262b] dark:text-slate-200 border-[#edebe3] dark:border-slate-700'
                                        }`}>
                                            {q.difficulty || 'MEDIUM'}
                                        </span>
                                    </div>

                                    <h4 className="text-base font-bold text-[#00262b] dark:text-slate-100 leading-snug">
                                        {q.content}
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                        {qOpts.map((opt) => {
                                            const isKey = q.correct_option_id === opt.id;
                                            return (
                                                <div 
                                                    key={opt.id}
                                                    className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all select-none ${
                                                        isKey 
                                                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500/50 dark:border-emerald-500/50 text-[#00262b] dark:text-emerald-200' 
                                                            : 'bg-[#f9f8f6] dark:bg-slate-800/40 border-[#edebe3] dark:border-slate-800 text-[#52716c] dark:text-slate-400'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                                                            isKey 
                                                                ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950' 
                                                                : 'bg-[#edebe3] dark:bg-slate-700 text-[#52716c] dark:text-slate-300'
                                                        }`}>
                                                            {opt.id}
                                                        </span>
                                                        <span className="text-xs font-semibold">{opt.text}</span>
                                                    </div>
                                                    {isKey && (
                                                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                                                            <Check size={10} /> Key
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="flex justify-center pt-4 pb-8">
                    <button
                        onClick={onBack}
                        className="btn-primary !px-8 !py-3 !text-xs"
                    >
                        Finished Review
                    </button>
                </div>
            </div>
        );
    }

    // ==========================================
    // STUDENT ATTEMPT & RESULTS VIEW
    // ==========================================
    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
            <ConfirmModal
                isOpen={showExitModal}
                title="Exit Quiz Early?"
                message={`You have answered ${responsesRef.current.length} question(s). Would you like to submit your answers to record your score before leaving?`}
                confirmText="Submit & Exit"
                cancelText="Discard & Exit"
                confirmVariant="primary"
                onConfirm={handleConfirmSubmitAndExit}
                onCancel={() => {
                    setShowExitModal(false);
                    onBack();
                }}
            />

            {/* Header bar */}
            <div className="flex items-center justify-between bg-[#ffffff] dark:bg-slate-900 border border-[#edebe3] dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                <button
                    onClick={handleExitEarly}
                    className="btn-ghost !text-xs !py-2 !px-4 inline-flex items-center gap-2"
                >
                    <ArrowLeft size={16} />
                    <span>Exit Quiz</span>
                </button>
                {!quizFinished && (
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[#52716c] dark:text-slate-400 uppercase tracking-wider">
                            Question {responseCount + 1}
                        </span>
                    </div>
                )}
            </div>

            {/* Main Quiz Content */}
            {quizFinished && results ? (
                <div className="space-y-6">
                    {/* Top Summary Metrics Card */}
                    <div className="bg-[#ffffff] dark:bg-slate-900 border border-[#edebe3] dark:border-slate-800 rounded-2xl p-8 shadow-sm space-y-6 text-center">
                        <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center ${
                            results.score >= 60 
                                ? 'bg-[#00262b] dark:bg-[#04c5e7]/20 text-[#04c5e7]' 
                                : 'bg-[#f3f1ed] dark:bg-rose-500/20 text-[#d64000] dark:text-rose-400'
                        }`}>
                            {results.score >= 60 ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl md:text-3xl font-extrabold text-[#00262b] dark:text-slate-100">
                                {results.score >= 60 ? 'Great job! Quiz Passed' : 'Quiz Completed'}
                            </h2>
                            <p className="text-xs font-medium text-[#52716c] dark:text-slate-400">
                                You completed the adaptive practice session. Here are your final metrics:
                            </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#edebe3] dark:border-slate-800">
                            <div className="p-4 bg-[#f9f8f6] dark:bg-slate-850 border border-[#edebe3] dark:border-slate-800 rounded-2xl">
                                <span className="block text-[10px] font-bold uppercase text-[#52716c] dark:text-slate-400 tracking-wider">Final Score</span>
                                <span className="text-2xl font-extrabold text-[#00262b] dark:text-slate-100">{results.score}%</span>
                            </div>
                            <div className="p-4 bg-[#f9f8f6] dark:bg-slate-850 border border-[#edebe3] dark:border-slate-800 rounded-2xl">
                                <span className="block text-[10px] font-bold uppercase text-[#52716c] dark:text-slate-400 tracking-wider">Average</span>
                                <span className="text-2xl font-extrabold text-[#00262b] dark:text-slate-100">
                                    {results.averageScore !== undefined ? results.averageScore : results.score}%
                                </span>
                            </div>
                            <div className="p-4 bg-[#f9f8f6] dark:bg-slate-850 border border-[#edebe3] dark:border-slate-800 rounded-2xl">
                                <span className="block text-[10px] font-bold uppercase text-[#52716c] dark:text-slate-400 tracking-wider">XP Earned</span>
                                <span className="text-2xl font-extrabold text-[#00262b] dark:text-slate-100 flex items-center justify-center gap-1">
                                    <Award size={20} className="text-[#d64000] dark:text-amber-400" />
                                    +{results.xpGained}
                                </span>
                            </div>
                            <div className="p-4 bg-[#f9f8f6] dark:bg-slate-850 border border-[#edebe3] dark:border-slate-800 rounded-2xl">
                                <span className="block text-[10px] font-bold uppercase text-[#52716c] dark:text-slate-400 tracking-wider">Attempt</span>
                                <span className="text-2xl font-extrabold text-[#00262b] dark:text-slate-100">#{results.attemptsCount || 1}</span>
                            </div>
                        </div>

                        <div className="pt-2 flex gap-4 justify-center">
                            <button
                                onClick={onBack}
                                className="btn-primary !px-8 !py-3 !text-sm"
                            >
                                Back to Topic
                            </button>
                        </div>
                    </div>

                    {/* Per-Question Review List */}
                    {results.questionReview && results.questionReview.length > 0 && (
                        <div className="bg-[#ffffff] dark:bg-slate-900 border border-[#edebe3] dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm space-y-6 text-left">
                            <div className="flex items-center justify-between pb-4 border-b border-[#edebe3] dark:border-slate-800">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-[#00262b] text-[#04c5e7]">
                                        <ClipboardList size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-extrabold text-[#00262b] dark:text-slate-100">
                                            Per-Question Answer Breakdown
                                        </h3>
                                        <p className="text-xs text-[#52716c] dark:text-slate-400">
                                            Review your selected answers against the correct answers
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-[#f3f1ed] dark:bg-slate-800 text-[#00262b] dark:text-[#04c5e7] border border-[#e1ddd1] dark:border-slate-700">
                                    {results.correctCount} / {results.totalQuestions} Correct
                                </span>
                            </div>

                            <div className="space-y-6">
                                {results.questionReview.map((item, idx) => {
                                    const itemOptions = item.options 
                                        ? (typeof item.options === 'string' ? JSON.parse(item.options) : item.options)
                                        : [];

                                    return (
                                        <div 
                                            key={item.questionId || idx}
                                            className="p-5 rounded-2xl border border-[#edebe3] dark:border-slate-800 bg-[#f9f8f6]/50 dark:bg-slate-850/40 space-y-4"
                                        >
                                            {/* Question Header */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-[#ffffff] dark:bg-slate-800 text-[#00262b] dark:text-slate-200 flex items-center justify-center text-xs font-bold border border-[#edebe3] dark:border-slate-700">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-xs font-bold text-[#52716c] dark:text-slate-400 uppercase tracking-wider">
                                                        Question {idx + 1}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {item.difficulty && (
                                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#edebe3] dark:bg-slate-800 text-[#52716c] dark:text-slate-300 border border-[#e1ddd1] dark:border-slate-700">
                                                            {item.difficulty}
                                                        </span>
                                                    )}
                                                    {item.isCorrect ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                            <CheckCircle size={13} />
                                                            <span>Correct</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                                            <X size={13} />
                                                            <span>Incorrect</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Question Content */}
                                            <p className="text-sm md:text-base font-bold text-[#00262b] dark:text-slate-100 leading-snug">
                                                {item.content}
                                            </p>

                                            {/* Options List */}
                                            <div className="space-y-2.5 pt-1">
                                                {itemOptions.map((opt) => {
                                                    const isSelected = item.selectedOptionId === opt.id;
                                                    const isCorrectKey = item.correctOptionId === opt.id;

                                                    // Determine visual style based on correctness & selection
                                                    let cardStyle = 'bg-[#ffffff] dark:bg-slate-900 border-[#edebe3] dark:border-slate-800 text-[#52716c] dark:text-slate-400';
                                                    let badgeElement = null;

                                                    if (isSelected && isCorrectKey) {
                                                        // Student picked correctly!
                                                        cardStyle = 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 text-[#00262b] dark:text-emerald-200 shadow-xs';
                                                        badgeElement = (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                                                <Check size={11} /> Correct — Your Pick
                                                            </span>
                                                        );
                                                    } else if (isSelected && !isCorrectKey) {
                                                        // Student picked wrongly!
                                                        cardStyle = 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-500 text-[#00262b] dark:text-rose-200 shadow-xs';
                                                        badgeElement = (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                                                                <X size={11} /> Your Choice (Incorrect)
                                                            </span>
                                                        );
                                                    } else if (!isSelected && isCorrectKey) {
                                                        // Correct answer that student missed
                                                        cardStyle = 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-400/80 dark:border-emerald-500/70 text-[#00262b] dark:text-emerald-200';
                                                        badgeElement = (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-100/90 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                                                <Check size={11} /> Correct Answer
                                                            </span>
                                                        );
                                                    }

                                                    return (
                                                        <div 
                                                            key={opt.id}
                                                            className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all select-none ${cardStyle}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                                                    isCorrectKey
                                                                        ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950'
                                                                        : isSelected
                                                                            ? 'bg-rose-600 text-white dark:bg-rose-500 dark:text-slate-950'
                                                                            : 'bg-[#edebe3] dark:bg-slate-800 text-[#52716c] dark:text-slate-300'
                                                                }`}>
                                                                    {opt.id}
                                                                </span>
                                                                <span className="text-xs md:text-sm font-semibold">
                                                                    {opt.text}
                                                                </span>
                                                            </div>
                                                            {badgeElement}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="pt-4 border-t border-[#edebe3] dark:border-slate-800 flex justify-center">
                                <button
                                    onClick={onBack}
                                    className="btn-primary !px-8 !py-3 !text-sm"
                                >
                                    Back to Topic
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : loading ? (
                <div className="bg-[#ffffff] dark:bg-slate-900 border border-[#edebe3] dark:border-slate-800 rounded-2xl p-12 shadow-sm text-center">
                    <div className="w-8 h-8 mx-auto border-3 border-[#00262b] border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-xs text-[#52716c] dark:text-slate-400 font-medium">Loading next question...</p>
                </div>
            ) : question ? (
                <div className="bg-[#ffffff] dark:bg-slate-900 border border-[#edebe3] dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
                    {/* Question Meta */}
                    <div className="flex items-center justify-between">
                        <span className={`px-3 py-1 rounded-[94px] text-[10px] font-bold tracking-wider uppercase border ${
                            question.difficulty === 'EASY'
                                ? 'bg-[#f3f1ed] dark:bg-slate-800 text-[#00262b] dark:text-[#04c5e7] border-[#04c5e7]'
                                : question.difficulty === 'HARD'
                                    ? 'bg-[#f3f1ed] dark:bg-slate-800 text-[#d64000] dark:text-rose-400 border-[#d64000]/40'
                                    : 'bg-[#f3f1ed] dark:bg-slate-800 text-[#00262b] dark:text-slate-200 border-[#edebe3] dark:border-slate-700'
                        }`}>
                            {question.difficulty} Difficulty
                        </span>
                    </div>

                    {/* Question Title */}
                    <h3 className="text-lg md:text-xl font-extrabold text-[#00262b] dark:text-slate-100 leading-relaxed">
                        {question.content}
                    </h3>

                    {/* Options list */}
                    <div className="space-y-3 pt-2">
                        {currentQuestionOptions.map((opt) => {
                            const isSelected = selectedOptionId === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => setSelectedOptionId(opt.id)}
                                    className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 ${
                                        isSelected
                                            ? 'bg-[#f3f1ed] dark:bg-slate-800 border-[#00262b] dark:border-[#04c5e7] text-[#00262b] dark:text-slate-100 shadow-sm'
                                            : 'bg-[#ffffff] dark:bg-slate-900 border-[#edebe3] dark:border-slate-800 text-[#00262b] dark:text-slate-200 hover:border-[#04c5e7]'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`w-8 h-8 rounded-2xl flex items-center justify-center text-xs font-bold ${
                                            isSelected
                                                ? 'bg-[#00262b] text-[#04c5e7]'
                                                : 'bg-[#f9f8f6] dark:bg-slate-800 text-[#00262b] dark:text-slate-200 border border-[#edebe3] dark:border-slate-700'
                                        }`}>
                                            {opt.id}
                                        </span>
                                        <span className="text-xs md:text-sm font-semibold">{opt.text}</span>
                                    </div>
                                    {isSelected && <Check size={18} className="text-[#00262b] dark:text-[#04c5e7]" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-[#edebe3] dark:border-slate-800 flex justify-end">
                        <button
                            onClick={handleNext}
                            disabled={!selectedOptionId || submitting}
                            className="btn-primary !px-6 !py-3 !text-xs disabled:opacity-40"
                        >
                            {submitting ? 'Submitting...' : 'Next Question →'}
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
