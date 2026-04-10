import { TrendingUp, Landmark, ShoppingBag, Utensils, Briefcase, Home, Plane, Download, Plus, PieChart, ArrowUpRight, ArrowDownRight, Trash2, Edit3, Settings2, KeyRound, Check, X, ChevronDown, Search, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, Budget } from '../types';
import { useState, useMemo } from 'react';
import { format, subMonths, startOfMonth, startOfYear, isWithinInterval, endOfDay, parseISO, eachMonthOfInterval } from 'date-fns';
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
  transactions = [],
  budgets = [],
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onUpsertBudget,
  globalMonthlyBudget,
  onSetGlobalBudget,
}: ExpensesProps) {
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
    const start = startOfMonth(now);
    return transactions
      .filter(t => {
        const tDate = parseISO(t.date);
        return isWithinInterval(tDate, { start, end: endOfDay(now) });
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

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
    return data;
  }, [transactions]);

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
    link.setAttribute("download", `synapse_ledger_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 sm:space-y-10 lg:space-y-12 pb-20 sm:pb-24 lg:pb-32 px-3 sm:px-4 lg:px-6 pt-6 sm:pt-8 lg:pt-12">
      {/* 2. Compact Metrics - 2x2 Grid on Mobile */}

      {/* The Command Strip (Intel Summary) */}
      <div className="flex flex-wrap sm:flex-nowrap w-full divide-x divide-border/30 border border-border/50 rounded-2xl bg-surface-subtle/20 overflow-hidden shadow-sm">
        {[
          { label: 'Inflow', value: `$${totalIncome.toLocaleString()}`, color: 'text-success' },
          { label: 'Outflow', value: `$${totalSpent.toLocaleString()}`, color: 'text-alert' },
          { label: 'Net Balance', value: `${netBalance >= 0 ? '+' : '-'}$${Math.abs(netBalance).toLocaleString()}`, color: netBalance >= 0 ? 'text-success' : 'text-alert' },
          { label: 'Savings Rate', value: `${(savingsRate || 0).toFixed(0)}%`, color: 'text-accent' },
        ].map((m, i) => (
          <div key={i} className="flex-1 w-1/2 sm:w-auto p-4 sm:p-5 flex flex-col justify-center items-center sm:items-start text-center sm:text-left hover:bg-surface/50 transition-colors">
            <span className="text-[9px] font-bold text-muted/50 uppercase tracking-[0.2em] mb-1">{m.label}</span>
            <div className="flex items-baseline gap-2">
               <span className={`text-base sm:text-lg lg:text-xl font-mono font-black tracking-tighter ${m.color}`}>{m.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Registry Section */}
      <div className="flex flex-col space-y-4 sm:space-y-6">
        <div className="pb-4 sm:pb-6 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
                <h3 className="text-2xl sm:text-3xl font-display font-black text-ink uppercase tracking-tighter">Expense Ledger</h3>
                <p className="text-[10px] font-black text-muted/40 uppercase tracking-[0.2em] mt-1">Current month transactions and budgets</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsFocusedLedgerOpen(true)} 
                className="w-10 h-10 rounded-full border border-border bg-surface-subtle flex items-center justify-center text-muted hover:text-accent hover:border-accent/40 transition-all active:scale-95 shadow-sm"
                aria-label="Expand focused ledger"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button 
                onClick={onAddExpense} 
                className="precise-button !px-6 !py-2.5 flex items-center gap-2 group/btn"
              >
                <Plus className="w-3.5 h-3.5 group-hover/btn:rotate-90 transition-transform" />
                <span className="hidden sm:inline text-[10px] uppercase font-black tracking-widest">New Entry</span>
                <span className="sm:hidden text-[10px] uppercase font-black tracking-widest">Add</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-6 bg-surface-subtle/50 px-5 py-2.5 rounded-full border border-border focus-within:border-accent/40 transition-all w-full max-w-sm">
            <Search className="w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Registry deeper search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-ink w-full placeholder:text-muted/60 font-medium"
            />
          </div>
        </div>
        <div className="w-full">
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
                  {searchTerm ? `No matches for "${searchTerm}"` : 'No transactions logged yet'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historical Reserves (Audit Buffer) */}
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
              {allTimeSavings <= 0 && (
                <div className="mt-4 p-4 rounded-xl border border-dashed border-border bg-bg/50 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60">No reserve growth yet</p>
                  <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-muted/40 mt-1">Income will appear here as transactions are logged.</p>
                </div>
              )}
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

      {/* Visual Analytics Stack */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
          <div className="soothing-card p-5 sm:p-6 h-[280px] flex flex-col min-w-0">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-display font-black text-ink uppercase tracking-tight">Net Performance</h3>
                <p className="micro-label mt-1">Cashflow Velocity Trend</p>
              </div>
            </div>
            <div className="flex-1 w-full min-w-0 min-h-[180px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180}>
                <BarChart data={cashflowData}>
                  <Tooltip content={<NoirTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                    {cashflowData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.net >= 0 ? 'var(--color-accent)' : 'var(--color-alert)'} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="soothing-card p-6 md:p-8 flex flex-col items-center justify-center gap-6 min-w-0">
            <div className="flex-1">
              <h3 className="text-lg font-display font-black text-ink uppercase tracking-tight">Spending Breakdown</h3>
              <p className="micro-label mt-1 uppercase tracking-widest">Category mix for the current month</p>
            </div>
            <div className="w-full md:w-[300px] h-[250px] min-w-0 min-h-[220px] relative">
              {categoryTotals.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                  <RechartsPieChart>
                    <Pie data={categoryTotals.map(([name, value]) => ({ name, value }))} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                      {categoryTotals.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                      ))}
                    </Pie>
                    <Tooltip content={<NoirTooltip />} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border/40 rounded-[28px] bg-bg/40">
                  <PieChart className="w-8 h-8 text-muted/40 mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/60">No spending data yet</p>
                </div>
              )}
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
                    placeholder="Search ledger..." 
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
