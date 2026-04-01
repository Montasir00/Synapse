import React from 'react';
import { Play, Pause, RotateCcw, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task } from '../types';

interface FloatingTimerProps {
  activeTask: Task | null;
  seconds: number;
  isActive: boolean;
  onToggle: () => void;
  onReset: () => void;
  onClose: () => void;
}

export default function FloatingTimer({ 
  activeTask, 
  seconds, 
  isActive, 
  onToggle, 
  onReset, 
  onClose 
}: FloatingTimerProps) {
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {activeTask && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.9 }}
          className="fixed bottom-8 right-8 z-[150] pointer-events-auto"
        >
          <div className="glass-card p-4 flex items-center gap-6 shadow-2xl border-white/10 min-w-[320px]">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center relative overflow-hidden border border-accent/20">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className={`absolute inset-[-2px] border border-accent border-t-transparent border-r-transparent rounded-full ${!isActive && 'pause-animation'}`}
              />
              <Clock className="w-5 h-5 text-accent" />
            </div>

            <div className="flex-1">
              <p className="text-[9px] font-black text-accent uppercase tracking-[0.2em] mb-1">Execution_State</p>
              <h4 className="text-xs font-display font-bold text-ink hover:text-accent transition-colors line-clamp-1 uppercase tracking-tight">{activeTask.title}</h4>
              <p className="text-2xl font-mono font-black text-ink tabular-nums mt-1 tracking-tighter">{formatTime(seconds)}</p>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={onToggle}
                className="w-10 h-10 rounded-full bg-ink text-bg flex items-center justify-center hover:bg-accent transition-all active:scale-95 shadow-lg shadow-accent/10"
              >
                {isActive ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              </button>
              <button 
                onClick={onReset}
                className="w-10 h-10 rounded-full bg-white/5 text-muted hover:text-coral hover:bg-coral/10 transition-all border border-white/5 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 text-muted hover:text-ink hover:bg-white/10 transition-all border border-white/5 active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
