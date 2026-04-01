import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  return (
    <div className="fixed bottom-8 right-8 z-[1000] flex flex-col gap-4">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`flex items-center gap-4 p-5 rounded-[4px] shadow-2xl border backdrop-blur-xl min-w-[320px] max-w-md ${
              toast.type === 'success' 
                ? 'bg-success/5 border-success/20 text-success' 
                : 'bg-coral/5 border-coral/20 text-coral'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-[11px] font-black uppercase tracking-tight flex-1">{toast.message}</p>
            <button 
              onClick={() => onRemove(toast.id)}
              className="p-1 hover:bg-white/10 rounded-[2px] transition-all active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
