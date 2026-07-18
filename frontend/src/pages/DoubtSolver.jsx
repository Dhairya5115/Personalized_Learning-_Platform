import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Send, HelpCircle, Bot, User, Sparkles, Trash2 } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// LaTeX & KaTeX Markdown parser to render formatted educational answers with LaTeX support
function parseMarkdownToHtml(text) {
    if (!text) return '';

    const mathPlaceholders = [];
    let processedText = text;

    // 1. Extract and render display math \[ ... \]
    processedText = processedText.replace(/\\\[([\s\S]*?)\\\]/g, (match, mathContent) => {
        try {
            const html = `<div class="my-4 overflow-x-auto flex justify-center w-full math-display">${katex.renderToString(mathContent.trim(), { displayMode: true, throwOnError: false })}</div>`;
            const index = mathPlaceholders.length;
            mathPlaceholders.push(html);
            return `__MATH_PLACEHOLDER_${index}__`;
        } catch (e) {
            console.error("KaTeX error: ", e);
            return match;
        }
    });

    // 2. Extract and render inline math \( ... \)
    processedText = processedText.replace(/\\\(([\s\S]*?)\\\)/g, (match, mathContent) => {
        try {
            const html = `<span class="math-inline">${katex.renderToString(mathContent.trim(), { displayMode: false, throwOnError: false })}</span>`;
            const index = mathPlaceholders.length;
            mathPlaceholders.push(html);
            return `__MATH_PLACEHOLDER_${index}__`;
        } catch (e) {
            console.error("KaTeX error: ", e);
            return match;
        }
    });

    // 3. Process normal markdown rules
    let html = processedText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Code blocks
    html = html.replace(/```(?:javascript|js|python|html|css)?([\s\S]*?)```/g, 
        '<pre class="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 p-4 rounded-xl overflow-x-auto my-3 font-mono text-xs text-indigo-600 dark:text-indigo-400"><code class="bg-transparent p-0">$1</code></pre>'
    );
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, 
        '<code class="bg-slate-100 dark:bg-slate-850 px-1.5 py-0.5 rounded text-xs font-mono text-indigo-600 dark:text-indigo-400">$1</code>'
    );
    
    // Headings
    html = html.replace(/^### (.*$)/gim, '<h4 class="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mt-4 mb-2">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 class="text-sm font-bold text-slate-800 dark:text-slate-200 mt-5 mb-2 pb-1 border-b border-slate-100 dark:border-slate-850">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 class="text-base font-extrabold text-slate-900 dark:text-white mt-6 mb-3">$1</h2>');
    
    // Bold text
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>');
    
    // Unordered lists
    html = html.replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc mb-1.5 text-left">$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li class="ml-4 list-disc mb-1.5 text-left">$1</li>');
    
    let linesProcessed = html.split('\n').map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('<h') || trimmed.startsWith('<li') || trimmed.startsWith('<pre') || trimmed.startsWith('</pre') || trimmed.startsWith('<code') || trimmed.startsWith('</code')) {
            return line;
        }
        return trimmed ? `<p class="mb-3 leading-relaxed text-left text-sm text-slate-700 dark:text-slate-300">${line}</p>` : '';
    }).join('\n');

    // 4. Put LaTeX HTML back
    for (let i = 0; i < mathPlaceholders.length; i++) {
        linesProcessed = linesProcessed.replace(`__MATH_PLACEHOLDER_${i}__`, () => mathPlaceholders[i]);
    }

    return linesProcessed;
}

function extractSuggestions(text) {
    if (!text) return { cleanText: '', suggestions: [] };
    const regex = /\[Suggestions:\s*(.*?)\s*\]/is;
    const match = text.match(regex);
    if (match) {
        const cleanText = text.replace(regex, '').trim();
        const suggestions = match[1].split('|').map(s => s.trim()).filter(Boolean);
        return { cleanText, suggestions };
    }
    return { cleanText: text, suggestions: [] };
}

