import { TrendingUp, Landmark, ShoppingBag, Utensils, Briefcase, Home, Plane, Download, Plus, PieChart, ArrowUpRight, ArrowDownRight, Trash2, Edit3, Settings2, KeyRound, Check, X, ChevronDown, Search, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, Budget } from '../types';
import { useState, useMemo } from 'react';
import { format, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, startOfYear, isWithinInterval, endOfDay, parseISO, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip, PieChart as RechartsPieChart, Pie, Legend } from 'recharts';

interface ExpensesProps {
  transactions: Transaction[];
  budgets: Budget[];
  onAddExpense: () => void;
  onEditExpense: (t: Transaction) => void;
  onDeleteExpense: (id: string) => void;
  onUpsertBudget: (category: string, limit: number) => void;
  globalMonthlyBudget: number;
  onSetGlobalBudget: (limit: number) => void;
}

type TimePeriod = 'weekly' | 'monthly' | 'ytd';

const NoirTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div className="soothing-card p-3 shadow-md border-border !bg-surface">
        <p className="micro-label mb-1">{payload[0].payload.name}</p>
        <p className={`text-xs font-mono font-black ${val >= 0 ? 'text-accent' : 'text-alert'}`}>
          {val >= 0 ? '+' : '-'}${Math.abs(val).toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export default function Expenses({
  transactions,
  budgets,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onUpsertBudget,
  globalMonthlyBudget,
  onSetGlobalBudget,
}: ExpensesProps) {
  const [timePeriod] = useState<TimePeriod>('monthly');
  const [savingsGoal, setSavingsGoal] = useState(5000);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState('5000');
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<{category: string, limit: string} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [selectedBudgetDate, setSelectedBudgetDate] = useState(new Date());
  const [isFocusedLedgerOpen, setIsFocusedLedgerOpen] = useState(false);

  // ALL-TIME CUMULATIVE SAVINGS (Historical Reserves)
  const allTimeSavings = useMemo(() => {
    return transactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0);
  }, [transactions]);

  // CATEGORY COLOR MAP for PieChart
  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#8b5cf6', '#3b82f6'];

  // BUDGET-SPECIFIC MONTH FILTER
  const budgetPeriodTransactions = useMemo(() => {
    const start = startOfMonth(selectedBudgetDate);
    const end = endOfDay(new Date(selectedBudgetDate.getFullYear(), selectedBudgetDate.getMonth() + 1, 0));
    return transactions.filter(t => {
      const d = parseISO(t.date);
      return isWithinInterval(d, { start, end });
    });
  }, [transactions, selectedBudgetDate]);

  const budgetPeriodTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    budgetPeriodTransactions.filter(t => t.type === 'expense').forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    return Object.entries(totals);
  }, [budgetPeriodTransactions]);

  // Filter transactions based on time period
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let start: Date;
    if (timePeriod === 'weekly') start = startOfWeek(now);
    else if (timePeriod === 'monthly') start = startOfMonth(now);
    else start = startOfYear(now);
    return transactions.filter(t => {
      const tDate = parseISO(t.date);
      return isWithinInterval(tDate, { start, end: endOfDay(now) });
    });
  }, [transactions, timePeriod]);

  // Search filter for the ledger
  const searchedTransactions = useMemo(() => {
    if (!searchTerm) return filteredTransactions;
    const lower = searchTerm.toLowerCase();
    return filteredTransactions.filter(t =>
      (t.merchant?.toLowerCase().includes(lower)) ||
      t.category.toLowerCase().includes(lower) ||
      t.amount.toString().includes(lower)
    );
  }, [filteredTransactions, searchTerm]);

  const totalSpent = filteredTransactions.reduce((acc, t) => t.type === 'expense' ? acc + t.amount : acc, 0);
  const totalIncome = filteredTransactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc, 0);
  const netBalance = totalIncome - totalSpent;
  const savingsRate = totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0;

  // Cashflow Trend Data (Last 6 periods)
  const cashflowData = useMemo(() => {
    const now = new Date();
    const data: { name: string; net: number }[] = [];
    if (timePeriod === 'weekly') {
      const weeks = eachWeekOfInterval({ start: subWeeks(now, 5), end: now });
      weeks.forEach(weekStart => {
        const weekEnd = endOfDay(endOfWeek(weekStart));
        const periodTx = transactions.filter(t => {
          const d = parseISO(t.date);
          return isWithinInterval(d, { start: weekStart, end: weekEnd });
        });
        const inc = periodTx.reduce((a, t) => t.type === 'income' ? a + t.amount : a, 0);
        const exp = periodTx.reduce((a, t) => t.type === 'expense' ? a + t.amount : a, 0);
        data.push({ name: format(weekStart, 'MMM d'), net: inc - exp });
      });
    } else {
      const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });
      months.forEach(monthStart => {
        const monthEnd = endOfDay(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0));
        const periodTx = transactions.filter(t => {
          const d = parseISO(t.date);
          return isWithinInterval(d, { start: monthStart, end: monthEnd });
        });
        const inc = periodTx.reduce((a, t) => t.type === 'income' ? a + t.amount : a, 0);
        const exp = periodTx.reduce((a, t) => t.type === 'expense' ? a + t.amount : a, 0);
        data.push({ name: format(monthStart, 'MMM'), net: inc - exp });
      });
    }
    return data;
  }, [transactions, timePeriod]);

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [filteredTransactions]);

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

  const handleSaveGoal = () => {
    const val = parseFloat(tempGoal);
    if (!isNaN(val) && val > 0) setSavingsGoal(val);
    setIsEditingGoal(false);
  };

  const handleExport = () => {
    const headers = ['Date', 'Merchant', 'Category', 'Amount', 'Type'];
    const rows = searchedTransactions.map(t => [
      t.date,
      t.merchant || '',
      t.category,
      t.amount.toString(),
      t.type
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `taskos_ledger_${timePeriod}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 sm:space-y-10 lg:space-y-12 pb-20 sm:pb-24 lg:pb-32 px-3 sm:px-4 lg:px-6 pt-6 sm:pt-8 lg:pt-12">
      {/* 2. Compact Metrics - 2x2 Grid on Mobile */}

      {/* 2. Compact Metrics - 2x2 Grid on Mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-5 lg:gap-6">
        {[
          { label: 'Inflow', value: `$${totalIncome.toLocaleString()}`, icon: ArrowUpRight, color: 'text-success' },
          { label: 'Outflow', value: `$${totalSpent.toLocaleString()}`, icon: ArrowDownRight, color: 'text-alert' },
          { label: 'Net', value: `${netBalance >= 0 ? '+' : '-'}$${Math.abs(netBalance).toLocaleString()}`, icon: Landmark, color: netBalance >= 0 ? 'text-success' : 'text-alert' },
          { label: 'Efficiency', value: `${savingsRate.toFixed(0)}%`, icon: TrendingUp, color: 'text-accent' },
        ].map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="soothing-card flex flex-col items-center justify-center p-2.5 sm:p-3 md:p-4 min-h-[98px] sm:min-h-[120px] md:min-h-[140px] border-border hover:border-accent/30 text-center"
          >
            <div className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mb-2 md:mb-3`}
            >
              <m.icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${m.color}`} aria-hidden="true" />
            </div>
            <p className="text-[10px] sm:micro-label !text-muted mb-0.5 md:mb-1 uppercase tracking-wide sm:tracking-widest">{m.label}</p>
            <h3 className={`text-sm sm:text-lg md:text-2xl font-mono font-black ${m.color}`}>{m.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* 3. Strategic Buffer - HISTORICAL RESERVES */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="soothing-card p-6 md:p-10 min-h-0 md:min-h-[180px] flex flex-col justify-center bg-gradient-to-br from-surface to-bg border-accent/10"
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 sm:gap-6 md:gap-8">
          <div className="space-y-2 md:space-y-4">
            <div className="flex items-center gap-2 mb-1 md:mb-2">
              <Landmark className="w-3.5 md:w-4 h-3.5 md:h-4 text-accent animate-pulse" />
              <span className="text-[10px] md:micro-label !text-accent tracking-[0.12em] sm:tracking-[0.3em] font-black uppercase">Historical Reserves</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-display font-black text-ink tracking-tighter">
              ${allTimeSavings.toLocaleString()}
            </h2>
            <div className="flex items-center gap-2 text-muted">
              <TrendingUp className="w-3 md:w-3.5 h-3 md:h-3.5 text-success" />
              <span className="text-[10px] md:text-[10px] font-bold uppercase tracking-wide sm:tracking-widest leading-none">Cumulative Savings Volume</span>
            </div>
          </div>
          
          <div className="flex-1 max-w-xl self-start lg:self-center w-full">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-3 md:mb-4">
               <div>
                 <p className="text-xs font-black uppercase text-ink tracking-wide sm:tracking-widest mb-1">Target Milestone</p>
                 <div className="flex items-baseline gap-2">
                   {isEditingGoal ? (
                     <div className="flex items-center gap-2">
                       <input 
                         type="number" 
                         value={tempGoal} 
                         onChange={e => setTempGoal(e.target.value)}
                         className="w-20 md:w-24 bg-black/40 border-b border-accent outline-none text-ink text-xs md:text-sm py-1 font-mono"
                       />
                       <button onClick={handleSaveGoal} className="p-1 hover:bg-white/5 rounded-full"><Check className="w-3 md:w-3.5 h-3 md:h-3.5 text-accent" /></button>
                     </div>
                   ) : (
                     <>
                       <span className="text-sm sm:text-base md:text-xl font-mono font-black text-ink">${savingsGoal.toLocaleString()}</span>
                       <button onClick={() => { setTempGoal(savingsGoal.toString()); setIsEditingGoal(true); }} className="p-1 hover:bg-white/5 rounded-full"><Edit3 className="w-2.5 md:w-3 h-2.5 md:h-3 text-muted" /></button>
                     </>
                   )}
                 </div>
               </div>
               <div className="text-right">
                 <p className="text-xs font-black uppercase text-muted tracking-wide sm:tracking-widest mb-1">Gap to Goal</p>
                     <span className="text-sm sm:text-base md:text-lg font-mono font-black text-accent/60">
                   ${Math.max(0, savingsGoal - allTimeSavings).toLocaleString()}
                 </span>
               </div>
            </div>
            <div className="h-3 md:h-4 bg-surface-subtle rounded-full border border-border overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (allTimeSavings / savingsGoal) * 100)}%` }}
                transition={{ duration: 1.5, ease: 'circOut' }}
                className={`h-full ${allTimeSavings >= savingsGoal ? 'bg-success shadow-[0_0_20px_rgba(52,211,153,0.3)]' : 'bg-accent shadow-[0_0_20px_rgba(99,102,241,0.3)]'} relative`}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 4. Two‑Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12">
        {/* LEFT COLUMN: Ledger */}
        <div className="lg:col-span-7">
          <div className="soothing-card !p-0 overflow-hidden flex flex-col h-full bg-surface">
            <div className="p-4 sm:p-6 border-b border-border space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-xl sm:text-2xl font-display font-black text-ink uppercase tracking-tighter">Registry</h3>
                <div className="flex items-center gap-2 sm:gap-3">
                  <button 
                    onClick={() => setIsFocusedLedgerOpen(true)} 
                    className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted hover:text-accent hover:border-accent/40 transition-all active:scale-95 shadow-lg shadow-black/20"
                    aria-label="Expand focused ledger"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={onAddExpense} 
                    className="precise-button !px-4 md:!px-6 !py-2 md:!py-3 flex items-center gap-2 group/btn relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                    <Plus className="w-3.5 md:w-4 h-3.5 md:h-4 group-hover/btn:rotate-90 transition-transform relative z-10" />
                    <span className="relative z-10 hidden sm:inline">New Entry</span>
                    <span className="relative z-10 sm:hidden">Add</span>
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 md:gap-4 bg-surface-subtle px-4 md:px-6 py-2.5 md:py-3 rounded-full border border-border focus-within:border-accent/30 transition-all">
                <Search className="w-3.5 md:w-4 h-3.5 md:h-4 text-muted" />
                <input
                  type="text"
                  placeholder="Registry search..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs md:text-sm text-ink w-full placeholder:text-muted font-semibold"
                />
              </div>
            </div>
            <div className="overflow-y-auto h-[300px] sm:h-[400px] scrollbar-custom">
              <div className="divide-y divide-white/[0.02]">
                {searchedTransactions.length > 0 ? (
                  searchedTransactions.slice(0, 50).map(t => {
                    const Icon = getIcon(t.category);
                    const tDate = parseISO(t.date);
                    return (
                      <div key={t.id} className="p-2.5 sm:p-4 flex items-start sm:items-center justify-between gap-2 sm:gap-3 group hover:bg-white/[0.02]">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-accent/5 group-hover:border-accent/20">
                            <Icon className="w-4 h-4 text-muted group-hover:text-accent transition-colors" aria-hidden="true" />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-ink mb-1 group-hover:translate-x-1 transition-transform truncate max-w-[140px] sm:max-w-none">{t.merchant || t.category}</p>
                            <div className="flex items-center gap-2 text-[9px] sm:text-[10px] text-muted">
                              <span>{t.category}</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-white/5" />
                              <span>{format(tDate, 'MMM d')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 sm:gap-2 shrink-0">
                          <span className={`text-sm sm:text-xl font-mono font-black ${t.type === 'income' ? 'text-success' : 'text-ink'}`}>${t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}</span>
                          <div className="flex items-center gap-1.5 sm:gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onEditExpense(t)} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 flex items-center justify-center text-muted hover:text-accent hover:bg-accent/10 transition-all" aria-label="Edit transaction"><Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>
                            <button onClick={() => setTransactionToDelete(t.id)} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 flex items-center justify-center text-muted hover:text-alert hover:bg-alert/10 transition-all" aria-label="Delete transaction"><Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-12 sm:p-20 text-center space-y-4" role="status">
                    <Search className="w-8 h-8 mx-auto text-muted" />
                    <p className="text-[11px] uppercase font-black tracking-[0.1em] sm:tracking-[0.2em] text-muted">
                      {searchTerm ? `No registry matches for "${searchTerm}"` : 'Archived Record Empty'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Visualizations */}
        <div className="lg:col-span-5 space-y-5 sm:space-y-8">
          {/* Cashflow Trend Chart */}
          <div className="soothing-card p-5 sm:p-6 h-[250px] sm:h-[280px] flex flex-col">
            <div className="flex items-center justify-between mb-5 sm:mb-6">
              <div>
                <h3 className="text-lg font-display font-black text-ink uppercase tracking-tight">Net Performance</h3>
                <p className="micro-label mt-1">Cashflow Velocity Trend</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-[10px] font-bold text-muted uppercase tracking-wide">Net Positive</span>
              </div>
            </div>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashflowData}>
                  <Tooltip content={<NoirTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                    {cashflowData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.net >= 0 ? 'var(--color-accent)' : 'var(--color-alert)'} 
                        fillOpacity={0.8}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Budget Monthly Auditor - FIX: Flex-wrap header to prevent mobile collision */}
          <div className="soothing-card p-5 sm:p-6 min-h-[360px] sm:min-h-[400px] flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-y-4 sm:gap-y-6 gap-x-4 mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-white/[0.03]">
              <div className="flex flex-col min-w-[140px]">
                <h3 className="text-xl font-display font-black text-ink uppercase tracking-tight">Audit Monthly</h3>
                <p className="micro-label mt-1">System Performance Status</p>
              </div>

              <div className="flex items-center bg-surface-subtle rounded-full px-3 sm:px-4 py-2 border border-border gap-3 h-10">
                <button 
                  onClick={() => setSelectedBudgetDate(subMonths(selectedBudgetDate, 1))} 
                  className="p-1 hover:text-accent transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronDown className="w-4 h-4 rotate-90" />
                </button>
                <span className="text-[10px] font-black uppercase tracking-widest min-w-[70px] text-center whitespace-nowrap">
                  {format(selectedBudgetDate, 'MMM yy')}
                </span>
                <button 
                  onClick={() => setSelectedBudgetDate(subMonths(selectedBudgetDate, -1))} 
                  className="p-1 hover:text-accent transition-colors"
                  aria-label="Next month"
                >
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                 <button onClick={() => setIsAllocationModalOpen(true)} className="p-2.5 rounded-full bg-white/5 border border-white/5 text-muted hover:text-accent transition-all"><KeyRound className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {/* Global Progress Bar */}
            <div className="mb-8 sm:mb-10 px-1 sm:px-2">
              <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted">Total Monthly Pulse</span>
                <span className="text-[10px] sm:text-[11px] font-mono font-black text-ink whitespace-nowrap">
                   ${totalSpent.toLocaleString()} / <span className="text-accent">${globalMonthlyBudget.toLocaleString()}</span>
                </span>
              </div>
                  <div className="h-2 bg-surface-subtle rounded-full border border-border overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (totalSpent / (globalMonthlyBudget || 1)) * 100)}%` }}
                  className={`h-full ${totalSpent > globalMonthlyBudget && globalMonthlyBudget > 0 ? 'bg-alert shadow-[0_0_12px_rgba(244,63,94,0.3)]' : 'bg-accent shadow-[0_0_12px_rgba(99,102,241,0.3)]'}`}
                />
              </div>
            </div>

            <div className="h-[230px] sm:h-[250px] overflow-y-auto scrollbar-custom pr-2">
              <div className="grid grid-cols-2 gap-3 md:gap-8">
                {budgets.length > 0 ? (
                  budgets.map(budget => {
                    const spent = budgetPeriodTotals.find(([cat]) => cat === budget.category)?.[1] || 0;
                    const limit = budget.monthly_limit;
                    const percent = limit > 0 ? (spent / limit) * 100 : 0;
                    const over = spent > limit;
                    return (
                      <div key={budget.category} className="flex flex-col items-center gap-4 group">
                        <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
                            <circle cx="16" cy="16" r="14" className="fill-none stroke-white/[0.03] stroke-[4]" />
                            <motion.circle
                              cx="16" cy="16" r="14"
                              className={`fill-none stroke-[4] ${over ? 'stroke-alert animate-pulse' : 'stroke-accent'}`}
                              strokeDasharray="88"
                              initial={{ strokeDashoffset: 88 }}
                              animate={{ strokeDashoffset: 88 - (88 * Math.min(percent / 100, 1)) }}
                              transition={{ duration: 1.5, ease: 'circOut' }}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-[9px] md:text-[10px] font-mono font-black ${over ? 'text-alert' : 'text-ink'}`}>{percent.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black uppercase tracking-wide sm:tracking-widest text-ink group-hover:text-accent transition-colors truncate max-w-[84px] sm:max-w-[100px]">{budget.category}</p>
                          <p className="text-[10px] font-mono text-muted">${spent.toLocaleString()} / <span className="text-muted">${limit.toLocaleString()}</span></p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                    <div className="col-span-2 flex flex-col items-center justify-center py-12 sm:py-16 text-center space-y-6">
                    <div className="w-16 h-16 bg-white/[0.02] border border-white/5 rounded-full flex items-center justify-center">
                      <Settings2 className="w-6 h-6 text-muted animate-spin-slow" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase font-black tracking-[0.1em] sm:tracking-[0.2em] text-muted mb-2 font-display">System Idle: No Benchmarks Set</p>
                      <p className="text-[11px] text-muted lowercase tracking-wide sm:tracking-widest leading-relaxed mb-6">Allocate categorical limits to activate structural pulse monitoring.</p>
                      <button 
                        onClick={() => setIsAllocationModalOpen(true)}
                        className="text-xs font-bold text-accent underline underline-offset-8 decoration-accent/30 hover:text-ink transition-colors"
                      >
                        Initialize Strategic Mapping
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Spending Analysis - PieChart */}
          <div className="soothing-card p-6 md:p-8 flex-1 flex flex-col">
            <h3 className="text-lg font-display font-bold text-ink uppercase mb-2">Spending Volume</h3>
            <p className="micro-label mb-4 md:mb-8 uppercase tracking-widest">Structural Analysis (Top Categories)</p>
            
            <div className="flex-1 w-full min-h-[250px] md:min-h-[300px] relative">
              {categoryTotals.length > 0 ? (
                <div className="absolute inset-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={categoryTotals.map(([name, value]) => ({ name, value }))}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {categoryTotals.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="soothing-card p-3 shadow-md !bg-surface border-border">
                                <p className="text-[10px] font-black text-muted uppercase mb-1">{payload[0].name}</p>
                                <p className="text-sm font-mono font-black text-accent">${payload[0].value.toLocaleString()}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        align="center"
                        content={({ payload }) => (
                          <div className="flex flex-wrap justify-center gap-4 mt-8">
                            {payload?.map((entry: any, index: number) => (
                              <div key={`item-${index}`} className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-[10px] font-black uppercase text-muted tracking-wide sm:tracking-widest">{entry.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-70">
                  <PieChart className="w-8 h-8 mb-3" />
                  <p className="text-[10px] uppercase tracking-wide sm:tracking-widest font-bold">Inflow Outflow Neutral</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Allocation Modal */}
      <AnimatePresence>
        {isAllocationModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAllocationModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="relative bg-surface w-full max-w-md rounded-[24px] sm:rounded-[32px] shadow-2xl border border-white/10 p-4 sm:p-6 lg:p-10">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-display font-black text-ink uppercase tracking-tight">System Benchmark</h2>
                <button onClick={() => setIsAllocationModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-muted transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <div className="mb-10 p-6 bg-accent/5 border border-accent/20 rounded-[28px] space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center text-accent border border-accent/20">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-ink uppercase tracking-widest">Global Spend Limit</h3>
                    <p className="text-[9px] text-muted/60 uppercase tracking-tight">Primary Monthly Benchmark</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 focus-within:border-accent/40 transition-all">
                  <span className="text-xl font-mono font-black text-accent">$</span>
                  <input 
                    type="number" 
                    defaultValue={globalMonthlyBudget}
                    onBlur={(e) => onSetGlobalBudget(parseFloat(e.target.value) || 0)}
                    className="w-full bg-transparent border-none outline-none text-2xl font-mono font-black text-ink"
                    placeholder="2500"
                  />
                </div>
              </div>

              <div className="mb-6 flex items-center gap-4">
                 <div className="h-px flex-1 bg-white/[0.03]" />
                 <span className="text-[10px] font-black text-muted/30 uppercase tracking-[0.12em] sm:tracking-[0.3em]">Mapping Controls</span>
                 <div className="h-px flex-1 bg-white/[0.03]" />
              </div>

              <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-2 scrollbar-custom">
                {Array.from(new Set([...transactions.map(t => t.category), ...budgets.map(b => b.category)])).map(cat => {
                  const budget = budgets.find(b => b.category === cat);
                  const isEditing = editingBudget?.category === cat;
                  return (
                    <div key={cat} className="p-4 bg-bg rounded-2xl border border-border flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wide sm:tracking-widest text-muted mb-1">{cat}</p>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-ink">$</span>
                            <input type="number" value={editingBudget.limit} onChange={e => setEditingBudget({ ...editingBudget, limit: e.target.value })} className="w-20 bg-surface border-b border-accent text-sm font-mono outline-none py-1" autoFocus />
                          </div>
                        ) : (
                          <p className="text-sm font-mono text-ink">{budget ? `$${budget.monthly_limit.toLocaleString()}` : 'No limit'}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {isEditing ? (
                          <button onClick={() => { onUpsertBudget(cat, parseFloat(editingBudget.limit) || 0); setEditingBudget(null); }} className="p-2 bg-accent/20 text-accent rounded-lg"><Check className="w-4 h-4" /></button>
                        ) : (
                          <button onClick={() => setEditingBudget({ category: cat, limit: budget?.monthly_limit.toString() || '' })} className="p-2 hover:bg-surface rounded-lg text-muted hover:text-accent"><Settings2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => setIsAllocationModalOpen(false)} className="w-full py-3 bg-ink text-bg rounded-full font-bold text-xs uppercase tracking-widest mt-6">Done</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Focused Ledger Modal */}
      <AnimatePresence>
        {isFocusedLedgerOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFocusedLedgerOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div 
               initial={{ opacity: 0, scale: 0.98, y: 30 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.98, y: 30 }} 
               className="relative bg-surface w-full max-w-5xl h-[85vh] rounded-[40px] shadow-2xl border border-white/10 flex flex-col overflow-hidden"
            >
              <div className="p-8 md:p-12 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-display font-black text-ink uppercase tracking-tighter">Mission Ledger</h2>
                  <p className="micro-label opacity-40 mt-1 uppercase tracking-widest">Complete Financial History</p>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={handleExport} className="p-3 bg-white/5 border border-white/5 rounded-full text-muted hover:text-accent transition-all"><Download className="w-5 h-5" /></button>
                  <button onClick={() => setIsFocusedLedgerOpen(false)} className="p-3 bg-white/5 border border-white/5 rounded-full text-muted hover:text-alert transition-all"><X className="w-5 h-5" /></button>
                </div>
              </div>
              
              <div className="p-6 md:p-8 bg-surface-subtle border-b border-border">
                <div className="flex items-center gap-4 bg-surface px-6 py-4 rounded-full border border-border focus-within:border-accent/40 shadow-inner">
                  <Search className="w-5 h-5 text-muted" />
                  <input 
                    type="text" 
                    placeholder="Deep search ledger..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm text-ink w-full placeholder:text-muted font-bold"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-custom p-4 md:p-8">
                <div className="space-y-2">
                   {searchedTransactions.map(t => {
                     const Icon = getIcon(t.category);
                     return (
                        <div key={t.id} className="p-6 bg-white/[0.01] border border-white/[0.03] rounded-3xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between group hover:bg-white/[0.03] hover:border-white/10 transition-all">
                          <div className="flex items-center gap-6 w-full sm:w-auto min-w-0">
                              <div className="w-12 h-12 bg-surface-subtle rounded-full flex items-center justify-center border border-border transition-all group-hover:scale-110 group-hover:border-accent/30">
                                <Icon className="w-5 h-5 text-muted group-hover:text-accent" />
                              </div>
                              <div>
                              <p className="text-base font-black text-ink leading-tight truncate">{t.merchant || t.category}</p>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                    <span className="text-[10px] uppercase font-black tracking-widest text-muted">{t.category}</span>
                                    <span className="w-1 h-1 bg-white/10 rounded-full" />
                                  <span className="text-[10px] font-mono text-muted break-words">{format(parseISO(t.date), 'MMMM d, yyyy')}</span>
                                 </div>
                              </div>
                           </div>
                          <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-8 w-full sm:w-auto">
                            <span className={`text-lg sm:text-2xl font-mono font-black ${t.type === 'income' ? 'text-success shadow-success/20' : 'text-ink'}`}>
                                 {t.type === 'income' ? '+' : '-'}${Math.abs(t.amount).toLocaleString()}
                              </span>
                              <div className="flex gap-2">
                                <button onClick={() => { setIsFocusedLedgerOpen(false); onEditExpense(t); }} className="p-2 text-muted hover:text-accent transition-colors"><Edit3 className="w-4 h-4" /></button>
                                <button onClick={() => setTransactionToDelete(t.id)} className="p-2 text-muted hover:text-alert transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </div>
                           </div>
                        </div>
                     );
                   })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {transactionToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setTransactionToDelete(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="relative bg-surface w-full max-w-xs rounded-[32px] shadow-2xl border border-white/10 p-10 text-center">
              <div className="w-16 h-16 bg-alert/20 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 className="w-6 h-6 text-alert" /></div>
              <h3 className="text-2xl font-display font-black text-ink mb-2 uppercase tracking-tight">Delete Entry?</h3>
              <p className="text-muted text-[11px] mb-8 font-bold tracking-widest">IRREVERSIBLE ACTION</p>
              <div className="flex gap-4">
                <button onClick={() => setTransactionToDelete(null)} className="flex-1 py-3 bg-white/5 border border-white/5 rounded-full font-bold text-[9px] uppercase tracking-widest text-muted">Cancel</button>
                <button onClick={() => { onDeleteExpense(transactionToDelete); setTransactionToDelete(null); }} className="flex-1 py-3 bg-alert text-white rounded-full font-bold text-[9px] uppercase tracking-widest shadow-2xl shadow-alert/30">Confirm</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
