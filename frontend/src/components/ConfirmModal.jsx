import React from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

export default function ConfirmModal({
    isOpen,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed with this action?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmVariant = 'danger',
    onConfirm,
    onCancel
}) {
    if (!isOpen) return null;

    const variantStyles = {
        danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20',
        warning: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20',
        primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-2xl ${
                            confirmVariant === 'danger'
                                ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                : confirmVariant === 'warning'
                                    ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        }`}>
                            {confirmVariant === 'danger' || confirmVariant === 'warning' ? (
                                <AlertTriangle size={22} />
                            ) : (
                                <Info size={22} />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {title}
                            </h3>
                        </div>
                    </div>
                    <button 
                        onClick={onCancel}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    >
                        <X size={18} />
                    </button>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {message}
                </p>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`px-5 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all ${
                            variantStyles[confirmVariant] || variantStyles.danger
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
