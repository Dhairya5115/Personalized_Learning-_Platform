import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { ArrowLeft, Check, AlertCircle, Award, Flame, CheckCircle, X, Sparkles } from 'lucide-react';

export default function QuizView({ quiz, onBack }) {
    const [question, setQuestion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedOptionId, setSelectedOptionId] = useState('');
    
    // Use a ref to hold responses so finishQuiz always gets the latest list (avoids stale closure)
    const responsesRef = useRef([]);
    const [responseCount, setResponseCount] = useState(0);
    const [quizFinished, setQuizFinished] = useState(false);
    const [results, setResults] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        responsesRef.current = [];
        setResponseCount(0);
        loadNextQuestion();
    }, [quiz.id]);

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
                } else {
                    alert('No responses were recorded. Please answer at least one question.');
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
            } else {
                alert('Failed to submit quiz results. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleExitEarly = async () => {
        const answersSoFar = responsesRef.current;
        if (answersSoFar.length > 0) {
            const confirmExit = window.confirm(
                `You have answered ${answersSoFar.length} questions. Would you like to submit them to view your score and update your performance before exiting?`
            );
            if (confirmExit) {
                await finishQuiz(answersSoFar);
                return;
            }
        }
        onBack();
    };

    if (submitting) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400 max-w-md mx-auto text-center space-y-4">
                <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-indigo-600 dark:border-slate-800 dark:border-t-indigo-500 animate-spin" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Checking your answers...</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                    Calculating your score, updating your progress, and awarding points.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Back Button */}
            <button 
                onClick={handleExitEarly} 
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-355 border border-slate-200/50 dark:border-slate-800/80 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors shadow-xs"
            >
                <ArrowLeft size={14} />
                <span>Exit Quiz</span>
            </button>

            {!quizFinished ? (
                /* Active Question Rendering */
                loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
                        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mb-4" />
                        <span>Loading next question...</span>
                    </div>
                ) : !question ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-855 rounded-2xl p-8 text-center flex flex-col items-center justify-center shadow-sm">
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">This quiz does not have any questions yet.</p>
                        <button onClick={onBack} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold">Go Back</button>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                        {/* Meta status bar */}
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Current Quiz</span>
                                <span className="text-sm font-bold text-slate-850 dark:text-slate-100">{quiz.title}</span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {responseCount > 0 && (
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">{responseCount} answered</span>
                                )}
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl uppercase tracking-wider ${
                                    question.difficulty === 'EASY' 
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' 
                                        : question.difficulty === 'HARD' 
                                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' 
                                            : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                                }`}>
                                    {question.difficulty}
                                </span>
                            </div>
                        </div>

                        {/* Question Text */}
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                            {question.content}
                        </h2>

                        {/* Options Radio List */}
                        <div className="space-y-3">
                            {question.options.map(option => {
                                const isChecked = selectedOptionId === option.id;
                                return (
                                    <label 
                                        key={option.id} 
                                        className={`flex items-center gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 select-none ${
                                            isChecked 
                                                ? 'bg-indigo-50/50 dark:bg-indigo-500/5 border-indigo-600 dark:border-indigo-500/60 text-slate-900 dark:text-white' 
                                                : 'bg-slate-50/30 dark:bg-slate-950/20 border-slate-205 dark:border-slate-805 hover:bg-slate-50 dark:hover:bg-slate-850/30 text-slate-700 dark:text-slate-350'
                                        }`}
                                    >
                                        <input 
                                            type="radio" 
                                            name="quiz-option" 
                                            value={option.id}
                                            checked={isChecked}
                                            onChange={() => setSelectedOptionId(option.id)}
                                            className="accent-indigo-600 h-4 w-4"
                                        />
                                        <span className="text-sm font-medium">{option.text}</span>
                                    </label>
                                );
                            })}
                        </div>

                        {/* Submit Actions */}
                        <button 
                            onClick={handleNext}
                            disabled={!selectedOptionId}
                            className="w-full bg-indigo-600 hover:bg-indigo-550 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-xl py-3.5 text-sm font-semibold transition-colors shadow-sm"
                        >
                            Submit Answer
                        </button>
                    </div>
                )
            ) : (
                /* Results Summary + Answer Review */
                results && (
                    <div className="space-y-6">

                        {/* Hero Result Card */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-sm flex flex-col items-center">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-5 ${
                                results.score >= 60 
                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                    : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}>
                                {results.score >= 60 ? <CheckCircle size={28} /> : <AlertCircle size={28} />}
                            </div>

                            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                                {results.score >= 60 ? 'Quiz Completed! 🎉' : 'Quiz Finished'}
                            </h2>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed max-w-sm">
                                Your answers have been checked. Here are your score details:
                            </p>

                            {/* Stats metrics grid */}
                            <div className="grid grid-cols-2 gap-4 w-full mt-8">
                                <div className="bg-slate-50 dark:bg-slate-955/40 border border-slate-100 dark:border-slate-805 p-4 rounded-2xl">
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Score</span>
                                    <h3 className={`text-xl font-black mt-1 ${results.score >= 60 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                        {results.score}%
                                    </h3>
                                    <span className="text-[10px] text-slate-400 block mt-0.5">{results.correctCount}/{results.totalQuestions} correct</span>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-955/40 border border-slate-100 dark:border-slate-805 p-4 rounded-2xl">
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">XP Reward</span>
                                    <h3 className="text-xl font-black text-amber-500 mt-1 flex items-center justify-center gap-1">
                                        <Award size={18} />
                                        <span>+{results.xpGained}</span>
                                    </h3>
                                    <span className="text-[10px] text-slate-400 block mt-0.5">Points earned</span>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-955/40 border border-slate-100 dark:border-slate-805 p-4 rounded-2xl">
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">My Score</span>
                                    <h3 className={`text-lg font-black mt-1 ${results.newSkill >= results.oldSkill ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-550'}`}>
                                        {results.oldSkill} ➔ {results.newSkill}
                                    </h3>
                                    <span className="text-[10px] text-slate-400 block mt-0.5">Score change</span>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-955/40 border border-slate-100 dark:border-slate-805 p-4 rounded-2xl">
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Daily Streak</span>
                                    <h3 className="text-xl font-black text-amber-500 mt-1 flex items-center justify-center gap-1">
                                        <Flame size={18} fill="currentColor" />
                                        <span>{results.newStreak}d</span>
                                    </h3>
                                    <span className="text-[10px] text-slate-400 block mt-0.5">Days in a row active</span>
                                </div>
                            </div>
                        </div>

                        {/* Achievements unlocked popup */}
                        {results.achievementsUnlocked && results.achievementsUnlocked.length > 0 && (
                            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-3">
                                <h4 className="text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles size={14} className="animate-pulse" />
                                    <span>Achievements Unlocked!</span>
                                </h4>
                                <div className="space-y-3">
                                    {results.achievementsUnlocked.map((ach, idx) => (
                                        <div key={idx} className="bg-white/80 dark:bg-slate-900 border border-amber-500/10 p-3.5 rounded-xl">
                                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">🏆 {ach.title}</p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">{ach.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Detailed Question Review Panels */}
                        {results.questionReview && results.questionReview.length > 0 && (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
                                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider text-slate-400 mb-2">
                                    📋 Review Answers
                                </h3>
                                
                                <div className="space-y-3">
                                    {results.questionReview.map((qr, idx) => (
                                        <div key={idx} className={`p-4 rounded-xl border ${
                                            qr.isCorrect 
                                                ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-900/20' 
                                                : 'bg-rose-50/20 dark:bg-rose-950/10 border-rose-200/50 dark:border-rose-900/20'
                                        }`}>
                                            <div className="flex gap-3 items-start">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                                    qr.isCorrect 
                                                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' 
                                                        : 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                                                }`}>
                                                    {qr.isCorrect ? <Check size={12} /> : <X size={12} />}
                                                </div>
                                                
                                                <div className="space-y-1 flex-1">
                                                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 text-left">
                                                        Q{idx + 1}: {qr.content}
                                                    </p>
                                                    {!qr.isCorrect && (
                                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium text-left">
                                                            ✓ Correct Choice: {qr.correctOptionText}
                                                        </p>
                                                    )}
                                                    <span className="inline-block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                                                        Difficulty: {qr.difficulty}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={onBack} 
                            className="w-full bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl py-3.5 text-sm font-semibold transition-colors"
                        >
                            Back to Course
                        </button>
                    </div>
                )
            )}
        </div>
    );
}
