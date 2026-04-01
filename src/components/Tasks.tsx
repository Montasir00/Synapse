import React, { useState } from 'react';
import { Search, Filter, Plus, Edit2, Trash2, CheckCircle2, Circle, AlertCircle, ListChecks, Calendar as CalendarIcon, Link as LinkIcon, History, Zap, ShieldAlert } from 'lucide-react';
import CalendarView from './CalendarView';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Note, UserStats } from '../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TasksProps {
  tasks: Task[];
  onUpdateStatus: (id: string, status: Task['status']) => void;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  notes?: Note[];
  userStats?: UserStats | null;
  onAddNote?: (content: string) => void;
  onUpdateNote?: (id: string, updates: Partial<Note>) => void;
  onDeleteNote?: (id: string) => void;
  onUpdateTaskOrder?: (taskId: string, position: number) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
}

interface SortableTaskProps {
  task: Task; 
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onUpdateStatus: (id: string, status: Task['status']) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  compact?: boolean;
}

const SortableTask = React.memo<SortableTaskProps>(({ 
  task, 
  onEditTask, 
  onDeleteTask, 
  onUpdateStatus,
  onUpdateTask,
  compact = false
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const completedSubtasks = task.subtasks?.filter(s => s.isCompleted).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const progressPercent = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      className={`soothing-card group !rounded-[42px] mb-6 ${isDragging ? 'z-50 shadow-2xl scale-[1.02] border-accent/20' : ''} ${task.status === 'done' ? 'opacity-40 grayscale-[0.5]' : ''}`}
    >
      <div className="flex items-center gap-8 p-6">
        {/* Drag Handle (Circular) */}
        {!compact && (
          <div {...attributes} {...listeners} className="w-10 h-10 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-accent/10 hover:border-accent/30 transition-all">
             <div className="grid grid-cols-2 gap-1">
                {[1,2,3,4].map(idx => <div key={idx} className="w-1 h-1 rounded-full bg-muted/40" />)}
             </div>
          </div>
        )}

        {/* Task Pulse Toggle */}
        <button 
          onClick={() => onUpdateStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
            task.status === 'done' 
              ? 'bg-success/20 border-success text-success shadow-[0_0_20px_rgba(52,211,153,0.3)]' 
              : 'bg-white/[0.02] border-white/10 text-muted/30 hover:border-accent hover:text-accent'
          }`}
        >
          {task.status === 'done' ? <CheckCircle2 className="w-7 h-7" /> : <Circle className="w-7 h-7" />}
        </button>

        {/* Info Area */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-4 mb-2">
            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1 rounded-full border ${
              task.priority === 'High' ? 'bg-alert/10 border-alert/20 text-alert' :
              task.priority === 'Medium' ? 'bg-accent/10 border-accent/20 text-accent' :
              'bg-white/5 border-white/10 text-muted/40'
            }`}>
              {task.priority}
            </span>
            {task.isStacked && <span className="text-[9px] font-black text-alert uppercase animate-pulse">! Overdue</span>}
          </div>
          <h4 className={`text-xl font-display font-black tracking-tight ${task.status === 'done' ? 'text-muted/30 line-through' : 'text-ink'}`}>
            {task.title}
          </h4>
        </div>

        {/* Progress Ring (Subtasks) */}
        {totalSubtasks > 0 && (
           <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                 <circle cx="32" cy="32" r="28" className="fill-none stroke-white/5 stroke-[4]" />
                 <motion.circle 
                    cx="32" cy="32" r="28" 
                    className="fill-none stroke-accent stroke-[4]"
                    strokeDasharray="175.9"
                    initial={{ strokeDashoffset: 175.9 }}
                    animate={{ strokeDashoffset: 175.9 - (175.9 * (progressPercent / 100)) }}
                    transition={{ duration: 1, ease: "circOut" }}
                    strokeLinecap="round"
                 />
              </svg>
              <span className="absolute text-[10px] font-mono font-black text-ink">{completedSubtasks}/{totalSubtasks}</span>
           </div>
        )}

        {/* Actions (Pill) */}
        <div className="flex items-center gap-2 bg-black/40 rounded-full px-2 py-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
           <button onClick={() => onEditTask(task)} className="p-3 text-muted/40 hover:text-accent transition-colors"><Edit2 className="w-4 h-4" /></button>
           <div className="w-px h-4 bg-white/5" />
           <button onClick={() => onDeleteTask(task.id)} className="p-3 text-muted/40 hover:text-alert transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Subtasks Expanded */}
      <AnimatePresence>
        {task.subtasks && task.subtasks.length > 0 && !compact && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="px-10 pb-8 space-y-4"
          >
            <div className="pt-4 border-t border-white/[0.03] grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3">
              {task.subtasks.map(st => (
                <div key={st.id} className="flex items-center gap-4 group/st">
                   <button 
                      onClick={() => onUpdateTask?.(task.id, { subtasks: task.subtasks!.map(s => s.id === st.id ? {...s, isCompleted: !s.isCompleted} : s) })}
                      className={`w-5 h-5 rounded-full border transition-all ${st.isCompleted ? 'bg-accent border-accent text-white scale-110' : 'border-white/10 hover:border-accent/40'}`}
                   >
                     {st.isCompleted && <CheckCircle2 className="w-3 h-3 mx-auto" />}
                   </button>
                   <span className={`text-xs font-bold ${st.isCompleted ? 'text-muted/20 line-through' : 'text-muted/60 group-hover/st:text-ink transition-colors'}`}>{st.title}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default function Tasks({ 
  tasks, 
  onUpdateStatus, 
  onAddTask, 
  onEditTask, 
  onDeleteTask,
  notes = [],
  userStats,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onUpdateTask
}: TasksProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'manual'>('priority');
  const [showCalendar, setShowCalendar] = useState(false);
  
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sortTasksArr = (taskList: Task[]) => {
    return [...taskList].sort((a, b) => {
      if (sortBy === 'priority') {
        const pMap: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
        return pMap[b.priority] - pMap[a.priority];
      }
      if (sortBy === 'date') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      return (a.position || 0) - (b.position || 0);
    });
  };

  // Sections division
  const dailyTasks = tasks.filter(t => t.taskCategory === 'daily');
  const longTermTasks = sortTasksArr(tasks.filter(t => t.taskCategory === 'long-term' && t.status !== 'done'));
  const overdueTasks = sortTasksArr(tasks.filter(t => t.isStacked && t.status !== 'done'));
  const completedTasks = sortTasksArr(tasks.filter(t => t.status === 'done')).slice(0, 10);

  const handleDragEnd = (event: DragEndEvent, listKey: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id || sortBy !== 'manual') return;
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 py-12 px-6">
      
      {/* LEFT PANE: Mission Control */}
      <div className="flex-1 space-y-16">
        
        {/* Unit Initialization & Filter Flow */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="pill-container !p-1 bg-white/[0.01]">
              {(['all', 'todo', 'done'] as const).map(f => (
                 <button 
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`px-10 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                       activeFilter === f ? 'bg-accent text-white shadow-xl shadow-accent/20' : 'text-muted/40 hover:text-ink'
                    }`}
                 >
                    {f}
                 </button>
              ))}
           </div>
           
           <button 
              onClick={onAddTask}
              className="precise-button !rounded-full !px-12 !py-4 flex items-center gap-4 group"
           >
              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent group-hover:rotate-90 transition-transform">
                 <Plus className="w-4 h-4" />
              </div>
              <span>Initialize Protocol</span>
           </button>
        </div>

        {/* Global Search Pulse */}
        <div className="relative group">
           <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/30 group-focus-within:text-accent transition-colors" />
           <input 
              type="text" 
              placeholder="Search Strategic Directives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-dark/40 py-8 pl-16 pr-10 rounded-[42px] border border-white/5 outline-none text-md font-medium focus:border-accent/40 transition-all placeholder:text-muted/20"
           />
        </div>

        {/* 1. Daily Resonance (Protocol Pulse) */}
        <section className="space-y-8">
           <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                 <div className="w-3 h-3 bg-accent rounded-full animate-pulse shadow-[0_0_12px_rgba(114,137,253,0.5)]" />
                 <h3 className="text-3xl font-display font-black text-ink uppercase tracking-tight">Active Resonance</h3>
              </div>
              <span className="micro-label !text-muted/20">Daily Persistence Protocol</span>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {dailyTasks.length > 0 ? (
                dailyTasks.map(task => (
                  <motion.div 
                    key={task.id}
                    whileHover={{ scale: 1.02 }}
                    className={`soothing-card flex items-center justify-between p-8 !rounded-full border-white/5 transition-all ${task.status === 'done' ? 'opacity-30' : ''}`}
                  >
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={() => onUpdateStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
                        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${task.status === 'done' ? 'bg-success/20 border-success text-success' : 'border-white/10 text-muted/30 hover:border-accent hover:text-accent'}`}
                      >
                         {task.status === 'done' ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                      </button>
                      <span className={`text-lg font-black tracking-tighter ${task.status === 'done' ? 'text-muted line-through font-medium' : 'text-ink'}`}>{task.title}</span>
                    </div>
                    <button onClick={() => onEditTask(task)} className="p-3 text-muted/20 hover:text-ink opacity-0 group-hover:opacity-100"><Edit2 className="w-4 h-4" /></button>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-2 py-16 text-center text-[10px] uppercase font-black tracking-widest text-muted/10 border border-dashed border-white/5 rounded-[42px]">Resonance Matrix Null</div>
              )}
           </div>
        </section>

        {/* 2. Temporal Flow (Calendar) */}
        <section className="space-y-8">
           <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                 <CalendarIcon className="w-6 h-6 text-muted/30" />
                 <h3 className="text-3xl font-display font-black text-muted/40 uppercase tracking-tight">Temporal Flow</h3>
              </div>
              <button 
                onClick={() => setShowCalendar(!showCalendar)}
                className="precise-button"
              >
                {showCalendar ? 'Deactivate_View' : 'Activate_Matrix'}
              </button>
           </div>
           
           <AnimatePresence>
              {showCalendar && (
                 <motion.div 
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="soothing-card overflow-hidden !rounded-[42px]"
                 >
                    <div className="p-10">
                       <CalendarView tasks={tasks} />
                    </div>
                 </motion.div>
              )}
           </AnimatePresence>
        </section>

        {/* 3. Strategic Directives (Long Term) */}
        <section className="space-y-8">
           <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                 <ListChecks className="w-6 h-6 text-muted/30" />
                 <h3 className="text-3xl font-display font-black text-muted/40 uppercase tracking-tight">Directives</h3>
              </div>
           </div>
           
           <div className="space-y-6">
              {longTermTasks.map(task => (
                 <SortableTask key={task.id} task={task} onEditTask={onEditTask} onDeleteTask={onDeleteTask} onUpdateStatus={onUpdateStatus} onUpdateTask={onUpdateTask} />
              ))}
           </div>
        </section>
      </div>

      {/* RIGHT PANE: Intelligence & Security */}
      <div className="w-full lg:w-96 shrink-0 space-y-12">
         
         {/* Security Audit (Overdue) */}
         <div className={`soothing-card !rounded-[42px] p-10 relative overflow-hidden transition-all duration-700 ${overdueTasks.length > 0 ? 'bg-alert/[0.05] border-alert/20' : ''}`}>
            {overdueTasks.length > 0 && <div className="absolute top-0 left-0 w-full h-1 bg-alert animate-pulse" />}
            <div className="flex items-center justify-between mb-10">
               <div className="flex items-center gap-4">
                  <ShieldAlert className={`w-6 h-6 ${overdueTasks.length > 0 ? 'text-alert' : 'text-muted/20'}`} />
                  <h3 className={`text-xl font-display font-black uppercase tracking-widest ${overdueTasks.length > 0 ? 'text-alert' : 'text-muted/30'}`}>Audit</h3>
               </div>
               {overdueTasks.length > 0 && <span className="px-4 py-1 bg-alert/20 text-alert text-[10px] font-black rounded-full">Violation</span>}
            </div>
            
            <div className="space-y-4">
               {overdueTasks.length > 0 ? (
                 overdueTasks.map(task => (
                   <div key={task.id} className="p-6 bg-black/40 rounded-[32px] border border-white/5 hover:border-alert/30 transition-all group">
                      <div className="flex items-center justify-between gap-4">
                         <p className="text-sm font-black text-ink truncate group-hover:text-alert transition-colors">{task.title}</p>
                         <button onClick={() => onUpdateStatus(task.id, 'done')} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-muted/40 hover:bg-success hover:text-white transition-all"><CheckCircle2 className="w-5 h-5" /></button>
                      </div>
                   </div>
                 ))
               ) : (
                 <div className="py-12 text-center text-[10px] font-black text-muted/10 uppercase tracking-widest">System Integrity Secure</div>
               )}
            </div>
         </div>

         {/* Neural Repository (Notes) */}
         <div className="soothing-card !rounded-[42px] flex flex-col h-[500px]">
            <div className="p-10 pb-6 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-accent rounded-full animate-ping" />
                  <h3 className="text-xl font-display font-black text-ink uppercase tracking-tight">Repository</h3>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-10 space-y-6 no-scrollbar">
               {notes.map(note => (
                 <div key={note.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-[32px] group relative">
                    <p className="text-sm font-medium text-ink/70 leading-relaxed">{note.content}</p>
                    <button onClick={() => onDeleteNote?.(note.id)} className="absolute top-4 right-4 p-2 opacity-0 group-hover:opacity-100 text-muted/20 hover:text-alert transition-all"><Trash2 className="w-4 h-4" /></button>
                 </div>
               ))}
            </div>

            <div className="p-10 pt-6">
               <input 
                  type="text"
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newNoteContent.trim() && onAddNote) {
                      onAddNote(newNoteContent);
                      setNewNoteContent('');
                    }
                  }}
                  placeholder="Insert memo..."
                  className="w-full bg-black/20 py-5 px-8 rounded-full border border-white/5 text-xs font-bold outline-none focus:border-accent/40 placeholder:text-muted/20"
               />
            </div>
         </div>

         {/* Operation History */}
         <div className="px-10 space-y-6">
            <div className="flex items-center gap-4 border-b border-white/5 pb-4">
               <History className="w-5 h-5 text-muted/20" />
               <h3 className="text-[10px] font-black text-muted/20 uppercase tracking-widest">History</h3>
            </div>
            <div className="space-y-2 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
               {completedTasks.slice(0, 5).map(task => (
                 <div key={task.id} className="flex items-center gap-4 py-2">
                    <div className="w-2 h-2 rounded-full bg-success/40" />
                    <span className="text-[11px] font-bold text-muted line-through truncate">{task.title}</span>
                 </div>
               ))}
            </div>
         </div>
      </div>

    </div>
  );
}
