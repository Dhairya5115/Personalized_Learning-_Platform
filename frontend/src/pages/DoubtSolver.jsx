import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
    Send, HelpCircle, Bot, User, Sparkles, Trash2, 
    Users, Calendar, Video, Clock, CheckCircle, AlertCircle, Plus, ChevronRight 
} from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import ConfirmModal from '../components/ConfirmModal';

// LaTeX & KaTeX Markdown parser to render formatted educational answers with LaTeX support
function parseMarkdownToHtml(text) {
    if (!text) return '';
    try {
        let str = typeof text === 'string' ? text : String(text);
        const mathPlaceholders = [];

        // 1. Extract and render display math \[ ... \]
        str = str.replace(/\\\[([\s\S]*?)\\\]/g, (match, mathContent) => {
            try {
                const html = `<div class="my-4 overflow-x-auto flex justify-center w-full math-display">${katex.renderToString(mathContent.trim(), { displayMode: true, throwOnError: false })}</div>`;
                const index = mathPlaceholders.length;
                mathPlaceholders.push(html);
                return `__MATH_PLACEHOLDER_${index}__`;
            } catch (e) {
                console.error("KaTeX display math error: ", e);
                return match;
            }
        });

        // 2. Extract and render inline math \( ... \)
        str = str.replace(/\\\(([\s\S]*?)\\\)/g, (match, mathContent) => {
            try {
                const html = `<span class="math-inline">${katex.renderToString(mathContent.trim(), { displayMode: false, throwOnError: false })}</span>`;
                const index = mathPlaceholders.length;
                mathPlaceholders.push(html);
                return `__MATH_PLACEHOLDER_${index}__`;
            } catch (e) {
                console.error("KaTeX inline math error: ", e);
                return match;
            }
        });

        // 3. Process normal markdown rules
        let html = str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // Code blocks
        html = html.replace(/```(?:javascript|js|python|html|css)?([\s\S]*?)```/g, 
            '<pre class="bg-[#f3f1ed] border border-[#edebe3] p-4 rounded-xl overflow-x-auto my-3 font-mono text-xs text-[#00262b]"><code class="bg-transparent p-0">$1</code></pre>'
        );
        
        // Inline code
        html = html.replace(/`([^`]+)`/g, 
            '<code class="bg-[#f3f1ed] px-1.5 py-0.5 rounded text-xs font-mono text-[#00262b] font-bold">$1</code>'
        );
        
        // Headings
        html = html.replace(/^### (.*$)/gim, '<h4 class="text-xs font-extrabold uppercase tracking-wider text-[#04c5e7] mt-4 mb-2">$1</h4>');
        html = html.replace(/^## (.*$)/gim, '<h3 class="text-sm font-extrabold text-[#00262b] mt-5 mb-2 pb-1 border-b border-[#f3f1ed]">$1</h3>');
        html = html.replace(/^# (.*$)/gim, '<h2 class="text-base font-black text-[#00262b] mt-6 mb-3">$1</h2>');
        
        // Bold text
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-extrabold text-[#00262b]">$1</strong>');
        
        // Unordered lists
        html = html.replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc mb-1.5 text-left text-[#00262b]">$1</li>');
        html = html.replace(/^- (.*$)/gim, '<li class="ml-4 list-disc mb-1.5 text-left text-[#00262b]">$1</li>');
        
        let linesProcessed = html.split('\n').map(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('<h') || trimmed.startsWith('<li') || trimmed.startsWith('<pre') || trimmed.startsWith('</pre') || trimmed.startsWith('<code') || trimmed.startsWith('</code')) {
                return line;
            }
            return trimmed ? `<p class="mb-3 leading-relaxed text-left text-sm text-[#00262b]">${line}</p>` : '';
        }).join('\n');

        // 4. Put LaTeX HTML back
        for (let i = 0; i < mathPlaceholders.length; i++) {
            linesProcessed = linesProcessed.replace(`__MATH_PLACEHOLDER_${i}__`, () => mathPlaceholders[i]);
        }

        return linesProcessed;
    } catch (e) {
        console.error("Markdown parsing error: ", e);
        return typeof text === 'string' ? text : '';
    }
}

function extractSuggestions(text) {
    if (!text || typeof text !== 'string') return { cleanText: String(text || ''), suggestions: [] };
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
    const [taError, setTaError] = useState('');
    const [submittingRequest, setSubmittingRequest] = useState(false);
    const [modalError, setModalError] = useState('');
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
        const saved = sessionStorage.getItem(cacheKey);
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
        setTaError('');
        try {
            const [tas, reqs] = await Promise.all([
                api.getAvailableTasForStudent(),
                api.getStudentTaRequests()
            ]);
            setAvailableTas(Array.isArray(tas) ? tas : []);
            setTaRequests(Array.isArray(reqs) ? reqs : []);
        } catch (err) {
            console.error('Error fetching Human TA data:', err);
            setTaError(err.message || 'Failed to load Teaching Assistant details. Please try again.');
        } finally {
            setLoadingTa(false);
        }
    };

    // Save messages to persistent history on update
    useEffect(() => {
        if (messages.length === 0) return;
        const cacheKey = `doubt_history_${user?.id || 'guest'}_${courseId || 'general'}`;
        sessionStorage.setItem(cacheKey, JSON.stringify(messages));
    }, [messages, user?.id, courseId]);

    const [showClearModal, setShowClearModal] = useState(false);

    const handleClearHistoryConfirm = () => {
        const cacheKey = `doubt_history_${user?.id || 'guest'}_${courseId || 'general'}`;
        sessionStorage.removeItem(cacheKey);
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
        if (!queryText || typeof queryText !== 'string' || !queryText.trim() || loading) return;

        const trimmed = queryText.trim();
        const userMsg = { sender: 'user', text: trimmed, timestamp: new Date() };
        const updatedMessages = [
            ...messages,
            userMsg
        ];
        setMessages(updatedMessages);
        setLoading(true);

        try {
            const data = await api.solveDoubt(trimmed, courseId, topicId);
            
            let rawAnswer = '';
            if (typeof data === 'string') {
                rawAnswer = data;
            } else if (data && typeof data.answer === 'string') {
                rawAnswer = data.answer;
            } else if (data && data.text) {
                rawAnswer = data.text;
            } else if (data && data.message) {
                rawAnswer = data.message;
            } else {
                rawAnswer = 'I received your query but was unable to formulate a response. Please try rephrasing your question.';
            }

            const { cleanText, suggestions } = extractSuggestions(rawAnswer);
            
            setMessages([
                ...updatedMessages,
                { 
                    sender: 'bot', 
                    text: cleanText || 'Here is what I found.', 
                    timestamp: new Date(),
                    source: data?.source || 'AI Tutor',
                    suggestions: Array.isArray(suggestions) ? suggestions : []
                }
            ]);
        } catch (err) {
            console.error('Error fetching AI doubt solution:', err);
            setMessages([
                ...updatedMessages,
                { 
                    sender: 'bot', 
                    text: `Something went wrong getting an answer (${err?.message || 'Network request failed'}). Please check your connection and try again.`, 
                    timestamp: new Date(),
                    isError: true,
                    suggestions: []
                }
            ]);
            if (window.showToast) {
                window.showToast('Something went wrong getting an answer, please try again', 'error');
            }
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

    const getInitials = (firstName, lastName) => {
        const f = (firstName && typeof firstName === 'string' && firstName.trim().length > 0) ? firstName.trim()[0].toUpperCase() : 'T';
        const l = (lastName && typeof lastName === 'string' && lastName.trim().length > 0) ? lastName.trim()[0].toUpperCase() : 'A';
        return `${f}${l}`;
    };

    const handleTaRequestSubmit = async (e) => {
        e.preventDefault();
        if (!selectedTa || !selectedTa.ta_id || !selectedTa.course_id) {
            setModalError('Please select a valid Teaching Assistant.');
            return;
        }
        if (!requestSubject.trim() || !requestDescription.trim()) {
            setModalError('Please provide both subject and detailed description.');
            return;
        }
        setSubmittingRequest(true);
        setModalError('');

        try {
            await api.createTaDoubtRequest(
                selectedTa.ta_id,
                selectedTa.course_id,
                requestSubject.trim(),
                requestDescription.trim()
            );
            if (window.showToast) window.showToast('Doubt request sent to TA successfully!', 'success');
            setRequestModalOpen(false);
            setSelectedTa(null);
            setRequestSubject('');
            setRequestDescription('');
            setModalError('');
            fetchHumanTaData();
        } catch (err) {
            setModalError(err.message || 'Failed to submit request');
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
            <header className="px-6 py-4 bg-[#ffffff] border-b border-[#edebe3] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-[#00262b] p-2.5 rounded-2xl text-[#04c5e7] shadow-sm">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold text-[#00262b] leading-tight">
                            Personal Doubt & Practice Solver
                        </h2>
                        <p className="text-xs text-[#52716c] font-medium">
                            {courseTitle 
                                ? `Active context: ${courseTitle}${topicTitle ? ` • ${topicTitle}` : ''}`
                                : 'Get 24/7 AI tutor explanations or request 1-on-1 human TA sessions'}
                        </p>
                    </div>
                </div>

                {/* Mode Switch Pills */}
                <div className="flex items-center p-1 bg-[#f9f8f6] border border-[#edebe3] rounded-[94px] self-start sm:self-auto">
                    <button
                        onClick={() => setSolverMode('AI')}
                        className={`flex items-center gap-2 px-5 py-2 rounded-[94px] text-xs font-extrabold transition-all duration-200 ${
                            solverMode === 'AI'
                                ? 'bg-[#04c5e7] text-[#00262b] shadow-sm'
                                : 'text-[#00262b] hover:text-[#04c5e7]'
                        }`}
                    >
                        <Bot size={15} />
                        <span>AI Tutor</span>
                    </button>
                    <button
                        onClick={() => setSolverMode('HUMAN')}
                        className={`flex items-center gap-2 px-5 py-2 rounded-[94px] text-xs font-extrabold transition-all duration-200 ${
                            solverMode === 'HUMAN'
                                ? 'bg-[#04c5e7] text-[#00262b] shadow-sm'
                                : 'text-[#00262b] hover:text-[#04c5e7]'
                        }`}
                    >
                        <Users size={15} />
                        <span>Human TA</span>
                    </button>
                </div>
            </header>

            {/* ==================== AI SOLVER MODE ==================== */}
            {solverMode === 'AI' && (
                <>
                    {/* Chat Messages Log */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar bg-[#ffffff]">
                        {messages.map((msg, index) => {
                            const isBot = msg.sender === 'bot';
                            return (
                                <div
                                    key={index}
                                    className={`flex gap-3 md:gap-4 max-w-3xl ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                                >
                                    {/* Avatar */}
                                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                                        isBot 
                                            ? 'bg-[#00262b] text-[#04c5e7]' 
                                            : 'bg-[#f3f1ed] text-[#00262b] border border-[#e1ddd1]'
                                    }`}>
                                        {isBot ? <Bot size={18} /> : <User size={18} />}
                                    </div>

                                    {/* Bubble */}
                                    <div className={`space-y-2 max-w-[85%]`}>
                                        <div className={`p-4 md:p-5 rounded-2xl text-sm leading-relaxed ${
                                            isBot
                                                ? msg.isError
                                                    ? 'bg-[#ffffff] text-[#d64000] border-2 border-[#d64000]/40 shadow-sm'
                                                    : 'bg-[#ffffff] text-[#00262b] border border-[#edebe3] shadow-sm'
                                                : 'bg-[#00262b] text-[#ffffff] shadow-sm'
                                        }`}>
                                            {isBot ? (
                                                msg.isError ? (
                                                    <div className="flex items-start gap-2.5">
                                                        <AlertCircle size={18} className="shrink-0 mt-0.5 text-[#d64000]" />
                                                        <p className="font-semibold text-sm">{msg.text}</p>
                                                    </div>
                                                ) : (
                                                    <div 
                                                        dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(msg.text) }} 
                                                        className="prose max-w-none text-sm leading-relaxed text-[#00262b]"
                                                    />
                                                )
                                            ) : (
                                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                            )}
                                        </div>

                                        <span className={`block text-[10px] font-bold text-[#52716c] uppercase tracking-wider ${isBot ? 'text-left pl-1' : 'text-right pr-1'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Loading / Typing Indicator */}
                        {loading && (
                            <div className="flex gap-3 max-w-3xl mr-auto">
                                <div className="w-9 h-9 rounded-2xl bg-[#00262b] text-[#04c5e7] flex items-center justify-center shrink-0 shadow-sm">
                                    <Bot size={18} />
                                </div>
                                <div className="p-4 rounded-2xl bg-[#ffffff] border border-[#edebe3] shadow-sm flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#00262b] animate-pulse"></span>
                                    <span className="w-2 h-2 rounded-full bg-[#00262b] animate-pulse" style={{ animationDelay: '200ms' }}></span>
                                    <span className="w-2 h-2 rounded-full bg-[#00262b] animate-pulse" style={{ animationDelay: '400ms' }}></span>
                                    <span className="text-xs font-bold text-[#52716c] ml-2">Thinking...</span>
                                </div>
                            </div>
                        )}

                        {/* Smart AI Suggestions */}
                        {showSuggestions && (
                            <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <span className="text-xs font-extrabold text-[#52716c] uppercase tracking-wider block">
                                    Suggested Follow-ups:
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {lastMsg.suggestions.map((sug, sIdx) => (
                                        <button
                                            key={sIdx}
                                            onClick={() => triggerSuggestion(sug)}
                                            className="btn-ghost !text-xs !py-1.5 !px-3.5 flex items-center gap-1.5 hover:border-[#04c5e7]"
                                        >
                                            <span>{sug}</span>
                                            <ChevronRight size={12} className="text-[#04c5e7]" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input Bar */}
                    <footer className="p-4 md:p-6 bg-[#ffffff] border-t border-[#edebe3] shadow-lg">
                        <div className="max-w-4xl mx-auto space-y-3">
                            <form onSubmit={handleSend} className="relative flex items-center">
                                <input
                                    type="text"
                                    value={inputQuery}
                                    onChange={(e) => setInputQuery(e.target.value)}
                                    placeholder={courseTitle ? `Ask anything about ${courseTitle}...` : "Ask any question about programming, data structures, math..."}
                                    disabled={loading}
                                    className="w-full pl-5 pr-14 py-3.5 bg-[#ffffff] border-2 border-[#e1ddd1] rounded-[94px] text-sm text-[#00262b] placeholder:text-[#52716c] focus:outline-none focus:border-[#00262b] shadow-sm transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={!inputQuery.trim() || loading}
                                    className="absolute right-2 p-2.5 bg-[#00262b] text-[#ffffff] hover:bg-[#04c5e7] hover:text-[#00262b] disabled:opacity-40 rounded-full transition-all shadow-sm"
                                    title="Send question"
                                >
                                    <Send size={16} />
                                </button>
                            </form>

                            <div className="flex items-center justify-between px-2">
                                <button
                                    onClick={() => setShowClearModal(true)}
                                    className="text-xs font-bold text-[#52716c] hover:text-[#d64000] flex items-center gap-1 transition-colors"
                                >
                                    <Trash2 size={12} /> Clear Chat
                                </button>
                                <p className="text-[10px] font-bold text-[#52716c] uppercase tracking-widest">
                                    AI can make mistakes. Verify critical facts.
                                </p>
                            </div>
                        </div>
                    </footer>
                </>
            )}

            {/* ==================== HUMAN TA MODE ==================== */}
            {solverMode === 'HUMAN' && (
                <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar bg-[#ffffff]">
                    {loadingTa ? (
                        <div className="flex flex-col items-center justify-center min-h-[300px] text-[#52716c] gap-3">
                            <div className="w-8 h-8 rounded-full border-3 border-[#00262b] border-t-transparent animate-spin"></div>
                            <span className="text-xs font-bold uppercase tracking-wider">Loading Teaching Assistant details...</span>
                        </div>
                    ) : taError ? (
                        <div className="p-8 text-center bg-[#ffffff] border border-[#edebe3] rounded-2xl space-y-4 shadow-sm">
                            <div className="w-12 h-12 rounded-full bg-[#f3f1ed] text-[#d64000] flex items-center justify-center mx-auto font-bold text-lg">!</div>
                            <h4 className="font-extrabold text-[#00262b] text-base">{taError}</h4>
                            <button
                                onClick={fetchHumanTaData}
                                className="btn-primary !text-xs !py-2 !px-4"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Section 1: Available Assigned TAs */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-extrabold text-[#00262b] flex items-center gap-2">
                                            <Users size={22} className="text-[#04c5e7]" />
                                            Available Course TAs
                                        </h3>
                                        <p className="text-xs text-[#52716c]">Teaching Assistants assigned to assist in your enrolled courses.</p>
                                    </div>
                                </div>

                                {availableTas.length === 0 ? (
                                    <div className="p-8 text-center bg-[#ffffff] border border-[#edebe3] rounded-2xl text-[#52716c] text-sm shadow-sm space-y-2">
                                        <p className="font-bold text-[#00262b]">No TAs currently assigned to your enrolled courses.</p>
                                        <p className="text-xs">Once your instructor approves and assigns a TA to your course, you will be able to request 1-on-1 doubt sessions here.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {availableTas.map((ta, idx) => {
                                            const initials = getInitials(ta.first_name, ta.last_name);
                                            const fullName = `${ta.first_name || 'Teaching'} ${ta.last_name || 'Assistant'}`.trim();
                                            const courseName = ta.course_title || 'Enrolled Course';

                                            return (
                                                <div key={idx} className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-11 h-11 rounded-2xl bg-[#00262b] text-[#04c5e7] font-bold flex items-center justify-center text-sm shadow-sm">
                                                            {initials}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-extrabold text-[#00262b] text-base">
                                                                {fullName}
                                                            </h4>
                                                            <p className="text-xs text-[#52716c]">Course: {courseName}</p>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            setSelectedTa(ta);
                                                            setRequestModalOpen(true);
                                                            setModalError('');
                                                        }}
                                                        className="btn-primary !text-xs !py-2 !px-4 flex items-center gap-1.5"
                                                    >
                                                        <Plus size={14} /> Request Session
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Section 2: Student TA Doubt Request History */}
                            <div className="space-y-4 pt-4 border-t border-[#edebe3]">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <h3 className="text-xl font-extrabold text-[#00262b] flex items-center gap-2">
                                        <Clock size={22} className="text-[#04c5e7]" />
                                        My TA Request History
                                    </h3>

                                    {/* Filter Controls */}
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
                                                className={`px-4 py-1.5 rounded-[94px] text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                                    requestFilter === tab.id
                                                        ? 'bg-[#04c5e7] text-[#00262b] shadow-xs'
                                                        : 'btn-ghost !py-1 !px-3'
                                                }`}
                                            >
                                                <span>{tab.label}</span>
                                                <span className={`px-1.5 py-0.2 rounded-[94px] text-[10px] ${
                                                    requestFilter === tab.id ? 'bg-[#00262b] text-white' : 'bg-[#f3f1ed] text-[#00262b]'
                                                }`}>
                                                    {tab.count}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {taRequests.filter(req => requestFilter === 'ALL' || req.status === requestFilter).length === 0 ? (
                                    <div className="p-8 text-center bg-[#ffffff] border border-[#edebe3] rounded-2xl text-[#52716c] text-sm shadow-sm">
                                        No {requestFilter !== 'ALL' ? requestFilter.toLowerCase() : ''} TA requests found.
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {taRequests
                                            .filter(req => requestFilter === 'ALL' || req.status === requestFilter)
                                            .map(req => (
                                                <div key={req.id} className="bg-[#ffffff] border border-[#edebe3] rounded-2xl p-6 space-y-4 shadow-sm">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#f3f1ed] pb-3">
                                                        <div>
                                                            <span className="text-xs font-bold text-[#04c5e7]">
                                                                Course: {req.course_title || 'Course'}
                                                            </span>
                                                            <h3 className="font-extrabold text-[#00262b] text-lg mt-0.5">
                                                                {req.subject}
                                                            </h3>
                                                            <p className="text-xs text-[#52716c]">
                                                                Assigned TA: {req.ta_first_name || 'TA'} {req.ta_last_name || ''} {req.ta_email ? `(${req.ta_email})` : ''}
                                                            </p>
                                                        </div>

                                                        <span className={`px-3 py-1 rounded-[94px] text-xs font-bold uppercase tracking-wider self-start md:self-auto border ${
                                                            req.status === 'SCHEDULED'
                                                                ? 'bg-[#f3f1ed] text-[#00262b] border-[#04c5e7]'
                                                                : req.status === 'RESOLVED'
                                                                    ? 'bg-[#f3f1ed] text-[#00262b] border-[#e1ddd1]'
                                                                    : 'bg-[#f3f1ed] text-[#d64000] border-[#d64000]/40'
                                                        }`}>
                                                            {req.status}
                                                        </span>
                                                    </div>

                                                    <p className="text-sm text-[#00262b] bg-[#f9f8f6] p-4 rounded-xl border border-[#edebe3]">
                                                        {req.description}
                                                    </p>

                                                    {/* Meeting Link */}
                                                    {req.meeting_link && req.status === 'SCHEDULED' && (
                                                        <div className="p-3 bg-[#f9f8f6] border border-[#04c5e7] rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                            <div>
                                                                <span className="font-bold text-[#00262b]">Scheduled Time: </span>
                                                                <span className="text-[#00262b]">
                                                                    {req.scheduled_at ? new Date(req.scheduled_at).toLocaleString() : 'Pending Confirmation'}
                                                                </span>
                                                            </div>
                                                            <a href={req.meeting_link} target="_blank" rel="noreferrer" className="text-[#00262b] font-bold underline flex items-center gap-1 hover:text-[#04c5e7]">
                                                                <Video size={14} /> Join Meeting Room
                                                            </a>
                                                        </div>
                                                    )}

                                                    {req.status === 'RESOLVED' && (
                                                        <div className="p-3 bg-[#f9f8f6] border border-[#edebe3] rounded-xl text-xs flex items-center justify-between">
                                                            <span className="font-bold text-[#00262b] flex items-center gap-1.5">
                                                                <CheckCircle size={14} className="text-[#00262b]" /> Session Resolved
                                                            </span>
                                                            {req.scheduled_at && (
                                                                <span className="text-[11px] text-[#52716c]">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#00262b]/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
                        <div className="flex items-center justify-between border-b border-[#f3f1ed] pb-4">
                            <div>
                                <h3 className="text-xl font-extrabold text-[#00262b]">
                                    Request TA Session
                                </h3>
                                <p className="text-xs text-[#52716c]">
                                    TA: {selectedTa.first_name || 'TA'} {selectedTa.last_name || ''} ({selectedTa.course_title || 'Course'})
                                </p>
                            </div>
                            <button 
                                onClick={() => {
                                    setRequestModalOpen(false);
                                    setModalError('');
                                }}
                                className="text-[#52716c] hover:text-[#00262b] p-1 rounded-full hover:bg-[#f9f8f6]"
                            >
                                ✕
                            </button>
                        </div>

                        {modalError && (
                            <div className="p-3 bg-[#f3f1ed] border border-[#d64000]/30 text-[#d64000] text-xs rounded-xl font-bold">
                                {modalError}
                            </div>
                        )}

                        <form onSubmit={handleTaRequestSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[#52716c] uppercase tracking-wider mb-1">
                                    Subject / Topic *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Graph Algorithms, Binary Trees, Assignment 2 Help"
                                    className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl p-3 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7]"
                                    value={requestSubject}
                                    onChange={(e) => setRequestSubject(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#52716c] uppercase tracking-wider mb-1">
                                    Detailed Question Description *
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="Describe your doubt or problem in detail..."
                                    className="w-full bg-[#ffffff] border border-[#e1ddd1] rounded-xl p-3 text-sm text-[#00262b] focus:outline-none focus:border-[#04c5e7]"
                                    value={requestDescription}
                                    onChange={(e) => setRequestDescription(e.target.value)}
                                />
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#f3f1ed]">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRequestModalOpen(false);
                                        setModalError('');
                                    }}
                                    className="btn-ghost !text-xs !py-2 !px-4"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingRequest}
                                    className="btn-primary !text-xs !py-2 !px-5"
                                >
                                    {submittingRequest ? 'Sending Request...' : 'Send Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
