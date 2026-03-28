import { PlusCircle, Star, Clock, Zap, Flower2, Activity, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Exercise } from '../types';

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
    <div className="pt-28 md:pt-32 px-6 md:px-12 pb-24 max-w-[1600px] mx-auto w-full min-h-screen">
      <section className="mb-16 md:mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <p className="micro-label mb-3 text-accent">Physical Sanctuary</p>
          <h1 className="text-5xl md:text-7xl font-serif italic text-ink leading-tight tracking-tight">Kinetic Excellence</h1>
          <p className="text-muted mt-6 text-base md:text-lg max-w-xl font-medium leading-relaxed">
            Consistency is the quietest form of excellence. You’ve completed {Math.round((sessions.length / 5) * 100)}% of your weekly targets.
          </p>
        </div>
        <button 
          onClick={onLogSession}
          className="w-full md:w-auto px-10 py-4 bg-ink text-bg rounded-full flex items-center justify-center gap-3 font-bold text-[10px] uppercase tracking-widest hover:bg-accent hover:text-bg transition-all duration-300 active:scale-95 shadow-xl shadow-accent/5"
        >
          <PlusCircle className="w-5 h-5" />
          Log Session
        </button>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-20">
        {stats.map((stat, i) => (
          <div key={i} className="glass-card p-8 rounded-[2rem] flex flex-col justify-between h-52 group hover:bg-white/[0.05] transition-all duration-500 border-white/5 hover:border-white/10">
            <span className="micro-label">{stat.label}</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-5xl font-serif italic ${stat.type === 'goal' ? 'text-accent' : 'text-ink'}`}>{stat.value}</span>
              {stat.total && <span className="text-2xl font-serif italic text-muted/30">{stat.total}</span>}
              {stat.unit && <span className="text-lg font-serif italic text-muted">{stat.unit}</span>}
            </div>
            {stat.progress !== undefined ? (
              <div className="w-full bg-white/[0.03] h-1 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(stat.progress, 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="bg-accent h-full shadow-[0_0_10px_rgba(var(--color-accent-rgb),0.3)]" 
                />
              </div>
            ) : stat.rating ? (
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`w-3.5 h-3.5 ${s <= stat.rating ? 'text-accent fill-accent' : 'text-white/[0.05]'}`} />
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted font-semibold uppercase tracking-wider opacity-50">{stat.sub}</p>
            )}
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-8">
          <div className="flex items-baseline justify-between mb-12 px-2">
            <h3 className="text-3xl font-serif italic text-ink">Recent Sessions</h3>
            <button className="text-accent font-bold text-[10px] uppercase tracking-widest hover:text-ink transition-colors">View History</button>
          </div>
          <div className="space-y-12">
            {sessions.map((session, i) => {
              const Icon = getIcon(session.icon);
              return (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="flex gap-10 items-start group"
                >
                  <div className="w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0 bg-white/[0.03] border border-white/5 group-hover:border-accent/20 transition-all duration-500">
                    <img src={session.img || `https://picsum.photos/seed/${session.title}/200/200`} alt={session.title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-110 group-hover:scale-100" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 pb-10 border-b border-white/[0.03]">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-accent mb-2 block">{session.category}</span>
                        <h4 className="text-2xl font-serif italic text-ink group-hover:text-accent transition-colors">{session.title}</h4>
                      </div>
                      <span className="text-[10px] font-bold text-muted uppercase tracking-widest">{session.date}</span>
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
            {sessions.length === 0 && (
              <div className="py-24 text-center glass-card rounded-[2.5rem] border-dashed border-white/5">
                <p className="micro-label !opacity-20">No sessions logged yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-16">
          <div className="glass-card p-10 rounded-[2.5rem] border-white/5">
            <div className="flex justify-between items-center mb-10">
              <h4 className="text-2xl font-serif italic text-ink">Performance</h4>
              <span className="text-[9px] font-bold text-accent px-2.5 py-1 bg-accent/10 rounded-full uppercase tracking-widest border border-accent/20">Volume</span>
            </div>
            <div className="h-40 flex items-end gap-3 mb-6 px-2">
              {[0.5, 0.75, 0.33, 0.66, 0.9, 0.5, 0.66].map((h, i) => (
                <div key={i} className="w-full bg-white/[0.03] rounded-full group relative overflow-hidden" style={{ height: `${h * 100}%` }}>
                  {i === 4 && <div className="absolute inset-0 bg-accent shadow-[0_0_15px_rgba(var(--color-accent-rgb),0.4)]" />}
                  <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[9px] font-bold text-muted uppercase tracking-widest px-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
                <span key={d} className={i === 4 ? 'text-accent' : 'opacity-40'}>{d}</span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-2xl font-serif italic mb-8 text-ink px-2">Active Programs</h4>
            <div className="space-y-6">
              <div className="p-8 glass-card rounded-[2rem] border-l-4 border-accent hover:bg-white/[0.05] transition-all duration-500 border-white/5">
                <div className="flex justify-between items-start mb-3">
                  <h5 className="text-xl font-serif italic text-ink">PPL Split: Phase 2</h5>
                  <span className="text-[9px] font-black text-accent uppercase tracking-widest">Week 6/12</span>
                </div>
                <p className="text-[11px] text-muted mb-6 font-medium leading-relaxed opacity-70">Focus: Progressive overload and compound lifts.</p>
                <div className="flex justify-between items-center">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-7 h-7 rounded-full bg-white/[0.05] border-2 border-bg grayscale" />
                    ))}
                  </div>
                  <button className="text-[10px] font-bold text-accent uppercase tracking-widest flex items-center gap-1.5 hover:text-ink transition-colors">
                    Resume <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2.5rem] p-10 bg-white/[0.02] border border-white/5 backdrop-blur-xl text-ink">
            <div className="relative z-10">
              <h4 className="text-2xl font-serif italic mb-3">Ready for tomorrow?</h4>
              <p className="text-muted text-[13px] mb-8 font-medium leading-relaxed">You have 'Pull Session' scheduled for 7:00 AM.</p>
              <button className="w-full py-4 bg-ink text-bg rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-accent hover:text-bg transition-all duration-300">
                View Pre-Workout Plan
              </button>
            </div>
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-accent/5 rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

