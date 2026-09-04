import { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp, 
  ListTodo, 
  PiggyBank, 
  Calculator,
  Lock,
  ChevronRight
} from 'lucide-react';
import { Task, Transaction, Budget, Loan } from '../types';
import { parseISO } from 'date-fns';
import AnimatedNumber from './AnimatedNumber';

interface DashboardProps {
  tasks: Task[];
  transactions: Transaction[];
  budgets: Budget[];
  loans?: Loan[];
  allTimeSavings?: number;
  onViewTasks?: () => void;
  onViewExpenses: () => void;
  onAddTask: () => void;
  onAddExpense: () => void;
  onAddClick: () => void;
}

export default function Dashboard({
  tasks = [],
  transactions = [],
  budgets = [],
  loans = [],
  allTimeSavings = 0,
  onViewTasks,
  onViewExpenses,
  onAddTask,
  onAddExpense,
  onAddClick,
}: DashboardProps) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Calculations
  const monthlySpend = useMemo(() => {
    return transactions
      .filter(t => {
        try {
          const d = parseISO(t.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'expense';
        } catch {
          return false;
        }
      })
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions, currentMonth, currentYear]);

  // Total monthly budget allocated
  const totalMonthlyBudget = useMemo(() => {
    return budgets.reduce((acc, b) => acc + (b.monthly_limit || 0), 0);
  }, [budgets]);

  const budgetUsagePercent = totalMonthlyBudget > 0 
    ? Math.min(100, Math.round((monthlySpend / totalMonthlyBudget) * 100))
    : 0;

  // Loans Gave (Lent) and Have to Give (Borrowed)
  const totalLentPending = useMemo(() => {
    return loans
      .filter(l => l.type === 'lent' && l.status === 'pending')
      .reduce((acc, l) => acc + Math.abs(l.amount || 0), 0);
  }, [loans]);

  const totalBorrowedPending = useMemo(() => {
    return loans
      .filter(l => l.type === 'borrowed' && l.status === 'pending')
      .reduce((acc, l) => acc + Math.abs(l.amount || 0), 0);
  }, [loans]);

  // Task Counts
  const { todoCount, doneCount } = useMemo(() => {
    return tasks.reduce((acc, t) => {
      if (t.status === 'done') {
        acc.doneCount++;
      } else {
        acc.todoCount++;
      }
      return acc;
    }, { todoCount: 0, doneCount: 0 });
  }, [tasks]);
  const totalTasksCount = todoCount + doneCount;
  const taskCompletionRate = totalTasksCount > 0 ? Math.round((doneCount / totalTasksCount) * 100) : 0;

  // Next 3 urgent/high-priority tasks with stable secondary sorting
  const urgentTasks = useMemo(() => {
    return tasks
      .filter(t => t.status !== 'done')
      .sort((a, b) => {
        const priorityMap = { High: 3, Medium: 2, Low: 1 };
        const pDiff = (priorityMap[b.priority] || 0) - (priorityMap[a.priority] || 0);
        if (pDiff !== 0) return pDiff;
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      })
      .slice(0, 3);
  }, [tasks]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-6xl mx-auto space-y-10 sm:space-y-12 lg:space-y-16 pb-28 sm:pb-24 px-4 sm:px-6 pt-5 sm:pt-10"
    >
      
      {/* 1. Header & Dynamic Controls */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-5 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink tracking-tight text-balance">System Overview</h1>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onAddTask}
            className="precise-button flex-1 sm:flex-initial !px-5 !py-2.5 flex items-center justify-center gap-2 group min-h-[42px]"
          >
            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Add Task</span>
          </button>
          <button
            onClick={onAddExpense}
            className="precise-button flex-1 sm:flex-initial !px-5 !py-2.5 flex items-center justify-center gap-2 group min-h-[42px]"
          >
            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Log Expense</span>
          </button>
        </div>
      </div>

      {/* 2. Visual Index: Massive Monospace Financial Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
        
        {/* Savings Reserve */}
        <div className="space-y-2 border-b border-border/20 md:border-b-0 pb-6 md:pb-0">
          <span className="text-xs font-bold text-muted/80 uppercase tracking-wide flex items-center gap-2">
            <PiggyBank className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
            Savings Reserve
          </span>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-4xl lg:text-6xl font-mono font-black text-ink tracking-tighter leading-none tabular-nums">
              ${allTimeSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-xs font-mono font-bold text-muted/70 tracking-widest uppercase">USD</span>
          </div>
        </div>

        {/* Monthly Expenditure */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-muted/80 uppercase tracking-wide flex items-center gap-2">
            <Calculator className="w-3.5 h-3.5 text-alert" aria-hidden="true" />
            Monthly Spend {totalMonthlyBudget > 0 && <span className="text-muted/70 font-mono font-normal">/ ${totalMonthlyBudget.toLocaleString()} BUDGET ({budgetUsagePercent}%)</span>}
          </span>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-4xl lg:text-6xl font-mono font-black text-alert tracking-tighter leading-none tabular-nums">
              ${monthlySpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-xs font-mono font-bold text-muted/70 tracking-widest uppercase">USD</span>
          </div>
          {totalMonthlyBudget > 0 && (
            <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden mt-2">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${budgetUsagePercent > 90 ? 'bg-alert' : budgetUsagePercent > 70 ? 'bg-warning' : 'bg-accent'}`}
                style={{ width: `${budgetUsagePercent}%` }}
              />
            </div>
          )}
        </div>

      </div>

      {/* 3. Segment: Debt Registers (Loans Outstanding) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 border-t border-b border-border/30 py-8">
        
        {/* Loans Gave (Lent) */}
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 rounded-full bg-success/5 border border-success/15 flex items-center justify-center text-success flex-shrink-0">
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold text-muted/80 uppercase tracking-wide block">Receivables (Lent)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-black text-success tracking-tight tabular-nums">
                +${totalLentPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-muted/70 font-mono">USD</span>
            </div>
          </div>
        </div>

        {/* Loans Have to Give (Borrowed) */}
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 rounded-full bg-alert/5 border border-alert/15 flex items-center justify-center text-alert flex-shrink-0">
            <ArrowDownRight className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold text-muted/80 uppercase tracking-wide block">Payables (Borrowed)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-black text-alert tracking-tight tabular-nums">
                -${totalBorrowedPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-muted/70 font-mono">USD</span>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Task Execution Index */}
      <div className="space-y-6">
        <div className="flex items-baseline justify-between pb-3 border-b border-border/20">
          <span className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-accent" />
            Task Progress
          </span>
        </div>

          <div className="space-y-5">
            {/* Completion Index Ratio */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between text-xs font-mono">
                <span className="font-semibold text-muted uppercase tracking-wide">COMPLETION RATE</span>
                <span className="font-black text-ink">
                  {doneCount} / {totalTasksCount} ({taskCompletionRate}%)
                </span>
              </div>
              <div className="w-full h-1 bg-surface-subtle rounded-full overflow-hidden">
                <motion.div 
                  style={{ transformOrigin: 'left' }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: taskCompletionRate / 100 }}
                  transition={{ duration: 1 }}
                  className="h-full w-full bg-accent shadow-[0_0_8px_var(--color-accent)]"
                />
              </div>
            </div>

            {/* List of High-Priority Pending Tasks */}
            {urgentTasks.length > 0 ? (
              <div className="space-y-3 pt-3 border-t border-border/10">
                <span className="text-xs font-bold text-muted/60 uppercase tracking-wide block mb-1">
                  CRITICAL TASKS PENDING
                </span>
                
                {urgentTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={onViewTasks}
                    className="w-full flex items-center justify-between text-xs py-2 border-b border-border/10 last:border-b-0 hover:text-accent cursor-pointer transition-colors group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 rounded"
                    aria-label={`View task: ${task.title}`}
                  >
                    <span className="font-semibold text-ink leading-tight truncate max-w-[200px] group-hover:text-accent transition-colors">
                      {task.title}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-black uppercase tracking-widest font-mono ${
                        task.priority === 'High' 
                          ? 'bg-alert/10 text-alert' 
                          : task.priority === 'Medium' 
                          ? 'bg-accent/10 text-accent' 
                          : 'bg-muted/15 text-muted'
                      }`}>
                        {task.priority || 'Normal'}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted/40 group-hover:text-accent transition-colors" aria-hidden="true" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center rounded-xl bg-surface-subtle/10 border border-dashed border-border/20">
                <p className="text-xs font-black uppercase tracking-widest text-muted/40">
                  No pending critical tasks
                </p>
              </div>
            )}
          </div>
        </div>

    </motion.div>
  );
}
