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
            <div className="flex flex-col items-center justify-center py-20 text-[#52716c]">
                <div className="w-8 h-8 rounded-full border-3 border-[#00262b] border-t-transparent animate-spin mb-4" />
                <span className="font-semibold text-sm">Loading spaced repetition cards...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-2xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#00262b]">
                    Flashcard Memory Deck
                </h1>
                <p className="mt-2 text-sm font-medium text-[#52716c]">
                    Review bookmarked flashcards to test your memory and learn concepts better.
                </p>
            </div>

            {reviews.length === 0 ? (
                <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-10 text-center flex flex-col items-center justify-center shadow-sm">
                    <div className="w-12 h-12 bg-[#00262b] text-[#04c5e7] rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                        <CheckCircle2 size={24} />
                    </div>
                    <h3 className="font-extrabold text-[#00262b] text-lg mb-2">Review Queue Cleared!</h3>
                    <p className="text-[#52716c] text-sm mb-6 max-w-sm">
                        Great job! You have reviewed all your flashcards for today.
                    </p>
                    <button 
                        onClick={loadOverdueReviews} 
                        className="btn-ghost !text-xs !py-2 !px-4 inline-flex items-center gap-2"
                    >
                        <RefreshCw size={14} />
                        <span>Check Again</span>
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Progress details */}
                    <div className="flex items-center justify-between text-xs text-[#52716c] font-bold">
                        <span>Due today: {reviews.length} cards</span>
                        <span>Card {currentIndex + 1} of {reviews.length}</span>
                    </div>

                    {/* Interactive Flashcard */}
                    <div 
                        onClick={() => setIsFlipped(!isFlipped)}
                        className="min-h-[280px] bg-[#ffffff] border-2 border-[#edebe3] hover:border-[#04c5e7] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group select-none"
                    >
                        {/* Flip hint */}
                        <div className="absolute right-4 top-4 text-[10px] uppercase font-bold tracking-wider text-[#52716c] bg-[#f9f8f6] px-2.5 py-1 rounded-[94px] border border-[#edebe3]">
                            Click to flip
                        </div>

                        {!isFlipped ? (
                            /* Front Side */
                            <div className="space-y-4">
                                <span className="inline-block bg-[#f3f1ed] text-[#00262b] border border-[#e1ddd1] text-[10px] font-bold px-3 py-1 rounded-[94px] uppercase tracking-wider">
                                    {reviews[currentIndex].topic_title}
                                </span>
                                <h2 className="text-xl sm:text-2xl font-extrabold text-[#00262b] max-w-md leading-snug">
                                    {reviews[currentIndex].material_title}
                                </h2>
                                <p className="text-xs text-[#52716c] flex items-center justify-center gap-1.5 pt-2">
                                    <RefreshCw size={12} className="animate-spin" style={{ animationDuration: '6s' }} />
                                    <span>Click to reveal details</span>
                                </p>
                            </div>
                        ) : (
                            /* Back Side */
                            <div className="space-y-4 w-full">
                                <span className="inline-block bg-[#00262b] text-[#04c5e7] text-[10px] font-bold px-3 py-1 rounded-[94px] uppercase tracking-wider">
                                    Recall Solution
                                </span>
                                <div className="space-y-3 py-2">
                                    <p className="text-sm text-[#52716c]">
                                        Type: <strong className="text-[#00262b] font-bold">{reviews[currentIndex].material_type}</strong>
                                    </p>
                                    <p className="text-xs text-[#52716c] truncate max-w-sm mx-auto">
                                        Reference URL: <a href={reviews[currentIndex].file_url} target="_blank" rel="noopener noreferrer" className="text-[#04c5e7] font-bold hover:underline">{reviews[currentIndex].file_url}</a>
                                    </p>
                                </div>
                                <p className="text-xs text-[#52716c]">
                                    Rate how well you remembered this card to decide when to review it next.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Ratings selection */}
                    {isFlipped && (
                        <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[#52716c] text-center mb-4">
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
                                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-sm border transition-colors shadow-sm ${
                                            val >= 3 
                                                ? 'bg-[#f3f1ed] hover:bg-[#00262b] hover:text-[#04c5e7] border-[#04c5e7] text-[#00262b]' 
                                                : 'bg-[#f3f1ed] hover:bg-[#d64000] hover:text-white border-[#d64000]/40 text-[#d64000]'
                                        }`}
                                        disabled={submittingRating}
                                    >
                                        {val}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex justify-between items-center text-[10px] text-[#52716c] font-semibold mt-4 px-1.5">
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
