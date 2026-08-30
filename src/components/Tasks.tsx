import { useState, useMemo } from 'react';
import { Search, Edit2, Trash2, CheckCircle2, Circle, ListChecks, Calendar as CalendarIcon, History, ShieldAlert, ChevronDown, ChevronUp, BrainCircuit, Zap, RotateCcw } from 'lucide-react';
import CalendarView from './CalendarView';
import ModuleCard from './ModuleCard';
import EmptyState from './EmptyState';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { Task, Note } from '../types';

interface SwipeableTaskItemProps {
  task: Task;
  onUpdateStatus: (id: string, status: Task['status']) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (task: Task) => void;
  variant?: 'focus' | 'board';
}

function SwipeableTaskItem({ task, onUpdateStatus, onDeleteTask, onEditTask, variant = 'board' }: SwipeableTaskItemProps) {
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
        <motion.div style={{ opacity: completeOpacity }} className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-widest">
          <CheckCircle2 className="w-5 h-5" />
          <span>Complete</span>
        </motion.div>
        <motion.div style={{ opacity: deleteOpacity }} className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-widest">
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
        role="button"
        tabIndex={0}
        aria-label={`Edit task: ${task.title}`}
        onClick={() => {
          if (Math.abs(x.get()) < 5) {
            onEditTask(task);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onEditTask(task);
          }
        }}
        className={`relative z-10 flex items-start justify-between p-3 sm:p-4 bg-surface border transition-colors cursor-pointer ${
          variant === 'focus' ? 'border-accent/30 shadow-md' : 'border-border hover:border-accent/20 hover:shadow-md'
        } ${task.status === 'done' ? 'opacity-70' : ''}`}
      >
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onUpdateStatus(task.id, task.status === 'done' ? 'todo' : 'done');
            }}
            aria-label={task.status === 'done' ? 'Mark as incomplete' : 'Mark as complete'}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-colors ${task.status === 'done' ? 'bg-success/20 border-success text-success' : 'border-border text-muted hover:border-accent flex-shrink-0'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1`}
          >
            {task.status === 'done' ? <CheckCircle2 className="w-5 h-5" aria-hidden="true" /> : <Circle className="w-5 h-5" aria-hidden="true" />}
          </button>
          <span className={`text-xs sm:text-base font-bold break-words leading-snug pr-2 ${task.status === 'done' ? 'text-muted line-through' : 'text-ink'}`}>{task.title}</span>
        </div>
        <div className="flex items-center gap-1 opacity-80 sm:opacity-50 sm:group-hover:opacity-100 transition-opacity self-start">
          <button onClick={(e) => { e.stopPropagation(); onEditTask(task); }} aria-label={`Edit task: ${task.title}`} className="p-2.5 text-muted hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 rounded"><Edit2 className="w-4 h-4" aria-hidden="true" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }} aria-label={`Delete task: ${task.title}`} className="p-2.5 text-muted hover:text-alert focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alert focus-visible:ring-offset-1 rounded"><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
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

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      return t.title.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [tasks, searchQuery]);

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

  // Consolidated single pass over filteredTasks to partition daily and long-term tasks
  const { dailyTasks, longTermTasks } = useMemo(() => {
    const daily: Task[] = [];
    const longTerm: Task[] = [];

    for (const t of filteredTasks) {
      if (t.status === 'done') continue;
      if (isOverdue(t)) continue;

      if (t.taskCategory === 'daily') {
        if (!t.isMissedDaily) {
          daily.push(t);
        }
      } else if (t.taskCategory === 'long-term') {
        longTerm.push(t);
      }
    }

    return {
      dailyTasks: daily,
      longTermTasks: sortTasksArr(longTerm),
    };
  }, [filteredTasks]);

  const overdueTasks = useMemo(() => {
    return sortTasksArr(tasks.filter(t => isOverdue(t)));
  }, [tasks]);

  return (
   <div className="w-full max-w-6xl mx-auto py-6 sm:py-8 lg:py-12 px-4 sm:px-6 space-y-6 sm:space-y-8 lg:space-y-12">
      
      {/* 1. Control Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6 lg:gap-8 pb-6 sm:pb-8 border-b border-border/50 relative overflow-hidden group">
         <div className="space-y-1 relative z-10">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-ink tracking-tighter text-balance">Task Board</h1>
            <p className="text-muted text-xs sm:text-xs font-medium uppercase tracking-[0.15em] sm:tracking-[0.2em] flex items-center gap-2">
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
                  aria-label="Search tasks"
               />
            </div>

            <button 
               onClick={() => setIsFocusMode(!isFocusMode)}
               aria-pressed={isFocusMode}
               className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl border font-semibold text-xs sm:text-sm uppercase tracking-wide transition-all active:scale-95 ${
                  isFocusMode 
                     ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20' 
                     : 'bg-surface-subtle border-border text-muted hover:text-ink'
               }`}
            >
               <BrainCircuit className={`w-3.5 h-3.5 ${isFocusMode ? 'animate-pulse' : ''}`} aria-hidden="true" />
               <span className="hidden sm:inline">{isFocusMode ? 'Show All Tasks' : 'Enter Focus Mode'}</span>
               <span className="sm:hidden">{isFocusMode ? 'All' : 'Focus'}</span>
            </button>

            <button onClick={onAddTask} className="precise-button !px-6 sm:!px-8 !py-2.5 sm:!py-3 shadow-accent/10 w-full sm:w-auto text-xs sm:text-xs">
               <span className="flex items-center gap-1.5 justify-center">Add Task <kbd className="text-xs bg-white/10 px-1.5 py-0.5 rounded font-mono font-normal tracking-normal lowercase hidden sm:inline-block">alt+n</kbd></span>
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
                  <EmptyState
                     icon={<Zap className="w-8 h-8" />}
                     title="No daily protocols"
                     description="Establish a daily routine to keep your focus sharp and your performance audited."
                     actionText="Add Protocol"
                     onAction={onAddTask}
                  />
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
                               variant={isFocusMode ? 'focus' : 'board'} 
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
                     <span className="text-xs font-semibold tracking-wide text-muted/60 group-hover:text-ink">Calendar View</span>
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
                         <EmptyState
                            icon={<ListChecks className="w-8 h-8" />}
                            title="No active epics"
                            description="Define strategic milestones to track your execution over longer horizons."
                            actionText="Create Epic"
                            onAction={onAddTask}
                         />
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
                                    variant={isFocusMode ? 'focus' : 'board'}
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
                           <p className="text-xs font-black uppercase tracking-[0.18em] text-muted/60">Nothing overdue</p>
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
                                    variant={isFocusMode ? 'focus' : 'board'}
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
                     aria-label="Record memo"
                  />
                  <div className="space-y-3">
                      {notes.length === 0 ? (
                         <EmptyState
                            icon={<FileText className="w-8 h-8" />}
                            title="No active notes"
                            description="Log cognitive context, links, or fleeting thoughts to offload working memory."
                         />
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
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-muted/60">History not loaded</p>
                        {onLoadHistory ? (
                           <button
                              onClick={handleLoadHistory}
                              disabled={historyLoading}
                              className="px-5 py-2 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                           >
                              {historyLoading ? 'Loading…' : 'Load History'}
                           </button>
                        ) : null}
                     </div>
                  ) : historyTasks.length === 0 ? (
                      <EmptyState
                         icon={<History className="w-8 h-8" />}
                         title="No logged history"
                         description="Your completed metrics and archived execution directives will materialize here."
                      />
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
