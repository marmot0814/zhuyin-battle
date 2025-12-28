import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = '確認',
  cancelText = '取消',
  onConfirm,
  onCancel,
  isDangerous = false
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-slate-300">{message}</p>
        </div>
        
        <div className="flex border-t border-slate-700">
          <button
            onClick={onCancel}
            className="flex-1 py-3 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors font-medium"
          >
            {cancelText}
          </button>
          <div className="w-px bg-slate-700"></div>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 font-bold transition-colors ${
              isDangerous 
                ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' 
                : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
