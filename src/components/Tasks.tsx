import React, { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, Plus, Clock, AlertCircle, CheckCircle2, Play, Pause, RotateCcw, Edit2, Trash2, ChevronRight, ChevronLeft, Link as LinkIcon, GripVertical, LayoutGrid, Calendar as CalendarIcon, ListChecks, ChevronDown, ChevronUp, Maximize2, Minimize2, ExternalLink, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Task, Transaction } from '../types';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
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
  transactions?: Transaction[];
  onUpdateStatus: (id: string, status: Task['status']) => void;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  activeTimerTaskId?: string;
  isTimerActive: boolean;
  timerSeconds: number;
  onToggleTimer: (task: Task) => void;
  onResetTimer: () => void;
}

const FocusTimer = ({ 
  task, 
  activeTimerTaskId, 
  isTimerActive, 
  timerSeconds, 
  onToggle, 
  onReset 
}: { 
  task: Task;
  activeTimerTaskId?: string;
  isTimerActive: boolean;
  timerSeconds: number;
  onToggle: (task: Task) => void;
  onReset: () => void;
}) => {
  const isThisTaskActive = activeTimerTaskId === task.id;

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalTime = (task.totalTimeSpent || 0) + (isThisTaskActive ? timerSeconds : 0);

  return (
    <div className={`flex items-center gap-3 bg-white/[0.02] px-3 py-1.5 rounded-full border transition-all duration-500 ${isThisTaskActive ? 'border-accent bg-accent/5 shadow-lg shadow-accent/5' : 'border-dark-border group-hover:border-accent/20'}`}>
      <span className={`text-[10px] font-mono font-bold tabular-nums tracking-tight ${isThisTaskActive ? 'text-accent' : 'text-muted/40'}`}>
        {formatTime(totalTime)}
      </span>
      <div className="flex items-center gap-1.5">
        <button 
          onClick={(e) => { e.stopPropagation(); onToggle(task); }}
          className={`p-0.5 transition-all duration-300 ${isThisTaskActive && isTimerActive ? 'text-accent scale-110' : 'text-muted/30 hover:text-accent'}`}
        >
          {isThisTaskActive && isTimerActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </button>
        {isThisTaskActive && (
          <button 
            onClick={(e) => { e.stopPropagation(); onReset(); }}
            className="p-0.5 text-muted/20 hover:text-alert transition-colors"
            title="Reset Timer"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

interface TaskCardProps {
  key?: string | number;
  task: Task; 
  transactions?: Transaction[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onUpdateStatus: (id: string, status: Task['status']) => void;
  activeTimerTaskId?: string;
  isTimerActive: boolean;
  timerSeconds: number;
  onToggleTimer: (task: Task) => void;
  onResetTimer: () => void;
  isDragging?: boolean;
  dragHandleProps?: any;
  isCompactView?: boolean;
  isGoogleConnected?: boolean;
  onSyncToCalendar?: (task: Task) => void;
}

const TaskCard = ({ 
  task, 
  transactions = [], 
  onEditTask, 
  onDeleteTask, 
  onUpdateStatus, 
  activeTimerTaskId, 
  isTimerActive, 
  timerSeconds, 
  onToggleTimer, 
  onResetTimer,
  isDragging = false,
  dragHandleProps = {},
  isCompactView = false,
  isGoogleConnected = false,
  onSyncToCalendar
}: TaskCardProps) => {
  const linkedExpense = transactions.find(t => t.id === task.linkedExpenseId);
  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter(st => st.completed).length;
  const subtaskProgress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'text-alert';
      case 'medium': return 'text-accent';
      case 'low': return 'text-muted';
      default: return 'text-muted';
    }
  };

  return (
    <motion.div 
      layoutId={task.id}
      className={`glass-card ${isCompactView ? 'p-5' : 'p-7'} hover:bg-white/[0.03] transition-all duration-500 group cursor-default border-dark-border hover:border-white/10 relative overflow-hidden ${isDragging ? 'opacity-50 scale-105 z-50' : ''}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 text-muted/30 hover:text-accent transition-colors">
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <span className={`text-[9px] font-bold uppercase tracking-widest ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button 
            onClick={() => onEditTask(task)}
            className="p-1.5 text-muted/50 hover:text-accent transition-colors"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button 
            onClick={() => onDeleteTask(task.id)}
            className="p-1.5 text-muted/50 hover:text-alert transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      <h4 className={`${isCompactView ? 'text-sm' : 'text-lg'} font-serif italic text-ink mb-2 leading-tight group-hover:text-accent transition-colors duration-500`}>
        {task.title}
      </h4>
      
      {!isCompactView && task.description && (
        <p className="text-[11px] text-muted/60 line-clamp-2 mb-4 leading-relaxed font-medium">
          {task.description}
        </p>
      )}

      {subtasks.length > 0 && (
        <div className="mb-4 space-y-1.5">
          <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-widest text-muted/40">
            <span>Progress</span>
            <span className="text-accent">{completedSubtasks}/{subtasks.length}</span>
          </div>
          <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${subtaskProgress}%` }}
              className="h-full bg-accent"
            />
          </div>
        </div>
      )}

      {linkedExpense && !isCompactView && (
        <div className="flex items-center gap-2 mb-5 text-[9px] font-bold text-accent/60 uppercase tracking-widest">
          <LinkIcon className="w-2.5 h-2.5" />
          <span>{linkedExpense.merchant} • ${linkedExpense.amount.toFixed(0)}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <FocusTimer 
          task={task}
          activeTimerTaskId={activeTimerTaskId}
          isTimerActive={isTimerActive}
          timerSeconds={timerSeconds}
          onToggle={onToggleTimer}
          onReset={onResetTimer}
        />
        
        <div className="flex items-center gap-3">
          {onSyncToCalendar && (
            <button 
              onClick={() => onSyncToCalendar(task)}
              className="p-1 text-muted/30 hover:text-accent transition-colors"
              title="Sync to Google Calendar"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
          )}
          {task.status !== 'todo' && (
            <button 
              onClick={() => {
                const prevStatusMap: Record<string, Task['status']> = {
                  'in-progress': 'todo',
                  'review': 'in-progress',
                  'done': 'review'
                };
                onUpdateStatus(task.id, prevStatusMap[task.status]);
              }}
              className="p-1 text-muted/30 hover:text-accent transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          
          <button 
            onClick={() => {
              const nextStatusMap: Record<string, Task['status']> = {
                'todo': 'in-progress',
                'in-progress': 'review',
                'review': 'done',
                'done': 'todo'
              };
              onUpdateStatus(task.id, nextStatusMap[task.status]);
            }}
            className="p-1 text-muted/30 hover:text-accent transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const CalendarView = ({ 
  tasks, 
  transactions, 
  onEditTask, 
  onDeleteTask, 
  onUpdateStatus, 
  activeTimerTaskId, 
  isTimerActive, 
  timerSeconds, 
  onToggleTimer, 
  onResetTimer,
  isGoogleConnected,
  onSyncToCalendar
}: {
  tasks: Task[];
  transactions: Transaction[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onUpdateStatus: (id: string, status: Task['status']) => void;
  activeTimerTaskId?: string;
  isTimerActive: boolean;
  timerSeconds: number;
  onToggleTimer: (task: Task) => void;
  onResetTimer: () => void;
  isGoogleConnected?: boolean;
  onSyncToCalendar?: (task: Task) => void;
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const tasksWithDates = tasks.filter(t => t.dueDate);
  
  const filteredByMonth = tasksWithDates.filter(t => {
    const d = new Date(t.dueDate!);
    return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
  });

  const sortedTasks = [...filteredByMonth].sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  
  const groups = sortedTasks.reduce((acc: Record<string, Task[]>, task) => {
    const date = task.dueDate!;
    if (!acc[date]) acc[date] = [];
    acc[date].push(task);
    return acc;
  }, {});

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const goToToday = () => setCurrentMonth(new Date());

  return (
    <div className="space-y-16">
      <div className="flex items-center justify-between bg-white/[0.02] p-6 rounded-[2rem] border border-dark-border">
        <div className="flex items-center gap-6">
          <h3 className="text-3xl font-serif italic text-ink tracking-tight">
            {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex items-center gap-2 bg-bg p-1 rounded-full border border-dark-border">
            <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-full text-muted transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={goToToday} className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest text-muted hover:text-ink transition-colors">Today</button>
            <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-full text-muted transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted/40">
            {filteredByMonth.length} Protocols this month
          </span>
        </div>
      </div>

      <div className="space-y-20">
        {Object.entries(groups).map(([date, dateTasks]) => (
          <div key={date} className="space-y-10">
            <div className="flex items-center gap-8">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-accent/60 mb-2">
                  {new Date(date).toLocaleDateString(undefined, { weekday: 'long' })}
                </span>
                <h3 className="text-4xl font-serif italic text-ink tracking-tight">
                  {new Date(date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                </h3>
              </div>
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-muted/30 text-[9px] font-bold uppercase tracking-widest">
                {dateTasks.length} Protocols
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {dateTasks.map((task) => (
                <TaskCard 
                  key={task.id}
                  task={task}
                  transactions={transactions}
                  onEditTask={onEditTask}
                  onDeleteTask={onDeleteTask}
                  onUpdateStatus={onUpdateStatus}
                  activeTimerTaskId={activeTimerTaskId}
                  isTimerActive={isTimerActive}
                  timerSeconds={timerSeconds}
                  onToggleTimer={onToggleTimer}
                  onResetTimer={onResetTimer}
                  isGoogleConnected={isGoogleConnected}
                  onSyncToCalendar={onSyncToCalendar}
                />
              ))}
            </div>
          </div>
        ))}
        {filteredByMonth.length === 0 && (
          <div className="h-[400px] flex flex-col items-center justify-center text-muted/10 border border-dashed border-white/5 rounded-[3rem]">
            <CalendarIcon className="w-12 h-12 mb-6" />
            <p className="micro-label">No scheduled protocols for this period</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SortableTask = (props: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: props.task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard 
        {...props} 
        isDragging={isDragging} 
        dragHandleProps={{ ...attributes, ...listeners }} 
      />
    </div>
  );
};

export default function Tasks({ 
  tasks = [], 
  transactions = [],
  onUpdateStatus, 
  onAddTask, 
  onEditTask, 
  onDeleteTask,
  activeTimerTaskId,
  isTimerActive,
  timerSeconds,
  onToggleTimer,
  onResetTimer
}: TasksProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'title'>('dueDate');
  const [isCompactView, setIsCompactView] = useState(false);
  const [collapsedColumns, setCollapsedColumns] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'calendar'>('kanban');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  useEffect(() => {
    checkGoogleStatus();
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.provider === 'google') {
        setIsGoogleConnected(true);
        toast.success('Google Calendar connected successfully');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkGoogleStatus = async () => {
    try {
      const response = await fetch('/api/auth/google/status');
      const data = await response.json();
      setIsGoogleConnected(data.connected);
    } catch (error) {
      console.error('Error checking Google status:', error);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      const { url } = await response.json();
      window.open(url, 'google_oauth', 'width=600,height=700');
    } catch (error) {
      toast.error('Failed to connect to Google Calendar');
    }
  };

  const handleSyncToCalendar = async (task: Task) => {
    if (!task.dueDate) {
      toast.error('Task must have a due date to sync');
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${task.id}/sync-to-calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task })
      });
      
      if (response.ok) {
        toast.success(`"${task.title}" synced to Google Calendar`);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to sync task');
      }
    } catch (error) {
      toast.error('Error syncing to calendar');
    }
  };
  
  const filteredTasks = safeTasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'All' || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  }).sort((a, b) => {
    if (sortBy === 'dueDate') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (sortBy === 'priority') {
      const pMap = { 'High': 0, 'Medium': 1, 'Low': 2 };
      return pMap[a.priority] - pMap[b.priority];
    }
    return a.title.localeCompare(b.title);
  });

  const toggleColumn = (status: string) => {
    setCollapsedColumns(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const columns: { title: string, status: Task['status'], color: string, number: string }[] = [
    { title: 'Backlog', status: 'todo', color: 'bg-muted', number: '01' },
    { title: 'In Progress', status: 'in-progress', color: 'bg-accent', number: '02' },
    { title: 'Review', status: 'review', color: 'bg-alert', number: '03' },
    { title: 'Completed', status: 'done', color: 'bg-success', number: '04' },
  ];

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = safeTasks.find(t => t.id === active.id);
    if (!activeTask) return;

    // Check if dragging over a different column
    const overId = over.id;
    const isOverAColumn = columns.some(c => c.status === overId);
    
    if (isOverAColumn && activeTask.status !== overId) {
      onUpdateStatus(activeTask.id, overId as Task['status']);
    }
  };

  const handleDragEnd = (event: any) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeTask = safeTasks.find(t => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id;
    const overTask = safeTasks.find(t => t.id === overId);
    
    if (overTask && activeTask.status !== overTask.status) {
      onUpdateStatus(activeTask.id, overTask.status);
    } else if (columns.some(c => c.status === overId) && activeTask.status !== overId) {
      onUpdateStatus(activeTask.id, overId as Task['status']);
    }
  };

  const activeTask = activeId ? safeTasks.find(t => t.id === activeId) : null;

  return (
    <div className="pt-28 md:pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto min-h-screen flex flex-col">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 mb-16">
        <div className="max-w-2xl">
          <p className="micro-label mb-4 text-accent flex items-center gap-2">
            <span className="w-8 h-px bg-accent/30" />
            Workspace Protocol
          </p>
          <h2 className="text-5xl md:text-7xl font-serif italic text-ink tracking-tight mb-8 leading-[0.9]">
            Focus <span className="opacity-30">Protocol</span>
          </h2>
          
          <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-widest text-muted/50">Active</span>
              <span className="text-2xl font-serif italic text-accent">{filteredTasks.filter(t => t.status !== 'done').length} Pursuits</span>
            </div>
            <div className="w-px h-10 bg-white/5 hidden sm:block" />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-widest text-muted/50">Completed</span>
              <span className="text-2xl font-serif italic text-success">{filteredTasks.filter(t => t.status === 'done').length} Closed</span>
            </div>
            <div className="w-px h-10 bg-white/5 hidden sm:block" />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-widest text-muted/50">Value</span>
              <span className="text-2xl font-serif italic text-ink">
                ${filteredTasks.reduce((acc, task) => {
                  const expense = transactions.find(t => t.id === task.linkedExpenseId);
                  return acc + (expense?.amount || 0);
                }, 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
        
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted group-focus-within:text-accent transition-colors" />
              <input 
                type="text" 
                placeholder="Search protocols..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-4 py-2.5 bg-white/[0.02] border border-dark-border rounded-full text-[11px] focus:outline-none focus:ring-1 focus:ring-accent/30 w-48 md:w-64 text-ink placeholder:text-muted/40 transition-all"
              />
            </div>
            
            <div className="flex items-center gap-1 bg-white/[0.02] p-1 rounded-full border border-dark-border">
              <select 
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="bg-transparent text-[9px] font-bold uppercase tracking-widest text-muted px-3 py-1.5 focus:outline-none cursor-pointer hover:text-ink transition-colors"
              >
                <option value="All" className="bg-bg">All Priorities</option>
                <option value="High" className="bg-bg">High</option>
                <option value="Medium" className="bg-bg">Medium</option>
                <option value="Low" className="bg-bg">Low</option>
              </select>
            </div>

            <div className="flex items-center gap-1 bg-white/[0.02] p-1 rounded-full border border-dark-border">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-[9px] font-bold uppercase tracking-widest text-muted px-3 py-1.5 focus:outline-none cursor-pointer hover:text-ink transition-colors"
              >
                <option value="dueDate" className="bg-bg">Sort by Due Date</option>
                <option value="priority" className="bg-bg">Sort by Priority</option>
                <option value="title" className="bg-bg">Sort by Title</option>
              </select>
            </div>

            <div className="flex items-center gap-1 bg-white/[0.02] p-1 rounded-full border border-dark-border">
              <button 
                onClick={() => setIsCompactView(!isCompactView)}
                className={`p-2 rounded-full transition-all ${isCompactView ? 'bg-accent text-bg' : 'text-muted hover:text-ink'}`}
                title={isCompactView ? "Standard View" : "Compact View"}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setViewMode(viewMode === 'kanban' ? 'calendar' : 'kanban')}
                className={`p-2 rounded-full transition-all ${viewMode === 'calendar' ? 'bg-accent text-bg' : 'text-muted hover:text-ink'}`}
                title={viewMode === 'calendar' ? "Kanban View" : "Calendar View"}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {(searchQuery || priorityFilter !== 'All') && (
              <button 
                onClick={() => { setSearchQuery(''); setPriorityFilter('All'); }}
                className="text-[9px] font-bold uppercase tracking-widest text-alert hover:text-alert/80 transition-colors px-2"
              >
                Clear Filters
              </button>
            )}

            <button 
              onClick={onAddTask}
              className="flex items-center gap-2 bg-ink text-bg px-6 py-2.5 rounded-full text-[10px] uppercase tracking-widest font-bold hover:bg-accent hover:text-bg transition-all duration-300 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              New Entry
            </button>
          </div>
      </div>

      {viewMode === 'kanban' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 flex gap-16 overflow-x-auto pb-10">
            {columns.map((column) => {
              const isCollapsed = collapsedColumns.includes(column.status);
              const columnTasks = filteredTasks.filter(t => t.status === column.status);
              
              return (
                <div 
                  key={column.status} 
                  className={`flex flex-col h-full group/col transition-all duration-500 ${isCollapsed ? 'w-16 min-w-[64px]' : 'flex-1 min-w-[300px]'}`}
                >
                  <div className="mb-8 px-2">
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-3 ${isCollapsed ? 'flex-col py-4' : ''}`}>
                        <span className={`w-1 h-1 rounded-full ${column.color}`} />
                        <h3 className={`text-[10px] font-bold uppercase tracking-[0.2em] text-ink ${isCollapsed ? 'writing-vertical-rl rotate-180' : ''}`}>
                          {column.title}
                        </h3>
                        <span className="text-[9px] font-mono text-muted/40">
                          ({columnTasks.length})
                        </span>
                      </div>
                      {!isCollapsed && (
                        <button 
                          onClick={() => toggleColumn(column.status)}
                          className="p-1 rounded-full hover:bg-white/5 text-muted/30 hover:text-accent transition-all"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      )}
                      {isCollapsed && (
                        <button 
                          onClick={() => toggleColumn(column.status)}
                          className="mt-4 p-1 rounded-full hover:bg-white/5 text-muted/30 hover:text-accent transition-all"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {!isCollapsed && (
                    <SortableContext
                      id={column.status}
                      items={columnTasks.map(t => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-10 flex-1 min-h-[400px]">
                        <AnimatePresence mode="popLayout">
                          {columnTasks.map((task) => (
                            <SortableTask 
                              key={task.id}
                              task={task}
                              transactions={transactions}
                              onEditTask={onEditTask}
                              onDeleteTask={onDeleteTask}
                              onUpdateStatus={onUpdateStatus}
                              activeTimerTaskId={activeTimerTaskId}
                              isTimerActive={isTimerActive}
                              timerSeconds={timerSeconds}
                              onToggleTimer={onToggleTimer}
                              onResetTimer={onResetTimer}
                              isCompactView={isCompactView}
                              isGoogleConnected={isGoogleConnected}
                              onSyncToCalendar={handleSyncToCalendar}
                            />
                          ))}
                        </AnimatePresence>
                        
                        {columnTasks.length === 0 && (
                          <div className="h-60 border border-dashed border-white/[0.05] rounded-[2.5rem] flex flex-col items-center justify-center gap-4 bg-white/[0.01]">
                            <div className="w-12 h-12 rounded-full bg-white/[0.02] flex items-center justify-center border border-white/5">
                              <AlertCircle className="w-5 h-5 text-muted opacity-20" />
                            </div>
                            <p className="micro-label !opacity-20">Protocol Empty</p>
                          </div>
                        )}
                      </div>
                    </SortableContext>
                  )}
                </div>
              );
            })}
          </div>

          <DragOverlay dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: {
                active: {
                  opacity: '0.5',
                },
              },
            }),
          }}>
            {activeTask ? (
              <TaskCard 
                task={activeTask}
                transactions={transactions}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onUpdateStatus={onUpdateStatus}
                activeTimerTaskId={activeTimerTaskId}
                isTimerActive={isTimerActive}
                timerSeconds={timerSeconds}
                onToggleTimer={onToggleTimer}
                onResetTimer={onResetTimer}
                isDragging
                isCompactView={isCompactView}
                isGoogleConnected={isGoogleConnected}
                onSyncToCalendar={handleSyncToCalendar}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <CalendarView 
          tasks={filteredTasks}
          transactions={transactions}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
          onUpdateStatus={onUpdateStatus}
          activeTimerTaskId={activeTimerTaskId}
          isTimerActive={isTimerActive}
          timerSeconds={timerSeconds}
          onToggleTimer={onToggleTimer}
          onResetTimer={onResetTimer}
          isGoogleConnected={isGoogleConnected}
          onSyncToCalendar={handleSyncToCalendar}
        />
      )}
    </div>
  );
}
