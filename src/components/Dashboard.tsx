import { TrendingUp, Check, AlertTriangle, Landmark, Plus, ChevronRight, ShoppingBag, Utensils, Briefcase, Home, Plane, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Task, Transaction, Budget } from '../types';
import { ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { subMonths, format, isWithinInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { useMemo } from 'react';

interface DashboardProps {
  tasks: Task[];
  transactions: Transaction[];
  budgets: Budget[];
  onViewTasks: () => void;
  onViewExpenses: () => void;
  onAddClick: () => void;
}

export default function Dashboard({ 
  tasks = [], 
  transactions = [], 
  budgets = [],
  onViewTasks, 
  onViewExpenses, 
  onAddClick
}: DashboardProps) {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const tasksDueToday = safeTasks.filter(t => t.status !== 'done').length;
  const completedWeekly = safeTasks.filter(t => t.status === 'done').length;
  
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
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      
      const periodTransactions = safeTransactions.filter(t => {
        const d = parseISO(t.date);
        return isWithinInterval(d, { start, end });
      });
      
      const income = periodTransactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc, 0);
      const expense = periodTransactions.reduce((acc, t) => t.type === 'expense' ? acc + t.amount : acc, 0);
      data.push({ 
        name: format(monthDate, 'MMM'), 
        net: income - expense 
      });
    }
    return data;
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
    { label: 'Tasks Due Today', value: tasksDueToday.toString(), trend: 'Priority focus needed', trendIcon: TrendingUp, color: 'text-accent' },
    { label: 'Savings This Period', value: `$${Math.max(0, netBalance).toLocaleString()}`, trend: `${monthlyIncome > 0 ? Math.round((netBalance / monthlyIncome) * 100) : 0}% Savings Rate`, trendIcon: ArrowUpRight, color: 'text-success' },
    { label: 'Monthly Spend', value: `$${monthlySpend.toLocaleString()}`, trend: `${budgetUsagePercent}% of budget`, trendIcon: AlertTriangle, color: budgetUsagePercent > 90 ? 'text-alert' : 'text-accent' },
    { label: 'Budget Remaining', value: `$${budgetRemaining.toLocaleString()}`, trend: totalBudgetLimit > 0 ? 'Active allocation' : 'No budget set', trendIcon: Landmark, color: 'text-success' },
  ];

  return (
    <div className="pt-28 md:pt-32 pb-20 px-6 md:px-12 max-w-[1400px] mx-auto relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mb-16 md:mb-24"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
          <div>
            <p className="micro-label mb-3 text-accent">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h2 className="text-5xl md:text-7xl font-serif italic text-ink leading-[0.9] tracking-tight">
              Good evening, <br />
              <span className="opacity-40">Fazlur</span>
            </h2>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-24">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card p-8 flex flex-col justify-between min-h-[180px] group cursor-default"
          >
            <div>
              <p className="micro-label mb-4">{stat.label}</p>
              <p className="text-4xl md:text-5xl font-serif italic text-ink tracking-tight group-hover:text-accent transition-colors duration-500">{stat.value}</p>
            </div>
            <div className={`mt-6 flex items-center gap-2 ${stat.color} bg-white/[0.03] w-fit px-3 py-1.5 rounded-full border border-dark-border`}>
              <stat.trendIcon className="w-3 h-3" />
              <span className="text-[9px] font-bold uppercase tracking-widest">{stat.trend}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-20">
        <div className="lg:col-span-7 space-y-12">
          <div className="flex items-end justify-between border-b border-white/5 pb-4">
            <div>
              <h3 className="text-3xl font-serif italic text-ink">Active Pursuits</h3>
              <p className="micro-label mt-1 !opacity-30">Current focus protocols</p>
            </div>
            <button 
              onClick={onViewTasks}
              className="text-accent text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 group"
            >
              View All 
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-6">
              <p className="micro-label flex items-center gap-2">
                <span className="w-1 h-1 bg-accent rounded-full" />
                In Progress
              </p>
              
              {safeTasks.filter(t => t.status === 'in-progress').length > 0 ? (
                safeTasks.filter(t => t.status === 'in-progress').slice(0, 2).map((task, idx) => (
                  <motion.div 
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="glass-card p-6 hover:bg-white/[0.05] transition-all duration-500 group"
                  >
                    <div className="flex justify-between mb-4">
                      <span className="text-[8px] px-2 py-0.5 bg-white/5 rounded-full text-muted font-bold uppercase tracking-widest border border-white/5">{task.priority}</span>
                    </div>
                    <h4 className="text-lg font-serif italic text-ink mb-6 leading-tight group-hover:text-accent transition-colors">{task.title}</h4>
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-2">
                        <img className="w-7 h-7 rounded-full border-2 border-bg grayscale group-hover:grayscale-0 transition-all" src={`https://picsum.photos/seed/${task.id}/100/100`} alt="user" referrerPolicy="no-referrer" />
                      </div>
                      <span className="micro-label !opacity-30">Active Protocol</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="p-12 glass-card border-dashed border-white/10 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-muted font-bold">No active pursuits</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <p className="micro-label flex items-center gap-2">
                <span className="w-1 h-1 bg-alert rounded-full" />
                Awaiting Review
              </p>
              {safeTasks.filter(t => t.status === 'review').length > 0 ? (
                safeTasks.filter(t => t.status === 'review').slice(0, 1).map((task, idx) => (
                  <motion.div 
                    key={task.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="glass-card p-6 hover:bg-white/[0.05] transition-all duration-500 group border-alert/10"
                  >
                    <div className="flex justify-between mb-4">
                      <span className="text-[8px] px-2 py-0.5 bg-alert/10 text-alert rounded-full font-bold uppercase tracking-widest border border-alert/20">{task.priority}</span>
                    </div>
                    <h4 className="text-lg font-serif italic text-ink mb-6 leading-tight group-hover:text-alert transition-colors">{task.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-alert font-bold uppercase tracking-widest">Urgent Review</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="p-12 glass-card border-dashed border-white/10 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-muted font-bold">Nothing to review</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-12">
          <div className="flex items-end justify-between border-b border-white/5 pb-4">
            <div>
              <h3 className="text-3xl font-serif italic text-ink">Spending Flow</h3>
              <p className="micro-label mt-1 !opacity-30">Financial liquidity</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="h-8 w-20 hidden sm:block">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashflowData}>
                    <Bar dataKey="net">
                      {cashflowData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.net >= 0 ? 'var(--color-success)' : 'var(--color-alert)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <button 
                onClick={onViewExpenses}
                className="text-accent text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 group"
              >
                View All 
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
          <div className="glass-card p-8">
            <div className="space-y-8">
              {safeTransactions.length > 0 ? (
                safeTransactions.slice(0, 4).map((item, idx) => {
                  const Icon = getIcon(item.category);
                  return (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between group cursor-default"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-11 h-11 rounded-full bg-white/[0.03] flex items-center justify-center text-muted border border-white/5 group-hover:border-accent/30 group-hover:text-accent transition-all duration-500">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-ink tracking-tight">{item.merchant || item.category}</p>
                          <p className="micro-label !opacity-30 !normal-case tracking-normal mt-0.5">{item.date}</p>
                        </div>
                      </div>
                      <p className={`text-sm font-mono ${item.type === 'income' ? 'text-success' : 'text-ink'}`}>
                        {item.type === 'income' ? `+${item.amount.toFixed(2)}` : `-${item.amount.toFixed(2)}`}
                      </p>
                    </motion.div>
                  );
                })
              ) : (
                <div className="py-12 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-muted font-bold">No recent transactions</p>
                </div>
              )}
            </div>
            <div className="mt-10 pt-8 border-t border-white/5">
              <div className="flex items-center justify-between mb-4">
                <p className="micro-label">Budget Usage</p>
                <p className="text-xs font-mono text-ink">{totalBudgetLimit > 0 ? budgetUsagePercent : 0}%</p>
              </div>
              <div className="w-full bg-white/[0.03] h-1 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(budgetUsagePercent, 100)}%` }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  className={`${budgetUsagePercent > 90 ? 'bg-alert' : 'bg-accent'} h-full`} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add FAB */}
      <button 
        onClick={onAddClick}
        className="fixed bottom-10 right-10 w-16 h-16 bg-ink text-bg rounded-full shadow-2xl shadow-accent/10 flex items-center justify-center hover:bg-accent hover:scale-110 active:scale-95 transition-all duration-300 z-30 lg:hidden"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}


