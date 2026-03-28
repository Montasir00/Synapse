import { TrendingDown, TrendingUp, Landmark, ShoppingBag, Utensils, Briefcase, Home, Plane, Filter, Download, Plus, PieChart, ArrowUpRight, ArrowDownRight, Trash2, Edit3, Settings2, Check, X, Calendar as CalendarIcon, ChevronDown, MoreVertical, Search } from 'lucide-react';
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
    <div className="pt-28 md:pt-32 px-6 md:px-12 pb-20 max-w-[1200px] mx-auto min-h-screen font-sans">
      {/* Header & Toggle */}
      <section className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-display font-bold text-ink tracking-tight">Spending Flow</h2>
          <p className="text-muted text-sm mt-1">Manage your financial rhythm</p>
        </div>
        
        <div className="flex items-center bg-white/[0.02] p-1 rounded-full border border-dark-border">
          {(['weekly', 'monthly', 'ytd'] as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setTimePeriod(p)}
              className={`px-6 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all ${
                timePeriod === p ? 'bg-accent text-bg shadow-lg' : 'text-muted hover:text-ink'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      {/* Simplified Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="glass-card p-10 flex flex-col justify-between min-h-[220px]">
          <div>
            <p className="micro-label mb-4 flex items-center gap-2">
              <ArrowUpRight className="w-3.5 h-3.5 text-success" />
              Total Inflow
            </p>
            <p className="text-4xl font-serif italic text-ink tracking-tight">${totalIncome.toLocaleString()}</p>
          </div>
          <div className="mt-8">
            <p className="micro-label mb-4 flex items-center gap-2">
              <ArrowDownRight className="w-3.5 h-3.5 text-alert" />
              Total Outflow
            </p>
            <p className="text-4xl font-serif italic text-ink tracking-tight">${totalSpent.toLocaleString()}</p>
          </div>
        </div>

        <div className="glass-card p-10 flex flex-col justify-between min-h-[220px]">
          <div>
            <p className="micro-label mb-4">Net Balance</p>
            <p className={`text-5xl font-serif italic tracking-tight ${netBalance >= 0 ? 'text-success' : 'text-alert'}`}>
              {netBalance >= 0 ? '+' : '-'}${Math.abs(netBalance).toLocaleString()}
            </p>
          </div>
          <div className="mt-8">
            <p className="micro-label mb-4">Savings This Period</p>
            <div className="flex items-end gap-4">
              <p className="text-3xl font-serif italic text-success tracking-tight">${Math.max(0, netBalance).toLocaleString()}</p>
              <span className="text-[10px] font-bold text-muted mb-1.5">{savingsRate.toFixed(1)}% Rate</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-10 flex flex-col justify-between min-h-[220px]">
          <div className="flex justify-between items-start">
            <div>
              <p className="micro-label mb-4">Cashflow Trend</p>
              <p className="text-[10px] text-muted opacity-40 font-bold uppercase tracking-widest">Last 6 {timePeriod === 'weekly' ? 'weeks' : 'months'}</p>
            </div>
            <div className="h-14 w-28">
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
          </div>
          
          <div className="mt-8">
            <div className="flex justify-between items-end mb-3">
              <p className="micro-label">Savings Goal</p>
              {isEditingGoal ? (
                <div className="flex items-center gap-1">
                  <input 
                    type="number"
                    value={tempGoal}
                    onChange={(e) => setTempGoal(e.target.value)}
                    onBlur={handleSaveGoal}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveGoal()}
                    className="w-20 bg-white/5 border-b border-accent text-[11px] font-bold text-ink outline-none px-2 py-1 rounded-t-lg"
                    autoFocus
                  />
                </div>
              ) : (
                <p 
                  onClick={() => {
                    setTempGoal(savingsGoal.toString());
                    setIsEditingGoal(true);
                  }}
                  className="text-[11px] font-bold text-ink cursor-pointer hover:text-accent transition-colors"
                >
                  ${Math.max(0, netBalance).toLocaleString()} / ${savingsGoal.toLocaleString()}
                </p>
              )}
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-dark-border">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((Math.max(0, netBalance) / savingsGoal) * 100, 100)}%` }}
                className="h-full bg-accent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown & Ledger */}
      <div className="grid grid-cols-12 gap-12">
        {/* Category Breakdown */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          <div className="glass-card p-10">
            <div className="flex items-center justify-between mb-10">
              <h4 className="text-2xl font-serif italic text-ink tracking-tight">Where it went</h4>
              <button 
                onClick={() => setIsAllocationModalOpen(true)}
                className="text-[10px] font-bold uppercase tracking-widest text-accent hover:text-ink transition-colors"
              >
                Limits
              </button>
            </div>
            
            <div className="space-y-8">
              {categoryTotals.length > 0 ? (
                categoryTotals.slice(0, 6).map(([cat, amount], i) => {
                  const budget = budgets.find(b => b.category === cat);
                  const limit = budget?.monthly_limit || 0;
                  const percentage = limit > 0 ? (amount / limit) * 100 : (amount / totalSpent) * 100;

                  return (
                    <div key={cat} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted/60">{cat}</span>
                        <span className="text-sm font-mono font-bold text-ink">${amount.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden border border-dark-border">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(percentage, 100)}%` }}
                          className={`h-full ${limit > 0 && amount > limit ? 'bg-alert' : 'bg-accent'}`}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-16 text-center opacity-10">
                  <PieChart className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No spending data</p>
                </div>
              )}
            </div>
          </div>
          
          <button 
            onClick={onAddExpense}
            className="w-full py-6 bg-ink text-bg rounded-[2rem] font-bold text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-accent/5 hover:bg-accent transition-all flex items-center justify-center gap-4 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Log Transaction
          </button>
        </div>

        {/* Refined Ledger */}
        <div className="col-span-12 lg:col-span-8">
          <div className="glass-card overflow-hidden">
            <div className="p-10 border-b border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <h3 className="text-2xl font-serif italic text-ink tracking-tight">Recent Ledger</h3>
              <div className="flex items-center gap-4 bg-white/[0.02] px-5 py-3 rounded-full border border-dark-border w-full sm:w-auto focus-within:ring-1 focus-within:ring-accent/20 transition-all">
                <Search className="w-4 h-4 text-muted/40" />
                <input 
                  type="text"
                  placeholder="Filter transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none outline-none text-[11px] text-ink w-full sm:w-56 placeholder:text-muted/20 font-medium"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-muted/40 uppercase text-[9px] tracking-[0.2em] font-bold border-b border-dark-border">
                    <th className="px-10 py-5">Date</th>
                    <th className="px-10 py-5">Merchant</th>
                    <th className="px-10 py-5">Category</th>
                    <th className="px-10 py-5 text-right">Amount</th>
                    <th className="px-10 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {searchedTransactions.slice(0, 15).map((t) => {
                    const Icon = getIcon(t.category);
                    return (
                      <tr key={t.id} className="group hover:bg-white/[0.02] transition-all">
                        <td className="px-10 py-6 text-[10px] text-muted/50 font-mono">{format(parseISO(t.date), 'MMM d')}</td>
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/[0.03] flex items-center justify-center border border-dark-border group-hover:border-accent/30 transition-colors">
                              <Icon className="w-4 h-4 text-muted/60 group-hover:text-accent transition-colors" />
                            </div>
                            <span className="text-sm font-medium text-ink tracking-tight">{t.merchant || t.category}</span>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-muted/30">{t.category}</span>
                        </td>
                        <td className={`px-10 py-6 text-right font-mono font-bold ${t.type === 'income' ? 'text-success' : 'text-ink'}`}>
                          {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                        </td>
                        <td className="px-10 py-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => onEditExpense(t)}
                              className="p-2 hover:bg-white/5 rounded-full text-muted hover:text-accent transition-all"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setTransactionToDelete(t.id)}
                              className="p-2 hover:bg-alert/10 rounded-full text-muted hover:text-alert transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {searchedTransactions.length === 0 && (
                <div className="py-24 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-muted font-bold opacity-20">
                    {searchTerm ? 'No matches found' : 'No entries for this period'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Allocation Modal (Simplified) */}
      <AnimatePresence>
        {isAllocationModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAllocationModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-surface w-full max-w-md rounded-3xl shadow-2xl border border-border p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-display font-bold text-ink">Budget Limits</h2>
                <button 
                  onClick={() => setIsAllocationModalOpen(false)}
                  className="p-2 hover:bg-bg rounded-full text-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
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
                            <input 
                              type="number"
                              value={editingBudget.limit}
                              onChange={(e) => setEditingBudget({ ...editingBudget, limit: e.target.value })}
                              className="w-24 bg-surface border-b border-accent text-sm font-mono outline-none py-1"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <p className="text-sm font-mono text-ink">
                            {budget ? `$${budget.monthly_limit.toLocaleString()}` : 'No limit'}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {isEditing ? (
                          <button 
                            onClick={() => {
                              onUpsertBudget(cat, parseFloat(editingBudget.limit) || 0);
                              setEditingBudget(null);
                            }}
                            className="p-2 bg-accent/20 text-accent rounded-lg"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => setEditingBudget({ category: cat, limit: budget?.monthly_limit.toString() || '' })}
                            className="p-2 hover:bg-surface rounded-lg text-muted hover:text-accent"
                          >
                            <Settings2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button 
                onClick={() => setIsAllocationModalOpen(false)}
                className="w-full py-4 bg-ink text-bg rounded-2xl font-bold text-xs uppercase tracking-widest mt-8"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {transactionToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTransactionToDelete(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-surface w-full max-w-xs rounded-3xl shadow-2xl border border-border p-8 text-center"
            >
              <div className="w-12 h-12 bg-alert/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-alert" />
              </div>
              <h3 className="text-xl font-display font-bold text-ink mb-2">Delete Entry?</h3>
              <p className="text-muted text-sm mb-8">This action cannot be undone.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setTransactionToDelete(null)}
                  className="flex-1 py-3 bg-bg border border-border rounded-xl font-bold text-[10px] uppercase tracking-widest text-muted hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    onDeleteExpense(transactionToDelete);
                    setTransactionToDelete(null);
                  }}
                  className="flex-1 py-3 bg-alert text-bg rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-alert/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

