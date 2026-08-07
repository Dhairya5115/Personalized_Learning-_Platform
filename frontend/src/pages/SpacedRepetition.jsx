import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { BookOpen, Star, RefreshCw, Layers, CheckCircle2, ChevronRight, FileText, Play } from 'lucide-react';

export default function SpacedRepetition() {
    const [reviews, setReviews] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isFlipped, setIsFlipped] = useState(false);
    const [submittingRating, setSubmittingRating] = useState(false);

    useEffect(() => {
        loadOverdueReviews();
    }, []);

    async function loadOverdueReviews() {
        setLoading(true);
        try {
            const list = await api.getOverdueReviews();
            setReviews(list);
            setCurrentIndex(0);
            setIsFlipped(false);
        } catch (err) {
            console.error('Error fetching cards due:', err.message);
        } finally {
            setLoading(false);
        }
    }

    const handleRatingSubmit = async (ratingValue) => {
        if (submittingRating) return;
        setSubmittingRating(true);

        const currentCard = reviews[currentIndex];
        try {
            const result = await api.submitReview(currentCard.material_id, ratingValue);
            
            if (result.xpGained > 0) {
                if (window.showToast) {
                    window.showToast(`Perfect Recall! Earned +${result.xpGained} XP!`, 'success');
                }
            }

            // Remove reviewed card from the active queue
            const updated = [...reviews];
            updated.splice(currentIndex, 1);
            setReviews(updated);
            
            if (currentIndex >= updated.length) {
                setCurrentIndex(0);
            }
            setIsFlipped(false);
        } catch (err) {
            if (window.showToast) {
                window.showToast('Failed to submit recall rating. Please try again.', 'error');
            }
        } finally {
            setSubmittingRating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mb-4" />
                <span>Loading spaced repetition cards...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-2xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Flashcard Memory Deck
                </h1>
                <p className="mt-2 text-base text-slate-500 dark:text-slate-400">
                    Review bookmarked flashcards to test your memory and learn concepts better.
                </p>
            </div>

            {reviews.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center shadow-sm">
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-4">
                        <CheckCircle2 size={24} />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg mb-2">Review Queue Cleared!</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-sm">
                        Great job! You have reviewed all your flashcards for today.
                    </p>
                    <button 
                        onClick={loadOverdueReviews} 
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-755 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-xs font-semibold transition-colors"
                    >
                        <RefreshCw size={12} />
                        <span>Check Again</span>
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Progress details */}
                    <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 font-semibold">
                        <span>Due today: {reviews.length} cards</span>
                        <span>Card {currentIndex + 1} of {reviews.length}</span>
                    </div>

                    {/* Interactive Flashcard */}
                    <div 
                        onClick={() => setIsFlipped(!isFlipped)}
                        className="min-h-[280px] bg-white dark:bg-slate-900 border-2 border-indigo-600/20 hover:border-indigo-600/40 dark:border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group select-none"
                    >
                        {/* Flip hint */}
                        <div className="absolute right-4 top-4 text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-850 px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-800/50">
                            Click to flip
                        </div>

                        {!isFlipped ? (
                            /* Front Side */
                            <div className="space-y-4">
                                <span className="inline-block bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold px-2.5 py-1 rounded-xl uppercase tracking-wider">
                                    {reviews[currentIndex].topic_title}
                                </span>
                                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white max-w-md leading-snug">
                                    {reviews[currentIndex].material_title}
                                </h2>
                                <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5 pt-2">
                                    <RefreshCw size={12} className="animate-spin" style={{ animationDuration: '6s' }} />
                                    <span>Click to reveal details</span>
                                </p>
                            </div>
                        ) : (
                            /* Back Side */
                            <div className="space-y-4 w-full">
                                <span className="inline-block bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-xl uppercase tracking-wider">
                                    Recall Solution
                                </span>
                                <div className="space-y-3 py-2">
                                    <p className="text-sm text-slate-550 dark:text-slate-400">
                                        Type: <strong className="text-slate-800 dark:text-slate-200">{reviews[currentIndex].material_type}</strong>
                                    </p>
                                    <p className="text-xs text-slate-400 truncate max-w-sm mx-auto">
                                        Reference URL: <a href={reviews[currentIndex].file_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">{reviews[currentIndex].file_url}</a>
                                    </p>
                                </div>
                                <p className="text-xs text-slate-400">
                                    Rate how well you remembered this card to decide when to review it next.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Ratings selection */}
                    {isFlipped && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-805 rounded-2xl p-5 shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-center mb-4">
                                How well did you remember this card?
                            </h4>
                            
                            <div className="flex justify-center gap-3">
                                {[0, 1, 2, 3, 4, 5].map((val) => (
                                    <button 
                                        key={val} 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRatingSubmit(val);
                                        }}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border transition-colors shadow-xs ${
                                            val >= 3 
                                                ? 'bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-500/5 dark:hover:bg-emerald-500/15 border-emerald-250 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                                                : 'bg-rose-50/50 hover:bg-rose-100 dark:bg-rose-500/5 dark:hover:bg-rose-500/15 border-rose-250 dark:border-rose-500/20 text-rose-700 dark:text-rose-450'
                                        }`}
                                        disabled={submittingRating}
                                    >
                                        {val}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-4 px-1.5">
                                <span>0 = Forgot completely</span>
                                <span>5 = Remembered perfectly</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
