import { useState } from 'react';
import { Search, Edit2, Trash2, CheckCircle2, Circle, ListChecks, Calendar as CalendarIcon, History, ShieldAlert, ChevronDown, ChevronUp, BrainCircuit, Zap, RotateCcw } from 'lucide-react';
import CalendarView from './CalendarView';
import ModuleCard from './ModuleCard';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { Task, Note } from '../types';

interface SwipeableTaskItemProps {
  task: Task;
  onUpdateStatus: (id: string, status: Task['status']) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (task: Task) => void;
  isFocusMode: boolean;
}

function SwipeableTaskItem({ task, onUpdateStatus, onDeleteTask, onEditTask, isFocusMode }: SwipeableTaskItemProps) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0, 100], [1, 1, 1]);
  const bg = useTransform(x, [-100, 0, 100], ['var(--color-alert)', 'transparent', 'var(--color-success)']);
  const completeOpacity = useTransform(x, [20, 80], [0, 1]);
  const deleteOpacity = useTransform(x, [-80, -20], [1, 0]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) {
      onUpdateStatus(task.id, task.status === 'done' ? 'todo' : 'done');
    } else if (info.offset.x < -100) {
      onDeleteTask(task.id);
    }
  };

  return (
    <div className="relative group overflow-hidden rounded-2xl">
      {/* Background Actions */}
      <motion.div 
        style={{ backgroundColor: bg }}
        className="absolute inset-0 flex items-center justify-between px-6 z-0"
      >
        <motion.div style={{ opacity: completeOpacity }} className="flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-widest">
          <CheckCircle2 className="w-5 h-5" />
          <span>Complete</span>
        </motion.div>
        <motion.div style={{ opacity: deleteOpacity }} className="flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-widest">
          <span>Delete</span>
          <Trash2 className="w-5 h-5" />
        </motion.div>
      </motion.div>

      {/* Foreground Content */}
      <motion.div 
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        onDragEnd={handleDragEnd}
        style={{ x, opacity }}
        className={`relative z-10 flex items-start justify-between p-3 sm:p-4 bg-surface border transition-all ${
          isFocusMode ? 'border-accent/30 shadow-md' : 'border-border hover:border-accent/20 hover:shadow-md'
        } ${task.status === 'done' ? 'opacity-70' : ''}`}
      >
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          <button 
            onClick={() => onUpdateStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all ${task.status === 'done' ? 'bg-success/20 border-success text-success' : 'border-border text-muted hover:border-accent flex-shrink-0'}`}
          >
            {task.status === 'done' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
          </button>
          <span className={`text-xs sm:text-base font-bold break-words leading-snug pr-2 ${task.status === 'done' ? 'text-muted line-through' : 'text-ink'}`}>{task.title}</span>
        </div>
        <div className="flex items-center gap-1 opacity-10 sm:opacity-50 group-hover:opacity-100 transition-opacity self-start">
          <button onClick={() => onEditTask(task)} className="p-2.5 text-muted hover:text-accent"><Edit2 className="w-4 h-4" /></button>
          <button onClick={() => onDeleteTask(task.id)} className="p-2.5 text-muted hover:text-alert"><Trash2 className="w-4 h-4" /></button>
        </div>
      </motion.div>
    </div>
  );
}

interface TasksProps {
  tasks: Task[];
  onUpdateStatus: (id: string, status: Task['status']) => void;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  notes?: Note[];
  onAddNote?: (content: string) => void;
  onDeleteNote?: (id: string) => void;
  /** Called when user clicks "Load History" — should fetch and return last 20 completed tasks */
  onLoadHistory?: () => Promise<Task[]>;
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
  onLoadHistory,
}: TasksProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showCalendar, setShowCalendar] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isFocusMode, setIsFocusMode] = useState(true);
  const [historyTasks, setHistoryTasks] = useState<Task[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const handleLoadHistory = async () => {
    if (!onLoadHistory || historyLoading || historyTasks !== null) return;
    setHistoryLoading(true);
    try {
      const history = await onLoadHistory();
      setHistoryTasks(history);
    } catch (e) {
      console.error('Failed to load task history', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const sortTasksArr = (taskList: Task[]) => {
    return [...taskList].sort((a, b) => {
       const pMap: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
       return pMap[b.priority] - pMap[a.priority];
    });
  };

  const filteredTasks = tasks.filter(t => {
    return t.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const isOverdue = (t: Task) => {
    if (t.status === 'done') return false;
    if (t.taskCategory === 'daily' && t.isMissedDaily) return true;
    if (!t.dueDate) return false;
      const dueDateParts = t.dueDate.split('-').map(Number);
      let due: Date;
      if (
         dueDateParts.length === 3 &&
         Number.isFinite(dueDateParts[0]) &&
         Number.isFinite(dueDateParts[1]) &&
         Number.isFinite(dueDateParts[2])
      ) {
         const [year, month, day] = dueDateParts;
         due = new Date(year, month - 1, day);
      } else {
         due = new Date(t.dueDate);
      }
    if (Number.isNaN(due.getTime())) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dueCompare = new Date(due);
    dueCompare.setHours(0, 0, 0, 0);
    return dueCompare.getTime() < now.getTime();
  };

  const dailyTasks = filteredTasks.filter(t => t.taskCategory === 'daily' && t.status !== 'done' && !t.isMissedDaily && !isOverdue(t));
  const longTermTasks = sortTasksArr(filteredTasks.filter(t => t.taskCategory === 'long-term' && t.status !== 'done' && !isOverdue(t)));
  const overdueTasks = sortTasksArr(tasks.filter(t => isOverdue(t)));

  return (
   <div className="w-full max-w-6xl mx-auto py-6 sm:py-8 lg:py-12 px-3 sm:px-4 lg:px-6 space-y-6 sm:space-y-8 lg:space-y-12">
      
      {/* 1. Control Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6 lg:gap-8 pb-6 sm:pb-8 border-b border-border/50 relative overflow-hidden group">
         <div className="space-y-1 relative z-10">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-ink tracking-tighter">Task Board</h1>
            <p className="text-muted text-[10px] sm:text-xs font-medium uppercase tracking-[0.15em] sm:tracking-[0.2em] flex items-center gap-2">
               <Zap className={`w-3 h-3 ${isFocusMode ? 'text-accent animate-spin-slow' : 'text-accent animate-pulse'}`} /> 
               {isFocusMode ? 'Focus view active' : 'Board view active'}
            </p>
         </div>

         <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4 w-full lg:w-auto relative z-10">
            <div className="relative flex-1 lg:w-64">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
               <input 
                  type="text" 
                  placeholder="Search tasks…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-w-0 bg-surface-subtle py-2.5 sm:py-3 pl-10 pr-4 rounded-xl border border-border outline-none text-xs focus:border-accent/40 transition-all font-medium"
                  inputMode="search"
               />
            </div>

            <button 
               onClick={() => setIsFocusMode(!isFocusMode)}
               className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl border font-black text-[10px] sm:text-[11px] uppercase tracking-widest transition-all active:scale-95 ${
                  isFocusMode 
                     ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20' 
                     : 'bg-surface-subtle border-border text-muted hover:text-ink'
               }`}
            >
               <BrainCircuit className={`w-3.5 h-3.5 ${isFocusMode ? 'animate-pulse' : ''}`} aria-hidden="true" />
               <span className="hidden sm:inline">{isFocusMode ? 'Show All Tasks' : 'Enter Focus Mode'}</span>
               <span className="sm:hidden">{isFocusMode ? 'All' : 'Focus'}</span>
            </button>

            <button onClick={onAddTask} className="precise-button !px-6 sm:!px-8 !py-2.5 sm:!py-3 shadow-accent/10 w-full sm:w-auto text-[10px] sm:text-[11px]">
               Add Task
            </button>
         </div>
      </div>

      {/* 2. Parallel Operative Grid */}
      <div className={`grid gap-3 sm:gap-6 lg:gap-8 items-start transition-all duration-500 ${
         isFocusMode 
            ? 'grid-cols-1 max-w-2xl mx-auto' 
         : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
      }`}>
         
         {/* Column 1: Active Resonance (Daily) */}
         <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            <ModuleCard 
               title="Daily Tasks" 
               icon={<Zap className="w-5 h-5" />} 
               maxItems={isFocusMode ? 12 : 5}
               badge={isFocusMode ? "Priority Focus" : "Daily"}
            >
               {dailyTasks.length === 0 ? (
                  <div className="p-4 rounded-2xl border border-dashed border-border/40 bg-surface/60 text-center">
                     <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted/60">No daily tasks yet</p>
                  </div>
               ) : (
                  <AnimatePresence mode="popLayout">
                     {dailyTasks.map(task => (
                        <motion.div 
                           layout
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, scale: 0.95 }}
                           transition={{ duration: 0.2 }}
                           key={task.id}
                        >
                           <SwipeableTaskItem 
                              task={task} 
                              onUpdateStatus={onUpdateStatus} 
                              onDeleteTask={onDeleteTask} 
                              onEditTask={onEditTask} 
                              isFocusMode={isFocusMode} 
                           />
                        </motion.div>
                     ))}
                  </AnimatePresence>
               )}
            </ModuleCard>

            {!isFocusMode && (
               <button 
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="w-full flex items-center justify-between p-4 sm:p-6 bg-surface/60 border border-border rounded-2xl hover:border-accent/20 transition-all group"
               >
                  <div className="flex items-center gap-3 sm:gap-4 text-left min-w-0">
                     <CalendarIcon className="w-5 h-5 text-muted/40 group-hover:text-accent transition-transform group-hover:scale-110" aria-hidden="true" />
                     <span className="text-xs font-black uppercase tracking-[0.12em] sm:tracking-[0.2em] text-muted/60 group-hover:text-ink">Calendar View</span>
                  </div>
                  <div className="w-10 h-10 bg-surface-subtle rounded-lg flex items-center justify-center text-muted group-hover:text-accent transition-all">
                     {showCalendar ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
                  </div>
               </button>
            )}
         </div>

         {!isFocusMode && (
            <>
               {/* Column 2: Priority Directives (Long Term) */}
               <div className="xl:col-span-1 space-y-4 sm:space-y-6 lg:space-y-8">
                  <ModuleCard 
                     title="Long-Term Tasks" 
                     icon={<ListChecks className="w-5 h-5" />} 
                     status="active"
                     maxItems={3}
                  >
                     {longTermTasks.length === 0 ? (
                        <div className="p-4 rounded-2xl border border-dashed border-border/40 bg-surface/60 text-center">
                           <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted/60">No long-term tasks yet</p>
                        </div>
                     ) : (
                        <AnimatePresence mode="popLayout">
                           {longTermTasks.map(task => (
                              <motion.div 
                                 layout
                                 initial={{ opacity: 0, y: 10 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 exit={{ opacity: 0, scale: 0.95 }}
                                 transition={{ duration: 0.2 }}
                                 key={task.id}
                              >
                                 <SwipeableTaskItem 
                                    task={task} 
                                    onUpdateStatus={onUpdateStatus} 
                                    onDeleteTask={onDeleteTask} 
                                    onEditTask={onEditTask} 
                                    isFocusMode={isFocusMode} 
                                 />
                              </motion.div>
                           ))}
                        </AnimatePresence>
                     )}
                  </ModuleCard>
               </div>

               {/* Column 3: Time Alerts */}
               <div className="space-y-4 sm:space-y-6 lg:space-y-8">
                  <ModuleCard 
                     title="Overdue" 
                     icon={<ShieldAlert className="w-5 h-5" />} 
                     status={overdueTasks.length > 0 ? "alert" : "default"}
                     maxItems={4}
                  >
                     {overdueTasks.length === 0 ? (
                        <div className="p-4 rounded-2xl border border-dashed border-border/40 bg-surface/60 text-center">
                           <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted/60">Nothing overdue</p>
                        </div>
                     ) : (
                        <AnimatePresence mode="popLayout">
                           {overdueTasks.map(task => (
                              <motion.div 
                                 layout
                                 initial={{ opacity: 0, y: 10 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 exit={{ opacity: 0, scale: 0.95 }}
                                 transition={{ duration: 0.2 }}
                                 key={task.id}
                              >
                                 <SwipeableTaskItem 
                                    task={task} 
                                    onUpdateStatus={onUpdateStatus} 
                                    onDeleteTask={onDeleteTask} 
                                    onEditTask={onEditTask} 
                                    isFocusMode={isFocusMode} 
                                 />
                              </motion.div>
                           ))}
                        </AnimatePresence>
                     )}
                  </ModuleCard>
               </div>
            </>
         )}

      </div>

         {/* 3. Knowledge & History Deck */}
         {!isFocusMode && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
               <ModuleCard 
                  title="Internal Memory" 
                  icon={<BrainCircuit className="w-5 h-5" />} 
                  maxItems={8}
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
                     placeholder="Record memo…"
                     className="w-full bg-surface-subtle py-3 px-4 rounded-xl border border-border text-xs sm:text-sm font-medium text-ink outline-none focus:border-accent/40 mb-4 transition-all placeholder:text-muted"
                     inputMode="text"
                  />
                  <div className="space-y-3">
                     {notes.length === 0 ? (
                        <div className="p-4 rounded-2xl border border-dashed border-border/40 bg-surface/60 text-center">
                           <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted/60">No notes recorded</p>
                        </div>
                     ) : notes.map(note => (
                        <div key={note.id} className="p-3 sm:p-4 bg-surface border border-border rounded-2xl relative group hover:border-dark-border transition-all">
                           <p className="text-xs sm:text-sm font-medium text-ink/70 leading-relaxed pr-6 break-words">{note.content}</p>
                           <button onClick={() => onDeleteNote?.(note.id)} aria-label="Delete note" className="absolute top-3 right-3 p-1 opacity-70 group-hover:opacity-100 text-muted hover:text-alert transition-all"><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
                        </div>
                     ))}
                  </div>
               </ModuleCard>

               <ModuleCard 
                  title="Operation History" 
                  icon={<History className="w-5 h-5" />} 
                  maxItems={10}
                  badge="On-Demand"
               >
                  {historyTasks === null ? (
                     // Not loaded yet — show a load button (0 Firebase reads)
                     <div className="p-4 rounded-2xl border border-dashed border-border/40 bg-surface/60 text-center space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted/60">History not loaded</p>
                        {onLoadHistory ? (
                           <button
                              onClick={handleLoadHistory}
                              disabled={historyLoading}
                              className="px-5 py-2 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                           >
                              {historyLoading ? 'Loading…' : 'Load History'}
                           </button>
                        ) : null}
                     </div>
                  ) : historyTasks.length === 0 ? (
                     <div className="p-4 rounded-2xl border border-dashed border-border/40 bg-surface/60 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted/60">No completed tasks yet</p>
                     </div>
                  ) : historyTasks.map(task => (
                     <div key={task.id} className="flex items-start justify-between py-2 group gap-3">
                        <div className="flex items-start gap-3 opacity-90 group-hover:opacity-100 min-w-0">
                           <div className="w-1.5 h-1.5 rounded-full bg-success/40" />
                           <span className="text-xs font-bold text-muted line-through break-words">{task.title}</span>
                        </div>
                         <div className="flex items-center gap-1 sm:gap-2 self-start">
                            <button 
                               onClick={() => onUpdateStatus(task.id, 'todo')} 
                               aria-label="Revert task" 
                               className="p-1 opacity-70 group-hover:opacity-100 text-accent hover:text-accent/80 transition-all"
                            >
                               <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                            <button 
                               onClick={() => onDeleteTask(task.id)} 
                               aria-label="Delete task" 
                               className="p-1 opacity-70 group-hover:opacity-100 text-alert transition-all"
                            >
                               <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                         </div>
                      </div>
                  ))}
               </ModuleCard>
            </div>
         )}

      {/* Calendar Overlay */}
      <AnimatePresence>
      {showCalendar && !isFocusMode ? (
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
         ) : null}
      </AnimatePresence>

    </div>
  );
}
