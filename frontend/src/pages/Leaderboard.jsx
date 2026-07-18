import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Award, Flame, Users, RefreshCw, Crown, Trophy, Sparkles } from 'lucide-react';

export default function Leaderboard() {
    const [standings, setStandings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLeaderboard();
    }, []);

    async function loadLeaderboard() {
        setLoading(true);
        try {
            const data = await api.getLeaderboard();
            setStandings(data);
        } catch (err) {
            console.error('Error fetching leaderboard:', err.message);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mb-4" />
                <span>Loading leaderboard ranks...</span>
            </div>
        );
    }

    // Slice top 3 for podium
    const top3 = standings.slice(0, 3);
    const rest = standings.slice(3);

    // Reorder top 3 for podium layout: [2nd, 1st, 3rd]
    const podiumOrder = [];
    if (top3[1]) podiumOrder.push({ ...top3[1], rank: 2 });
    if (top3[0]) podiumOrder.push({ ...top3[0], rank: 1 });
    if (top3[2]) podiumOrder.push({ ...top3[2], rank: 3 });

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Class Leaderboard
                    </h1>
                    <p className="mt-2 text-base text-slate-500 dark:text-slate-400">
                        See who has the most points! Earn points by completing quizzes and flashcards.
                    </p>
                </div>
                <button 
                    onClick={loadLeaderboard} 
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-355 border border-slate-200/50 dark:border-slate-800/80 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors shadow-xs"
                >
                    <RefreshCw size={12} />
                    <span>Refresh</span>
                </button>
            </div>

            {standings.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                    No students on the leaderboard yet. Complete a quiz to be the first one!
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Duolingo Podium */}
                    {top3.length > 0 && (
                        <div className="flex flex-col items-center justify-center pt-8 pb-4">
                            <div className="flex items-end justify-center gap-4 sm:gap-8 max-w-lg w-full px-4">
                                {podiumOrder.map((student) => {
                                    const isFirst = student.rank === 1;
                                    const isSecond = student.rank === 2;
                                    
                                    // Height and colors for the columns
                                    let columnHeight = 'h-32 sm:h-36';
                                    let columnBg = 'bg-slate-100 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-800/40';
                                    let textGradient = 'from-slate-700 to-slate-900 dark:from-slate-350 dark:to-slate-150';
                                    
                                    if (isFirst) {
                                        columnHeight = 'h-40 sm:h-48';
                                        columnBg = 'bg-gradient-to-t from-amber-500/20 to-amber-500/5 dark:from-amber-500/10 dark:to-amber-500/0 border border-amber-500/30 dark:border-amber-500/15 shadow-sm';
                                        textGradient = 'from-amber-600 to-yellow-500';
                                    } else if (isSecond) {
                                        columnHeight = 'h-32 sm:h-38';
                                        columnBg = 'bg-gradient-to-t from-slate-500/10 to-slate-500/0 border border-slate-400/20 dark:border-slate-500/5';
                                    }

                                    return (
                                        <div key={student.id} className="flex-1 flex flex-col items-center select-none">
                                            {/* Avatar / Icon crown */}
                                            <div className="relative mb-3 flex flex-col items-center">
                                                {isFirst && (
                                                    <Crown size={22} className="text-amber-500 fill-amber-500 animate-bounce absolute -top-5" />
                                                )}
                                                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-bold text-base shadow-sm ${
                                                    isFirst 
                                                        ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-2 ring-amber-400' 
                                                        : isSecond
                                                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-2 ring-slate-300 dark:ring-slate-700'
                                                            : 'bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-2 ring-orange-300 dark:ring-orange-800/40'
                                                }`}>
                                                    {student.first_name[0]}{student.last_name[0]}
                                                </div>
                                                <div className="absolute -bottom-2 bg-slate-850 text-white dark:bg-slate-950 dark:text-slate-100 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                                    {student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : '🥉'}
                                                </div>
                                            </div>

                                            {/* Name */}
                                            <div className="text-center mb-2 mt-1">
                                                <p className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate max-w-[80px] sm:max-w-[120px]">
                                                    {student.first_name}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                                    {student.xp_points} XP
                                                </p>
                                            </div>

                                            {/* Pedestal block */}
                                            <div className={`w-full ${columnHeight} ${columnBg} rounded-t-2xl flex flex-col justify-end items-center pb-4`}>
                                                <span className={`font-black text-2xl bg-gradient-to-r ${textGradient} bg-clip-text text-transparent`}>
                                                    #{student.rank}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Standard ranks List */}
                    {rest.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 text-xs uppercase tracking-wider text-slate-400">
                                Runners Up
                            </h3>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {rest.map((student, index) => {
                                    const rank = index + 4;
                                    return (
                                        <div key={student.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                                            <div className="flex items-center gap-4">
                                                <span className="font-bold text-slate-400 dark:text-slate-500 text-sm w-6">
                                                    #{rank}
                                                </span>
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300">
                                                    {student.first_name[0]}{student.last_name[0]}
                                                </div>
                                                <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                                                    {student.first_name} {student.last_name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1 text-amber-500 font-semibold text-xs">
                                                    <Flame size={12} fill="currentColor" />
                                                    <span>{student.streak_count || 0}d</span>
                                                </div>
                                                <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                                                    {student.xp_points} XP
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
