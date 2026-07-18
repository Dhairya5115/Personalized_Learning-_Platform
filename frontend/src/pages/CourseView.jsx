import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
    ArrowLeft, BookOpen, Plus, ClipboardList, Play, FileText, 
    Trash2, Sparkles, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, HelpCircle,
    Lock, Unlock, CreditCard, Bookmark
} from 'lucide-react';

function TopicNode({ topic, index, isStudent, isEnrolled = true, onSelectQuiz, onSelectMaterial, role, onReloadTopics, onAskTutor }) {
    const { user } = useAuth();
    const [quizzes, setQuizzes] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMaterials, setLoadingMaterials] = useState(true);
    const [isExpanded, setIsExpanded] = useState(index === 0); // Expand first topic by default

    // Custom delete modal
    const [showDeleteTopicModal, setShowDeleteTopicModal] = useState(false);
    const [deleteMaterialTarget, setDeleteMaterialTarget] = useState(null);
    const [deleteQuizTarget, setDeleteQuizTarget] = useState(null);

    // Add Material form states
    const [addingMaterial, setAddingMaterial] = useState(false);
    const [materialTitle, setMaterialTitle] = useState('');
    const [materialType, setMaterialType] = useState('PDF');
    const [materialUrl, setMaterialUrl] = useState('');
    const [matError, setMatError] = useState('');
    const [uploadingFile, setUploadingFile] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [materialIsPremium, setMaterialIsPremium] = useState(false);
    const [materialPrice, setMaterialPrice] = useState('49');

    // Material purchase/checkout states
    const [checkoutMaterial, setCheckoutMaterial] = useState(null);
    const [purchaseError, setPurchaseError] = useState('');
    const [purchaseLoading, setPurchaseLoading] = useState(false);

    // Quiz and Question builder states
    const [creatingQuiz, setCreatingQuiz] = useState(false);
    const [quizTitle, setQuizTitle] = useState('');
    const [quizPassingScore, setQuizPassingScore] = useState(50);
    const [generatingQuiz, setGeneratingQuiz] = useState(false);
    const [quizError, setQuizError] = useState('');

    // Add Question form states
    const [selectedQuizForQuestion, setSelectedQuizForQuestion] = useState(null);
    const [qContent, setQContent] = useState('');
    const [optA, setOptA] = useState('');
    const [optB, setOptB] = useState('');
    const [optC, setOptC] = useState('');
    const [optD, setOptD] = useState('');
    const [correctOpt, setCorrectOpt] = useState('A');
    const [qDiff, setQDiff] = useState('MEDIUM');
    const [qError, setQError] = useState('');


    // View/Edit Quiz Questions states
    const [viewingQuestionsQuizId, setViewingQuestionsQuizId] = useState(null);
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    
    // Editing question states
    const [editingQuestionId, setEditingQuestionId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [editOptA, setEditOptA] = useState('');
    const [editOptB, setEditOptB] = useState('');
    const [editOptC, setEditOptC] = useState('');
    const [editOptD, setEditOptD] = useState('');
    const [editCorrectOpt, setEditCorrectOpt] = useState('A');
    const [editDiff, setEditDiff] = useState('MEDIUM');
    const [editError, setEditError] = useState('');

    const handleViewQuestions = async (quizId) => {
        if (viewingQuestionsQuizId === quizId) {
            setViewingQuestionsQuizId(null);
            setQuizQuestions([]);
            return;
        }
        setViewingQuestionsQuizId(quizId);
        setLoadingQuestions(true);
        try {
            const data = await api.getQuizQuestions(quizId);
            setQuizQuestions(data);
        } catch (err) {
            alert(err.message || 'Failed to load questions');
        } finally {
            setLoadingQuestions(false);
        }
    };

    const handleStartEdit = (q) => {
        setEditingQuestionId(q.id);
        setEditContent(q.content);
        const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
        setEditOptA(opts.find(o => o.id === 'A')?.text || '');
        setEditOptB(opts.find(o => o.id === 'B')?.text || '');
        setEditOptC(opts.find(o => o.id === 'C')?.text || '');
        setEditOptD(opts.find(o => o.id === 'D')?.text || '');
        setEditCorrectOpt(q.correct_option_id);
        setEditDiff(q.difficulty);
        setEditError('');
    };

    const handleSaveEdit = async (e, qId) => {
        e.preventDefault();
        setEditError('');
        if (!editContent || !editOptA || !editOptB || !editOptC || !editOptD) {
            setEditError('All fields are required');
            return;
        }
        const questionData = {
            content: editContent,
            options: [
                { id: 'A', text: editOptA },
                { id: 'B', text: editOptB },
                { id: 'C', text: editOptC },
                { id: 'D', text: editOptD }
            ],
            correctOptionId: editCorrectOpt,
            difficulty: editDiff
        };
        try {
            const res = await api.updateQuestion(qId, questionData);
            if (res.success) {
                alert('Question updated successfully!');
                setQuizQuestions(prev => prev.map(item => item.id === qId ? res.question : item));
                setEditingQuestionId(null);
            }
        } catch (err) {
            setEditError(err.message || 'Failed to update question');
        }
    };

    const handleDeleteQuestion = async (qId) => {
        if (!window.confirm('Are you sure you want to delete this question?')) return;
        try {
            const res = await api.deleteQuestion(qId);
            if (res.success) {
                if (window.showToast) {
                    window.showToast('Question deleted successfully!', 'success');
                } else {
                    alert('Question deleted successfully!');
                }
                setQuizQuestions(prev => prev.filter(item => item.id !== qId));
            }
        } catch (err) {
            if (window.showToast) {
                window.showToast(err.message || 'Failed to delete question', 'error');
            } else {
                alert(err.message || 'Failed to delete question');
            }
        }
    };

    const handleDeleteMaterialConfirm = async (materialId) => {
        try {
            const data = await api.deleteMaterial(materialId);
            if (data.success) {
                if (window.showToast) {
                    window.showToast('Material deleted successfully!', 'success');
                }
                setMaterials(prev => prev.filter(m => m.id !== materialId));
            }
        } catch (err) {
            if (window.showToast) {
                window.showToast(err.message || 'Failed to delete material', 'error');
            } else {
                alert(err.message || 'Failed to delete material');
            }
        }
    };

    const handleSelectMaterial = async (material) => {
        if (!isEnrolled) {
            if (material.is_premium) {
                if (window.showToast) {
                    window.showToast("Please enroll in the course to access premium materials.", "warning");
                } else {
                    alert("Please enroll in the course to access premium materials.");
                }
                return;
            }
            // Free materials can be previewed
            onSelectMaterial(material);
            return;
        }

        if (isStudent && material.is_premium && !material.is_unlocked) {
            setCheckoutMaterial(material);
            return;
        }

        onSelectMaterial(material);
        if (isStudent && !material.is_completed) {
            try {
                await api.completeMaterial(material.id);
                setMaterials(prev => prev.map(m => m.id === material.id ? { ...m, is_completed: true } : m));
                if (onReloadTopics) {
                    onReloadTopics();
                }
            } catch (err) {
                console.error('Failed to mark material as read:', err.message);
            }
        }
    };

    const handlePurchaseMaterial = async () => {
        if (!checkoutMaterial) return;
        setPurchaseError('');
        setPurchaseLoading(true);

        try {
            // 1. Create order
            const orderData = await api.createPaymentOrder({ materialId: checkoutMaterial.id });

            // 2. Configure Razorpay options
            const options = {
                key: orderData.key || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_dummy_id',
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'TailorLearn',
                description: `Unlock Material: ${checkoutMaterial.title}`,
                order_id: orderData.orderId,
                handler: async function (response) {
                    try {
                        const verifyRes = await api.verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });
                        
                        if (verifyRes.success) {
                            if (window.showToast) {
                                window.showToast('Material unlocked successfully!', 'success');
                            } else {
                                alert('Material unlocked successfully!');
                            }
                            setCheckoutMaterial(null);
                            // Reload materials list to refresh lock status
                            loadQuizzesAndMaterials();
                            if (onReloadTopics) {
                                onReloadTopics();
                            }
                        }
                    } catch (verifyErr) {
                        setPurchaseError(`Verification failed: ${verifyErr.message}`);
                    }
                },
                prefill: {
                    name: `${user?.firstName || 'Student'} ${user?.lastName || ''}`,
                    email: user?.email || 'student@tailorlearn.com'
                },
                theme: {
                    color: '#6366f1'
                }
            };

            if (!window.Razorpay) {
                throw new Error('Razorpay Checkout SDK is loading. Please try again in a few seconds.');
            }

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (err) {
            setPurchaseError(err.message || 'Payment initiation failed');
        } finally {
            setPurchaseLoading(false);
        }
    };

    useEffect(() => {
        loadQuizzesAndMaterials();
    }, [topic.id]);

    async function loadQuizzesAndMaterials() {
        setLoading(true);
        setLoadingMaterials(true);
        try {
            const quizList = await api.getQuizzesByTopic(topic.id);
            setQuizzes(quizList);
        } catch (err) {
            console.error('Error fetching quizzes:', err);
        } finally {
            setLoading(false);
        }

        try {
            const materialList = await api.getMaterials(topic.id);
            setMaterials(materialList);
        } catch (err) {
            console.error('Error fetching materials:', err);
        } finally {
            setLoadingMaterials(false);
        }
    }


    const handleAddMaterial = async (e) => {
        e.preventDefault();
        setMatError('');
        if (!materialTitle || !materialUrl) {
            setMatError('Title and URL are required');
            return;
        }
        try {
            const data = await api.createMaterial(
                topic.id, 
                materialTitle, 
                materialType, 
                materialUrl,
                materialIsPremium,
                materialIsPremium ? parseFloat(materialPrice) : 0
            );
            if (data.success) {
                if (window.showToast) {
                    window.showToast('Study material published successfully!', 'success');
                } else {
                    alert('Study material published successfully!');
                }
                setMaterials(prev => [...prev, { ...data.material, is_bookmarked: false }]);
                setMaterialTitle('');
                setMaterialUrl('');
                setMaterialIsPremium(false);
                setMaterialPrice('49');
                setAddingMaterial(false);
            }
        } catch (err) {
            setMatError(err.message || 'Failed to add material');
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingFile(true);
        setUploadProgress(15);
        setMatError('');

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 40) + 15;
                    setUploadProgress(percentComplete);
                }
            };
            reader.onload = async () => {
                try {
                    setUploadProgress(60);
                    const base64Data = reader.result;
                    const res = await api.uploadLocal(file.name, base64Data);
                    
                    setUploadProgress(100);
                    setMaterialUrl(res.fileUrl);
                    
                    if (!materialTitle) {
                        setMaterialTitle(file.name.replace(/\.[^/.]+$/, ""));
                    }

                    if (file.type.includes('pdf') || file.name.endsWith('.pdf')) {
                        setMaterialType('PDF');
                    } else if (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.mov') || file.name.endsWith('.avi') || file.name.endsWith('.mkv')) {
                        setMaterialType('VIDEO');
                    }

                    if (window.showToast) {
                        window.showToast('File processed and ready to publish!', 'success');
                    }
                } catch (err) {
                    setMatError(err.message || 'Failed to save upload payload.');
                } finally {
                    setUploadingFile(false);
                }
            };
            reader.onerror = () => {
                setUploadingFile(false);
                setMatError('Error reading bytes from local file input.');
            };
        } catch (err) {
            setUploadingFile(false);
            setMatError('Local file reader system error: ' + err.message);
        }
    };

    const handleGenerateAiQuiz = async () => {
        setGeneratingQuiz(true);
        setQuizError('');
        try {
            const data = await api.generateAiQuiz(topic.id);
            if (data.success) {
                const list = await api.getQuizzesByTopic(topic.id);
                setQuizzes(list);
                if (window.showToast) {
                    window.showToast(`AI Quiz generated: "${data.quiz.title}" (${data.questionsCount} questions)`, 'success');
                } else {
                    alert(`Successfully generated AI Quiz "${data.quiz.title}" containing ${data.questionsCount} questions!`);
                }
            }
        } catch (err) {
            setQuizError(err.message || 'Failed to auto-generate AI Quiz.');
            if (window.showToast) {
                window.showToast(err.message || 'Failed to generate AI Quiz', 'error');
            }
        } finally {
            setGeneratingQuiz(false);
        }
    };

    const handleCreateQuiz = async (e) => {
        e.preventDefault();
        setQuizError('');
        if (!quizTitle) {
            setQuizError('Quiz title is required');
            return;
        }
        try {
            const data = await api.createQuiz(topic.id, quizTitle, parseInt(quizPassingScore) || 50);
            if (data.success) {
                setQuizzes(prev => [...prev, data.quiz]);
                setQuizTitle('');
                setQuizPassingScore(50);
                setCreatingQuiz(false);
                alert(`Quiz "${data.quiz.title}" created successfully! Now you can add questions to it.`);
            }
        } catch (err) {
            setQuizError(err.message || 'Failed to create quiz.');
        }
    };

    const handleDeleteQuizConfirm = async (quizId) => {
        try {
            await api.deleteQuiz(quizId);
            setQuizzes(prev => prev.filter(q => q.id !== quizId));
            if (selectedQuizForQuestion === quizId) {
                setSelectedQuizForQuestion(null);
            }
            if (window.showToast) {
                window.showToast("Quiz deleted successfully", "success");
            }
        } catch (err) {
            alert(err.message || 'Failed to delete quiz.');
        }
    };

    const handleDeleteTopicConfirm = async () => {
        try {
            await api.deleteTopic(topic.id);
            if (window.showToast) {
                window.showToast("Topic deleted successfully", "success");
            }
            onReloadTopics();
        } catch (err) {
            alert(err.message || "Failed to delete topic");
        }
    };

    const handleAddQuestion = async (e, quizId) => {
        e.preventDefault();
        setQError('');
        if (!qContent || !optA || !optB || !optC || !optD) {
            setQError('Question content and all 4 options are required.');
            return;
        }
        const questionData = {
            content: qContent,
            options: [
                { id: 'A', text: optA },
                { id: 'B', text: optB },
                { id: 'C', text: optC },
                { id: 'D', text: optD }
            ],
            correctOptionId: correctOpt,
            difficulty: qDiff
        };
        try {
            const data = await api.addQuestionToQuiz(quizId, questionData);
            if (data.success) {
                alert('Question added successfully!');
                setQContent('');
                setOptA('');
                setOptB('');
                setOptC('');
                setOptD('');
                setCorrectOpt('A');
                setQDiff('MEDIUM');
                setSelectedQuizForQuestion(null);
            }
        } catch (err) {
            setQError(err.message || 'Failed to add question.');
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-all duration-200">
            {/* Header Accordion trigger */}
            <div 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors select-none"
            >
                <div className="flex items-center gap-4 flex-1">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center justify-center flex-shrink-0">
                        {index + 1}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-slate-850 dark:text-slate-100 text-base leading-snug">
                            {topic.title}
                        </h3>
                        <p className="text-xs text-slate-450 dark:text-slate-500 mt-1 line-clamp-1">
                            {topic.description || 'No topic details listed.'}
                        </p>
                    </div>
                </div>

                {/* Right badges */}
                <div className="flex items-center gap-4 pl-4" onClick={e => e.stopPropagation()}>
                    {role === 'TEACHER' && (
                        <button 
                            onClick={() => setShowDeleteTopicModal(true)}
                            className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 p-1 transition-colors mr-1"
                            title="Delete Topic"
                        >
                            <Trash2 size={15} />
                        </button>
                    )}
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)} 
                        className="text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 transition-colors p-1"
                    >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {/* Content Body */}
            {isExpanded && (
                <div className="p-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-950/10 space-y-6">
                    
                    {/* Concept Progress Summary */}
                    {isStudent && (
                        <div className="flex items-center justify-between text-xs text-slate-400 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-3 shadow-xs">
                            <span className="font-medium">Course Completed</span>
                            <div className="flex items-center gap-3 w-1/2">
                                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                                        style={{ width: `${topic.completion_percentage || 0}%` }}
                                    />
                                </div>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{topic.completion_percentage || 0}%</span>
                            </div>
                        </div>
                    )}

                    {/* AI doubt solver quick access banner */}
                    {isStudent && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/40 dark:border-indigo-900/20 p-4 rounded-2xl">
                            <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 text-left">
                                <HelpCircle size={15} className="text-indigo-500 shrink-0" />
                                <span>Stuck on a concept in this topic? Ask the AI Tutor for help.</span>
                            </div>
                            <button
                                onClick={() => onAskTutor && onAskTutor(topic.id, topic.title)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 self-stretch sm:self-auto justify-center"
                            >
                                <Sparkles size={12} className="text-white" />
                                <span>Ask AI Tutor</span>
                            </button>
                        </div>
                    )}

                    {/* Study Materials */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">📚 Learning Materials</h4>
                            {role === 'TEACHER' && (
                                <button 
                                    onClick={() => setAddingMaterial(!addingMaterial)} 
                                    className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                                >
                                    {addingMaterial ? 'Cancel' : '+ Add Material'}
                                </button>
                            )}
                        </div>

                        {/* Add material sub-form */}
                        {addingMaterial && (
                            <form onSubmit={handleAddMaterial} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3">
                                <h5 className="font-bold text-xs text-slate-700 dark:text-slate-300">Add New Material</h5>
                                {matError && <p className="text-rose-500 text-xs">{matError}</p>}
                                
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <input 
                                        type="text" 
                                        className="w-full sm:col-span-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                        placeholder="Material Title" 
                                        value={materialTitle}
                                        onChange={e => setMaterialTitle(e.target.value)}
                                        required
                                    />
                                    <select 
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                        value={materialType} 
                                        onChange={e => setMaterialType(e.target.value)}
                                    >
                                        <option value="PDF">PDF / Notes</option>
                                        <option value="VIDEO">Video Lecture</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Upload Local Document / Video</label>
                                    <input 
                                        type="file" 
                                        accept=".pdf,video/*"
                                        onChange={handleFileUpload}
                                        disabled={uploadingFile}
                                        className="text-xs text-slate-500 dark:text-slate-400 file:bg-slate-100 file:dark:bg-slate-800 file:border-none file:px-3 file:py-1.5 file:rounded-lg file:text-xs file:font-semibold file:cursor-pointer hover:file:bg-slate-200 dark:file:text-slate-300"
                                    />
                                    {uploadingFile && (
                                        <div className="mt-2 space-y-1">
                                            <div className="w-full h-1 bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                                            </div>
                                            <span className="text-[10px] text-slate-400">Uploading: {uploadProgress}%</span>
                                        </div>
                                    )}
                                </div>

                                <input 
                                    type="text" 
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                    placeholder="File URL link" 
                                    value={materialUrl}
                                    onChange={e => setMaterialUrl(e.target.value)}
                                    required
                                />
                                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2 text-xs font-semibold" disabled={uploadingFile}>
                                    Save Material
                                </button>
                            </form>
                        )}

                        {/* List materials */}
                        {loadingMaterials ? (
                            <span className="text-xs text-slate-400">Loading study materials...</span>
                        ) : materials.length === 0 ? (
                            <p className="text-xs text-slate-400 dark:text-slate-500 italic p-3 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-xl">No materials uploaded yet.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {materials.map(material => (
                                    <div 
                                        key={material.id} 
                                        onClick={() => handleSelectMaterial(material)}
                                        className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl hover:border-indigo-500/40 dark:hover:border-indigo-400/20 cursor-pointer shadow-xs hover:shadow-sm transition-all"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {material.type === 'VIDEO' 
                                                ? <Play size={15} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                                                : <FileText size={15} className="text-slate-500 dark:text-slate-455 flex-shrink-0" />
                                            }
                                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                                                {material.title}
                                            </span>
                                            {isStudent && material.is_premium && (
                                                material.is_unlocked ? (
                                                    <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/10 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md flex-shrink-0 select-none">
                                                        <Unlock size={8} />
                                                        <span>Unlocked</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-600 dark:text-rose-455 border border-rose-500/10 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md flex-shrink-0 select-none">
                                                        <Lock size={8} />
                                                        <span>₹{Math.round(material.price)}</span>
                                                    </span>
                                                )
                                            )}
                                            {!isStudent && material.is_premium && (
                                                <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/10 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md flex-shrink-0 select-none">
                                                    <Lock size={8} />
                                                    <span>Premium (₹{Math.round(material.price)})</span>
                                                </span>
                                            )}
                                            {material.is_completed && (
                                                <CheckCircle2 size={13} className="text-emerald-500 dark:text-emerald-450 flex-shrink-0" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                            {isStudent && (
                                                material.is_bookmarked ? (
                                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-200/50 dark:border-emerald-500/10">
                                                        SRS Deck
                                                    </span>
                                                ) : (
                                                    <button 
                                                        onClick={(e) => handleBookmark(e, material.id)} 
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 rounded-lg text-[10px] font-bold transition-colors" 
                                                    >
                                                        <Bookmark size={10} />
                                                        <span>Spaced Review</span>
                                                    </button>
                                                )
                                            )}
                                            {role === 'TEACHER' && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setDeleteMaterialTarget(material); }} 
                                                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Adaptive Quizzes */}
                    {(isStudent || role === 'TEACHER') && (
                        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">📝 Adaptive Quizzes</h4>
                                {role === 'TEACHER' && (
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={handleGenerateAiQuiz} 
                                            disabled={generatingQuiz}
                                            className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                                        >
                                            <Sparkles size={12} className="text-indigo-600 dark:text-indigo-405 animate-pulse" />
                                            <span>{generatingQuiz ? 'AI Generating...' : '✨ Generate AI Quiz'}</span>
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setCreatingQuiz(!creatingQuiz);
                                                setQuizError('');
                                            }} 
                                            className="text-xs text-slate-550 dark:text-slate-400 font-bold hover:underline"
                                        >
                                            {creatingQuiz ? 'Cancel' : '+ Create Quiz'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {quizError && (
                                <p className="text-rose-500 text-xs">{quizError}</p>
                            )}

                            {creatingQuiz && role === 'TEACHER' && (
                                <form onSubmit={handleCreateQuiz} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3">
                                    <h5 className="font-bold text-xs text-slate-700 dark:text-slate-350">Create Adaptive Quiz</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <input 
                                            type="text" 
                                            className="w-full sm:col-span-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-850 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                            placeholder="Quiz Title" 
                                            value={quizTitle}
                                            onChange={e => setQuizTitle(e.target.value)}
                                            required
                                        />
                                        <input 
                                            type="number" 
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-850 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                            placeholder="Passing Score %" 
                                            min="0"
                                            max="100"
                                            value={quizPassingScore}
                                            onChange={e => setQuizPassingScore(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2 text-xs font-semibold">
                                        Save Quiz Node
                                    </button>
                                </form>
                            )}

                            {loading ? (
                                <span className="text-xs text-slate-400">Loading quizzes...</span>
                            ) : quizzes.length === 0 ? (
                                <p className="text-xs text-slate-400 dark:text-slate-500 italic p-3 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-xl">No active quizzes built for this topic.</p>
                            ) : (
                                <div className="space-y-3">
                                    {quizzes.map(quiz => (
                                        <div key={quiz.id} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4 flex flex-col gap-4 shadow-xs">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                        {quiz.title}
                                                    </span>
                                                    <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                                                        Passing Criteria: {quiz.passing_score}% accuracy
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {isStudent && (
                                                        <button 
                                                            onClick={() => {
                                                                if (!isEnrolled) {
                                                                    if (window.showToast) {
                                                                        window.showToast("Please enroll in the course to take practice quizzes.", "warning");
                                                                    } else {
                                                                        alert("Please enroll in the course to take practice quizzes.");
                                                                    }
                                                                } else {
                                                                    onSelectQuiz(quiz);
                                                                }
                                                            }} 
                                                            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors ${
                                                                isEnrolled 
                                                                    ? "bg-indigo-600 hover:bg-indigo-500 text-white" 
                                                                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/50 dark:border-slate-700/50 cursor-not-allowed"
                                                            }`} 
                                                        >
                                                            {!isEnrolled && <Lock size={12} />}
                                                            <span>Take Quiz</span>
                                                        </button>
                                                    )}
                                                    {role === 'TEACHER' && (
                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={() => {
                                                                    setSelectedQuizForQuestion(selectedQuizForQuestion === quiz.id ? null : quiz.id);
                                                                    setQError('');
                                                                }} 
                                                                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
                                                            >
                                                                {selectedQuizForQuestion === quiz.id ? 'Cancel' : '➕ Question'}
                                                            </button>
                                                            <button 
                                                                onClick={() => handleViewQuestions(quiz.id)}
                                                                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
                                                            >
                                                                {viewingQuestionsQuizId === quiz.id ? 'Hide Questions' : '👁️ Questions'}
                                                            </button>
                                                            <button 
                                                                onClick={() => setDeleteQuizTarget(quiz)} 
                                                                className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                                                                title="Delete Quiz"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Add question inline subform */}
                                            {role === 'TEACHER' && selectedQuizForQuestion === quiz.id && (
                                                <form onSubmit={(e) => handleAddQuestion(e, quiz.id)} className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-1 space-y-3">
                                                    <h6 className="font-bold text-xs text-slate-750 dark:text-slate-350">Add Question Details</h6>
                                                    {qError && <p className="text-rose-500 text-xs">{qError}</p>}
                                                    
                                                    <textarea 
                                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                                        placeholder="Question content..." 
                                                        value={qContent}
                                                        onChange={e => setQContent(e.target.value)}
                                                        rows="2"
                                                        required
                                                    />
                                                    
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <input 
                                                            type="text" 
                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-850 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                                            placeholder="Option A" 
                                                            value={optA}
                                                            onChange={e => setOptA(e.target.value)}
                                                            required
                                                        />
                                                        <input 
                                                            type="text" 
                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-850 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                                            placeholder="Option B" 
                                                            value={optB}
                                                            onChange={e => setOptB(e.target.value)}
                                                            required
                                                        />
                                                        <input 
                                                            type="text" 
                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-850 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                                            placeholder="Option C" 
                                                            value={optC}
                                                            onChange={e => setOptC(e.target.value)}
                                                            required
                                                        />
                                                        <input 
                                                            type="text" 
                                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-850 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                                            placeholder="Option D" 
                                                            value={optD}
                                                            onChange={e => setOptD(e.target.value)}
                                                            required
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Correct Choice</label>
                                                            <select 
                                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                                                value={correctOpt} 
                                                                onChange={e => setCorrectOpt(e.target.value)}
                                                            >
                                                                <option value="A">A</option>
                                                                <option value="B">B</option>
                                                                <option value="C">C</option>
                                                                <option value="D">D</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Difficulty Tier</label>
                                                            <select 
                                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                                                value={qDiff} 
                                                                onChange={e => setQDiff(e.target.value)}
                                                            >
                                                                <option value="EASY">EASY</option>
                                                                <option value="MEDIUM">MEDIUM</option>
                                                                <option value="HARD">HARD</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl py-2 text-xs font-semibold">
                                                        Publish Question
                                                    </button>
                                                </form>
                                            )}

                                            {/* View / Edit Questions list */}
                                            {role === 'TEACHER' && viewingQuestionsQuizId === quiz.id && (
                                                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-1 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h6 className="font-bold text-xs text-slate-750 dark:text-slate-350">Quiz Questions ({quizQuestions.length})</h6>
                                                    </div>
                                                    
                                                    {loadingQuestions ? (
                                                        <p className="text-xs text-slate-400">Loading questions...</p>
                                                    ) : quizQuestions.length === 0 ? (
                                                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">This quiz does not have any questions yet.</p>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            {quizQuestions.map((q, idx) => {
                                                                const isEditing = editingQuestionId === q.id;
                                                                const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;

                                                                return (
                                                                    <div key={q.id} className="p-3 bg-slate-50/80 dark:bg-slate-950/80 border border-slate-150 dark:border-slate-850 rounded-xl space-y-2 text-xs">
                                                                        {isEditing ? (
                                                                            <form onSubmit={(e) => handleSaveEdit(e, q.id)} className="space-y-3">
                                                                                {editError && <p className="text-rose-500 text-[10px]">{editError}</p>}
                                                                                <textarea 
                                                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                                                                    value={editContent}
                                                                                    onChange={e => setEditContent(e.target.value)}
                                                                                    rows="2"
                                                                                    required
                                                                                />
                                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                                    <input 
                                                                                        type="text" 
                                                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-850 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                                                                        placeholder="Option A" 
                                                                                        value={editOptA}
                                                                                        onChange={e => setEditOptA(e.target.value)}
                                                                                        required
                                                                                    />
                                                                                    <input 
                                                                                        type="text" 
                                                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-850 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                                                                        placeholder="Option B" 
                                                                                        value={editOptB}
                                                                                        onChange={e => setEditOptB(e.target.value)}
                                                                                        required
                                                                                    />
                                                                                    <input 
                                                                                        type="text" 
                                                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-850 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                                                                        placeholder="Option C" 
                                                                                        value={editOptC}
                                                                                        onChange={e => setEditOptC(e.target.value)}
                                                                                        required
                                                                                    />
                                                                                    <input 
                                                                                        type="text" 
                                                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-850 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                                                                        placeholder="Option D" 
                                                                                        value={editOptD}
                                                                                        onChange={e => setEditOptD(e.target.value)}
                                                                                        required
                                                                                    />
                                                                                </div>
                                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                                    <div>
                                                                                        <label className="block text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-0.5">Correct Choice</label>
                                                                                        <select 
                                                                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                                                                            value={editCorrectOpt} 
                                                                                            onChange={e => setEditCorrectOpt(e.target.value)}
                                                                                        >
                                                                                            <option value="A">A</option>
                                                                                            <option value="B">B</option>
                                                                                            <option value="C">C</option>
                                                                                            <option value="D">D</option>
                                                                                        </select>
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="block text-[9px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider mb-0.5">Difficulty Tier</label>
                                                                                        <select 
                                                                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                                                                            value={editDiff} 
                                                                                            onChange={e => setEditDiff(e.target.value)}
                                                                                        >
                                                                                            <option value="EASY">EASY</option>
                                                                                            <option value="MEDIUM">MEDIUM</option>
                                                                                            <option value="HARD">HARD</option>
                                                                                        </select>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex gap-2 justify-end pt-1">
                                                                                    <button 
                                                                                        type="button" 
                                                                                        onClick={() => setEditingQuestionId(null)}
                                                                                        className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-lg font-semibold transition-colors"
                                                                                    >
                                                                                        Cancel
                                                                                    </button>
                                                                                    <button 
                                                                                        type="submit" 
                                                                                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-550 text-white rounded-lg font-semibold transition-colors"
                                                                                    >
                                                                                        Save
                                                                                    </button>
                                                                                </div>
                                                                            </form>
                                                                        ) : (
                                                                            <div className="space-y-1.5">
                                                                                <div className="flex items-start justify-between gap-4">
                                                                                    <span className="font-bold text-slate-400 select-none mr-0.5">{idx + 1}.</span>
                                                                                    <span className="flex-1 font-medium text-slate-800 dark:text-slate-200">{q.content}</span>
                                                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold select-none tracking-wider ${
                                                                                        q.difficulty === 'EASY' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' :
                                                                                        q.difficulty === 'HARD' ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400' :
                                                                                        'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                                                                                    }`}>
                                                                                        {q.difficulty}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-4">
                                                                                    {opts && opts.map(o => (
                                                                                        <div key={o.id} className={`flex items-center gap-1.5 p-1.5 rounded-lg border ${
                                                                                            o.id === q.correct_option_id 
                                                                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-450 font-bold' 
                                                                                                : 'bg-transparent border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-455'
                                                                                        }`}>
                                                                                            <span className="font-black">{o.id}:</span>
                                                                                            <span className="truncate">{o.text}</span>
                                                                                            {o.id === q.correct_option_id && <CheckCircle2 size={10} className="text-emerald-500 dark:text-emerald-455 shrink-0" />}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                                <div className="flex gap-2 justify-end pt-1">
                                                                                    <button 
                                                                                        onClick={() => handleStartEdit(q)}
                                                                                        className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-350 rounded-md font-semibold transition-colors"
                                                                                    >
                                                                                        Edit
                                                                                    </button>
                                                                                    <button 
                                                                                        onClick={() => handleDeleteQuestion(q.id)}
                                                                                        className="px-2 py-0.5 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-md font-semibold transition-colors"
                                                                                    >
                                                                                        Delete
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {showDeleteTopicModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-xl animate-in zoom-in-95 duration-200 text-center space-y-4">
                        <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center">
                            <Trash2 size={24} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Topic?</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Are you sure you want to delete the topic "{topic.title}"? All learning materials, quizzes, and student progress for this topic will be permanently deleted!
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowDeleteTopicModal(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    setShowDeleteTopicModal(false);
                                    try {
                                        await api.deleteTopic(topic.id);
                                        if (window.showToast) {
                                            window.showToast("Topic deleted successfully", "success");
                                        }
                                        onReloadTopics();
                                    } catch (err) {
                                        alert(err.message || "Failed to delete topic");
                                    }
                                }}
                                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-550 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteMaterialTarget && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-xl animate-in zoom-in-95 duration-200 text-center space-y-4">
                        <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center">
                            <Trash2 size={24} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Material?</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Are you sure you want to delete the study material "{deleteMaterialTarget.title}"?
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setDeleteMaterialTarget(null)}
                                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    const targetId = deleteMaterialTarget.id;
                                    setDeleteMaterialTarget(null);
                                    try {
                                        const data = await api.deleteMaterial(targetId);
                                        if (data.success) {
                                            if (window.showToast) {
                                                window.showToast('Material deleted successfully!', 'success');
                                            }
                                            setMaterials(prev => prev.filter(m => m.id !== targetId));
                                        }
                                    } catch (err) {
                                        if (window.showToast) {
                                            window.showToast(err.message || 'Failed to delete material', 'error');
                                        } else {
                                            alert(err.message || 'Failed to delete material');
                                        }
                                    }
                                }}
                                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-550 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteQuizTarget && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-xl animate-in zoom-in-95 duration-200 text-center space-y-4">
                        <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center">
                            <Trash2 size={24} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Quiz?</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Are you sure you want to delete the quiz "{deleteQuizTarget.title}"? All its questions and student attempts will be deleted permanently.
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setDeleteQuizTarget(null)}
                                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    const targetId = deleteQuizTarget.id;
                                    setDeleteQuizTarget(null);
                                    try {
                                        await api.deleteQuiz(targetId);
                                        setQuizzes(prev => prev.filter(q => q.id !== targetId));
                                        if (selectedQuizForQuestion === targetId) {
                                            setSelectedQuizForQuestion(null);
                                        }
                                        if (window.showToast) {
                                            window.showToast('Quiz deleted successfully!', 'success');
                                        }
                                    } catch (err) {
                                        alert(err.message || 'Failed to delete quiz.');
                                    }
                                }}
                                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-550 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {checkoutMaterial && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
                                <Lock size={22} className="animate-pulse" />
                            </div>
                            <button
                                onClick={() => setCheckoutMaterial(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Premium Learning Material</span>
                            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                                {checkoutMaterial.title}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                This {checkoutMaterial.type === 'VIDEO' ? 'video tutorial' : 'document notes'} is premium content. Get instant lifetime access to review and learn at any time.
                            </p>
                        </div>

                        {purchaseError && (
                            <div className="bg-rose-500/10 text-rose-500 border border-rose-500/20 p-3 rounded-xl text-xs">
                                {purchaseError}
                            </div>
                        )}

                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Amount to Pay</p>
                                <p className="text-2xl font-black text-slate-850 dark:text-white mt-0.5">₹{Math.round(checkoutMaterial.price)}</p>
                            </div>
                            <span className="bg-indigo-100/50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                Razorpay Secure
                            </span>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setCheckoutMaterial(null)}
                                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePurchaseMaterial}
                                disabled={purchaseLoading}
                                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-xl text-xs font-bold shadow-sm transition-all inline-flex items-center justify-center gap-1.5"
                            >
                                {purchaseLoading ? (
                                    <>
                                        <div className="w-3.5 h-3.5 rounded-full border border-white border-t-transparent animate-spin" />
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <span>Pay & Unlock</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function CourseView({ course, onBack, onSelectQuiz, onAskTutor }) {
    const { user } = useAuth();
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEnrolled, setIsEnrolled] = useState(user.role !== 'STUDENT');
    const [enrollLoading, setEnrollLoading] = useState(false);

    // Topic forms
    const [topicTitle, setTopicTitle] = useState('');
    const [topicDesc, setTopicDesc] = useState('');
    const [topicOrder, setTopicOrder] = useState('1');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Active material viewer
    const [activeMaterial, setActiveMaterial] = useState(null);
    const [showDeleteCourseModal, setShowDeleteCourseModal] = useState(false);

    useEffect(() => {
        loadTopics();
        if (user.role === 'STUDENT') {
            checkEnrollment();
        }
    }, [course.id]);

    const checkEnrollment = async () => {
        try {
            const enrolled = await api.getEnrolledCourses();
            const enrolledIds = enrolled.map(c => c.id);
            setIsEnrolled(enrolledIds.includes(course.id));
        } catch (err) {
            console.error('Error checking enrollment status:', err.message);
        }
    };

    const handleEnroll = async () => {
        setEnrollLoading(true);
        try {
            const enrollRes = await api.enrollInCourse(course.id);
            
            // Case 1: Enrollment free or direct
            if (!enrollRes.paymentRequired) {
                if (window.showToast) {
                    window.showToast(enrollRes.message || 'Enrolled successfully!', 'success');
                } else {
                    alert(enrollRes.message || 'Enrolled successfully!');
                }
                setIsEnrolled(true);
                return;
            }

            // Case 2: Checkout required via Razorpay
            const orderData = await api.createPaymentOrder(course.id);

            const options = {
                key: orderData.key || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_dummy_id',
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'TailorLearn',
                description: `Purchase Course: ${course.title}`,
                order_id: orderData.orderId,
                handler: async function (response) {
                    try {
                        const verifyRes = await api.verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });
                        
                        if (verifyRes.success) {
                            if (window.showToast) {
                                window.showToast('Payment verified and course unlocked successfully!', 'success');
                            } else {
                                alert('Payment verified and course unlocked successfully!');
                            }
                            setIsEnrolled(true);
                        }
                    } catch (verifyErr) {
                        if (window.showToast) {
                            window.showToast(`Payment verification failed: ${verifyErr.message}`, 'error');
                        } else {
                            alert(`Payment verification failed: ${verifyErr.message}`);
                        }
                    }
                },
                prefill: {
                    name: `${user.firstName || ''} ${user.lastName || ''}`,
                    email: user.email
                },
                theme: {
                    color: '#6366f1'
                }
            };

            if (!window.Razorpay) {
                throw new Error('Razorpay Checkout SDK is loading. Please try again in a few seconds.');
            }

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (err) {
            if (window.showToast) {
                window.showToast(err.message || 'Error occurred during enrollment.', 'error');
            } else {
                alert(err.message || 'Error occurred during enrollment.');
            }
        } finally {
            setEnrollLoading(false);
        }
    };

    async function loadTopics() {
        setLoading(true);
        try {
            const list = await api.getTopics(course.id);
            setTopics(list);
            setTopicOrder((list.length + 1).toString());
        } catch (err) {
            console.error('Error fetching topics:', err.message);
        } finally {
            setLoading(false);
        }
    }



    const handleDeleteCourse = async () => {
        try {
            await api.deleteCourse(course.id);
            if (window.showToast) {
                window.showToast("Course deleted successfully", "success");
            }
            onBack();
        } catch (err) {
            alert(err.message || "Failed to delete course");
        }
    };

    const handleCreateTopic = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (!topicTitle) {
            setError('Topic title is required');
            return;
        }

        try {
            await api.createTopic(
                course.id, 
                topicTitle, 
                topicDesc, 
                parseInt(topicOrder)
            );
            setSuccess(true);
            setTopicTitle('');
            setTopicDesc('');
            loadTopics();
        } catch (err) {
            setError(err.message || 'Failed to create topic');
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Back Button */}
            <button 
                onClick={onBack} 
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-800/80 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors shadow-xs"
            >
                <ArrowLeft size={14} />
                <span>Back to Catalog</span>
            </button>

            {/* Course details card */}
            <div className="bg-gradient-to-br from-indigo-50/60 via-white to-slate-50/60 dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-950 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex-1">
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                        {course.title}
                    </h1>
                    <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-3xl">
                        {course.description || 'No description provided for this course.'}
                    </p>
                    
                    {user.role === 'STUDENT' && (
                        <div className="mt-6 flex items-center gap-2">
                            <span className="text-xs text-slate-400">Class Progress:</span>
                            {isEnrolled ? (
                                <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 text-[10px] font-bold px-2.5 py-1 rounded-xl uppercase tracking-wider">
                                    Active Student
                                </span>
                            ) : (
                                <span className="bg-amber-55/20 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-xl uppercase tracking-wider">
                                    Preview Mode
                                </span>
                            )}
                        </div>
                    )}
                </div>
                {user.role === 'STUDENT' && (
                    <div className="flex flex-wrap gap-3 self-start md:self-auto shrink-0 mt-4 md:mt-0">
                        <button
                            onClick={() => {
                                if (!isEnrolled) {
                                    if (window.showToast) {
                                        window.showToast("Please enroll in the course to use the AI Tutor.", "warning");
                                    } else {
                                        alert("Please enroll in the course to use the AI Tutor.");
                                    }
                                } else {
                                    onAskTutor && onAskTutor(course.id, course.title);
                                }
                            }}
                            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 ${
                                isEnrolled 
                                    ? "bg-indigo-600 hover:bg-indigo-550 text-white" 
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200/50 dark:border-slate-700/50"
                            }`}
                        >
                            <Sparkles size={14} />
                            <span>Ask AI Tutor about Course</span>
                        </button>
                        
                        {!isEnrolled && (
                            <button
                                onClick={handleEnroll}
                                disabled={enrollLoading}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-650 hover:bg-emerald-550 disabled:bg-emerald-450 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0"
                            >
                                <CreditCard size={14} />
                                <span>{enrollLoading ? "Opening..." : parseFloat(course.price) === 0 ? "Enroll for Free" : `Buy Course - ₹${course.price}`}</span>
                            </button>
                        )}
                    </div>
                )}
                {user.role === 'TEACHER' && (
                    <button
                        onClick={() => setShowDeleteCourseModal(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/30 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 self-start md:self-auto"
                    >
                        <Trash2 size={14} />
                        <span>Delete Course</span>
                    </button>
                )}
            </div>

            {/* Curriculum grid layout */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                
                {/* Topics Accordion List */}
                <div className="lg:col-span-3 space-y-4">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-2">
                        <ClipboardList size={16} className="text-indigo-600 dark:text-indigo-400" />
                        <span>Curriculum Outline</span>
                    </h2>

                    {loading ? (
                        <div className="text-slate-400 text-sm">Loading syllabus nodes...</div>
                    ) : topics.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                            No topics have been structured for this syllabus yet.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {topics.map((topic, index) => (
                                <TopicNode 
                                    key={topic.id} 
                                    topic={topic} 
                                    index={index} 
                                    isStudent={user.role === 'STUDENT'} 
                                    isEnrolled={isEnrolled}
                                    onSelectQuiz={onSelectQuiz} 
                                    onSelectMaterial={(material) => setActiveMaterial(material)}
                                    role={user.role}
                                    onReloadTopics={loadTopics}
                                    onAskTutor={(topicId, topicTitle) => onAskTutor && onAskTutor(topicId, topicTitle)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Add Topic form (Teacher only) */}
                {user.role === 'TEACHER' && (
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                            <Plus size={18} className="text-indigo-600 dark:text-indigo-400" />
                            <span>Add Curriculum Topic</span>
                        </h2>

                        {error && (
                            <div className="bg-rose-500/10 text-rose-500 border border-rose-500/20 p-3 rounded-xl text-xs mb-4">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 p-3 rounded-xl text-xs mb-4">
                                Topic node added successfully!
                            </div>
                        )}

                        <form onSubmit={handleCreateTopic} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Topic Title</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-850 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                    placeholder="e.g. Memory Layout"
                                    value={topicTitle}
                                    onChange={(e) => setTopicTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Sequence Order</label>
                                <input 
                                    type="number" 
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-850 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                    value={topicOrder}
                                    onChange={(e) => setTopicOrder(e.target.value)}
                                    min="1"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Description</label>
                                <textarea 
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-850 dark:text-slate-100 focus:outline-none focus:border-indigo-500" 
                                    rows="3"
                                    placeholder="Overview..."
                                    value={topicDesc}
                                    onChange={(e) => setTopicDesc(e.target.value)}
                                />
                            </div>

                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                                Publish Topic Node
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* Embedded Premium Material Viewer Modal */}
            {activeMaterial && (
                <div className="fixed inset-0 bg-slate-950/80 dark:bg-slate-950/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-250 truncate pr-6">
                                {activeMaterial.type === 'VIDEO' ? '🎥 Watching Video' : '📄 Reading Notes'}: {activeMaterial.title}
                            </h3>
                            <button 
                                onClick={() => setActiveMaterial(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors text-lg p-1 font-semibold"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 p-6 bg-slate-950 flex flex-col justify-center items-center overflow-hidden">
                            {activeMaterial.type === 'VIDEO' ? (
                                <video 
                                    src={activeMaterial.file_url} 
                                    controls 
                                    autoPlay
                                    className="w-full h-full rounded-lg object-contain shadow-md"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col">
                                    <iframe 
                                        src={activeMaterial.file_url}
                                        className="w-full h-full border-none rounded-lg bg-white" 
                                        title={activeMaterial.title}
                                    />
                                    <p className="text-xs text-slate-450 dark:text-slate-500 mt-3 text-center">
                                        Trouble loading document preview? <a href={activeMaterial.file_url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 font-bold hover:underline">Open raw PDF file in new browser tab</a>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-end bg-slate-50 dark:bg-slate-900">
                            <button 
                                onClick={() => setActiveMaterial(null)} 
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors"
                            >
                                Close Viewer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteCourseModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-xl animate-in zoom-in-95 duration-200 text-center space-y-4">
                        <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center">
                            <Trash2 size={24} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Course?</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Are you sure you want to delete this entire course? This will permanently remove all topics, learning materials, quizzes, and student progress!
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowDeleteCourseModal(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowDeleteCourseModal(false);
                                    handleDeleteCourse();
                                }}
                                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-555 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
