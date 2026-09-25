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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-[#00262b]/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#ffffff] border border-[#edebe3] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-full ${
                            confirmVariant === 'danger'
                                ? 'bg-[#f3f1ed] text-[#d64000]'
                                : 'bg-[#f3f1ed] text-[#04c5e7]'
                        }`}>
                            {confirmVariant === 'danger' || confirmVariant === 'warning' ? (
                                <AlertTriangle size={22} />
                            ) : (
                                <Info size={22} />
                            )}
                        </div>
                        <div>
                            <h3 className="text-xl font-extrabold text-[#00262b]">
                                {title}
                            </h3>
                        </div>
                    </div>
                    <button 
                        onClick={onCancel}
                        className="text-[#52716c] hover:text-[#00262b] p-1 rounded-full hover:bg-[#f9f8f6]"
                    >
                        <X size={18} />
                    </button>
                </div>

                <p className="text-sm text-[#52716c] leading-relaxed">
                    {message}
                </p>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f3f1ed]">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="btn-ghost !text-xs !py-2 !px-4"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={confirmVariant === 'danger' ? "btn-filled !text-xs !py-2 !px-5" : "btn-primary !text-xs !py-2 !px-5"}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
