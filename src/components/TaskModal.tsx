import React, { useState, useEffect, useRef } from 'react';
import { X, Type, AlignLeft, Flag, Calendar, ChevronDown, Target, Repeat, Plus, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Subtask } from '../types';
import { haptics } from '../utils/haptics';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id'> | Partial<Task>) => void | Promise<void>;
  task?: Task;
}

export default function TaskModal({ isOpen, onClose, onSave, task }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('Low');
  const [status, setStatus] = useState<Task['status']>('todo');
  const [dueDate, setDueDate] = useState('');
  const [taskCategory, setTaskCategory] = useState<Task['taskCategory']>('daily');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [recurrence, setRecurrence] = useState<NonNullable<Task['recurrence']>>({ type: 'none' });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const trimmedTitle = title.trim();
  const titleError = submitAttempted && !trimmedTitle;

  const generateId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2, 11);
  };

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setStatus(task.status);
      setDueDate(task.dueDate || '');
      setTaskCategory(task.taskCategory || 'daily');
      setSubtasks(task.subtasks || []);
      setRecurrence(task.recurrence || { type: 'daily' });
    } else {
      setTitle('');
      setDescription('');
      setPriority('Low');
      setStatus('todo');
      setDueDate(new Date().toISOString().split('T')[0]);
      setTaskCategory('daily');
      setSubtasks([]);
      setRecurrence({ type: 'none' });
    }
    setSubmitAttempted(false);
  }, [task, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusFirstElement = () => {
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      focusable[0]?.focus();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!dialogRef.current) return;

      if (event.key === 'Escape' && !isSubmitting) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const timer = window.setTimeout(focusFirstElement, 0);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, isSubmitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!trimmedTitle) {
      haptics.error();
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      await Promise.resolve(onSave({ 
        title: trimmedTitle,
        description, 
        priority, 
        status, 
        taskCategory,
        subtasks: taskCategory === 'long-term' ? subtasks : [],
        recurrence: taskCategory === 'daily' ? recurrence : null,
        dueDate: dueDate || null
      }));
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks([...subtasks, { id: generateId(), title: newSubtask, isCompleted: false }]);
    setNewSubtask('');
    haptics.light();
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
    haptics.light();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-label={task ? 'Edit task' : 'Create task'}>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-bg/80 backdrop-blur-xl"
          />
          
          <motion.div 
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative bg-surface w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden rounded-[42px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-border"
          >
            {/* Glossy Header Overlay */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none z-10" />

            <div className="relative flex-1 overflow-y-auto scrollbar-custom p-6 sm:p-10">
              {/* Header */}
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-3 h-3 rounded-full bg-accent animate-ping absolute inset-0" />
                    <div className="w-3 h-3 rounded-full bg-accent relative" />
                  </div>
                  <span className="text-[11px] font-black text-ink uppercase tracking-[0.25em]">{task ? 'System: Update Task' : 'System: Create Task'}</span>
                </div>
                <button 
                  onClick={() => !isSubmitting && onClose()}
                  className="w-10 h-10 rounded-full bg-surface-subtle/50 flex items-center justify-center text-muted hover:text-accent hover:bg-accent/5 transition-all border border-border"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form className="space-y-10" onSubmit={handleSubmit}>
                {/* Hero Title Field */}
                <div className="space-y-4 group">
                  <div className="flex justify-between items-end px-1">
                    <label htmlFor="task-title" className="text-[10px] font-black text-muted/60 uppercase tracking-[0.2em]">Objective Descriptor</label>
                    <div className="flex items-center gap-1.5 text-accent">
                      <Sparkles className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Priority Sync</span>
                    </div>
                  </div>
                  
                  <div className={`relative flex items-center p-6 sm:p-8 bg-surface-subtle/30 rounded-[32px] border-2 transition-all duration-300 ${titleError ? 'border-alert/50' : 'border-border group-focus-within:border-accent group-focus-within:bg-accent/[0.02]'}`}>
                    <Type className="text-accent/40 w-6 h-6 mr-4" />
                    <input 
                      id="task-title"
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={() => setSubmitAttempted(true)}
                      placeholder="ENTER OBJECTIVE TITLE..." 
                      className="w-full bg-transparent text-xl sm:text-2xl font-display font-black outline-none transition-colors placeholder:text-muted/30 text-ink uppercase tracking-tight"
                      required
                      autoFocus
                    />
                  </div>
                  {titleError && (
                    <p className="text-[10px] font-black text-alert uppercase tracking-widest px-2">Objective descriptor required</p>
                  )}
                </div>

                {/* Category Grid */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-muted/60 uppercase tracking-[0.2em] px-1">Engagement Framework</p>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => { setTaskCategory('daily'); haptics.light(); }}
                      className={`flex flex-col items-center justify-center p-6 rounded-[32px] border-2 transition-all duration-300 ${taskCategory === 'daily' ? 'bg-accent/10 border-accent/40 text-accent shadow-xl shadow-accent/10' : 'bg-surface-subtle/30 border-border text-muted hover:bg-surface'}`}
                    >
                      <Repeat className={`w-6 h-6 mb-3 transition-transform ${taskCategory === 'daily' ? 'scale-110' : ''}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Iterative (Daily)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTaskCategory('long-term'); haptics.light(); }}
                      className={`flex flex-col items-center justify-center p-6 rounded-[32px] border-2 transition-all duration-300 ${taskCategory === 'long-term' ? 'bg-accent/10 border-accent/40 text-accent shadow-xl shadow-accent/10' : 'bg-surface-subtle/30 border-border text-muted hover:bg-surface'}`}
                    >
                      <Target className={`w-6 h-6 mb-3 transition-transform ${taskCategory === 'long-term' ? 'scale-110' : ''}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Linear (Long-term)</span>
                    </button>
                  </div>
                </div>

                {/* Task Specific Context */}
                <AnimatePresence mode="wait">
                  {taskCategory === 'long-term' ? (
                    <motion.div 
                      key="long-term"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6 p-6 sm:p-8 bg-surface-subtle/30 border border-border rounded-[32px] backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-black text-muted/60 uppercase tracking-[0.2em]">Project Checkpoints</label>
                        <span className="text-[10px] font-black text-accent uppercase tracking-widest">[{subtasks.length} SECURED]</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={newSubtask}
                          onChange={(e) => setNewSubtask(e.target.value)}
                          placeholder="ADD CHECKPOINT..."
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                          className="flex-1 bg-surface/50 rounded-2xl py-3.5 px-6 text-xs font-bold focus:border-accent/40 outline-none transition-all border border-border text-ink placeholder:text-muted/40 uppercase tracking-widest"
                        />
                        <button 
                          type="button"
                          onClick={handleAddSubtask}
                          className="w-12 h-12 bg-accent text-white rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20 active:scale-95 transition-transform"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>

                      {subtasks.length > 0 && (
                        <div className="space-y-2 mt-4 max-h-[200px] overflow-y-auto no-scrollbar pr-2">
                          {subtasks.map((st) => (
                            <motion.div 
                              layout
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              key={st.id} 
                              className="flex items-center justify-between bg-surface/50 p-4 rounded-2xl border border-border group/sub"
                            >
                              <span className="text-[10px] font-black text-ink px-2 uppercase tracking-widest">{st.title}</span>
                              <button type="button" onClick={() => handleRemoveSubtask(st.id)} className="text-muted hover:text-alert p-1 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="daily"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6 p-6 sm:p-8 bg-surface-subtle/30 border border-border rounded-[32px] backdrop-blur-sm"
                    >
                      <label className="text-[10px] font-black text-muted/60 uppercase tracking-[0.2em] px-1">Recurrence Protocol</label>
                      <div className="relative">
                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-muted w-4 h-4 pointer-events-none" />
                        <select 
                          value={recurrence.type}
                          onChange={(e) => setRecurrence({ ...recurrence, type: e.target.value as any })}
                          className="w-full bg-surface/50 rounded-2xl py-4 px-6 text-xs font-black focus:border-accent/40 outline-none transition-all appearance-none cursor-pointer border border-border text-ink uppercase tracking-[0.2em]"
                        >
                          <option value="none">One Time Only</option>
                          <option value="daily">Every Day</option>
                          <option value="weekly">Specific Days</option>
                          <option value="monthly">Specific Date</option>
                        </select>
                      </div>
                      
                      {recurrence.type === 'weekly' && (
                        <div className="flex justify-between gap-1 pt-2">
                          {['S','M','T','W','T','F','S'].map((day, idx) => {
                            const active = recurrence.daysOfWeek?.includes(idx);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  const current = recurrence.daysOfWeek || [];
                                  if (active) setRecurrence({ ...recurrence, daysOfWeek: current.filter(d => d !== idx) });
                                  else setRecurrence({ ...recurrence, daysOfWeek: [...current, idx] });
                                  haptics.light();
                                }}
                                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl text-[10px] font-black flex items-center justify-center transition-all ${active ? 'bg-accent text-white shadow-lg' : 'bg-surface/50 text-muted border border-border'}`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Additional Vitals */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted/60 uppercase tracking-[0.2em] px-1">Priority Tier</label>
                    <div className="relative">
                      <Flag className="absolute left-5 top-1/2 -translate-y-1/2 text-accent/50 w-4 h-4 pointer-events-none" />
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-muted w-4 h-4 pointer-events-none" />
                      <select 
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as Task['priority'])}
                        className="w-full bg-surface-subtle/50 rounded-2xl py-4 pl-12 pr-10 text-xs font-black focus:border-accent/40 outline-none transition-all appearance-none cursor-pointer border border-border text-ink uppercase tracking-[0.2em]"
                      >
                        <option value="High">Priority: High</option>
                        <option value="Medium">Priority: Medium</option>
                        <option value="Low">Priority: Low</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted/60 uppercase tracking-[0.2em] px-1">Target Deadline</label>
                    <div className="relative group">
                      <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-accent/50 w-4 h-4 transition-colors group-focus-within:text-accent" />
                      <input 
                        type="date" 
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full bg-surface-subtle/50 rounded-2xl py-4 pl-12 pr-5 text-xs font-black focus:border-accent/40 outline-none transition-all border border-border text-ink [color-scheme:light] tracking-widest"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-muted/60 uppercase tracking-[0.2em] px-1">Supplemental Logic</label>
                  <div className="relative group">
                    <AlignLeft className="absolute left-5 top-4.5 text-muted w-4 h-4 transition-colors group-focus-within:text-accent" />
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="APPEND DETAIL..." 
                      className="w-full bg-surface-subtle/50 rounded-[28px] py-4 pl-12 pr-5 text-xs font-bold focus:border-accent/40 outline-none transition-all min-h-[120px] resize-none border border-border text-ink placeholder:text-muted/40 uppercase tracking-widest"
                    />
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative w-full h-16 bg-accent rounded-[24px] overflow-hidden shadow-[0_12px_24px_-8px_rgba(var(--accent-rgb),0.3)] active:scale-[0.98] transition-all"
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-center justify-center gap-3">
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <span className="text-sm font-black text-white uppercase tracking-[0.3em]">{task ? 'Commit Update' : 'Initialize Objective'}</span>
                      )}
                    </div>
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