export default function DoubtSolver({ context, onClearContext }) {
    const { user } = useAuth();
    const courseId = context?.courseId || null;
    const courseTitle = context?.courseTitle || null;
    const topicId = context?.topicId || null;
    const topicTitle = context?.topicTitle || null;

    const [messages, setMessages] = useState([]);
    const [inputQuery, setInputQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto-scroll chat to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    // Load persistent history on mount or when context changes
    useEffect(() => {
        const cacheKey = `doubt_history_${user?.id || 'guest'}_${courseId || 'general'}`;
        const saved = localStorage.getItem(cacheKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setMessages(parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
                return;
            } catch (e) {}
        }
        
        // Welcome message fallback if history is empty
        setMessages([
            {
                sender: 'bot',
                text: courseTitle 
                    ? `Hello! I am your AI Study Tutor for the course "${courseTitle}"${topicTitle ? ` (Topic: "${topicTitle}")` : ''}. Ask me any question related to this class!`
                    : `Hello! I am your AI Study Tutor. Ask me any question about your courses, or ask for examples and practice questions!`,
                timestamp: new Date(),
                suggestions: []
            }
        ]);
    }, [user?.id, courseId, topicId]);

    // Save messages to persistent history on update
    useEffect(() => {
        if (messages.length === 0) return;
        const cacheKey = `doubt_history_${user?.id || 'guest'}_${courseId || 'general'}`;
        localStorage.setItem(cacheKey, JSON.stringify(messages));
    }, [messages, user?.id, courseId]);

    const handleClearHistory = () => {
        if (window.confirm("Are you sure you want to clear the chat history for this session?")) {
            const cacheKey = `doubt_history_${user?.id || 'guest'}_${courseId || 'general'}`;
            localStorage.removeItem(cacheKey);
            setMessages([
                {
                    sender: 'bot',
                    text: courseTitle 
                        ? `Hello! I am your AI Study Tutor for the course "${courseTitle}"${topicTitle ? ` (Topic: "${topicTitle}")` : ''}. Ask me any question related to this class!`
                        : `Hello! I am your AI Study Tutor. Ask me any question about your courses, or ask for examples and practice questions!`,
                    timestamp: new Date(),
                    suggestions: []
                }
            ]);
        }
    };

    const sendQuery = async (queryText) => {
        if (!queryText.trim() || loading) return;

        const updatedMessages = [
            ...messages,
            { sender: 'user', text: queryText, timestamp: new Date() }
        ];
        setMessages(updatedMessages);
        setLoading(true);

        try {
            const data = await api.solveDoubt(queryText, courseId, topicId);
            const { cleanText, suggestions } = extractSuggestions(data.answer);
            
            setMessages([
                ...updatedMessages,
                { 
                    sender: 'bot', 
                    text: cleanText, 
                    timestamp: new Date(),
                    source: data.source,
                    suggestions: suggestions
                }
            ]);
        } catch (err) {
            setMessages([
                ...updatedMessages,
                { 
                    sender: 'bot', 
                    text: `Sorry, I had trouble answering your question: "${err.message}". Please check your internet and try again.`, 
                    timestamp: new Date(),
                    suggestions: []
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputQuery.trim() || loading) return;
        const queryText = inputQuery;
        setInputQuery('');
        sendQuery(queryText);
    };

    const triggerSuggestion = (suggestionText) => {
        sendQuery(suggestionText);
    };

    const lastMsg = messages[messages.length - 1];
    const showSuggestions = lastMsg && lastMsg.sender === 'bot' && lastMsg.suggestions && lastMsg.suggestions.length > 0 && !loading;

    return (
        <div className="flex flex-col h-[calc(100vh-60px)] max-w-5xl mx-auto overflow-hidden">
            {/* Chat Header */}
            <header className="h-20 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-8 shrink-0 rounded-t-2xl">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 dark:shadow-none">
                        <Bot size={24} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">AI Academic Tutor</h2>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                Online • Precision Mode Active
                            </span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={handleClearHistory}
                    className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-550 hover:text-rose-600 uppercase tracking-widest transition-colors"
                >
                    <Trash2 size={16} /> Clear Chat History
                </button>
            </header>

            {/* Context focus Banner */}
            {courseTitle && (
                <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-slate-200 dark:border-slate-800 px-8 py-3 flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-400 shrink-0">
                    <div className="flex items-center gap-2">
                        <Sparkles size={13} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
                        <span>
                            AI Tutor currently focused on: <strong className="font-bold">{courseTitle}</strong>
                            {topicTitle && <> &gt; <strong className="font-bold">{topicTitle}</strong></>}
                        </span>
                    </div>
                    <button 
                        onClick={onClearContext}
                        className="font-bold hover:underline text-indigo-600 dark:text-indigo-400"
                    >
                        Reset focus
                    </button>
                </div>
            )}

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar">
                {messages.map((msg, idx) => {
                    const isBot = msg.sender === 'bot';
                    return (
                        <div key={idx} className={`flex gap-4 ${isBot ? 'self-start' : 'flex-row-reverse ml-auto'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                                isBot ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                                {isBot ? <Bot size={20} /> : <User size={20} />}
                            </div>
                            <div className={`max-w-2xl ${isBot ? '' : 'text-right'}`}>
                                <div className={`p-6 rounded-2xl border ${
                                    isBot 
                                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm text-slate-800 dark:text-slate-200 text-left' 
                                        : 'bg-indigo-600 border-indigo-500 text-white text-left'
                                }`}>
                                    {isBot ? (
                                        <div 
                                            dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(msg.text) }} 
                                            className="prose dark:prose-invert max-w-none text-sm leading-relaxed"
                                        />
                                    ) : (
                                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                            {msg.text}
                                        </p>
                                    )}
                                </div>
                                <p className="mt-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                    {msg.timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                    {msg.source && ` • Saved Cache`}
                                </p>
                            </div>
                        </div>
                    );
                })}

                {loading && (
                    <div className="flex gap-4 self-start">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <Bot size={20} />
                        </div>
                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-indigo-600 dark:bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-indigo-600 dark:bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-indigo-600 dark:bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}

                {showSuggestions && (
                    <div className="flex flex-wrap gap-2 pt-2 pl-14 justify-start">
                        {lastMsg.suggestions.map((suggestion, sIdx) => (
                            <button
                                key={sIdx}
                                onClick={() => triggerSuggestion(suggestion)}
                                className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-350 transition-colors"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Area */}
            <footer className="p-8 bg-white dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <div className="max-w-5xl mx-auto">
                    <form onSubmit={handleSend} className="relative flex items-center">
                        <input 
                            type="text" 
                            placeholder={courseTitle ? `Ask AI Tutor about ${courseTitle}...` : "Ask a doubt about Calculus, Computer Architecture, or anything else..."}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-5 pl-6 pr-24 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm text-slate-900 dark:text-slate-100 placeholder-slate-400"
                            value={inputQuery}
                            onChange={(e) => setInputQuery(e.target.value)}
                            required
                            disabled={loading}
                        />
                        <div className="absolute right-4 flex items-center gap-2">
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all disabled:opacity-50"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </form>
                    <p className="mt-4 text-center text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                        AI can make mistakes. Verify critical facts.
                    </p>
                </div>
            </footer>
        </div>
    );
}

