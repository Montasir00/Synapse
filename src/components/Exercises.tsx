import { PlusCircle, Clock, Zap, Flower2, Activity, ChevronRight, Dumbbell, History } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, Cell, Tooltip, CartesianGrid, XAxis } from 'recharts';
import { motion } from 'motion/react';
import { Exercise } from '../types';
import ModuleCard from './ModuleCard';
import EmptyState from './EmptyState';
import { parseISO, startOfWeek, addDays, format, isSameDay } from 'date-fns';

import { useMemo } from 'react';

interface ExercisesProps {
  sessions: Exercise[];
  onLogSession: () => void;
}

export default function Exercises({ sessions, onLogSession }: ExercisesProps) {
  const stats = [
    { label: 'Weekly Progress', value: sessions.length.toString(), total: '/ 5', progress: (sessions.length / 5) * 100, type: 'goal' },
    { label: 'Active Minutes', value: sessions.reduce((acc, s) => acc + (parseInt(s.duration) || 0), 0).toString(), unit: 'min', sub: '+12% from last week' },
    { label: 'Calories Burned', value: (sessions.length * 450).toLocaleString(), unit: 'kcal', sub: 'Daily average: 262 kcal' },
    { label: 'Last Workout', value: sessions[0]?.title || 'None', sub: sessions[0]?.date || 'No sessions yet', rating: 4 },
  ];

  const weeklyData = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(start, i);
      const daySessions = sessions.filter(s => isSameDay(parseISO(s.date), day));
      const duration = daySessions.reduce((acc, s) => acc + (parseInt(s.duration) || 0), 0);
      return {
        name: format(day, 'EEE'),
        full: format(day, 'EEEE'),
        value: duration,
        isToday: isSameDay(day, today)
      };
    });
  }, [sessions]);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap': return Zap;
      case 'Flower2': return Flower2;
      case 'Activity': return Activity;
      default: return Activity;
    }
  };

  return (
    <div className="pt-6 sm:pt-8 lg:pt-12 pb-20 sm:pb-24 lg:pb-32 px-3 sm:px-4 lg:px-6 w-full min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-surface border border-border rounded-2xl p-4 sm:p-6 lg:p-8 mb-10 lg:mb-16">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tighter">Exercises</h1>
          <p className="micro-label mt-1">Track sessions and weekly progress</p>
        </div>
        <button
          onClick={onLogSession}
          className="precise-button px-8 py-3 w-full sm:w-auto shadow-sm active:scale-95"
          aria-label="Log new exercise session"
        >
          <PlusCircle className="w-4 h-4" aria-hidden="true" />
          <span className="ml-2 flex items-center gap-1.5 justify-center">Log Session <kbd className="text-xs bg-white/10 px-1.5 py-0.5 rounded font-mono font-normal tracking-normal lowercase hidden sm:inline-block">alt+g</kbd></span>
        </button>
      </div>

      <div className="flex flex-wrap sm:flex-nowrap w-full divide-x divide-border/30 border border-border/50 rounded-2xl bg-surface-subtle/20 overflow-hidden shadow-sm mb-16">
        {[
          { label: 'Weekly Progress', value: sessions.length.toString(), sub: '/ 5 SESSIONS', color: 'text-accent' },
          { label: 'Active Minutes', value: sessions.reduce((acc, s) => acc + (parseInt(s.duration) || 0), 0).toString(), sub: 'MINUTES', color: 'text-ink' },
          { label: 'Calories Burned', value: (sessions.length * 450).toLocaleString(), sub: 'KCAL', color: 'text-coral' },
          { label: 'Last Workout', value: sessions[0]?.title || 'None', sub: sessions[0]?.date || 'NO DATA', color: 'text-teal-500' },
        ].map((m, i) => (
          <div key={i} className="flex-1 w-1/2 sm:w-auto p-4 sm:p-6 flex flex-col justify-center items-center sm:items-start text-center sm:text-left hover:bg-surface/50 transition-colors">
            <span className="text-xs font-bold text-muted/70 uppercase tracking-[0.2em] mb-1.5">{m.label}</span>
            <div className="flex items-baseline gap-2">
               <span className={`text-xl sm:text-2xl lg:text-3xl font-mono font-black tracking-tighter ${m.color} truncate max-w-[120px]`}>{m.value}</span>
               {m.sub && <span className="text-xs font-bold text-muted/70 uppercase hidden sm:inline-block">{m.sub}</span>}
            </div>
            {i === 0 && (
               <div className="w-full bg-surface h-1 rounded-full overflow-hidden mt-3 max-w-[100px]">
                  <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${Math.min((sessions.length / 5) * 100, 100)}%` }}
                     className="bg-accent h-full shadow-[0_0_10px_rgba(114,137,253,0.3)]" 
                  />
               </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-12 lg:gap-16">
        <div className="w-full">
          <ModuleCard
            title="Recent Sessions"
            icon={<History className="w-5 h-5" />}
            badge={sessions.length > 0 ? `${sessions.length} RECORDED` : undefined}
            maxItems={10}
            className="w-full"
          >
            <div className="space-y-6 pt-4">
            {sessions.length === 0 ? (
              <EmptyState
                iconName="Dumbbell"
                title="No training logged"
                description="Keep your biological status and active recovery metrics audited by logging a workout."
                actionText="Log Session"
                onAction={onLogSession}
              />
            ) : sessions.map((session, i) => {
              const Icon = getIcon(session.icon);
              return (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-start group"
                >
                  <div className="w-full sm:w-32 h-48 sm:h-32 rounded-[24px] overflow-hidden flex-shrink-0 bg-surface-subtle/20 border border-border/40 group-hover:border-accent/40 transition-all duration-300 shadow-xl shadow-black/20">
                    <img src={session.img || `https://picsum.photos/seed/${session.title}/200/200`} alt={session.title} width={200} height={200} className="w-full h-full object-cover grayscale opacity-50 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-500 scale-110 group-hover:scale-100" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 pb-8 border-b border-border/40 w-full">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-xs uppercase tracking-[0.2em] font-black text-accent mb-2 block">{session.category}</span>
                        <h4 className="text-xl sm:text-2xl font-display font-bold text-ink group-hover:text-accent transition-colors uppercase tracking-tight">{session.title}</h4>
                      </div>
                        <span className="text-xs font-mono font-bold text-muted/70 uppercase tracking-widest">{session.date}</span>
                    </div>
                    <p className="text-sm text-muted leading-relaxed mb-6 max-w-2xl font-medium opacity-70">
                      {session.description}
                    </p>
                    <div className="flex items-center gap-8">
                      <div className="flex items-center gap-2.5 text-xs font-bold text-ink uppercase tracking-wider">
                        <Clock className="w-3.5 h-3.5 text-accent" />
                        {session.duration}
                      </div>
                      <div className="flex items-center gap-2.5 text-xs font-bold text-ink uppercase tracking-wider">
                        <Icon className="w-3.5 h-3.5 text-accent" />
                        {session.intensity}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            </div>
          </ModuleCard>
        </div>

        {/* Tactical Intel Section (Moved below List) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 w-full pt-8 border-t border-border/50">
          <div className="glass-card p-6 md:p-10 h-full flex flex-col justify-center">
            <div className="flex justify-between items-center mb-10">
              <span className="text-xs font-black text-ink uppercase tracking-[0.2em]">Weekly activity</span>
              <span className="text-xs font-bold text-white px-2.5 py-1 bg-accent/14 rounded-full uppercase tracking-widest border border-accent/30">Load</span>
            </div>
            <div style={{ height: 160, minHeight: 160 }} className="w-full min-w-0">
              <ResponsiveContainer width="100%" height={160} minWidth={0} minHeight={160}>
                <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Tooltip 
                    cursor={{ fill: 'var(--color-accent)', opacity: 0.05 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="glass-card !p-3 shadow-xl border-border/30">
                            <p className="text-xs font-black text-muted/70 uppercase tracking-[0.2em] mb-1">{payload[0].payload.full}</p>
                            <p className="text-sm font-mono font-black text-accent">{payload[0].value} MIN</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={1500}>
                    {weeklyData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isToday ? 'var(--color-accent)' : 'var(--color-surface-subtle)'} 
                        fillOpacity={entry.isToday ? 1 : 0.4}
                      />
                    ))}
                  </Bar>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 900, fill: 'var(--color-muted)', opacity: 0.5 }}
                    interval={0}
                    dy={10}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-6">
            <ModuleCard
              title="Active Programs"
              icon={<Dumbbell className="w-5 h-5" />}
              className="w-full"
            >
              <div className="pt-4">
                <div className="p-6 soothing-card hover:border-accent/40 bg-surface hover:border-accent/60 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <h5 className="text-lg font-display font-bold text-ink uppercase tracking-tight">PPL Split: Phase 2</h5>
                    <span className="text-xs font-black text-accent uppercase tracking-widest">W6/12</span>
                  </div>
                  <p className="text-xs uppercase font-bold text-muted mb-6 tracking-wide opacity-40">Progression plan in progress.</p>
                  <div className="flex justify-between items-center">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-7 h-7 rounded-lg bg-surface-subtle/20 border border-border/40 grayscale" />
                      ))}
                    </div>
                    <button className="text-xs font-bold text-accent uppercase tracking-widest flex items-center gap-1.5 hover:text-ink transition-colors">
                      Resume <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </ModuleCard>

            <div className="relative overflow-hidden rounded-[24px] p-8 bg-surface-subtle/10 border border-border/40 backdrop-blur-xl text-ink shadow-sm hover:border-border/30 transition-colors">
              <div className="relative z-10">
                <h4 className="text-lg font-display font-black mb-2 uppercase tracking-tight">Ready Protocol?</h4>
                <p className="text-muted/70 text-xs mb-6 font-bold uppercase tracking-wide">Scheduled for T+07:00 PHT.</p>
                <button className="precise-button w-full py-3 sm:py-4 text-xs uppercase">
                  Preview Plan
                </button>
              </div>
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-accent/14 rounded-full blur-3xl opacity-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

