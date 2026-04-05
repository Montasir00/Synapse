import { PlusCircle, Clock, Zap, Flower2, Activity, ChevronRight, Dumbbell, History } from 'lucide-react';
import { motion } from 'motion/react';
import { Exercise } from '../types';
import ModuleCard from './ModuleCard';

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

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap': return Zap;
      case 'Flower2': return Flower2;
      case 'Activity': return Activity;
      default: return Activity;
    }
  };

  return (
    <div className="pt-6 sm:pt-8 lg:pt-12 pb-20 sm:pb-24 lg:pb-16 px-3 sm:px-4 md:px-8 lg:px-10 w-full min-h-screen">
      {/* Page Header Removed */}
        <button 
          onClick={onLogSession}
          className="precise-button w-full md:w-auto px-10 py-4 shadow-xl active:scale-95 mb-10 lg:mb-16"
          aria-label="Log new exercise session"
        >
          <PlusCircle className="w-5 h-5" aria-hidden="true" />
          <span className="ml-2">Log Session</span>
        </button>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {stats.map((stat, i) => (
          <div key={i} className="soothing-card p-6 flex flex-col justify-between h-48 group">
            <span className="micro-label opacity-40">{stat.label}</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl sm:text-5xl font-mono font-bold tracking-tighter ${stat.type === 'goal' ? 'text-accent' : 'text-ink'}`}>{stat.value}</span>
              {stat.total && <span className="text-xl sm:text-2xl font-mono font-bold text-muted/20">{stat.total}</span>}
              {stat.unit && <span className="text-[10px] sm:text-sm font-mono font-bold text-muted uppercase opacity-40">{stat.unit}</span>}
            </div>
            {stat.progress !== undefined ? (
              <div className="w-full bg-white/[0.03] h-1 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(stat.progress, 100)}%` }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-accent h-full shadow-[0_0_10px_rgba(114,137,253,0.3)]" 
                />
              </div>
            ) : (
              <p className="text-[9px] text-muted font-bold uppercase tracking-widest opacity-30">{stat.sub}</p>
            )}
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8">
          <ModuleCard
            title="Recent Sessions"
            icon={<History className="w-5 h-5" />}
            badge={sessions.length > 0 ? `${sessions.length} RECORDED` : undefined}
            maxItems={5}
            className="w-full"
          >
            <div className="space-y-8 pt-4">
            {sessions.map((session, i) => {
              const Icon = getIcon(session.icon);
              return (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-start group"
                >
                  <div className="w-full sm:w-28 h-48 sm:h-28 rounded-3xl overflow-hidden flex-shrink-0 bg-white/[0.03] border border-white/5 group-hover:border-accent/40 transition-all duration-300 shadow-xl shadow-black/20">
                    <img src={session.img || `https://picsum.photos/seed/${session.title}/200/200`} alt={session.title} className="w-full h-full object-cover grayscale opacity-50 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-500 scale-110 group-hover:scale-100" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 pb-10 border-b border-white/[0.03] w-full">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[9px] uppercase tracking-[0.2em] font-black text-accent mb-2 block">{session.category}</span>
                        <h4 className="text-xl sm:text-2xl font-display font-bold text-ink group-hover:text-accent transition-colors uppercase tracking-tight">{session.title}</h4>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-muted/40 uppercase tracking-widest">{session.date}</span>
                    </div>
                    <p className="text-[13px] text-muted leading-relaxed mb-6 max-w-lg font-medium opacity-70">
                      {session.description}
                    </p>
                    <div className="flex items-center gap-8">
                      <div className="flex items-center gap-2.5 text-[10px] font-bold text-ink uppercase tracking-wider">
                        <Clock className="w-3.5 h-3.5 text-accent" />
                        {session.duration}
                      </div>
                      <div className="flex items-center gap-2.5 text-[10px] font-bold text-ink uppercase tracking-wider">
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

        <div className="lg:col-span-4 space-y-16">
          <div className="glass-card p-6 md:p-10">
            <div className="flex justify-between items-center mb-10">
              <span className="text-[10px] font-black text-ink uppercase tracking-[0.2em]">Alpha Volume</span>
              <span className="text-[9px] font-bold text-accent px-2.5 py-1 bg-accent/5 rounded-full uppercase tracking-widest border border-accent/10">W-LOAD</span>
            </div>
            <div className="h-40 flex items-end gap-3 mb-6 px-2">
              {[0.5, 0.75, 0.33, 0.66, 0.9, 0.5, 0.66].map((h, i) => (
                <div key={i} className="w-full bg-white/[0.03] rounded-full group relative overflow-hidden" style={{ height: `${h * 100}%` }}>
                  {i === 4 && <div className="absolute inset-0 bg-accent shadow-[0_0_15px_rgba(114,137,253,0.4)]" />}
                  <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[8px] font-black text-muted uppercase tracking-[0.2em] px-1 opacity-30">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
                <span key={d} className={i === 4 ? 'text-accent opacity-100' : ''}>{d}</span>
              ))}
            </div>
          </div>

          <ModuleCard
            title="Active Programs"
            icon={<Dumbbell className="w-5 h-5" />}
            className="w-full"
          >
            <div className="space-y-6 pt-4">
              <div className="p-6 soothing-card border-l-4 border-accent">
                <div className="flex justify-between items-start mb-3">
                  <h5 className="text-lg font-display font-bold text-ink uppercase tracking-tight">PPL Split: Phase 2</h5>
                  <span className="text-[9px] font-black text-accent uppercase tracking-widest">W6/12</span>
                </div>
                <p className="text-[10px] uppercase font-bold text-muted mb-6 tracking-wide opacity-40">Progressive overload protocol.</p>
                <div className="flex justify-between items-center">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/10 grayscale" />
                    ))}
                  </div>
                  <button className="text-[9px] font-bold text-accent uppercase tracking-widest flex items-center gap-1.5 hover:text-ink transition-colors">
                    Resume <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </ModuleCard>

          <div className="relative overflow-hidden rounded-[32px] p-8 md:p-10 bg-white/[0.02] border border-white/5 backdrop-blur-xl text-ink shadow-2xl">
            <div className="relative z-10">
              <h4 className="text-lg md:text-xl font-display font-black mb-3 uppercase tracking-tight">Ready Protocol?</h4>
              <p className="text-muted text-[10px] mb-8 font-bold uppercase tracking-wide opacity-40">Scheduled for T+07:00 PHT.</p>
              <button className="precise-button w-full py-4 text-[10px]">
                Preview Plan
              </button>
            </div>
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-accent/5 rounded-full blur-3xl opacity-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

