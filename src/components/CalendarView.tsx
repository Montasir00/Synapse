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
import { ChevronLeft, ChevronRight, Zap, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task } from '../types';

interface CalendarViewProps {
  tasks: Task[];
}

export default function CalendarView({ tasks }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      try {
        const taskDate = parseISO(task.dueDate);
        return isSameDay(taskDate, day);
      } catch {
        return false;
      }
    });
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-muted transition-all border border-white/5"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={nextMonth}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-muted transition-all border border-white/5"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Day Names Row */}
      <div className="grid grid-cols-7 border-b border-white/5 bg-black/20">
        {dayNames.map(day => (
          <div key={day} className="py-3 text-center">
            <span className="hidden md:inline text-[9px] font-black text-muted uppercase tracking-[0.2em] opacity-40">{day}</span>
            <span className="md:hidden text-[9px] font-black text-muted uppercase tracking-[0.2em] opacity-40">{day.charAt(0)}</span>
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
            {calendarDays.map((day, idx) => {
              const dayTasks = getTasksForDay(day);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, monthStart);
              
              return (
                <div 
                  key={day.toISOString()} 
                  className={`min-h-[70px] md:min-h-[80px] lg:min-h-[120px] p-1.5 md:p-2 border-r border-b border-white/5 relative transition-colors ${!isCurrentMonth ? 'opacity-20 bg-black/40' : 'hover:bg-white/[0.02]'}`}
                >
                  <span className={`text-[10px] font-mono font-bold ${isToday ? 'text-accent' : isCurrentMonth ? 'text-ink' : 'text-muted/30'}`}>
                    {format(day, 'd')}
                  </span>
                  
                  {isToday && (
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_8px_rgba(114,137,253,0.6)]" />
                  )}

                  <div className="mt-2 space-y-1">
                    {dayTasks.map(task => (
                      <div 
                        key={task.id} 
                        className={`px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest truncate max-w-full ${
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

      {/* Legend */}
      <div className="p-4 border-t border-white/5 bg-black/40 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent/20 border border-accent/40" />
          <span className="text-[8px] font-black text-muted uppercase tracking-widest">Habit</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white/5 border border-white/10" />
          <span className="text-[8px] font-black text-muted uppercase tracking-widest">Strategy</span>
        </div>
      </div>
    </div>
  );
}
