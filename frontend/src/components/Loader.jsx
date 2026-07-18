import React, { useEffect } from 'react';

export default function Loader({ onFinished }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            if (onFinished) {
                onFinished();
            }
        }, 3000); // Exactly 3 seconds duration
        return () => clearTimeout(timer);
    }, [onFinished]);

    return (
        <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col items-center justify-center p-6 select-none overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex flex-col items-center space-y-6 relative max-w-sm w-full text-center">
                {/* SVG Logo Loader */}
                <div className="relative w-32 h-32 flex items-center justify-center">
                    {/* Glowing outer rotating SVG circle */}
                    <svg className="absolute inset-0 w-full h-full animate-spin [animation-duration:4s]" viewBox="0 0 100 100">
                        <circle 
                            cx="50" 
                            cy="50" 
                            r="44" 
                            stroke="url(#ringGrad)" 
                            strokeWidth="2.5" 
                            fill="transparent" 
                            strokeDasharray="90 120"
                            strokeLinecap="round"
                            className="opacity-75"
                        />
                    </svg>

                    {/* Logo: Centered SVG Book Open icon with dynamic scale & path animations */}
                    <div className="absolute w-20 h-20 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center shadow-lg shadow-indigo-500/5 group animate-pulse">
                        <svg 
                            className="w-10 h-10 text-indigo-400 drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        >
                            {/* Left page of the book */}
                            <path 
                                d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" 
                                className="animate-dash" 
                                style={{
                                    strokeDasharray: 50,
                                    strokeDashoffset: 50,
                                    animation: 'drawSvg 2.5s ease-out forwards'
                                }}
                            />
                            {/* Right page of the book */}
                            <path 
                                d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" 
                                className="animate-dash" 
                                style={{
                                    strokeDasharray: 50,
                                    strokeDashoffset: 50,
                                    animation: 'drawSvg 2.5s ease-out forwards'
                                }}
                            />
                        </svg>
                    </div>

                    {/* SVG Gradient definitions */}
                    <svg className="w-0 h-0">
                        <defs>
                            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="50%" stopColor="#8b5cf6" />
                                <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>

                {/* Brand Name & Description */}
                <div className="space-y-2 mt-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-700">
                    <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent drop-shadow-xs">
                        TailorLearn
                    </span>
                    <p className="text-[10px] font-bold tracking-widest text-indigo-400/80 uppercase">
                        Personalizing Your Learning Curve
                    </p>
                </div>

                {/* Sleek inline progress bar tracker */}
                <div className="w-40 h-[2px] bg-slate-900 rounded-full overflow-hidden mt-6">
                    <div 
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full" 
                        style={{
                            width: '100%',
                            animation: 'expandProgress 3s linear forwards'
                        }}
                    />
                </div>

                {/* Inline keyframe animations */}
                <style dangerouslySetInnerHTML={{__html: `
                    @keyframes drawSvg {
                        to {
                            stroke-dashoffset: 0;
                        }
                    }
                    @keyframes expandProgress {
                        from { width: 0%; }
                        to { width: 100%; }
                    }
                `}} />
            </div>
        </div>
    );
}
