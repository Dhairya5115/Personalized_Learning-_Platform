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
            <div className="flex flex-col items-center justify-center py-20 text-[#52716c]">
                <div className="w-8 h-8 rounded-full border-3 border-[#00262b] border-t-transparent animate-spin mb-4" />
                <span className="font-semibold text-sm">Loading leaderboard ranks...</span>
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
            {/* Distinct Energetic Championship Header */}
            <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-indigo-600/15 dark:from-amber-500/20 dark:via-purple-900/40 dark:to-indigo-950/50 border border-amber-300/40 dark:border-amber-500/30 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/25 ring-4 ring-amber-300/30 shrink-0">
                            <Trophy size={28} className="drop-shadow" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-800 dark:text-amber-300 border border-amber-400/30">
                                    <Sparkles size={11} /> Season Arena
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-slate-50 mt-1">
                                Hall of Fame
                            </h1>
                            <p className="mt-1 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 max-w-xl">
                                Outscore peers across adaptive practice quizzes and flashcard reviews to climb the championship podium.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={loadLeaderboard} 
                        className="self-start sm:self-center px-4 py-2.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-2 bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-400 hover:shadow-sm"
                    >
                        <RefreshCw size={14} className="text-amber-500" />
                        <span>Refresh Ranks</span>
                    </button>
                </div>
            </div>

            {standings.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-slate-500 dark:text-slate-400 text-sm shadow-sm">
                    No students on the leaderboard yet. Complete a quiz to claim rank #1!
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Championship Podium */}
                    {top3.length > 0 && (
                        <div className="flex flex-col items-center justify-center pt-8 pb-4">
                            <div className="flex items-end justify-center gap-3 sm:gap-6 md:gap-8 max-w-xl w-full px-2">
                                {podiumOrder.map((student) => {
                                    const isFirst = student.rank === 1;
                                    const isSecond = student.rank === 2;
                                    const isThird = student.rank === 3;
                                    
                                    // Height and energetic theme styles per rank
                                    let columnHeight = 'h-32 sm:h-38';
                                    let columnBg = 'bg-gradient-to-t from-amber-700/20 via-orange-600/10 to-transparent border-t-2 border-x-2 border-orange-400/70 dark:border-orange-500/60 shadow-[0_-4px_16px_rgba(234,88,12,0.15)]';
                                    let ringStyle = 'ring-4 ring-orange-500/50 shadow-md bg-gradient-to-br from-amber-700 to-orange-700 text-white';
                                    let badgeBg = 'bg-gradient-to-r from-orange-600 to-amber-700 text-white';
                                    let rankColor = 'text-orange-600 dark:text-orange-400';
                                    let rankLabel = '🥉 Bronze';
                                    
                                    if (isFirst) {
                                        columnHeight = 'h-44 sm:h-52';
                                        columnBg = 'bg-gradient-to-t from-amber-500/25 via-amber-400/15 to-transparent border-t-4 border-x-2 border-amber-400 shadow-[0_-6px_25px_rgba(245,158,11,0.25)]';
                                        ringStyle = 'ring-4 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.4)] bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950';
                                        badgeBg = 'bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-black';
                                        rankColor = 'text-amber-500 dark:text-amber-400';
                                        rankLabel = '👑 Champion';
                                    } else if (isSecond) {
                                        columnHeight = 'h-36 sm:h-42';
                                        columnBg = 'bg-gradient-to-t from-slate-400/20 via-slate-300/10 to-transparent border-t-2 border-x-2 border-slate-300 dark:border-slate-500 shadow-[0_-4px_16px_rgba(148,163,184,0.15)]';
                                        ringStyle = 'ring-4 ring-slate-300 dark:ring-slate-500 shadow-md bg-gradient-to-br from-slate-200 to-slate-400 dark:from-slate-600 dark:to-slate-800 text-slate-900 dark:text-white';
                                        badgeBg = 'bg-gradient-to-r from-slate-400 to-slate-600 text-white';
                                        rankColor = 'text-slate-600 dark:text-slate-300';
                                        rankLabel = '🥈 Silver';
                                    }

                                    return (
                                        <div key={student.id} className="flex-1 flex flex-col items-center select-none">
                                            {/* Avatar with energetic badge */}
                                            <div className="relative mb-3 flex flex-col items-center">
                                                {isFirst && (
                                                    <Crown size={26} className="text-amber-400 fill-amber-400 animate-bounce absolute -top-6 drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]" />
                                                )}
                                                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-black text-base sm:text-lg transition-transform hover:scale-105 ${ringStyle}`}>
                                                    {student.first_name[0]}{student.last_name[0]}
                                                </div>
                                                <div className={`absolute -bottom-2.5 ${badgeBg} text-[10px] font-black px-2 py-0.5 rounded-full shadow-md whitespace-nowrap`}>
                                                    {student.rank === 1 ? '🥇 #1' : student.rank === 2 ? '🥈 #2' : '🥉 #3'}
                                                </div>
                                            </div>

                                            {/* Student Details */}
                                            <div className="text-center mb-2 mt-2">
                                                <p className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate max-w-[85px] sm:max-w-[130px]">
                                                    {student.first_name} {student.last_name ? student.last_name[0] + '.' : ''}
                                                </p>
                                                <p className="text-[11px] font-black text-amber-600 dark:text-amber-400 mt-0.5">
                                                    {student.xp_points} XP
                                                </p>
                                            </div>

                                            {/* Pedestal column */}
                                            <div className={`w-full ${columnHeight} ${columnBg} rounded-t-2xl flex flex-col justify-end items-center pb-4`}>
                                                <span className={`font-black text-2xl sm:text-3xl ${rankColor}`}>
                                                    #{student.rank}
                                                </span>
                                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
                                                    {isFirst ? 'GOLD' : isSecond ? 'SILVER' : 'BRONZE'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Standard Ranks List (Runners-Up) */}
                    {rest.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2">
                                    <Sparkles size={16} className="text-amber-500" />
                                    <span>Top Contenders</span>
                                </h3>
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    {rest.length} Climbers
                                </span>
                            </div>

                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {rest.map((student, index) => {
                                    const rank = index + 4;
                                    return (
                                        <div key={student.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 px-3 rounded-2xl transition-colors">
                                            <div className="flex items-center gap-4">
                                                <span className="font-black text-slate-400 dark:text-slate-500 text-sm w-7 text-center">
                                                    #{rank}
                                                </span>
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-950/60 dark:to-purple-900/40 border border-indigo-200/60 dark:border-indigo-800/50 flex items-center justify-center font-black text-xs text-indigo-700 dark:text-indigo-300 shadow-xs">
                                                    {student.first_name[0]}{student.last_name[0]}
                                                </div>
                                                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                                    {student.first_name} {student.last_name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 sm:gap-5">
                                                <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-extrabold text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 px-2.5 py-1 rounded-full">
                                                    <Flame size={14} className="text-orange-500 fill-orange-500" />
                                                    <span>{student.streak_days || 0}d</span>
                                                </div>
                                                <span className="font-black text-xs sm:text-sm text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 px-3.5 py-1 rounded-full shadow-xs">
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
