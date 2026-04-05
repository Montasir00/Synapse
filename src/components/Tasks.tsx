import { useState } from 'react';
import { Search, Edit2, Trash2, CheckCircle2, Circle, ListChecks, Calendar as CalendarIcon, History, ShieldAlert, ChevronDown, ChevronUp, BrainCircuit, Zap } from 'lucide-react';
import CalendarView from './CalendarView';
import ModuleCard from './ModuleCard';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Note } from '../types';

interface TasksProps {
  tasks: Task[];
  onUpdateStatus: (id: string, status: Task['status']) => void;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  notes?: Note[];
  onAddNote?: (content: string) => void;
  onDeleteNote?: (id: string) => void;
}



export default function Tasks({ 
  tasks, 
  onUpdateStatus, 
  onAddTask, 
  onEditTask, 
  onDeleteTask,
  notes = [],
  onAddNote,
  onDeleteNote,
}: TasksProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showCalendar, setShowCalendar] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');

  const sortTasksArr = (taskList: Task[]) => {
    return [...taskList].sort((a, b) => {
       const pMap: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
       return pMap[b.priority] - pMap[a.priority];
    });
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'all' || t.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const dailyTasks = filteredTasks.filter(t => t.taskCategory === 'daily' && !t.isMissedDaily);
  const longTermTasks = sortTasksArr(filteredTasks.filter(t => t.taskCategory === 'long-term' && t.status !== 'done'));
   const overdueTasks = sortTasksArr(
      tasks.filter(t => {
         if (t.status === 'done') return false;
         if (t.taskCategory === 'daily' && t.isMissedDaily) return true;
         if (!t.dueDate) return false;
         const due = new Date(t.dueDate);
         if (Number.isNaN(due.getTime())) return false;
         return due.getTime() < Date.now();
      })
   );
  const completedTasks = sortTasksArr(tasks.filter(t => t.status === 'done')).slice(0, 10);

  return (
   <div className="w-full max-w-6xl mx-auto py-6 sm:py-8 lg:py-12 px-3 sm:px-4 lg:px-6 space-y-6 sm:space-y-8 lg:space-y-12">
      
      {/* 1. Control Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-6 lg:gap-8 bg-surface p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-[32px] border border-border shadow-sm">
         <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-ink tracking-tighter">TASKS</h1>
            <p className="text-muted text-xs font-medium uppercase tracking-[0.12em] sm:tracking-[0.2em] flex items-center gap-2">
               <Zap className="w-3 h-3 text-accent animate-pulse" /> Daily command center
            </p>
         </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-80">
               <Search className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-label="Search directives" />
               <input 
                  type="text" 
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-w-0 bg-surface-subtle py-2.5 sm:py-4 pl-10 sm:pl-14 pr-4 sm:pr-6 rounded-2xl border border-border outline-none text-sm focus:border-accent/40"
               />
            </div>
            <div className="pill-container !py-2 !px-2 w-full sm:w-auto justify-between sm:justify-start">
               {(['all', 'todo', 'done'] as const).map(f => (
                  <button 
                     key={f}
                     onClick={() => setActiveFilter(f)}
                     className={`px-2.5 sm:px-4 lg:px-6 py-2 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wide sm:tracking-widest transition-all ${
                        activeFilter === f ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-ink hover:bg-surface-subtle'
                     }`}
                  >
                     {f}
                  </button>
               ))}
            </div>
            <button onClick={onAddTask} className="precise-button !pl-8 !pr-10 !py-4 shadow-accent/10 w-full sm:w-auto text-[10px] sm:text-sm">
               Add Task
            </button>
         </div>
      </div>

      {/* 2. Parallel Operative Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 lg:gap-8 items-start">
         
         {/* Column 1: Active Resonance (Daily) - NOW FIRST */}
         <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            <ModuleCard 
               title="Resonance" 
               icon={<Zap className="w-5 h-5" />} 
               maxItems={5}
               badge="Primary"
            >
               {dailyTasks.map(task => (
                   <div key={task.id} className="flex items-center justify-between p-3 bg-surface border border-border rounded-xl group hover:border-accent/20 transition-all">
                     <div className="flex items-center gap-3 min-w-0">
                        <button 
                           onClick={() => onUpdateStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
                           className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${task.status === 'done' ? 'bg-success/20 border-success text-success' : 'border-border text-muted hover:border-accent'}`}
                        >
                           {task.status === 'done' ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        </button>
                        <span className={`text-xs sm:text-sm font-bold truncate ${task.status === 'done' ? 'text-muted line-through' : 'text-ink'}`}>{task.title}</span>
                     </div>
                     <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEditTask(task)} className="p-2.5 text-muted hover:text-accent transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => onDeleteTask(task.id)} className="p-2.5 text-muted hover:text-alert transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                     </div>
                  </div>
               ))}
            </ModuleCard>

            {/* Calendar Integrated */}
            <button 
               onClick={() => setShowCalendar(!showCalendar)}
               className="w-full flex items-center justify-between p-4 sm:p-6 bg-surface/40 border border-white/5 rounded-[28px] hover:border-accent/20 transition-all group"
            >
               <div className="flex items-center gap-3 sm:gap-4 text-left min-w-0">
                  <CalendarIcon className="w-5 h-5 text-muted/40 group-hover:text-accent transition-transform group-hover:scale-110" />
                  <span className="text-xs font-black uppercase tracking-[0.12em] sm:tracking-[0.2em] text-muted/60 group-hover:text-ink">Calendar View</span>
               </div>
               <div className="w-10 h-10 bg-surface-subtle rounded-lg flex items-center justify-center text-muted group-hover:text-accent transition-all">
                  {showCalendar ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
               </div>
            </button>
         </div>

         {/* Column 2: Priority Directives (Long Term) - NOW SECOND */}
         <div className="xl:col-span-1 space-y-4 sm:space-y-6 lg:space-y-8">
            <ModuleCard 
               title="Directives" 
               icon={<ListChecks className="w-5 h-5" />} 
               status="active"
               maxItems={4}
            >
               {longTermTasks.map(task => (
                  <div key={task.id} className="bg-surface border border-border rounded-2xl p-3 sm:p-4 group transition-all hover:border-dark-border relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-1 h-full bg-accent/20" />
                     <div className="flex items-center gap-4">
                        <button 
                           onClick={() => onUpdateStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
                           className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all border ${task.status === 'done' ? 'bg-success/10 border-success text-success' : 'bg-surface-subtle border-border text-muted hover:border-accent'}`}
                        >
                           {task.status === 'done' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </button>
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded border ${task.priority === 'High' ? 'bg-alert/10 border-alert/20 text-alert' : 'bg-surface-subtle border-border text-muted'}`}>{task.priority}</span>
                           </div>
                           <h4 className={`text-xs sm:text-sm font-bold truncate ${task.status === 'done' ? 'text-muted line-through' : 'text-ink'}`}>{task.title}</h4>
                        </div>
                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => onEditTask(task)} className="p-2.5 text-muted hover:text-accent"><Edit2 className="w-3.5 h-3.5" /></button>
                           <button onClick={() => onDeleteTask(task.id)} className="p-2.5 text-muted hover:text-alert"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                     </div>
                  </div>
               ))}
            </ModuleCard>
         </div>

            {/* Column 3: Time Alerts */}
         <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            <ModuleCard 
               title="Time Alerts" 
               icon={<ShieldAlert className="w-5 h-5" />} 
               status={overdueTasks.length > 0 ? "alert" : "default"}
               maxItems={4}
            >
               {overdueTasks.map(task => (
                  <div key={task.id} className="p-3 sm:p-4 bg-alert/[0.03] border border-alert/20 rounded-2xl flex items-center justify-between gap-3 group hover:bg-alert/[0.06] transition-all">
                     <span className="text-xs sm:text-sm font-black text-alert truncate">{task.title}</span>
                      <div className="flex items-center gap-2">
                         <button onClick={() => onUpdateStatus(task.id, 'done')} className="w-9 h-9 rounded-lg bg-alert/10 text-alert hover:bg-success hover:text-white transition-all flex items-center justify-center shadow-lg shadow-alert/5"><CheckCircle2 className="w-4 h-4" /></button>
                         <button onClick={() => onDeleteTask(task.id)} className="w-9 h-9 rounded-lg bg-alert/5 text-alert/30 hover:bg-alert hover:text-white transition-all flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                      </div>
                  </div>
               ))}
            </ModuleCard>
         </div>

         {/* Column 4: Internal Memory & History */}
         <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            <ModuleCard 
               title="Internal Memory" 
               icon={<BrainCircuit className="w-5 h-5" />} 
               maxItems={3}
            >
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
                  placeholder="Record memo..."
                  className="w-full bg-surface-subtle py-3 px-4 rounded-xl border border-border text-xs sm:text-sm font-medium text-ink outline-none focus:border-accent/40 mb-4 transition-all placeholder:text-muted"
               />
               <div className="space-y-3">
                  {notes.map(note => (
                  <div key={note.id} className="p-3 sm:p-4 bg-surface border border-border rounded-2xl relative group hover:border-dark-border transition-all">
                     <p className="text-xs sm:text-sm font-medium text-ink/70 leading-relaxed pr-6">{note.content}</p>
                     <button onClick={() => onDeleteNote?.(note.id)} className="absolute top-3 right-3 p-1 opacity-70 group-hover:opacity-100 text-muted hover:text-alert transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  ))}
               </div>
            </ModuleCard>

            <ModuleCard 
               title="Operation History" 
               icon={<History className="w-5 h-5" />} 
               maxItems={5}
            >
               {completedTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between py-2 group">
                     <div className="flex items-center gap-3 opacity-90 group-hover:opacity-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-success/40" />
                        <span className="text-xs font-bold text-muted line-through truncate max-w-[120px] sm:max-w-[180px]">{task.title}</span>
                     </div>
                     <button onClick={() => onDeleteTask(task.id)} className="p-1 opacity-70 group-hover:opacity-100 text-alert transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
               ))}
            </ModuleCard>
         </div>

      </div>

      {/* Calendar Overlay */}
      <AnimatePresence>
         {showCalendar && (
            <motion.div 
               initial={{ opacity: 0, y: 30, scale: 0.95 }} 
               animate={{ opacity: 1, y: 0, scale: 1 }} 
               exit={{ opacity: 0, y: 30, scale: 0.95 }}
               className="soothing-card overflow-hidden !rounded-[42px] border-accent/20 bg-surface backdrop-blur-xl shadow-sm"
            >
               <div className="p-3 sm:p-6 lg:p-10">
                  <CalendarView tasks={tasks} />
               </div>
            </motion.div>
         )}
      </AnimatePresence>

    </div>
  );
}
