import React, { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  parseISO 
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task } from '../types';

interface CalendarViewProps {
  tasks: Task[];
}

type MonthTaskEntry = {
  task: Task;
  dueDate: Date;
};

export default function CalendarView({ tasks }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isTinyScreen, setIsTinyScreen] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(max-width: 389px)').matches;
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(max-width: 389px)');
    const onChange = (e: MediaQueryListEvent) => setIsTinyScreen(e.matches);
    setIsTinyScreen(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      try {
        const taskDate = parseISO(task.dueDate);
        if (Number.isNaN(taskDate.getTime())) return false;
        return isSameDay(taskDate, day);
      } catch {
        return false;
      }
    });
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthTasks = tasks.reduce<MonthTaskEntry[]>((acc, task) => {
    if (!task.dueDate) return acc;
    try {
      const dueDate = parseISO(task.dueDate);
      if (Number.isNaN(dueDate.getTime())) return acc;
      if (!isSameMonth(dueDate, monthStart)) return acc;
      acc.push({ task, dueDate });
    } catch {
      // Ignore malformed dates to keep calendar rendering stable.
    }
    return acc;
  }, []).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  return (
    <div className="glass-card overflow-hidden border-white/5">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.01]">
        <div>
          <h3 className="text-xl font-display font-black text-ink uppercase tracking-tight">
            {format(currentMonth, 'MMMM')} <span className="opacity-20 text-accent">{format(currentMonth, 'yyyy')}</span>
          </h3>
          <p className="micro-label mt-0.5 opacity-30">Temporal Mapping</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={prevMonth}
            className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-muted transition-all border border-white/5"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={nextMonth}
            className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-muted transition-all border border-white/5"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {!isTinyScreen && (
      <>
      {/* Day Names Row */}
      <div className="grid grid-cols-7 border-b border-white/5 bg-black/20">
        {dayNames.map(day => (
          <div key={day} className="py-3 text-center">
            <span className="hidden md:inline text-[10px] font-black text-muted uppercase tracking-[0.15em] opacity-40">{day}</span>
            <span className="md:hidden text-[10px] font-black text-muted uppercase tracking-[0.15em] opacity-40">{day.charAt(0)}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMonth.toISOString()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="contents"
          >
            {calendarDays.map((day) => {
              const dayTasks = getTasksForDay(day);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, monthStart);
              
              return (
                <div 
                  key={day.toISOString()} 
                  className={`min-h-[60px] sm:min-h-[70px] md:min-h-[80px] lg:min-h-[120px] p-1 md:p-1.5 lg:p-2 border-r border-b border-white/5 relative transition-colors ${!isCurrentMonth ? 'opacity-20 bg-black/40' : 'hover:bg-white/[0.02]'}`}
                >
                  <span className={`text-[11px] font-mono font-bold ${isToday ? 'text-accent' : isCurrentMonth ? 'text-ink' : 'text-muted/30'}`}>
                    {format(day, 'd')}
                  </span>
                  
                  {isToday && (
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_8px_rgba(114,137,253,0.6)]" />
                  )}

                  <div className="mt-2 space-y-1">
                    {dayTasks.map(task => (
                      <div 
                        key={task.id} 
                        className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide truncate max-w-full ${
                          task.taskCategory === 'daily' 
                            ? 'bg-accent/10 text-accent border border-accent/20' 
                            : 'bg-white/5 text-muted border border-white/10'
                        }`}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
      </>
      )}

      {isTinyScreen && (
        <div className="p-3 border-t border-white/5 space-y-2">
          {monthTasks.length === 0 && (
            <div className="p-4 text-center text-[10px] font-bold uppercase tracking-widest text-muted/40 border border-dashed border-white/10 rounded-xl">
              No tasks scheduled this month
            </div>
          )}
          {monthTasks.map(entry => (
            <div key={entry.task.id} className="p-3 rounded-xl bg-black/20 border border-white/10 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-muted/40 font-black">
                  {format(entry.dueDate, 'MMM d')}
                </p>
                <p className="text-sm font-bold text-ink truncate">{entry.task.title}</p>
              </div>
              <span className={`text-[9px] font-black uppercase tracking-wide px-2 py-1 rounded-full border ${entry.task.taskCategory === 'daily' ? 'text-accent border-accent/30 bg-accent/10' : 'text-muted border-white/15 bg-white/5'}`}>
                {entry.task.taskCategory === 'daily' ? 'Habit' : 'Task'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="p-4 border-t border-white/5 bg-black/40 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent/20 border border-accent/40" />
          <span className="text-[9px] font-black text-muted uppercase tracking-wide">Habit</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white/5 border border-white/10" />
          <span className="text-[9px] font-black text-muted uppercase tracking-wide">Strategy</span>
        </div>
      </div>
    </div>
  );
}
