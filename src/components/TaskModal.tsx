import React, { useState, useEffect } from 'react';
import { X, Type, AlignLeft, Flag, Calendar, ChevronDown, Target, Workflow, Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Subtask } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id'> | Partial<Task>) => void;
  task?: Task;
}

export default function TaskModal({ isOpen, onClose, onSave, task }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('Medium');
  const [status, setStatus] = useState<Task['status']>('todo');
  const [dueDate, setDueDate] = useState('');
  const [taskCategory, setTaskCategory] = useState<Task['taskCategory']>('standard');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [recurrence, setRecurrence] = useState<NonNullable<Task['recurrence']>>({ type: 'daily' });

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setStatus(task.status);
      setDueDate(task.dueDate || '');
      setTaskCategory(task.taskCategory || 'standard');
      setSubtasks(task.subtasks || []);
      setRecurrence(task.recurrence || { type: 'daily' });
    } else {
      setTitle('');
      setDescription('');
      setPriority('Medium');
      setStatus('todo');
      setDueDate(new Date().toISOString().split('T')[0]);
      setTaskCategory('daily');
      setSubtasks([]);
      setRecurrence({ type: 'daily' });
    }
  }, [task, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    onSave({ 
      title, 
      description, 
      priority, 
      status, 
      taskCategory,
      subtasks: taskCategory === 'long-term' ? subtasks : [],
      recurrence: taskCategory === 'daily' ? recurrence : null,
      dueDate: dueDate || null
    });
    
    onClose();
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks([...subtasks, { id: Math.random().toString(36).substr(2, 9), title: newSubtask, isCompleted: false }]);
    setNewSubtask('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative bg-surface w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-white/5"
          >
            <div className="p-8 lg:p-10">
              <div className="flex justify-end items-center mb-6">
                <button 
                  onClick={onClose}
                  className="w-12 h-12 rounded-full bg-white/[0.03] flex items-center justify-center text-muted hover:text-accent hover:bg-accent/5 transition-all border border-white/5 active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form className="space-y-8" onSubmit={handleSubmit}>
                <div className="space-y-3">
                  <label className="micro-label opacity-40">Task Name</label>
                  <div className="relative group">
                    <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/30 group-focus-within:text-accent w-4 h-4 transition-colors" />
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Define mission protocol..." 
                      className="w-full bg-black/10 rounded-full py-5 pl-12 pr-5 text-sm font-semibold focus:border-accent/30 outline-none transition-all border border-white/5 text-ink placeholder:text-muted/30"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="micro-label opacity-40">Description</label>
                  <div className="relative group">
                    <AlignLeft className="absolute left-4 top-4 text-muted/30 group-focus-within:text-accent w-4 h-4 transition-colors" />
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Append supplemental details..." 
                      className="w-full bg-black/10 rounded-[32px] py-5 pl-12 pr-5 text-sm font-semibold focus:border-accent/30 outline-none transition-all min-h-[120px] resize-none border border-white/5 text-ink placeholder:text-muted/30"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="micro-label opacity-40">Task Type</label>
                  <div className="grid grid-cols-3 gap-2">

                    <button
                      type="button"
                      onClick={() => setTaskCategory('daily')}
                      className={`flex flex-col items-center justify-center p-5 rounded-[32px] border transition-all duration-300 ${taskCategory === 'daily' ? 'bg-accent/5 border-accent/20 text-accent ring-1 ring-accent/10 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'bg-black/10 border-white/5 text-muted/50 hover:text-ink/80 hover:bg-white/5'}`}
                    >
                      <Repeat className="w-6 h-6 mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-center">Daily Protocols</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskCategory('long-term')}
                      className={`flex flex-col items-center justify-center p-3 rounded-[32px] border transition-all ${taskCategory === 'long-term' ? 'bg-accent/10 border-accent/40 text-accent shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'bg-black/20 border-white/5 text-muted hover:text-ink hover:bg-white/5'}`}
                    >
                      <Target className="w-5 h-5 mb-2" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-center">Long-Term<br/>Goal</span>
                    </button>
                  </div>
                </div>

                {taskCategory === 'long-term' && (
                  <div className="space-y-4 p-8 bg-white/[0.01] border border-white/5 rounded-[32px]">
                    <div className="flex items-center justify-between">
                      <label className="micro-label opacity-40">Subtask Protocol</label>
                      <span className="text-[9px] font-bold text-muted uppercase tracking-widest">({subtasks.length} Checkpoints)</span>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        placeholder="Define checkpoint..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSubtask();
                          }
                        }}
                        className="flex-1 bg-black/20 rounded-full py-3 px-6 text-xs font-medium focus:border-accent/40 outline-none transition-all border border-white/5 text-ink"
                      />
                      <button 
                        type="button"
                        onClick={handleAddSubtask}
                        className="px-6 bg-white/10 text-ink rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-white transition-colors border border-white/5"
                      >
                        Add
                      </button>
                    </div>
                    {subtasks.length > 0 && (
                      <div className="space-y-2 mt-4">
                        {subtasks.map((st) => (
                          <div key={st.id} className="flex flex-row items-center justify-between bg-black/40 p-4 rounded-full border border-white/5">
                            <span className="text-xs font-bold text-ink px-2">{st.title}</span>
                            <button type="button" onClick={() => handleRemoveSubtask(st.id)} className="text-muted/30 hover:text-alert p-1 mr-1">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {taskCategory === 'daily' && (
                  <div className="space-y-4 p-8 bg-white/[0.01] border border-white/5 rounded-[32px]">
                    <label className="micro-label opacity-40 border-b border-white/5 pb-2 block">Advanced Recurrence Matrix</label>
                    <div className="space-y-4">
                      <div className="relative group">
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted/30 w-4 h-4 pointer-events-none" />
                        <select 
                          value={recurrence.type}
                          onChange={(e) => setRecurrence({ ...recurrence, type: e.target.value as any })}
                          className="w-full bg-black/20 rounded-full py-4 px-6 text-sm font-medium focus:border-accent/40 outline-none transition-all appearance-none cursor-pointer border border-white/5 text-ink"
                        >
                          <option className="bg-bg" value="daily">Every Day</option>
                          <option className="bg-bg" value="weekly">Specific Days of Week</option>
                          <option className="bg-bg" value="monthly">Specific Date of Month</option>
                          <option className="bg-bg" value="interval">Custom Interval (Days)</option>
                        </select>
                      </div>
                      
                      {recurrence.type === 'weekly' && (
                        <div className="flex flex-wrap gap-2 pt-2">
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
                                }}
                                className={`w-10 h-10 rounded-full text-[10px] font-black flex items-center justify-center transition-all ${active ? 'bg-accent text-white shadow-lg' : 'bg-white/5 text-muted hover:bg-white/10'}`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {recurrence.type === 'monthly' && (
                        <div className="flex items-center gap-3">
                          <label className="text-[10px] font-bold uppercase text-muted tracking-widest">Date:</label>
                          <input 
                            type="number" min="1" max="31"
                            value={recurrence.dateOfMonth || 1}
                            onChange={(e) => setRecurrence({ ...recurrence, dateOfMonth: parseInt(e.target.value) })}
                            className="w-20 bg-black/20 rounded-full py-2 px-3 text-sm font-medium focus:border-accent/40 outline-none border border-white/5 text-ink text-center"
                          />
                        </div>
                      )}

                      {recurrence.type === 'interval' && (
                        <div className="flex items-center gap-3">
                          <label className="text-[10px] font-bold uppercase text-muted tracking-widest">Every:</label>
                          <input 
                            type="number" min="2" max="365"
                            value={recurrence.intervalDays || 2}
                            onChange={(e) => setRecurrence({ ...recurrence, intervalDays: parseInt(e.target.value) })}
                            className="w-16 bg-black/20 rounded-full py-2 px-3 text-sm font-medium focus:border-accent/40 outline-none border border-white/5 text-ink text-center"
                          />
                          <span className="text-[10px] uppercase font-bold text-muted/50 tracking-widest">Days</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="micro-label opacity-40">Priority</label>
                    <div className="relative group">
                      <Flag className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/30 group-focus-within:text-accent w-4 h-4 transition-colors" />
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted/30 w-4 h-4" />
                      <select 
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as Task['priority'])}
                        className="w-full bg-black/20 rounded-full py-4 pl-12 pr-10 text-sm font-medium focus:border-accent/40 outline-none transition-all appearance-none cursor-pointer border border-white/5 text-ink"
                      >
                        <option className="bg-bg" value="High">High</option>
                        <option className="bg-bg" value="Medium">Medium</option>
                        <option className="bg-bg" value="Low">Low</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="micro-label opacity-40">Deadline</label>
                    <div className="relative group">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/30 group-focus-within:text-accent w-4 h-4 transition-colors" />
                      <input 
                        type="date" 
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full bg-black/20 rounded-full py-4 pl-12 pr-5 text-sm font-medium focus:border-accent/40 outline-none transition-all border border-white/5 text-ink [color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="precise-button w-full py-4 text-xs tracking-[0.3em] font-black"
                >
                  {task ? 'Update Task' : 'Create Task'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
