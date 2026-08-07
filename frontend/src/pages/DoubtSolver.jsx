import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
    Send, HelpCircle, Bot, User, Sparkles, Trash2, 
    Users, Calendar, Video, Clock, CheckCircle, AlertCircle, Plus 
} from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import ConfirmModal from '../components/ConfirmModal';

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

    // Solver Mode: 'AI' (default) or 'HUMAN'
    const [solverMode, setSolverMode] = useState('AI');

    // AI Solver State
    const [messages, setMessages] = useState([]);
    const [inputQuery, setInputQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Human TA State
    const [availableTas, setAvailableTas] = useState([]);
    const [taRequests, setTaRequests] = useState([]);
    const [loadingTa, setLoadingTa] = useState(false);
    const [selectedTa, setSelectedTa] = useState(null);
    const [requestSubject, setRequestSubject] = useState('');
    const [requestDescription, setRequestDescription] = useState('');
    const [requestModalOpen, setRequestModalOpen] = useState(false);
    const [requestFilter, setRequestFilter] = useState('ALL');

    // Auto-scroll chat to bottom
    useEffect(() => {
        if (solverMode === 'AI') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, loading, solverMode]);

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

    // Fetch Human TA data when switching to HUMAN mode
    useEffect(() => {
        if (solverMode === 'HUMAN') {
            fetchHumanTaData();
        }
    }, [solverMode]);

    const fetchHumanTaData = async () => {
        setLoadingTa(true);
        try {
            const [tas, reqs] = await Promise.all([
                api.getAvailableTasForStudent(),
                api.getStudentTaRequests()
            ]);
            setAvailableTas(tas || []);
            setTaRequests(reqs || []);
        } catch (err) {
            console.error('Error fetching Human TA data:', err);
        } finally {
            setLoadingTa(false);
        }
    };

    // Save messages to persistent history on update
    useEffect(() => {
        if (messages.length === 0) return;
        const cacheKey = `doubt_history_${user?.id || 'guest'}_${courseId || 'general'}`;
        localStorage.setItem(cacheKey, JSON.stringify(messages));
    }, [messages, user?.id, courseId]);

    const [showClearModal, setShowClearModal] = useState(false);

    const handleClearHistoryConfirm = () => {
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
        setShowClearModal(false);
        if (window.showToast) window.showToast('Chat history cleared!', 'success');
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

    const handleTaRequestSubmit = async (e) => {
        e.preventDefault();
        if (!selectedTa) return;
        setSubmittingRequest(true);

        try {
            await api.createTaDoubtRequest(
                selectedTa.ta_id,
                selectedTa.course_id,
                requestSubject,
                requestDescription
            );
            if (window.showToast) window.showToast('Doubt request sent to TA successfully!', 'success');
            setRequestModalOpen(false);
            setSelectedTa(null);
            setRequestSubject('');
            setRequestDescription('');
            fetchHumanTaData();
        } catch (err) {
            if (window.showToast) window.showToast(err.message || 'Failed to submit request', 'error');
        } finally {
            setSubmittingRequest(false);
        }
    };

    const lastMsg = messages[messages.length - 1];
    const showSuggestions = lastMsg && lastMsg.sender === 'bot' && lastMsg.suggestions && lastMsg.suggestions.length > 0 && !loading;

    return (
        <div className="flex flex-col h-[calc(100vh-60px)] max-w-5xl mx-auto overflow-hidden">
            <ConfirmModal
                isOpen={showClearModal}
                title="Clear Chat History?"
                message="Are you sure you want to clear the entire chat history for this session? This action cannot be undone."
                confirmText="Clear History"
                cancelText="Cancel"
                confirmVariant="danger"
                onConfirm={handleClearHistoryConfirm}
                onCancel={() => setShowClearModal(false)}
            />

            {/* Top Toggle Header */}
            <header className="h-20 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-8 shrink-0 rounded-t-2xl">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-colors ${
                        solverMode === 'AI' ? 'bg-indigo-600 shadow-indigo-100 dark:shadow-none' : 'bg-emerald-600 shadow-emerald-100 dark:shadow-none'
                    }`}>
                        {solverMode === 'AI' ? <Bot size={24} /> : <Users size={24} />}
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {solverMode === 'AI' ? 'AI Academic Tutor' : 'Human Teaching Assistants'}
                        </h2>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${solverMode === 'AI' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                {solverMode === 'AI' ? 'Instant 24/7 AI Assistance' : '1-on-1 Virtual TA Sessions'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Header Actions */}
                <div className="flex items-center gap-3">
                    {solverMode === 'AI' && (
                        <button
                            onClick={() => setShowClearModal(true)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                            title="Clear Chat History"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}

                    {/* Mode Selector Switch */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setSolverMode('AI')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                solverMode === 'AI'
                                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <Bot size={14} /> AI Doubt Solver
                        </button>
                        <button
                            onClick={() => setSolverMode('HUMAN')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                solverMode === 'HUMAN'
                                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <Users size={14} /> Human TA
                        </button>
                    </div>
                </div>
            </header>

            {/* ==================== AI SOLVER MODE ==================== */}
            {solverMode === 'AI' && (
                <>
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
                                            {(() => {
                                                try {
                                                    const d = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp || Date.now());
                                                    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                                                } catch (e) {
                                                    return '';
                                                }
                                            })()}
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
                            <div className="mt-3 flex items-center justify-between px-2">
                                <button 
                                    type="button"
                                    onClick={() => setShowClearModal(true)}
                                    className="text-[10px] font-bold text-slate-400 hover:text-rose-600 uppercase tracking-widest transition-colors flex items-center gap-1"
                                >
                                    <Trash2 size={12} /> Clear Chat
                                </button>
                                <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                                    AI can make mistakes. Verify critical facts.
                                </p>
                            </div>
                        </div>
                    </footer>
                </>
            )}

            {/* ==================== HUMAN TA MODE ==================== */}
            {solverMode === 'HUMAN' && (
                <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar bg-slate-50/50 dark:bg-slate-950/40">
                    {loadingTa ? (
                        <div className="flex items-center justify-center min-h-[300px]">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
                        </div>
                    ) : (
                        <>
                            {/* Section 1: Available Assigned TAs */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Users size={20} className="text-emerald-600" />
                                            Available Course TAs
                                        </h3>
                                        <p className="text-xs text-slate-500">TAs assigned to assist in your enrolled courses.</p>
                                    </div>
                                </div>

                                {availableTas.length === 0 ? (
                                    <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-sm">
                                        No TAs currently assigned to your enrolled courses. Ask your instructor to assign a TA!
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {availableTas.map((ta, idx) => (
                                            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-200 dark:border-emerald-800">
                                                        {ta.first_name[0]}{ta.last_name[0]}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                                            {ta.first_name} {ta.last_name}
                                                        </h4>
                                                        <p className="text-xs text-slate-500">Course: {ta.course_title}</p>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        setSelectedTa(ta);
                                                        setRequestModalOpen(true);
                                                    }}
                                                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                                                >
                                                    <Plus size={14} /> Request Session
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Section 2: Student TA Doubt Request History */}
                            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Clock size={20} className="text-indigo-600" />
                                        My TA Request History
                                    </h3>

                                    {/* Filter Controls (Requirement 5) */}
                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                                        {[
                                            { id: 'ALL', label: 'All', count: taRequests.length },
                                            { id: 'PENDING', label: 'Pending', count: taRequests.filter(r => r.status === 'PENDING').length },
                                            { id: 'SCHEDULED', label: 'Scheduled', count: taRequests.filter(r => r.status === 'SCHEDULED').length },
                                            { id: 'RESOLVED', label: 'Resolved', count: taRequests.filter(r => r.status === 'RESOLVED').length }
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setRequestFilter(tab.id)}
                                                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                                    requestFilter === tab.id
                                                        ? 'bg-indigo-600 text-white shadow-xs'
                                                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                }`}
                                            >
                                                <span>{tab.label}</span>
                                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                                    requestFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                }`}>
                                                    {tab.count}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {taRequests.filter(req => requestFilter === 'ALL' || req.status === requestFilter).length === 0 ? (
                                    <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-sm">
                                        No {requestFilter !== 'ALL' ? requestFilter.toLowerCase() : ''} TA requests found.
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {taRequests
                                            .filter(req => requestFilter === 'ALL' || req.status === requestFilter)
                                            .map(req => (
                                                <div key={req.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                                        <div>
                                                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                                                Course: {req.course_title}
                                                            </span>
                                                            <h4 className="font-bold text-slate-900 dark:text-white text-base">
                                                                {req.subject}
                                                            </h4>
                                                            <p className="text-xs text-slate-400">
                                                                Assigned TA: {req.ta_first_name} {req.ta_last_name} ({req.ta_email})
                                                            </p>
                                                        </div>

                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider self-start md:self-auto ${
                                                            req.status === 'SCHEDULED'
                                                                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                                                                : req.status === 'RESOLVED'
                                                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                                    : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                                                        }`}>
                                                            {req.status}
                                                        </span>
                                                    </div>

                                                    <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                                        {req.description}
                                                    </p>

                                                    {/* Requirement 6: Meeting link shown ONLY when SCHEDULED */}
                                                    {req.meeting_link && req.status === 'SCHEDULED' && (
                                                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl space-y-2">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                                <div>
                                                                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">
                                                                        📅 Scheduled Meeting: {(() => {
                                                                            try {
                                                                                return new Date(req.scheduled_at).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });
                                                                            } catch (e) {
                                                                                return String(req.scheduled_at);
                                                                            }
                                                                        })()}
                                                                    </span>
                                                                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                                                                        A calendar invitation (<code>.ics</code>) was sent to your email.
                                                                    </span>
                                                                </div>
                                                                <a 
                                                                    href={req.meeting_link} 
                                                                    target="_blank" 
                                                                    rel="noreferrer" 
                                                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
                                                                >
                                                                    <Video size={14} /> Join Meeting
                                                                </a>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {req.status === 'RESOLVED' && (
                                                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs flex items-center justify-between">
                                                            <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                                                                <CheckCircle size={14} /> Session Resolved
                                                            </span>
                                                            {req.scheduled_at && (
                                                                <span className="text-[11px] text-slate-400">
                                                                    Completed: {new Date(req.scheduled_at).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Student Request Modal */}
            {requestModalOpen && selectedTa && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Request TA Session
                                </h3>
                                <p className="text-xs text-slate-400">
                                    TA: {selectedTa.first_name} {selectedTa.last_name} ({selectedTa.course_title})
                                </p>
                            </div>
                            <button 
                                onClick={() => setRequestModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleTaRequestSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Subject / Topic *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Graph Algorithms, Binary Trees, Assignment 2 Help"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500"
                                    value={requestSubject}
                                    onChange={(e) => setRequestSubject(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Detailed Question Description *
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="Describe your doubt or problem in detail..."
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500"
                                    value={requestDescription}
                                    onChange={(e) => setRequestDescription(e.target.value)}
                                />
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setRequestModalOpen(false)}
                                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingRequest}
                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
                                >
                                    {submittingRequest ? 'Sending...' : 'Send Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
