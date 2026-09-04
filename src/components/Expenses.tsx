import { useState, useMemo, useEffect, useDeferredValue } from 'react';
import { format, subMonths, startOfMonth, startOfYear, endOfMonth, isWithinInterval, endOfDay, parseISO, eachMonthOfInterval } from 'date-fns';
import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip, PieChart as RechartsPieChart, Pie, Legend, CartesianGrid } from 'recharts';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';
import { TrendingUp, Landmark, ShoppingBag, Utensils, Briefcase, Home, Plane, Download, Plus, PieChart, ArrowUpRight, ArrowDownRight, Trash2, Edit3, Settings2, KeyRound, Check, X, ChevronDown, Search, Maximize2, CalendarRange, RotateCcw, History as HistoryIcon, Receipt } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { Transaction, Budget } from '../types';
import AnimatedNumber from './AnimatedNumber';
import EmptyState from './EmptyState';

interface SwipeableExpenseItemProps {
  transaction: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  index: number;
  searchTerm: string;
  getIcon: (cat: string) => any;
}

function SwipeableExpenseItem({ transaction: t, onEdit, onDelete, index, searchTerm, getIcon }: SwipeableExpenseItemProps) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0, 100], [1, 1, 1]);
  const bg = useTransform(x, [-100, 0, 100], ['var(--color-alert)', 'transparent', 'var(--color-accent)']);
  const deleteOpacity = useTransform(x, [-80, -20], [1, 0]);
  const editOpacity = useTransform(x, [20, 80], [0, 1]);

  const Icon = getIcon(t.category);
  const isLatest = index === 0 && !searchTerm;

  const handleDragEnd = (_: any, info: any) => {
    // Emil Kowalski velocity-aware gesture dismissal: flick velocity or distance threshold
    const isFlickLeft = info.velocity.x < -500 || info.offset.x < -80;
    const isFlickRight = info.velocity.x > 500 || info.offset.x > 80;

    if (isFlickLeft) {
      onDelete(t.id);
    } else if (isFlickRight) {
      onEdit(t);
    }
  };

  return (
    <div className="relative group overflow-hidden rounded-2xl">
      <motion.div 
        style={{ backgroundColor: bg }}
        className="absolute inset-0 flex items-center justify-between px-8 z-0"
      >
        <motion.div style={{ opacity: editOpacity }} className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-widest">
          <Edit3 className="w-5 h-5" />
          <span>Edit</span>
        </motion.div>
        <motion.div style={{ opacity: deleteOpacity }} className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-widest">
          <span>Delete</span>
          <Trash2 className="w-5 h-5" />
        </motion.div>
      </motion.div>

      <motion.div 
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        onDragEnd={handleDragEnd}
        style={{ x, opacity }}
        role="button"
        tabIndex={0}
        aria-label={`Edit ${t.description || t.category}: ${t.type === 'income' ? '+' : '–'}$${Math.abs(t.amount).toFixed(2)}`}
        onClick={() => {
          if (Math.abs(x.get()) < 5) {
            onEdit(t);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onEdit(t);
          }
        }}
        className={`relative z-10 p-4 sm:p-6 bg-white/[0.01] border-b border-white/[0.03] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between transition-colors cursor-pointer ${isLatest ? 'border-l-2 border-l-success bg-success/[0.02]' : ''} hover:bg-black/[0.02] ${t.id.toString().startsWith('temp-') ? 'opacity-50 grayscale-[0.5]' : ''}`}
      >
        <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-surface-subtle rounded-full flex items-center justify-center border border-border transition-all group-hover:scale-110 group-hover:border-accent/30 flex-shrink-0">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-muted group-hover:text-accent" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <p className="text-sm sm:text-base font-black text-ink leading-tight truncate">{t.description || t.category || t.merchant}</p>
              {isLatest && !t.id.toString().startsWith('temp-') && (
                <span className="px-2 py-0.5 rounded-md bg-accent text-xs font-black text-white uppercase tracking-widest shadow-sm">Latest</span>
              )}
              {t.id.toString().startsWith('temp-') && (
                <span className="px-2 py-0.5 rounded-md bg-warning/20 border border-warning/30 text-xs font-black text-warning uppercase tracking-widest animate-pulse">Syncing…</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-xs uppercase font-bold tracking-widest text-muted/90">{t.category}</span>
              <span className="w-1 h-1 bg-border rounded-full" />
              <span className="text-xs font-mono text-muted/80 truncate max-w-[100px] sm:max-w-none">{t.merchant}</span>
              <span className="w-1 h-1 bg-border rounded-full" />
              <span className="text-xs font-mono text-muted/80">{format(parseISO(t.date), 'MMM d, yyyy')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-8 w-full sm:w-auto">
          <span className={`text-base sm:text-2xl font-mono font-black tabular-nums ${t.type === 'income' ? 'text-success' : 'text-ink'}`}>
            {t.type === 'income' ? '+' : '–'}${Math.abs(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div className="hidden sm:flex gap-2">
            <button onClick={() => onEdit(t)} aria-label={`Edit ${t.description || t.category}`} className="p-2 text-muted hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 rounded"><Edit3 className="w-4 h-4" aria-hidden="true" /></button>
            <button onClick={() => onDelete(t.id)} aria-label={`Delete ${t.description || t.category}`} className="p-2 text-muted hover:text-alert transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alert focus-visible:ring-offset-1 rounded"><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface ExpensesProps {
  transactions: Transaction[];
  budgets: Budget[];
  onAddExpense: () => void;
  onEditExpense: (t: Transaction) => void;
  onDeleteExpense: (id: string) => void;
  onUpsertBudget: (category: string, limit: number) => void;
  globalMonthlyBudget: number;
  onSetGlobalBudget: (limit: number) => void;
  /** Pre-computed all-time savings aggregate from app_settings. Avoids reading all transactions. */
  allTimeSavings?: number;
  /** On-demand fetcher for historical ranges. */
  onLoadRange?: (start: string, end: string) => Promise<Transaction[]>;
  /** Whether a financial sync is currently in progress. */
  isSyncing?: boolean;
}

const NoirTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div className="bg-surface/90 backdrop-blur-xl border border-border/80 ring-1 ring-white/10 p-3.5 rounded-2xl shadow-2xl">
        <p className="text-xs font-black text-muted/90 uppercase tracking-[0.2em] mb-1.5">{payload[0].payload.name}</p>
        <p className={`text-base font-mono font-black tabular-nums ${val >= 0 ? 'text-success' : 'text-alert'}`}>
          {val >= 0 ? '+' : '-'}${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
  allTimeSavings: allTimeSavingsProp,
  onLoadRange,
  isSyncing,
}: ExpensesProps) {
  const [periodMode, setPeriodMode] = useState<'month' | 'all' | 'custom'>('month');
  const [savingsGoal, setSavingsGoal] = useState(5000);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState('5000');
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<{category: string, limit: string} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [selectedBudgetDate, setSelectedBudgetDate] = useState(new Date());
  const [isFocusedLedgerOpen, setIsFocusedLedgerOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{start: string, end: string} | null>(null);
  const [historicalData, setHistoricalData] = useState<Transaction[] | null>(null);
  const [isFetchingRange, setIsFetchingRange] = useState(false);

  // Sync historical data when date range changes
  useEffect(() => {
    if (dateRange?.start && dateRange?.end && onLoadRange) {
      const fetchHistory = async () => {
        setIsFetchingRange(true);
        try {
          const data = await onLoadRange(dateRange.start, dateRange.end);
          setHistoricalData(data);
        } catch (e) {
          console.error('Range fetch failed', e);
        } finally {
          setIsFetchingRange(false);
        }
      };
      fetchHistory();
    } else {
      setHistoricalData(null);
    }
  }, [dateRange, onLoadRange]);

  // Escape key listener for budget allocation modal
  useEffect(() => {
    if (!isAllocationModalOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAllocationModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isAllocationModalOpen]);

  // The pool of transactions we are currently looking at
  const transactionPool = historicalData ?? transactions;

  // ALL-TIME CUMULATIVE SAVINGS (Historical Reserves)
  // Uses the pre-computed aggregate from app_settings if available.
  // Falls back to summing the local (limited) transaction list only if prop is not provided.
  const computedSavings = useMemo(() => {
    return transactionPool.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0);
  }, [transactionPool]);
  const allTimeSavings = allTimeSavingsProp ?? computedSavings;

  // CATEGORY COLOR MAP for PieChart - using standardized theme variables
  const COLORS = ['var(--color-accent)', 'var(--color-success)', 'var(--color-trade)', 'var(--color-todo)', 'var(--color-ink)', 'var(--color-muted)'];

  // BUDGET-SPECIFIC MONTH FILTER
  const budgetPeriodTransactions = useMemo(() => {
    const start = startOfMonth(selectedBudgetDate);
    const end = endOfDay(new Date(selectedBudgetDate.getFullYear(), selectedBudgetDate.getMonth() + 1, 0));
    return transactionPool.filter(t => {
      const d = parseISO(t.date);
      return isWithinInterval(d, { start, end });
    });
  }, [transactionPool, selectedBudgetDate]);

  // Filter transactions based on time period or active periodMode
  const filteredTransactions = useMemo(() => {
    if (periodMode === 'all') {
      return [...transactionPool].sort((a, b) => {
        const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (timeDiff !== 0) return timeDiff;
        return (b.id || '').localeCompare(a.id || '');
      });
    }

    if (periodMode === 'month') {
      const now = new Date();
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      return transactionPool
        .filter(t => {
          try {
            const d = parseISO(t.date);
            return isWithinInterval(d, { start, end });
          } catch {
            return false;
          }
        })
        .sort((a, b) => {
          const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (timeDiff !== 0) return timeDiff;
          return (b.id || '').localeCompare(a.id || '');
        });
    }

    // Custom mode with dateRange
    const hasStart = Boolean(dateRange?.start);
    const hasEnd = Boolean(dateRange?.end);

    let list = transactionPool;

    if (hasStart || hasEnd) {
      list = list.filter(t => {
        const transactionDate = t.date.split('T')[0];
        if (hasStart && transactionDate < dateRange!.start) return false;
        if (hasEnd && transactionDate > dateRange!.end) return false;
        return true;
      });
    }

    return [...list].sort((a, b) => {
      const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (timeDiff !== 0) return timeDiff;
      const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (aCreated !== bCreated) return bCreated - aCreated;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [transactionPool, periodMode, dateRange]);

  // Search filter for the ledger using deferred search term
  const searchedTransactions = useMemo(() => {
    if (!deferredSearchTerm) return filteredTransactions;
    const lower = deferredSearchTerm.toLowerCase();
    return filteredTransactions.filter(t =>
      (t.merchant?.toLowerCase().includes(lower)) ||
      t.category.toLowerCase().includes(lower) ||
      (t.description?.toLowerCase().includes(lower)) ||
      t.amount.toString().includes(lower)
    );
  }, [filteredTransactions, deferredSearchTerm]);

  const { totalSpent, totalIncome } = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      if (t.type === 'expense') {
        acc.totalSpent += t.amount;
      } else if (t.type === 'income') {
        acc.totalIncome += t.amount;
      }
      return acc;
    }, { totalSpent: 0, totalIncome: 0 });
  }, [filteredTransactions]);
  const netBalance = totalIncome - totalSpent;
  const savingsRate = totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0;

  // Cashflow Trend Data (Last 6 periods)
  const cashflowData = useMemo(() => {
    const now = new Date();
    const data: { name: string; net: number }[] = [];
    const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });
    months.forEach(monthStart => {
      const monthEnd = endOfDay(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0));
      const { inc, exp } = transactionPool.reduce((acc, t) => {
        const d = parseISO(t.date);
        if (isWithinInterval(d, { start: monthStart, end: monthEnd })) {
          if (t.type === 'income') acc.inc += t.amount;
          else if (t.type === 'expense') acc.exp += t.amount;
        }
        return acc;
      }, { inc: 0, exp: 0 });
      data.push({ name: format(monthStart, 'MMM'), net: inc - exp });
    });
    return data;
  }, [transactionPool]);

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
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

  const handleExportFiltered = () => {
    const headers = ['Date', 'Description', 'Category', 'Merchant', 'Amount', 'Type'];
    const rows = searchedTransactions.map(t => [
      t.date,
      `"${t.description?.replace(/"/g, '""') || ''}"`,
      t.category,
      `"${t.merchant?.replace(/"/g, '""') || ''}"`,
      Number(t.amount).toFixed(2),
      t.type
    ]);
    const csvString = [headers.join(','), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `synapse_filtered_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Filtered ledger exported.');
  };

  const handleExportAllTime = async () => {
    if (!auth.currentUser) return;
    toast.info('Preparing full ledger export…');
    try {
      const q = query(collection(db, 'transactions'), where('uid', '==', auth.currentUser.uid));
      const snap = await getDocs(q);
      const allTrans = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction));
      
      const headers = ['Date', 'Description', 'Category', 'Merchant', 'Amount', 'Type'];
      const rows = allTrans
        .sort((a, b) => {
          const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (timeDiff !== 0) return timeDiff;
          const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (aCreated !== bCreated) return bCreated - aCreated;
          return (b.id || '').localeCompare(a.id || '');
        })
        .map(t => [
        t.date,
        `"${t.description?.replace(/"/g, '""') || ''}"`,
        t.category,
        `"${t.merchant?.replace(/"/g, '""') || ''}"`,
          Number(t.amount).toFixed(2),
        t.type
      ]);
      
      const csvString = [headers.join(','), ...rows.map(e => e.join(","))].join("\n");
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `synapse_full_history_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Full history exported.');
    } catch (e) {
      console.error('Export failed', e);
      toast.error('Failed to export all-time data.');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 sm:space-y-10 lg:space-y-12 pb-20 sm:pb-24 lg:pb-32 px-4 sm:px-6 pt-6 sm:pt-8 lg:pt-12">
      {/* 1. Time Horizon Switcher (0-Read Client-side Switcher) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/30">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-black text-ink uppercase tracking-tight">Financial Intel</h2>
          <p className="micro-label mt-0.5">
            {periodMode === 'month' ? 'Viewing active calendar month' : periodMode === 'all' ? 'Viewing complete transaction history' : 'Viewing custom date range'}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-surface-subtle/50 rounded-full border border-border/80 self-start sm:self-auto relative">
          {[
            { id: 'month', label: 'This Month', action: () => { setPeriodMode('month'); setDateRange(null); } },
            { id: 'all', label: 'All Time', action: () => { setPeriodMode('all'); setDateRange(null); } },
            { id: 'custom', label: 'Custom Range', action: () => { setPeriodMode('custom'); setIsFocusedLedgerOpen(true); } }
          ].map((tab) => {
            const isActive = periodMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={tab.action}
                className={`relative px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.12em] transition-colors cursor-pointer z-10 ${
                  isActive ? 'text-white' : 'text-muted hover:text-ink'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeHorizonPill"
                    transition={{ type: 'spring', duration: 0.35, bounce: 0.12 }}
                    className="absolute inset-0 bg-accent rounded-full shadow-lg shadow-accent/25 -z-10"
                  />
                )}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* The Command Strip (Intel Summary) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 w-full border border-border/50 rounded-2xl bg-surface-subtle/20 overflow-hidden shadow-sm divide-x divide-y divide-border/30 sm:divide-y-0">
        {[
          { label: 'Inflow', value: totalIncome, color: 'text-success', prefix: '$' },
          { label: 'Outflow', value: totalSpent, color: 'text-alert', prefix: '$' },
          { label: 'Net Balance', value: netBalance, color: netBalance >= 0 ? 'text-success' : 'text-alert', prefix: netBalance >= 0 ? '+$' : '-$' },
          { label: 'Savings Rate', value: savingsRate || 0, color: 'text-accent', suffix: '%' },
        ].map((m, i) => (
               <div key={i} className="p-4 sm:p-5 flex flex-col justify-center items-center sm:items-start text-center sm:text-left hover:bg-surface/50 transition-colors border-border/10">
                 <span className="text-xs font-semibold text-muted/70 uppercase tracking-wide mb-1">{m.label}</span>
            <div className="flex items-baseline gap-2">
               <span className={`text-sm sm:text-lg lg:text-xl font-mono font-black tracking-tighter ${m.color}`}>
                  <AnimatedNumber value={Math.abs(m.value)} prefix={m.prefix} />
                  {m.suffix}
               </span>
            </div>
          </div>
        ))}
      </div>

      {/* Registry Section */}
      <div className="flex flex-col space-y-4 sm:space-y-6">
        <div className="pb-4 sm:pb-6 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
                <h3 className="text-2xl sm:text-3xl font-display font-black text-ink uppercase tracking-tighter text-balance">Expense Ledger</h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs font-medium text-muted/60">
                    {dateRange ? 'Historical range filtered' : 'Latest activity and budgets'}
                  </p>
                  {isFetchingRange && (
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  )}
                </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsFocusedLedgerOpen(true)} 
                className="w-10 h-10 rounded-full border border-border bg-surface-subtle flex items-center justify-center text-muted/70 hover:text-accent hover:border-accent/40 transition-all active:scale-95 shadow-sm"
                aria-label="Open full ledger with export options"
                title="Full Ledger + Export"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button 
                onClick={onAddExpense} 
                disabled={isSyncing}
                className="precise-button !px-6 !py-2.5 flex items-center gap-2 group/btn disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5 group-hover/btn:rotate-90 transition-transform" />
                <span className="hidden sm:inline text-xs uppercase font-black tracking-widest flex items-center gap-1.5">New Entry <kbd className="text-xs bg-white/10 px-1.5 py-0.5 rounded font-mono font-normal tracking-normal lowercase">alt+a</kbd></span>
                <span className="sm:hidden text-xs uppercase font-black tracking-widest">Add</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-6 bg-surface-subtle/50 px-5 py-2.5 rounded-full border border-border focus-within:border-accent/60 focus-within:ring-1 focus-within:ring-accent/30 transition-all w-full max-w-sm">
            <Search className="w-4 h-4 text-muted/70" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search by merchant, category or amount…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-ink w-full placeholder:text-muted/60 font-medium"
              aria-label="Search transactions"
            />
          </div>
        </div>
        <div className="w-full">
          <div className="space-y-1">
            {searchedTransactions.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {searchedTransactions.slice(0, 25).map((t, index) => (
                  <SwipeableExpenseItem 
                    key={t.id}
                    transaction={t}
                    index={index}
                    searchTerm={searchTerm}
                    getIcon={getIcon}
                    onEdit={onEditExpense}
                    onDelete={onDeleteExpense}
                  />
                ))}
              </AnimatePresence>
            ) : (
              <EmptyState 
                iconName={searchTerm ? "Search" : "ShoppingBag"}
                title={searchTerm ? "No matches found" : "No transactions logged"}
                description={searchTerm ? `No matches found for "${searchTerm}". Try a different keyword.` : "Keep tabs on your cash flow by logging your first income or expense."}
                actionText={searchTerm ? undefined : "Log Transaction"}
                onAction={searchTerm ? undefined : onAddExpense}
              />
            )}
          </div>
        </div>

        {/* Date Filter UI */}
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center gap-4 bg-surface-subtle/50 p-4 rounded-2xl border border-border shadow-sm">
           <div className="flex items-center gap-3 w-full sm:w-auto">
              <CalendarRange className="w-5 h-5 text-muted hidden sm:block" />
              <div className="flex items-center justify-between sm:justify-start gap-2 flex-1 sm:flex-none">
                 <input 
                    type="date" 
                    className="bg-surface border border-border rounded-xl px-3 py-2 text-xs text-ink outline-none focus:border-accent/40 w-full sm:w-auto"
                    value={dateRange?.start || ''}
                    onChange={(e) => setDateRange(prev => ({ start: e.target.value, end: prev?.end || '' }))}
                    aria-label="Start date"
                    name="date-start"
                 />
                 <span className="text-muted text-xs font-bold uppercase">to</span>
                 <input 
                    type="date" 
                    className="bg-surface border border-border rounded-xl px-3 py-2 text-xs text-ink outline-none focus:border-accent/40 w-full sm:w-auto"
                    value={dateRange?.end || ''}
                    onChange={(e) => setDateRange(prev => ({ start: prev?.start || '', end: e.target.value }))}
                    aria-label="End date"
                    name="date-end"
                 />
              </div>
           </div>
           {dateRange ? (
              <button 
                 onClick={() => setDateRange(null)}
                 className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-alert/10 text-muted hover:text-alert border border-border rounded-xl transition-all text-xs uppercase font-black tracking-widest w-full sm:w-auto justify-center"
              >
                 <RotateCcw className="w-3.5 h-3.5" />
                 Reset Filter
              </button>
           ) : null}
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
              <span className="text-xs md:micro-label !text-accent tracking-[0.12em] sm:tracking-[0.3em] font-black uppercase">Historical Reserves</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-display font-black text-ink tracking-tighter tabular-nums">
              ${allTimeSavings.toLocaleString()}
            </h2>
            <div className="flex items-center gap-2 text-muted">
              <TrendingUp className="w-3 md:w-3.5 h-3 md:h-3.5 text-success" />
              <span className="text-xs md:text-xs font-bold uppercase tracking-wide sm:tracking-widest leading-none">Cumulative Savings Volume</span>
            </div>
          </div>
          
          <div className="flex-1 max-w-xl self-start lg:self-center w-full">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-3 md:mb-4">
               <div>
              {allTimeSavings <= 0 ? (
                <div className="mt-4 p-4 rounded-xl border border-dashed border-border bg-bg/50 text-center">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-muted/60">No reserve growth yet</p>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted/40 mt-1">Income will appear here as transactions are logged.</p>
                </div>
              ) : null}
                 <p className="text-xs font-black uppercase text-ink tracking-wide sm:tracking-widest mb-1">Target Milestone</p>
                 <div className="flex items-baseline gap-2">
                   {isEditingGoal ? (
                     <div className="flex items-center gap-2">
                       <input 
                         type="number" 
                         value={tempGoal} 
                         onChange={e => setTempGoal(e.target.value)}
                         className="w-20 md:w-24 bg-black/40 border-b border-accent outline-none text-ink text-xs md:text-sm py-1 font-mono"
                         aria-label="Savings goal amount"
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
                 style={{ transformOrigin: 'left' }}
                 initial={{ scaleX: 0 }}
                 animate={{ scaleX: Math.max(0, Math.min(1, allTimeSavings / savingsGoal)) }}
                 transition={{ duration: 1.5, ease: 'circOut' }}
                 className={`h-full w-full ${allTimeSavings >= savingsGoal ? 'bg-success shadow-[0_0_20px_rgba(52,211,153,0.3)]' : 'bg-accent shadow-[0_0_20px_rgba(99,102,241,0.3)]'} relative`}
               >
                 <div className="absolute inset-0 bg-white/20 animate-pulse" />
               </motion.div>
             </div>
          </div>
        </div>
      </motion.div>

      {/* Visual Analytics Stack */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
          <div className="soothing-card p-5 sm:p-6 flex flex-col min-w-0" style={{ height: 280 }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-display font-black text-ink uppercase tracking-tight">Net Performance</h3>
                <p className="micro-label mt-1">Cashflow Velocity Trend</p>
              </div>
            </div>
            <div className="w-full min-w-0" style={{ flex: 1, minHeight: 180 }}>
              <ResponsiveContainer width="100%" height={180} minWidth={0} minHeight={180}>
                <BarChart data={cashflowData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" opacity={0.1} />
                  <Tooltip content={<NoirTooltip />} cursor={{ fill: 'var(--color-accent)', opacity: 0.05 }} />
                  <Bar dataKey="net" radius={[6, 6, 0, 0]} animationDuration={1500}>
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
              <p className="micro-label mt-1 uppercase tracking-widest">
                {periodMode === 'month' ? 'Category mix for current month' : periodMode === 'all' ? 'All-time category mix' : 'Category mix for custom range'}
              </p>
            </div>
            <div className="w-full md:w-[300px] min-w-0" style={{ height: 250, minHeight: 220, position: 'relative' }}>
              {categoryTotals.length > 0 ? (
                <ResponsiveContainer width="100%" height={250} minWidth={0} minHeight={220}>
                  <RechartsPieChart>
                    <Pie data={categoryTotals.map(([name, value]) => ({ name, value }))} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value" stroke="none" animationDuration={2000}>
                      {categoryTotals.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.9} />
                      ))}
                    </Pie>
                    <Tooltip content={<NoirTooltip />} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border/40 rounded-[28px] bg-bg/40">
                  <PieChart className="w-8 h-8 text-muted/40 mb-3" />
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-muted/60">No spending data yet</p>
                </div>
              )}
            </div>
          </div>
      </div>

      {/* Allocation Modal */}
      <AnimatePresence>
        {isAllocationModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="benchmark-modal-title">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAllocationModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="relative bg-surface w-full max-w-md rounded-[24px] sm:rounded-[32px] shadow-2xl border border-border/30 p-4 sm:p-6 lg:p-10">
              <div className="flex justify-between items-center mb-8">
                <h2 id="benchmark-modal-title" className="text-2xl font-display font-black text-ink uppercase tracking-tight">System Benchmark</h2>
                <button onClick={() => setIsAllocationModalOpen(false)} aria-label="Close budget configuration" className="p-2 hover:bg-surface-subtle/20 rounded-full text-muted/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><X className="w-5 h-5" aria-hidden="true" /></button>
              </div>

                <div className="mb-10 p-6 bg-accent/14 border border-accent/30 rounded-[28px] space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center text-accent border border-accent/20">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-ink uppercase tracking-widest">Global Spend Limit</h3>
                    <p className="text-xs text-muted/60 uppercase tracking-tight">Primary Monthly Benchmark</p>
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
                    aria-label="Monthly spending limit"
                  />
                </div>
              </div>

               <div className="mb-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-border/30" />
                <span className="text-xs font-black text-muted/70 uppercase tracking-[0.12em] sm:tracking-[0.3em]">Mapping Controls</span>
                <div className="h-px flex-1 bg-border/30" />
              </div>

              <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-2 scrollbar-custom">
                {Array.from(new Set([...transactions.map(t => t.category), ...budgets.map(b => b.category)])).map(cat => {
                  const budget = budgets.find(b => b.category === cat);
                  const isEditing = editingBudget?.category === cat;
                  return (
                    <div key={cat} className="p-4 bg-bg rounded-2xl border border-border flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-wide sm:tracking-widest text-muted mb-1">{cat}</p>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-ink">$</span>
                            <input type="number" value={editingBudget.limit} onChange={e => setEditingBudget({ ...editingBudget, limit: e.target.value })} className="w-20 bg-surface border-b border-accent text-sm font-mono outline-none py-1" aria-label={`Budget limit for ${cat}`} autoFocus />
                          </div>
                        ) : (
                          <p className="text-sm font-mono text-ink">{budget ? `$${budget.monthly_limit.toLocaleString()}` : 'No limit'}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {isEditing ? (
                          <button onClick={() => { onUpsertBudget(cat, parseFloat(editingBudget.limit) || 0); setEditingBudget(null); }} aria-label={`Save budget for ${cat}`} className="p-2 bg-accent/20 text-accent rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Check className="w-4 h-4" aria-hidden="true" /></button>
                        ) : (
                          <button onClick={() => setEditingBudget({ category: cat, limit: budget?.monthly_limit.toString() || '' })} aria-label={`Edit budget for ${cat}`} className="p-2 hover:bg-surface rounded-lg text-muted hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Settings2 className="w-4 h-4" aria-hidden="true" /></button>
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
              className="relative bg-surface w-full max-w-5xl h-[85vh] rounded-[40px] shadow-2xl border border-border/30 flex flex-col overflow-hidden"
            >
              <div className="p-8 md:p-12 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-display font-black text-ink uppercase tracking-tighter">Mission Ledger</h2>
                  <p className="micro-label opacity-40 mt-1 uppercase tracking-widest">Complete Financial History</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="flex items-center bg-surface-subtle/20 rounded-full p-1 border border-border/40">
                    <button 
                      onClick={handleExportFiltered} 
                      aria-label="Export filtered" 
                      title="Export Current View"
                      className="flex items-center gap-2 px-4 py-2 hover:bg-accent/10 text-muted/70 hover:text-accent rounded-full transition-all text-xs font-black uppercase tracking-widest"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Filtered
                    </button>
                    <div className="w-[1px] h-4 bg-border/40 mx-1" />
                    <button 
                      onClick={handleExportAllTime} 
                      aria-label="Export all time" 
                      title="Export All-Time History"
                      className="flex items-center gap-2 px-4 py-2 hover:bg-success/10 text-muted/70 hover:text-success rounded-full transition-all text-xs font-black uppercase tracking-widest"
                    >
                      <HistoryIcon className="w-3.5 h-3.5" />
                      All-Time
                    </button>
                  </div>
                  <button onClick={() => setIsFocusedLedgerOpen(false)} aria-label="Close ledger" className="p-3 bg-surface-subtle/20 border border-border/40 rounded-full text-muted/70 hover:text-alert transition-all"><X className="w-5 h-5" aria-hidden="true" /></button>
                </div>
              </div>
              
              <div className="p-6 md:p-8 bg-surface-subtle border-b border-border">
                <div className="flex items-center gap-4 bg-surface px-6 py-4 rounded-full border border-border focus-within:border-accent/40 shadow-inner">
                  <Search className="w-5 h-5 text-muted" aria-hidden="true" />
                  <input 
                    type="text" 
                    placeholder="Search and refine…" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs sm:text-sm text-ink w-full placeholder:text-muted/60 font-bold"
                    aria-label="Search transactions"
                    inputMode="search"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-custom p-4 md:p-8">
                <div className="space-y-2">
                    {searchedTransactions.map((t, index) => (
                      <SwipeableExpenseItem 
                        key={t.id}
                        transaction={t}
                        index={index}
                        searchTerm={searchTerm}
                        getIcon={getIcon}
                        onEdit={(tx) => { setIsFocusedLedgerOpen(false); onEditExpense(tx); }}
                        onDelete={(id) => setTransactionToDelete(id)}
                      />
                    ))}
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
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="relative bg-surface w-full max-w-xs rounded-[32px] shadow-2xl border border-border/30 p-10 text-center">
              <div className="w-16 h-16 bg-alert/20 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 className="w-6 h-6 text-alert" /></div>
              <h3 className="text-2xl font-display font-black text-ink mb-2 uppercase tracking-tight">Delete Entry?</h3>
              <p className="text-muted text-xs mb-8 font-bold tracking-widest">IRREVERSIBLE ACTION</p>
              <div className="flex gap-4">
                <button onClick={() => setTransactionToDelete(null)} className="flex-1 py-3 bg-surface-subtle/20 border border-border/40 rounded-full font-semibold text-sm text-muted/70 active:scale-[0.97] transition-all hover:bg-surface/50">Cancel</button>
                <button onClick={() => { onDeleteExpense(transactionToDelete); setTransactionToDelete(null); }} className="flex-1 py-3 bg-alert text-white rounded-full font-semibold text-sm shadow-2xl shadow-alert/30 hover:bg-alert/90 active:scale-[0.97] transition-all">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
