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

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 pb-6 bg-[#00262b]/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#ffffff] dark:bg-[var(--color-bg-card)] border border-[#edebe3] dark:border-[var(--color-border)] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl space-y-5 max-h-[90dvh] overflow-y-auto">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-full shrink-0 ${
                            confirmVariant === 'danger'
                                ? 'bg-[#f3f1ed] dark:bg-[var(--color-bg-neutral)] text-[#d64000] dark:text-[#ff7043]'
                                : 'bg-[#f3f1ed] dark:bg-[var(--color-bg-neutral)] text-[#04c5e7]'
                        }`}>
                            {confirmVariant === 'danger' || confirmVariant === 'warning' ? (
                                <AlertTriangle size={22} />
                            ) : (
                                <Info size={22} />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg sm:text-xl font-extrabold text-[#00262b] dark:text-[var(--color-text)] leading-tight">
                                {title}
                            </h3>
                        </div>
                    </div>
                    <button 
                        onClick={onCancel}
                        aria-label="Close modal"
                        className="text-[#52716c] dark:text-[var(--color-text-secondary)] hover:text-[#00262b] dark:hover:text-[var(--color-text)] min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-[var(--row-hover-bg)] transition-colors shrink-0"
                    >
                        <X size={18} />
                    </button>
                </div>

                <p className="text-xs sm:text-sm text-[#52716c] dark:text-[var(--color-text-secondary)] leading-relaxed">
                    {message}
                </p>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f3f1ed] dark:border-[var(--color-border)]">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="btn-ghost !text-xs !py-2.5 !px-4 min-h-[44px]"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={confirmVariant === 'danger' ? "btn-filled !text-xs !py-2.5 !px-5 min-h-[44px]" : "btn-primary !text-xs !py-2.5 !px-5 min-h-[44px]"}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
