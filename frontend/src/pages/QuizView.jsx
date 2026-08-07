import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Check, AlertCircle, Award, Flame, CheckCircle, X, Sparkles } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

export default function QuizView({ quiz: quizProp, onBack: onBackProp }) {
    const { quizId: paramQuizId } = useParams();
    const navigate = useNavigate();

    const [fetchedQuiz, setFetchedQuiz] = useState(null);
    const quiz = quizProp || fetchedQuiz || { id: paramQuizId, title: 'Adaptive Practice Quiz' };
    const onBack = onBackProp || (() => navigate(-1));

    const [question, setQuestion] = useState(null);
    const [loading, setLoading] = useState(true);
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
            api.getQuizDetails ? api.getQuizDetails(paramQuizId).then(q => setFetchedQuiz(q)).catch(() => {}) : null;
        }
    }, [quizProp, paramQuizId]);

    useEffect(() => {
        if (quiz?.id) {
            responsesRef.current = [];
            setResponseCount(0);
            loadNextQuestion();
        }
    }, [quiz?.id]);

    async function loadNextQuestion(currentResponses) {
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
        } finally {
            setLoading(false);
        }
    }

    const handleNext = () => {
        if (!selectedOptionId) return;

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
                window.showToast('Failed to submit quiz results. Please try again.', 'error');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleExitEarly = () => {
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
    const options = question && question.options 
        ? (typeof question.options === 'string' ? JSON.parse(question.options) : question.options)
        : [];

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
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
                <button
                    onClick={handleExitEarly}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                    <ArrowLeft size={16} />
                    <span>Exit Quiz</span>
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Question {responseCount + 1}
                    </span>
                </div>
            </div>

            {/* Main Quiz Content */}
            {quizFinished && results ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-6 text-center">
                    <div className={`mx-auto w-16 h-16 rounded-3xl flex items-center justify-center ${
                        results.score >= 60 
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}>
                        {results.score >= 60 ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {results.score >= 60 ? 'Great job! Quiz Passed' : 'Quiz Completed'}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            You completed the adaptive practice session. Here are your final metrics:
                        </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl">
                            <span className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Final Score</span>
                            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{results.score}%</span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl">
                            <span className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Accuracy</span>
                            <span className="text-xl font-black text-slate-800 dark:text-slate-200">{results.correctAnswers}/{results.totalAnswered}</span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl">
                            <span className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">XP Earned</span>
                            <span className="text-xl font-black text-amber-500 flex items-center justify-center gap-1">
                                <Award size={18} />
                                +{results.xpGained}
                            </span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl">
                            <span className="block text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">New Skill Score</span>
                            <span className="text-xl font-black text-emerald-500">{results.newSkillScore}</span>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-4 justify-center">
                        <button
                            onClick={onBack}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                        >
                            Back to Topic
                        </button>
                    </div>
                </div>
            ) : loading ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 shadow-sm text-center">
                    <div className="w-8 h-8 mx-auto border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-xs text-slate-400 dark:text-slate-500">Loading next question...</p>
                </div>
            ) : question ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                    {/* Question Meta */}
                    <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                            question.difficulty === 'EASY'
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                : question.difficulty === 'HARD'
                                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                                    : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                        }`}>
                            {question.difficulty} Difficulty
                        </span>
                    </div>

                    {/* Question Title */}
                    <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                        {question.content}
                    </h3>

                    {/* Options list */}
                    <div className="space-y-3 pt-2">
                        {options.map((opt) => {
                            const isSelected = selectedOptionId === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    onClick={() => setSelectedOptionId(opt.id)}
                                    className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 ${
                                        isSelected
                                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-indigo-950 dark:text-indigo-100 shadow-xs'
                                            : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-800'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                                            isSelected
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                        }`}>
                                            {opt.id}
                                        </span>
                                        <span className="text-xs md:text-sm font-medium">{opt.text}</span>
                                    </div>
                                    {isSelected && <Check size={18} className="text-indigo-600 dark:text-indigo-400" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        <button
                            onClick={handleNext}
                            disabled={!selectedOptionId || submitting}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-550 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                        >
                            {submitting ? 'Submitting...' : 'Next Question →'}
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
