import { TrendingDown, TrendingUp, Landmark, ShoppingBag, Utensils, Briefcase, Home, Plane, Filter, Download, Plus, PieChart, ArrowUpRight, ArrowDownRight, Trash2, Edit3, Settings2, KeyRound, Check, X, Calendar as CalendarIcon, ChevronDown, MoreVertical, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, Budget } from '../types';
import { useState, useMemo } from 'react';
import { format, subWeeks, subMonths, startOfWeek, startOfMonth, startOfYear, isWithinInterval, endOfDay, parseISO, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip } from 'recharts';

interface ExpensesProps {
  transactions: Transaction[];
  budgets: Budget[];
  onAddExpense: () => void;
  onEditExpense: (t: Transaction) => void;
  onDeleteExpense: (id: string) => void;
  onUpsertBudget: (category: string, limit: number) => void;
}

type TimePeriod = 'weekly' | 'monthly' | 'ytd';

export default function Expenses({ 
  transactions, 
  budgets,
  onAddExpense, 
  onEditExpense, 
  onDeleteExpense,
  onUpsertBudget
}: ExpensesProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('monthly');
  const [savingsGoal, setSavingsGoal] = useState(5000);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState('5000');
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<{category: string, limit: string} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

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
    const lowerSearch = searchTerm.toLowerCase();
    return filteredTransactions.filter(t => 
      (t.merchant?.toLowerCase().includes(lowerSearch)) || 
      (t.category.toLowerCase().includes(lowerSearch)) ||
      (t.amount.toString().includes(lowerSearch))
    );
  }, [filteredTransactions, searchTerm]);

  const totalSpent = filteredTransactions.reduce((acc, t) => t.type === 'expense' ? acc + t.amount : acc, 0);
  const totalIncome = filteredTransactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc, 0);
  const netBalance = totalIncome - totalSpent;
  const savingsRate = totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0;

  // Cashflow Trend Data (Last 6 periods)
  const cashflowData = useMemo(() => {
    const now = new Date();
    const data = [];
    
    if (timePeriod === 'weekly') {
      const weeks = eachWeekOfInterval({
        start: subWeeks(now, 5),
        end: now
      });
      
      for (const weekStart of weeks) {
        const weekEnd = endOfDay(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000));
        const periodTransactions = transactions.filter(t => {
          const d = parseISO(t.date);
          return isWithinInterval(d, { start: weekStart, end: weekEnd });
        });
        const income = periodTransactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc, 0);
        const expense = periodTransactions.reduce((acc, t) => t.type === 'expense' ? acc + t.amount : acc, 0);
        data.push({ name: format(weekStart, 'MMM d'), net: income - expense });
      }
    } else {
      const months = eachMonthOfInterval({
        start: subMonths(now, 5),
        end: now
      });
      
      for (const monthStart of months) {
        const monthEnd = endOfDay(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0));
        const periodTransactions = transactions.filter(t => {
          const d = parseISO(t.date);
          return isWithinInterval(d, { start: monthStart, end: monthEnd });
        });
        const income = periodTransactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc, 0);
        const expense = periodTransactions.reduce((acc, t) => t.type === 'expense' ? acc + t.amount : acc, 0);
        data.push({ name: format(monthStart, 'MMM'), net: income - expense });
      }
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
    if (!isNaN(val) && val > 0) {
      setSavingsGoal(val);
    }
    setIsEditingGoal(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-16 pb-32 px-6 pt-12">
      {/* 1. Period Selector & Global Pulse */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="pill-container !p-1 bg-white/[0.01]">
          {(['weekly', 'monthly', 'ytd'] as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setTimePeriod(p)}
              className={`px-8 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                timePeriod === p ? 'bg-accent text-white shadow-xl shadow-accent/20' : 'text-muted/40 hover:text-ink'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
           <span className="text-[10px] font-bold text-muted/30 uppercase tracking-widest">Protocol Sync:</span>
           <div className="w-2 h-2 bg-success rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
        </div>
      </div>

      {/* 2. Asset Bubbles (Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Inflow', value: `$${totalIncome.toLocaleString()}`, icon: ArrowUpRight, color: 'text-success' },
          { label: 'Outflow', value: `$${totalSpent.toLocaleString()}`, icon: ArrowDownRight, color: 'text-alert' },
          { label: 'Network', value: `${netBalance >= 0 ? '+' : '-'}$${Math.abs(netBalance).toLocaleString()}`, icon: Landmark, color: netBalance >= 0 ? 'text-success' : 'text-alert' },
          { label: 'Efficiency', value: `${savingsRate.toFixed(0)}%`, icon: TrendingUp, color: 'text-accent' }
        ].map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="soothing-card flex flex-col items-center justify-center text-center p-10 min-h-[200px]"
          >
            <div className={`w-12 h-12 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mb-6`}>
              <m.icon className={`w-5 h-5 ${m.color}`} />
            </div>
            <p className="micro-label !text-muted/30 mb-2">{m.label}</p>
            <h3 className={`text-3xl font-mono font-black ${m.color}`}>{m.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* 3. Objective Track: Savings Goal */}
      <motion.div 
        whileHover={{ scale: 1.01 }}
        className=" pill-container !flex-col md:!flex-row !p-10 !rounded-[42px] justify-between gap-12 group transition-all duration-700"
      >
        <div className="space-y-4">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                 <PieChart className="w-6 h-6" />
              </div>
              <div>
                 <h4 className="text-2xl font-display font-black text-ink tracking-tight uppercase">Strategic Buffer</h4>
                 <p className="text-[10px] font-bold text-muted/40 uppercase tracking-[0.2em]">Resource Allocation Goal</p>
              </div>
           </div>
        </div>

        <div className="flex-1 max-w-xl space-y-6">
           <div className="flex justify-between items-end mb-2">
              <div className="space-y-1">
                 <span className="text-[10px] font-black text-muted/30 uppercase tracking-[0.2em]">Progress</span>
                 <p className="text-3xl font-mono font-black text-ink">
                    {Math.min((Math.max(0, netBalance) / savingsGoal) * 100, 100).toFixed(0)}%
                 </p>
              </div>
              {isEditingGoal ? (
                 <input 
                    type="number"
                    value={tempGoal}
                    onChange={(e) => setTempGoal(e.target.value)}
                    onBlur={handleSaveGoal}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveGoal()}
                    className="w-32 bg-black/20 border-b-2 border-accent text-right text-2xl font-mono outline-none px-2 py-1"
                    autoFocus
                 />
              ) : (
                 <p onClick={() => { setTempGoal(savingsGoal.toString()); setIsEditingGoal(true); }} className="text-right cursor-pointer hover:text-accent transition-colors">
                    <span className="text-sm font-mono text-muted/40 uppercase">Target: </span>
                    <span className="text-xl font-mono font-black text-ink">${savingsGoal.toLocaleString()}</span>
                 </p>
              )}
           </div>
           <div className="w-full h-4 bg-white/[0.02] rounded-full overflow-hidden border border-white/5">
              <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${Math.min((Math.max(0, netBalance) / savingsGoal) * 100, 100)}%` }}
                 transition={{ duration: 1.5, ease: "circOut" }}
                 className={`h-full ${netBalance >= savingsGoal ? 'bg-success shadow-[0_0_20px_rgba(52,211,153,0.3)]' : 'bg-accent shadow-[0_0_20px_rgba(99,102,241,0.3)]'}`}
              />
           </div>
        </div>
      </motion.div>

      {/* 4. Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* LEFT COLUMN: Visualizations */}
        <div className="lg:col-span-5 space-y-8">
          {/* Budget Rings Analysis */}
          <div className="soothing-card">
            <div className="flex items-center justify-between mb-12">
               <div>
                  <h3 className="text-2xl font-display font-black text-ink uppercase tracking-tight">Budget vs. Actual</h3>
                  <p className="micro-label mt-1 opacity-30">Structural Allocation Monitoring</p>
               </div>
               <button 
                  onClick={() => setIsAllocationModalOpen(true)} 
                  className="precise-button flex items-center gap-2"
               >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Configure</span>
               </button>
            </div>
            
            <div className="grid grid-cols-2 gap-10">
              {budgets.slice(0, 4).map(budget => {
                const spent = categoryTotals.find(([cat]) => cat === budget.category)?.[1] || 0;
                const limit = budget.monthly_limit;
                const percentage = limit > 0 ? (spent / limit) * 100 : 0;
                const isOver = spent > limit;

                return (
                  <div key={budget.category} className="flex flex-col items-center gap-4 group">
                     <div className="relative w-28 h-28 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90">
                           <circle cx="56" cy="56" r="50" className="fill-none stroke-white/[0.03] stroke-[4]" />
                           <motion.circle 
                              cx="56" cy="56" r="50" 
                              className={`fill-none stroke-[4] ${isOver ? 'stroke-alert' : 'stroke-accent'}`}
                              strokeDasharray="314.15"
                              initial={{ strokeDashoffset: 314.15 }}
                              animate={{ strokeDashoffset: 314.15 - (314.15 * Math.min(percentage / 100, 1)) }}
                              transition={{ duration: 1.5, ease: "circOut" }}
                              strokeLinecap="round"
                           />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                           <span className={`text-md font-mono font-black ${isOver ? 'text-alert' : 'text-ink'}`}>{percentage.toFixed(0)}%</span>
                        </div>
                     </div>
                     <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-ink group-hover:text-accent transition-colors">{budget.category}</p>
                        <p className="text-[9px] font-mono text-muted/40">${spent.toLocaleString()} / ${limit.toLocaleString()}</p>
                     </div>
                  </div>
                );
              })}
              {budgets.length === 0 && (
                 <div 
                   onClick={() => setIsAllocationModalOpen(true)}
                   className="col-span-2 py-20 text-center border-2 border-dashed border-white/5 rounded-[42px] cursor-pointer hover:border-accent/40 transition-all group/empty"
                 >
                    <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted/20 mb-4">No Active Budgets</p>
                    <span className="text-xs font-bold text-accent group-hover/empty:text-ink transition-colors underline underline-offset-8 decoration-accent/30">Set up your first limit</span>
                 </div>
              )}
            </div>
          </div>

          {/* Spending by Category */}
          <div className="glass-card p-6 md:p-8">
            <h3 className="text-xl font-display font-bold text-ink tracking-tight uppercase mb-8">Spending by Category</h3>
            <div className="space-y-6">
              {categoryTotals.length > 0 ? (
                categoryTotals.slice(0, 6).map(([cat, amount]) => {
                  const percentage = (amount / totalSpent) * 100;
                  return (
                    <div key={cat} className="space-y-2 group">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-ink/80 group-hover:text-ink transition-colors">{cat}</span>
                        <span className="font-mono font-bold text-ink">${amount.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(percentage, 100)}%` }}
                          transition={{ duration: 0.8 }}
                          className="h-full bg-ink/30 group-hover:bg-accent transition-colors"
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center opacity-30">
                  <PieChart className="w-8 h-8 mx-auto mb-3" />
                  <p className="text-[10px] uppercase tracking-widest font-bold">No categorical data</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Fluid Ledger */}
        <div className="lg:col-span-7">
          <div className="soothing-card !p-0 overflow-hidden flex flex-col h-full bg-surface/20">
            <div className="p-10 border-b border-white/[0.03] space-y-8">
              <div className="flex items-center justify-between">
                 <h3 className="text-3xl font-display font-black text-ink tracking-tighter uppercase">Registry</h3>
                 <button onClick={onAddExpense} className="pill-button">New Entry</button>
              </div>
              
              <div className="flex items-center gap-4 bg-black/20 px-8 py-4 rounded-full border border-white/5 focus-within:border-accent/30 transition-all">
                <Search className="w-4 h-4 text-muted/30" />
                <input 
                  type="text"
                  placeholder="Search mission archives..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs text-ink w-full placeholder:text-muted/20 font-semibold"
                />
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-[800px] no-scrollbar">
               <div className="divide-y divide-white/[0.02]">
                  {searchedTransactions.length > 0 ? (
                    searchedTransactions.slice(0, 50).map((t) => {
                      const Icon = getIcon(t.category);
                      const tDate = parseISO(t.date);
                      return (
                        <div key={t.id} className="p-8 flex items-center justify-between group transition-all duration-300 hover:bg-white/[0.02]">
                           <div className="flex items-center gap-6">
                              <div className="w-14 h-14 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-accent/5 group-hover:border-accent/20">
                                 <Icon className="w-6 h-6 text-muted/40 group-hover:text-accent transition-colors" />
                              </div>
                              <div>
                                 <p className="text-md font-bold text-ink mb-1 group-hover:translate-x-1 transition-transform">{t.merchant || t.category}</p>
                                 <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted/30">{t.category}</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/5" />
                                    <span className="text-[10px] font-bold text-muted/20 uppercase">{format(tDate, 'MMM d')}</span>
                                 </div>
                              </div>
                           </div>
                           <div className="flex flex-col items-end gap-4">
                              <span className={`text-xl font-mono font-black ${t.type === 'income' ? 'text-success' : 'text-ink'}`}>
                                 {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                              </span>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => onEditExpense(t)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-muted hover:text-accent hover:bg-accent/10 transition-all"><Edit3 className="w-4 h-4" /></button>
                                 <button onClick={() => setTransactionToDelete(t.id)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-muted hover:text-alert hover:bg-alert/10 transition-all"><Trash2 className="w-4 h-4" /></button>
                              </div>
                           </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-20 text-center text-[10px] uppercase font-black tracking-[0.2em] text-muted/20">Archived Record Empty</div>
                  )}
               </div>
            </div>
          </div>
        </div>
      </div> {/* End of Grid */}

      {/* Allocation Modal */}
      <AnimatePresence>
        {isAllocationModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAllocationModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
              className="relative bg-surface w-full max-w-md rounded-[32px] shadow-2xl border border-white/10 p-10"
            >
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-display font-black text-ink uppercase tracking-tight">Budget Limits</h2>
                <button onClick={() => setIsAllocationModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-muted transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 no-scrollbar">
                {Array.from(new Set([...transactions.map(t => t.category), ...budgets.map(b => b.category)])).map(cat => {
                  const budget = budgets.find(b => b.category === cat);
                  const isEditing = editingBudget?.category === cat;
                  return (
                    <div key={cat} className="p-4 bg-bg rounded-2xl border border-border flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">{cat}</p>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                             <span className="text-sm font-mono text-ink">$</span>
                             <input type="number" value={editingBudget.limit} onChange={(e) => setEditingBudget({ ...editingBudget, limit: e.target.value })} className="w-24 bg-surface border-b border-accent text-sm font-mono outline-none py-1" autoFocus />
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
              <button onClick={() => setIsAllocationModalOpen(false)} className="w-full py-4 bg-ink text-bg rounded-full font-bold text-xs uppercase tracking-widest mt-8">Done</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {transactionToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setTransactionToDelete(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="relative bg-surface w-full max-w-xs rounded-[32px] shadow-2xl border border-white/10 p-10 text-center">
              <div className="w-16 h-16 bg-alert/20 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 className="w-6 h-6 text-alert" /></div>
              <h3 className="text-2xl font-display font-black text-ink mb-2 uppercase tracking-tight">Delete Entry?</h3>
              <p className="text-muted text-[11px] mb-8 font-bold tracking-widest">IRREVERSIBLE ACTION</p>
              <div className="flex gap-4">
                <button onClick={() => setTransactionToDelete(null)} className="flex-1 py-4 bg-white/5 border border-white/5 rounded-full font-bold text-[10px] uppercase tracking-widest text-muted">Cancel</button>
                <button onClick={() => { onDeleteExpense(transactionToDelete); setTransactionToDelete(null); }} className="flex-1 py-4 bg-alert text-white rounded-full font-bold text-[10px] uppercase tracking-widest shadow-2xl shadow-alert/30">Confirm</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

