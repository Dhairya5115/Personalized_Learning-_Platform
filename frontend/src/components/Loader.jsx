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
        <div className="fixed inset-0 z-[99999] bg-[#ffffff] dark:bg-[#001e22] flex flex-col items-center justify-center p-6 select-none overflow-hidden transition-colors duration-200">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#04c5e7]/5 dark:bg-[#04c5e7]/10 rounded-full blur-[140px] pointer-events-none animate-pulse" />

            <div className="flex flex-col items-center space-y-6 relative max-w-sm w-full text-center">
                {/* SVG Logo Loader */}
                <div className="relative w-32 h-32 flex items-center justify-center">
                    {/* Glowing outer rotating SVG circle */}
                    <svg className="absolute inset-0 w-full h-full animate-spin [animation-duration:3s]" viewBox="0 0 100 100">
                        <circle 
                            cx="50" 
                            cy="50" 
                            r="44" 
                            stroke="#04c5e7" 
                            strokeWidth="3" 
                            fill="transparent" 
                            strokeDasharray="90 120"
                            strokeLinecap="round"
                            className="opacity-90"
                        />
                    </svg>

                    {/* Logo: Centered SVG Book Open icon with dynamic scale & path animations */}
                    <div className="absolute w-20 h-20 rounded-2xl bg-[#f9f8f6] dark:bg-[#002b31] border border-[#e1ddd1] dark:border-[#004d57] flex items-center justify-center shadow-md">
                        <svg 
                            className="w-10 h-10 text-[#00262b] dark:text-[#04c5e7]" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2.5" 
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
                </div>

                {/* Brand Name & Description */}
                <div className="space-y-2 mt-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-700">
                    <span className="font-extrabold text-3xl tracking-tight text-[#00262b] dark:text-[#f9f8f6]">
                        TailorLearn
                    </span>
                    <p className="text-xs font-bold tracking-widest text-[#52716c] dark:text-[#a5b6b1] uppercase">
                        Personalizing Your Learning Curve
                    </p>
                </div>

                {/* Sleek inline progress bar tracker */}
                <div className="w-40 h-[3px] bg-[#edebe3] dark:bg-[#003840] rounded-full overflow-hidden mt-6">
                    <div 
                        className="h-full bg-[#04c5e7] rounded-full" 
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
