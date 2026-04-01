import { TrendingUp, AlertTriangle, Landmark, Plus, ChevronRight, ShoppingBag, Utensils, Briefcase, Home, Plane, ArrowUpRight, ArrowDownRight, Flame, Repeat, CheckCircle2, Circle } from 'lucide-react';
import { motion } from 'motion/react';
import { Task, Transaction, Budget, UserStats } from '../types';
import { ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { subMonths, format, isWithinInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { useMemo } from 'react';

interface DashboardProps {
  tasks: Task[];
  transactions: Transaction[];
  budgets: Budget[];
  userStats?: UserStats | null;
  onViewTasks: () => void;
  onViewExpenses: () => void;
  onAddClick: () => void;
  userName?: string;
  onUpdateTaskStatus?: (taskId: string, status: Task['status']) => void;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard({
  tasks = [],
  transactions = [],
  budgets = [],
  onViewTasks,
  onViewExpenses,
  onAddClick,
  userName,
  userStats,
  onUpdateTaskStatus,
}: DashboardProps) {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const tasksDueToday = safeTasks.filter(t => t.status !== 'done').length;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyTransactions = safeTransactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const monthlySpend = monthlyTransactions.reduce((acc, t) => t.type === 'expense' ? acc + t.amount : acc, 0);
  const monthlyIncome = monthlyTransactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc, 0);
  const netBalance = monthlyIncome - monthlySpend;
  const totalBudgetLimit = budgets.reduce((acc, b) => acc + b.monthly_limit, 0);
  const budgetRemaining = Math.max(0, totalBudgetLimit - monthlySpend);
  const budgetUsagePercent = totalBudgetLimit > 0 ? Math.round((monthlySpend / totalBudgetLimit) * 100) : 0;

  const cashflowData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const monthDate = subMonths(now, 5 - i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const periodTx = safeTransactions.filter(t => {
        try { return isWithinInterval(parseISO(t.date), { start, end }); } catch { return false; }
      });
      const income = periodTx.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc, 0);
      const expense = periodTx.reduce((acc, t) => t.type === 'expense' ? acc + t.amount : acc, 0);
      return { name: format(monthDate, 'MMM'), net: income - expense };
    });
  }, [safeTransactions]);

  const getIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'technology': return ShoppingBag;
      case 'dining': return Utensils;
      case 'income': return Briefcase;
      case 'housing': return Home;
      case 'travel': return Plane;
      default: return Landmark;
    }
  };

  const stats = [
    { label: 'Active Habits', value: safeTasks.filter(t => t.taskCategory === 'daily' && t.status !== 'done').length.toString(), trend: 'Daily Protocol', trendIcon: Repeat, color: 'text-accent' },
    { label: 'Savings', value: `$${Math.max(0, netBalance).toLocaleString()}`, trend: `${monthlyIncome > 0 ? Math.round((netBalance / monthlyIncome) * 100) : 0}% rate`, trendIcon: ArrowUpRight, color: 'text-success' },
    { label: 'Monthly Spend', value: `$${monthlySpend.toLocaleString()}`, trend: `${budgetUsagePercent}% of budget`, trendIcon: AlertTriangle, color: budgetUsagePercent > 90 ? 'text-alert' : 'text-accent' },
    { label: 'Budget Left', value: `$${budgetRemaining.toLocaleString()}`, trend: totalBudgetLimit > 0 ? 'Active allocation' : 'No budget set', trendIcon: Landmark, color: 'text-success' },
  ];

  const displayName = userName || 'You';

  return (
    <div className="w-full max-w-7xl mx-auto space-y-12 pb-24">
    <div className="w-full max-w-6xl mx-auto space-y-16 pb-32 px-6">
      {/* 1. Header & Identity Pulse */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-12 pt-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-center lg:text-left space-y-4"
        >
          <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-accent/5 border border-accent/10 rounded-full">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">System Active</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-display font-black tracking-[-0.04em] text-ink leading-tight">
            {getGreeting()},<br/>
            <span className="text-accent/40">{displayName}</span>
          </h1>
        </motion.div>

        {userStats && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-48 h-48 flex items-center justify-center"
          >
            {/* Circular Progress Ring */}
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="96" cy="96" r="88"
                className="fill-none stroke-white/[0.03] stroke-[6]"
              />
              <motion.circle
                cx="96" cy="96" r="88"
                className="fill-none stroke-accent stroke-[6]"
                strokeDasharray="552.92"
                initial={{ strokeDashoffset: 552.92 }}
                animate={{ strokeDashoffset: 552.92 - (552.92 * (userStats.exp / (userStats.level * 100))) }}
                transition={{ duration: 2, ease: "circOut" }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-display font-black text-ink">{userStats.level}</span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted/50">Tier</span>
            </div>
            {/* Glow effect */}
            <div className="absolute inset-0 bg-accent/5 blur-3xl rounded-full scale-75 pointer-events-none" />
          </motion.div>
        )}
      </div>

      {/* 2. Top Missions (Pill Cards) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="micro-label !text-muted/40">Critical Protocol</h3>
          <button onClick={onViewTasks} className="text-[10px] font-bold text-accent hover:underline uppercase tracking-widest">Open Archive</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {safeTasks.filter(t => t.status !== 'done').slice(0, 3).map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="pill-container group cursor-pointer justify-between"
              onClick={() => onUpdateTaskStatus?.(task.id, 'done')}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center group-hover:border-accent/30 transition-all">
                  <div className="w-2 h-2 bg-muted/20 rounded-full group-hover:bg-accent transition-all" />
                </div>
                <span className="text-xs font-bold text-ink/70 group-hover:text-ink truncate max-w-[120px]">{task.title}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted/20 group-hover:text-accent group-hover:translate-x-1 transition-all" />
            </motion.div>
          ))}
          {safeTasks.filter(t => t.status !== 'done').length === 0 && (
            <div className="md:col-span-3 py-8 text-center text-muted/20 text-[10px] uppercase font-black tracking-widest bg-white/[0.01] rounded-full border border-dashed border-white/5">
              No Pending Missions
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      {/* 3. Stats Reflection */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            className="group flex flex-col items-center text-center space-y-4"
          >
            <div className="w-20 h-20 rounded-full border border-white/10 bg-white/[0.01] flex items-center justify-center group-hover:border-accent/30 group-hover:bg-accent/5 transition-all duration-500 shadow-xl shadow-black/20">
              <stat.trendIcon className={`w-8 h-8 ${stat.color} opacity-40 group-hover:opacity-100 transition-all`} />
            </div>
            <div>
              <p className="micro-label !text-muted/30 mb-1">{stat.label}</p>
              <p className="text-2xl font-mono font-black text-ink group-hover:text-ink transition-colors">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 4. Financial Status & Protocol Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-8 border-t border-white/[0.03]">
        <div className="lg:col-span-12 space-y-8">
           <div className="flex items-center justify-between border-b border-white/[0.03] pb-6">
              <div>
                <h3 className="text-2xl font-display font-black text-ink">Asset Flow</h3>
                <p className="micro-label mt-1 opacity-30">Real-time financial resonance</p>
              </div>
              <div className="flex items-center gap-6">
                 {/* Mini Chart Pill */}
                 <div className="pill-container !py-2 !px-4 hidden sm:flex">
                   <BarChart width={40} height={20} data={cashflowData.slice(-4)}>
                     <Bar dataKey="net">
                        {cashflowData.slice(-4).map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.net >= 0 ? 'var(--color-success)' : 'var(--color-alert)'} opacity={0.4} />
                        ))}
                     </Bar>
                   </BarChart>
                   <span className="text-[10px] font-black text-success">+12%</span>
                 </div>
                 <button onClick={onViewExpenses} className="precise-button">Report</button>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Financial Snapshot Card */}
              <motion.div whileHover={{ y: -5 }} className="soothing-card bg-gradient-to-br from-white/[0.02] to-transparent">
                 <div className="flex justify-between items-start mb-8">
                    <p className="micro-label">Weekly Burn Rate</p>
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                       <TrendingUp className="w-4 h-4" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <p className="text-4xl font-mono font-black text-ink">${monthlySpend.toLocaleString()}</p>
                    <div className="w-full h-2 bg-white/[0.03] rounded-full overflow-hidden">
                       <motion.div 
                          className="h-full bg-accent shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                          initial={{ width: 0 }}
                          animate={{ width: `${budgetUsagePercent}%` }}
                       />
                    </div>
                    <p className="text-[10px] font-bold text-muted/40 uppercase tracking-widest text-right">{budgetUsagePercent}% of limit reached</p>
                 </div>
              </motion.div>

              {/* Habit Pulse Matrix */}
              <div className="soothing-card space-y-6">
                 <p className="micro-label">Active Habits</p>
                 <div className="grid grid-cols-5 gap-4">
                    {safeTasks.filter(t => t.taskCategory === 'daily').slice(0, 5).map((habit, i) => (
                       <button 
                          key={habit.id}
                          onClick={() => onUpdateTaskStatus?.(habit.id, habit.status === 'done' ? 'todo' : 'done')}
                          className={`w-14 h-14 rounded-full border-2 transition-all flex items-center justify-center ${habit.status === 'done' ? 'border-success bg-success/10 text-success' : 'border-white/5 bg-white/[0.01] text-muted/20 hover:border-accent/40'}`}
                       >
                          {habit.status === 'done' ? <CheckCircle2 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
                       </button>
                    ))}
                    {/* Placeholder for habits if empty */}
                    {safeTasks.filter(t => t.taskCategory === 'daily').length === 0 && (
                       <div className="col-span-5 h-14 rounded-full border border-dashed border-white/5 flex items-center justify-center text-[10px] text-muted/20 font-black uppercase">Initialize Protocols</div>
                    )}
                 </div>
                 <p className="text-[10px] font-bold text-muted/40 uppercase tracking-[0.2em] text-center">Maintain consistency for bonus EXP</p>
              </div>
           </div>
        </div>
      </div>

      {/* Modern FAB */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        onClick={onAddClick}
        className="fixed bottom-12 right-12 w-16 h-16 bg-accent text-white rounded-full shadow-[0_20px_40px_rgba(99,102,241,0.4)] flex items-center justify-center z-50 border border-white/20"
      >
        <Plus className="w-6 h-6" />
      </motion.button>
    </div>
    </div>
  );
}
