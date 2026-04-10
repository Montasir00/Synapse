import { TrendingUp, AlertTriangle, Plus, ArrowUpRight, ListChecks, Wallet, RefreshCw, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Transaction, Budget } from '../types';
import { ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { subMonths, format, isWithinInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { useState, useEffect, useMemo } from 'react';

interface DashboardProps {
  tasks: Task[];
  transactions: Transaction[];
  budgets: Budget[];
   onViewTasks?: () => void;
  onViewExpenses: () => void;
   onAddTask: () => void;
   onAddExpense: () => void;
  onAddClick: () => void;
   tradeSnapshot?: {
      openPositions: number;
      closedPositions: number;
      totalNetPnl: number;
      totalFees: number;
      avgHoldDuration: { winner: number; loser: number };
      tagPerformance: Record<string, { pnl: number; count: number }>;
      lastSyncAt: number | null;
      hasError: boolean;
   };
}

export default function Dashboard({
  tasks = [],
  transactions = [],
  budgets = [],
   onViewTasks,
  onViewExpenses,
   onAddTask,
   onAddExpense,
  onAddClick,
   tradeSnapshot,
}: DashboardProps) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

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

   const recentCashflowTrend = useMemo(() => {
      if (cashflowData.length < 2) return 0;
      const previous = cashflowData[cashflowData.length - 2]?.net ?? 0;
      const current = cashflowData[cashflowData.length - 1]?.net ?? 0;
      const baseline = Math.abs(previous) > 0 ? Math.abs(previous) : 1;
      return Math.round(((current - previous) / baseline) * 100);
   }, [cashflowData]);

   const todoCount = safeTasks.filter(t => t.status !== 'done').length;
   const activeTradeSnapshot = tradeSnapshot || ({
      openPositions: 0,
      closedPositions: 0,
      totalNetPnl: 0,
      totalFees: 0,
      avgHoldDuration: { winner: 0, loser: 0 },
      tagPerformance: {},
      lastSyncAt: null,
      hasError: false,
   } as NonNullable<DashboardProps['tradeSnapshot']>);

   const stats = [
      { label: 'Savings', value: `$${Math.max(0, netBalance).toLocaleString()}`, trend: `${monthlyIncome > 0 ? Math.round((netBalance / monthlyIncome) * 100) : 0}% rate`, trendIcon: ArrowUpRight, color: 'text-success' },
      { label: 'Monthly Spend', value: `$${monthlySpend.toLocaleString()}`, trend: `${budgetUsagePercent}% limit`, trendIcon: AlertTriangle, color: budgetUsagePercent > 90 ? 'text-alert' : 'text-warning' },
      { label: 'To Do', value: todoCount.toString(), trend: `${safeTasks.length - todoCount}/${safeTasks.length} done`, trendIcon: ListChecks, color: 'text-accent' },
      {
         label: 'Open Trades',
         value: activeTradeSnapshot.openPositions.toString(),
         valueSuffix: 'Open',
         trend: activeTradeSnapshot.hasError
            ? 'Sync issue detected'
            : activeTradeSnapshot.lastSyncAt
            ? `Sync ${format(new Date(activeTradeSnapshot.lastSyncAt), 'MMM d HH:mm')}`
            : 'No sync yet',
         trendIcon: Wallet,
         color: activeTradeSnapshot.totalNetPnl >= 0 ? 'text-teal' : 'text-alert'
      },
   ] as Array<{ label: string; value: string; valueSuffix?: string; trend: string; trendIcon: any; color: string }>;

  return (
   <div className="w-full max-w-6xl mx-auto space-y-8 sm:space-y-10 lg:space-y-12 pb-8 sm:pb-10 lg:pb-16 px-3 sm:px-4 lg:px-6 pt-6 sm:pt-8 lg:pt-12">

      <div className="flex flex-row items-center justify-between gap-4">
         <h2 className="text-xl sm:text-2xl font-black text-ink tracking-tight uppercase">Overview</h2>
         <div className="flex gap-2 sm:gap-3">
            <button
               onClick={onAddTask}
               aria-label="Add new task"
               className="precise-button !px-3 sm:!px-5 !py-3 sm:!py-2 flex items-center gap-2 group/btn min-h-[44px]"
            >
               <Plus className="w-4 h-4 group-hover/btn:rotate-90 transition-transform" />
               <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Task</span>
            </button>
            <button
               onClick={onAddExpense}
               aria-label="Add new expense"
               className="precise-button !px-3 sm:!px-5 !py-3 sm:!py-2 flex items-center gap-2 group/btn min-h-[44px]"
            >
               <Plus className="w-4 h-4 group-hover/btn:rotate-90 transition-transform" />
               <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Expense</span>
            </button>
         </div>
      </div>

      {/* 2. The Command Strip (System Vitals) */}
         <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 w-full divide-y sm:divide-y-0 sm:divide-x divide-border/30 border border-border/50 rounded-2xl bg-surface-subtle/20 overflow-hidden shadow-sm">
        {stats.map((stat, i) => (
               <div key={i} className="p-4 sm:p-5 flex flex-col justify-center text-center sm:text-left hover:bg-surface/50 transition-colors relative group min-w-0">
            <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-1 mb-2">
               <span className="text-[10px] sm:text-[11px] font-bold text-muted/60 uppercase tracking-[0.14em]">{stat.label}</span>
               <div className="flex items-center gap-1 opacity-70">
                  <stat.trendIcon className={`w-3 h-3 ${stat.color}`} />
                  <span className={`text-[10px] font-black uppercase tracking-[0.12em] ${stat.color}`}>{stat.trend}</span>
               </div>
            </div>
            <div className="flex items-baseline justify-center lg:justify-start gap-1.5">
               <span className={`text-xl sm:text-2xl lg:text-3xl font-mono font-black tracking-tighter text-ink group-hover:text-accent transition-colors`}>{stat.value}</span>
               {stat.valueSuffix && <span className="text-[10px] font-bold text-muted/60 uppercase tracking-widest">{stat.valueSuffix}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Financial Audit Row */}
      <div className="space-y-8 pt-6 border-t border-border">
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
               <h3 className="text-2xl font-black text-ink">Financial Snapshot</h3>
               <p className="micro-label mt-1">Real-time expenditure tracking</p>
            </div>
            <button onClick={onViewExpenses} aria-label="View all expenses" className="precise-button !pl-8 !pr-8 !py-3 w-full sm:w-full md:w-auto min-h-[44px]">View Expenses</button>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <motion.div whileHover={{ scale: 1.01 }} className="soothing-card p-5 sm:p-8 bg-surface border-border">
               <div className="flex justify-between items-start mb-10">
                  <p className="micro-label !text-ink/40">Monthly spend</p>
                  <div className="flex items-center gap-2 px-3 py-1 bg-accent/10 rounded-full">
                     <TrendingUp className="w-3 h-3 text-accent" />
                     <span className="text-[10px] font-black text-accent uppercase tracking-wide">Current Month</span>
                  </div>
               </div>
               <div className="space-y-4">
                   <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                     <p className="text-4xl sm:text-5xl font-mono font-black text-ink tracking-tight leading-none">${monthlySpend.toLocaleString()}</p>
                     <p className="text-[10px] sm:text-[11px] font-bold text-muted uppercase tracking-[0.12em] sm:tracking-[0.2em] whitespace-nowrap opacity-60">{budgetUsagePercent}% Utilization</p>
                   </div>
                  <div className="w-full h-1.5 bg-surface-subtle rounded-full overflow-hidden">
                     <motion.div 
                        className="h-full bg-accent shadow-[0_0_15px_rgba(139,92,246,0.6)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${budgetUsagePercent}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                     />
                  </div>
               </div>
            </motion.div>

            <div className="soothing-card p-5 sm:p-8 flex flex-col border-border bg-surface min-w-0">
               <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-display font-black text-ink uppercase tracking-tight">Net Performance</h3>
                    <p className="micro-label mt-1">Cashflow trend</p>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1 bg-success/10 rounded-full">
                     <ArrowUpRight className="w-3 h-3 text-success" />
                     <span className="text-[10px] font-black text-success uppercase">{recentCashflowTrend >= 0 ? '+' : ''}{recentCashflowTrend}%</span>
                  </div>
               </div>
                        <div className="flex-1 w-full min-w-0 min-h-[130px] sm:min-h-[180px] relative">
                   {cashflowData.some(d => d.net !== 0) ? (
                               <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={130}>
                       <BarChart data={cashflowData}>
                         <Bar dataKey="net">
                            {cashflowData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.net >= 0 ? 'var(--color-success)' : 'var(--color-alert)'} opacity={index === cashflowData.length - 1 ? 1 : 0.2} />
                            ))}
                         </Bar>
                       </BarChart>
                     </ResponsiveContainer>
                   ) : (
                     <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30">
                       <p className="text-[10px] font-black uppercase tracking-[0.2em]">No cashflow data in buffer</p>
                     </div>
                   )}
                </div>
            </div>
         </div>

             <div className="soothing-card p-5 sm:p-6 lg:p-8 border-border bg-surface-subtle/40">
                <div className="flex items-center justify-between mb-4">
                  <p className="micro-label !text-ink/40">Trade Snapshot</p>
                   <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted">
                      <RefreshCw className="w-3.5 h-3.5" />
                      {activeTradeSnapshot.lastSyncAt ? format(new Date(activeTradeSnapshot.lastSyncAt), 'MMM d HH:mm') : 'No Sync'}
                   </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                   <div className="rounded-2xl border border-border bg-surface p-4">
                      <p className="micro-label mb-2">Open Positions</p>
                      <p className="text-2xl font-mono font-black text-accent">{activeTradeSnapshot.openPositions}</p>
                   </div>
                   <div className="rounded-2xl border border-border bg-surface p-4">
                      <p className="micro-label mb-2">Trade Net PnL</p>
                      <p className={`text-2xl font-mono font-black ${activeTradeSnapshot.totalNetPnl >= 0 ? 'text-success' : 'text-alert'}`}>
                         {activeTradeSnapshot.totalNetPnl >= 0 ? '+' : '-'}${Math.abs(activeTradeSnapshot.totalNetPnl).toLocaleString()}
                      </p>
                   </div>
                   <div className="rounded-2xl border border-border bg-surface-subtle p-4 border-alert/20">
                      <p className="micro-label mb-2 text-alert">Fees Paid</p>
                      <p className="text-2xl font-mono font-black text-alert">-${(activeTradeSnapshot?.totalFees || 0).toFixed(2)}</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                   <div className="rounded-2xl border border-border bg-surface p-4">
                      <p className="micro-label mb-2">Hold Time (Winners)</p>
                      <p className="text-xl font-mono font-black text-teal">
                        {activeTradeSnapshot?.avgHoldDuration?.winner > 0 
                          ? ((activeTradeSnapshot.avgHoldDuration.winner || 0) / (1000 * 60 * 60)).toFixed(1) + ' hrs'
                          : 'N/A'}
                      </p>
                   </div>
                   <div className="rounded-2xl border border-border bg-surface p-4">
                      <p className="micro-label mb-2">Hold Time (Losers)</p>
                      <p className="text-xl font-mono font-black text-rose-400">
                        {activeTradeSnapshot?.avgHoldDuration?.loser > 0 
                          ? ((activeTradeSnapshot.avgHoldDuration.loser || 0) / (1000 * 60 * 60)).toFixed(1) + ' hrs'
                          : 'N/A'}
                      </p>
                   </div>
                </div>

                {Object.keys(activeTradeSnapshot?.tagPerformance || {}).length > 0 && (
                  <div className="mt-8 pt-6 border-t border-border">
                    <h4 className="micro-label !text-ink/60 mb-4 uppercase tracking-[0.2em]">Strategy Performance Log</h4>
                    <div className="space-y-3">
                      {Object.entries(activeTradeSnapshot?.tagPerformance || {})
                        .sort((a: any, b: any) => (b[1]?.pnl || 0) - (a[1]?.pnl || 0))
                        .slice(0, 3)
                        .map(([tag, data]: [string, any]) => (
                          <div key={tag} className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border/50">
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-0.5 rounded-md bg-accent/10 text-[10px] font-black text-accent uppercase">{tag}</span>
                              <span className="text-[10px] font-bold text-muted">{data.count} Trades</span>
                            </div>
                            <span className={`text-sm font-mono font-black ${data.pnl >= 0 ? 'text-success' : 'text-alert'}`}>
                              {data.pnl >= 0 ? '+' : '-'}${Math.abs(data.pnl).toLocaleString()}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
             </div>
      </div>

      {/* Modern FAB */}
      <motion.button
         whileHover={{ scale: 1.1, rotate: 90 }}
         whileTap={{ scale: 0.9 }}
         onClick={onAddClick}
         className="hidden lg:flex fixed bottom-12 right-12 w-16 h-16 bg-accent text-white rounded-full shadow-md items-center justify-center z-50 border border-transparent"
      >
         <Plus className="w-6 h-6" />
      </motion.button>

      {/* Mobile Scroll to Top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={scrollToTop}
                  className="lg:hidden fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 w-12 h-12 bg-surface/80 backdrop-blur-xl border border-border text-accent rounded-full shadow-2xl flex items-center justify-center z-[85] active:scale-90"
            aria-label="Back to top"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
}
