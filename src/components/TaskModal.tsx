import React, { useState, useEffect } from 'react';
import { X, Type, AlignLeft, Flag, Calendar, ChevronDown, Link as LinkIcon, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Transaction, SubTask } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id'> | Partial<Task>) => void;
  task?: Task;
  transactions?: Transaction[];
}

export default function TaskModal({ isOpen, onClose, onSave, task, transactions = [] }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('Medium');
  const [status, setStatus] = useState<Task['status']>('todo');
  const [linkedExpenseId, setLinkedExpenseId] = useState<string | undefined>(undefined);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setStatus(task.status);
      setLinkedExpenseId(task.linkedExpenseId);
      setSubtasks(task.subtasks || []);
      setDueDate(task.dueDate || '');
    } else {
      setTitle('');
      setDescription('');
      setPriority('Medium');
      setStatus('todo');
      setLinkedExpenseId(undefined);
      setSubtasks([]);
      setDueDate('');
    }
  }, [task, isOpen]);

  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSubtask: SubTask = {
      id: Math.random().toString(36).substr(2, 9),
      title: newSubtaskTitle,
      completed: false
    };
    setSubtasks([...subtasks, newSubtask]);
    setNewSubtaskTitle('');
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const toggleSubtask = (id: string) => {
    setSubtasks(subtasks.map(st => 
      st.id === id ? { ...st, completed: !st.completed } : st
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    onSave({ 
      title, 
      description, 
      priority, 
      status, 
      linkedExpenseId: linkedExpenseId === 'none' ? undefined : linkedExpenseId,
      subtasks,
      dueDate: dueDate || undefined
    });
    
    onClose();
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
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative glass-card w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20"
          >
            <div className="p-10 lg:p-12">
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h2 className="text-3xl font-serif italic text-ink tracking-tight">
                    {task ? 'Refine Pursuit' : 'New Pursuit'}
                  </h2>
                  <p className="micro-label mt-2 !opacity-30">Protocol Configuration</p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-muted hover:text-accent hover:bg-white/10 transition-all border border-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form className="space-y-8" onSubmit={handleSubmit}>
                <div className="space-y-3">
                  <label className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted/50">Title</label>
                  <div className="relative group">
                    <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/30 group-focus-within:text-accent w-4 h-4 transition-colors" />
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What are you pursuing?" 
                      className="w-full bg-white/[0.02] rounded-2xl py-4 pl-12 pr-5 text-sm font-medium focus:ring-1 focus:ring-accent/20 outline-none transition-all border border-white/5 text-ink placeholder:text-muted/20"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted/50">Description</label>
                  <div className="relative group">
                    <AlignLeft className="absolute left-4 top-4 text-muted/30 group-focus-within:text-accent w-4 h-4 transition-colors" />
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add more clarity..." 
                      className="w-full bg-white/[0.02] rounded-2xl py-4 pl-12 pr-5 text-sm font-medium focus:ring-1 focus:ring-accent/20 outline-none transition-all min-h-[100px] resize-none border border-white/5 text-ink placeholder:text-muted/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted/50">Priority</label>
                    <div className="relative group">
                      <Flag className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/30 group-focus-within:text-accent w-4 h-4 transition-colors" />
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted/30 w-4 h-4" />
                      <select 
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as Task['priority'])}
                        className="w-full bg-white/[0.02] rounded-2xl py-4 pl-12 pr-10 text-sm font-medium focus:ring-1 focus:ring-accent/20 outline-none transition-all appearance-none cursor-pointer border border-white/5 text-ink"
                      >
                        <option className="bg-bg" value="High">High</option>
                        <option className="bg-bg" value="Medium">Medium</option>
                        <option className="bg-bg" value="Low">Low</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted/50">Due Date</label>
                    <div className="relative group">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/30 group-focus-within:text-accent w-4 h-4 transition-colors" />
                      <input 
                        type="date" 
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full bg-white/[0.02] rounded-2xl py-4 pl-12 pr-5 text-sm font-medium focus:ring-1 focus:ring-accent/20 outline-none transition-all border border-white/5 text-ink [color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted/50">Status</label>
                  <div className="relative group">
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted/30 w-4 h-4" />
                    <select 
                      value={status}
                      onChange={(e) => setStatus(e.target.value as Task['status'])}
                      className="w-full bg-white/[0.02] rounded-2xl py-4 pl-12 pr-10 text-sm font-medium focus:ring-1 focus:ring-accent/20 outline-none transition-all appearance-none cursor-pointer border border-white/5 text-ink"
                    >
                      <option className="bg-bg" value="todo">To Do</option>
                      <option className="bg-bg" value="in-progress">In Progress</option>
                      <option className="bg-bg" value="review">Review</option>
                      <option className="bg-bg" value="done">Done</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted/50">Checkpoints</label>
                  <div className="space-y-3">
                    {subtasks.map(st => (
                      <div key={st.id} className="flex items-center gap-4 group/st">
                        <button 
                          type="button"
                          onClick={() => toggleSubtask(st.id)}
                          className={`transition-colors ${st.completed ? 'text-accent' : 'text-muted/20 hover:text-accent/50'}`}
                        >
                          {st.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </button>
                        <span className={`flex-1 text-xs font-medium ${st.completed ? 'line-through text-muted/30' : 'text-ink'}`}>
                          {st.title}
                        </span>
                        <button 
                          type="button"
                          onClick={() => removeSubtask(st.id)}
                          className="opacity-0 group-hover/st:opacity-100 text-alert/50 hover:text-alert transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="relative group">
                      <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/30 group-focus-within:text-accent w-4 h-4 transition-colors" />
                      <input 
                        type="text"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSubtask();
                          }
                        }}
                        placeholder="Add a checkpoint..."
                        className="w-full bg-white/[0.02] rounded-2xl py-3.5 pl-12 pr-5 text-sm font-medium focus:ring-1 focus:ring-accent/20 outline-none transition-all border border-white/5 text-ink placeholder:text-muted/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted/50">Link Expense</label>
                  <div className="relative group">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/30 group-focus-within:text-accent w-4 h-4 transition-colors" />
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted/30 w-4 h-4" />
                    <select 
                      value={linkedExpenseId || 'none'}
                      onChange={(e) => setLinkedExpenseId(e.target.value)}
                      className="w-full bg-white/[0.02] rounded-2xl py-4 pl-12 pr-10 text-sm font-medium focus:ring-1 focus:ring-accent/20 outline-none transition-all appearance-none cursor-pointer border border-white/5 text-ink"
                    >
                      <option className="bg-bg" value="none">No Expense Linked</option>
                      {transactions.map(t => (
                        <option key={t.id} className="bg-bg" value={t.id}>
                          {t.merchant} - ${t.amount.toFixed(0)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-ink text-bg rounded-2xl font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-accent transition-all active:scale-[0.98] mt-6"
                >
                  {task ? 'Update Pursuit' : 'Create Pursuit'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
