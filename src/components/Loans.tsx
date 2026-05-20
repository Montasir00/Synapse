import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coins, 
  Trash2, 
  Edit3, 
  Check, 
  RotateCcw, 
  Calendar, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Scale 
} from 'lucide-react';
import { Loan } from '../types';
import { format, parseISO } from 'date-fns';
import AnimatedNumber from './AnimatedNumber';
import LogLoanModal from './LogLoanModal';

interface LoansProps {
  loans: Loan[];
  onAddLoan: (loan: Omit<Loan, 'id' | 'uid'>) => void | Promise<void>;
  onEditLoan: (id: string, updates: Partial<Loan>) => void | Promise<void>;
  onDeleteLoan: (id: string) => void | Promise<void>;
  onToggleStatus: (id: string, currentStatus: 'pending' | 'settled') => void | Promise<void>;
  totalUnrealizedPnl: number;
}

export default function Loans({
  loans = [],
  onAddLoan,
  onEditLoan,
  onDeleteLoan,
  onToggleStatus,
  totalUnrealizedPnl = 0,
}: LoansProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [loanToDelete, setLoanToDelete] = useState<string | null>(null);

  // Filtered lists based on search
  const filteredLoans = useMemo(() => {
    let list = [...loans].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase().trim();
      list = list.filter(l => 
        l.personName.toLowerCase().includes(lower) || 
        (l.notes && l.notes.toLowerCase().includes(lower)) ||
        l.amount.toString().includes(lower)
      );
    }
    return list;
  }, [loans, searchTerm]);

  // Aggregate metrics (only active/pending loans reflect in total outstanding balances)
  const totalLent = useMemo(() => 
    loans.filter(l => l.type === 'lent' && l.status === 'pending')
         .reduce((acc, l) => acc + l.amount, 0),
    [loans]
  );

  const totalBorrowed = useMemo(() => 
    loans.filter(l => l.type === 'borrowed' && l.status === 'pending')
         .reduce((acc, l) => acc + l.amount, 0),
    [loans]
  );

  const netBalance = totalLent - totalBorrowed;
  
  const settledCount = useMemo(() => 
    loans.filter(l => l.status === 'settled').length,
    [loans]
  );

  const formatDateSafely = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const handleOpenAddModal = () => {
    setEditingLoan(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (loan: Loan) => {
    setEditingLoan(loan);
    setIsModalOpen(true);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 sm:space-y-10 lg:space-y-12 pb-20 sm:pb-24 lg:pb-32 px-3 sm:px-4 lg:px-6 pt-6 sm:pt-8 lg:pt-12 theme-loans">
      
      {/* 1. Unrealized Profit Hero Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className={`soothing-card p-6 md:p-10 relative overflow-hidden flex flex-col justify-center bg-gradient-to-br from-surface to-bg border-2 border-dashed ${
          totalUnrealizedPnl >= 0 ? 'border-success/20' : 'border-alert/20'
        }`}
      >
        {/* Glow orb background effect */}
        <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[100px] opacity-10 pointer-events-none ${
          totalUnrealizedPnl >= 0 ? 'bg-success' : 'bg-alert'
        }`} />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              {totalUnrealizedPnl >= 0 ? (
                <TrendingUp className="w-4 h-4 text-success animate-pulse" />
              ) : (
                <TrendingDown className="w-4 h-4 text-alert animate-pulse" />
              )}
              <span className="text-[10px] micro-label !text-muted tracking-[0.25em] font-black uppercase">
                Unrealized Quant Performance
              </span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-ink tracking-tighter leading-none flex items-baseline gap-2">
              <span className={totalUnrealizedPnl >= 0 ? 'text-success' : 'text-alert'}>
                {totalUnrealizedPnl >= 0 ? '+' : '–'}${Math.abs(totalUnrealizedPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-mono font-bold text-muted/50 uppercase tracking-widest">USDC</span>
            </h2>
            
            <p className="text-[10px] font-bold text-muted/50 uppercase tracking-widest flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${totalUnrealizedPnl >= 0 ? 'bg-success' : 'bg-alert'}`} />
              Real-time trading ledger integrations matching Binance stream
            </p>
          </div>

          <div className="lg:max-w-xs text-left lg:text-right space-y-1">
            <span className="text-[9px] font-black text-muted/40 uppercase tracking-[0.2em] block">Current Portfolio State</span>
            <p className="text-xs text-muted/70 font-semibold leading-relaxed">
              This panel aggregates raw floating yields from your active market exposures. This metric does not affect your local debt balance.
            </p>
          </div>
        </div>
      </motion.div>

      {/* 2. Global Debt Metrics (Command Strip) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 w-full border border-border/50 rounded-2xl bg-surface-subtle/20 overflow-hidden shadow-sm divide-x divide-y divide-border/30 sm:divide-y-0">
        {[
          { label: 'Gave to People (Lent)', value: totalLent, color: 'text-success', prefix: '$' },
          { label: 'Have to Give (Owe)', value: totalBorrowed, color: 'text-alert', prefix: '$' },
          { label: 'Net Outstanding', value: netBalance, color: netBalance >= 0 ? 'text-success' : 'text-alert', prefix: netBalance >= 0 ? '+$' : '-$' },
          { label: 'Settled Ledger Count', value: settledCount, color: 'text-accent', prefix: '' },
        ].map((m, i) => (
          <div key={i} className="p-4 sm:p-5 flex flex-col justify-center items-center sm:items-start text-center sm:text-left hover:bg-surface/50 transition-colors border-border/10">
            <span className="text-[9px] font-black text-muted/60 uppercase tracking-[0.2em] mb-1">{m.label}</span>
            <div className="flex items-baseline gap-2">
               <span className={`text-sm sm:text-lg lg:text-xl font-mono font-black tracking-tighter ${m.color}`}>
                  <AnimatedNumber value={Math.abs(m.value)} prefix={m.prefix} />
               </span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Main Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/50">
        <div>
          <h3 className="text-2xl sm:text-3xl font-display font-black text-ink uppercase tracking-tighter">Debt Registry</h3>
          <p className="text-[10px] font-black text-muted/40 uppercase tracking-[0.2em] mt-1">
            Audit and reconcile outstanding peer accounts
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-surface-subtle/50 px-4 py-2 rounded-full border border-border focus-within:border-accent/40 transition-all w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-muted" />
            <input
              type="text"
              placeholder="Search counterparty..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-ink w-full placeholder:text-muted/60 font-bold"
            />
          </div>
          
          <button 
            onClick={handleOpenAddModal} 
            className="precise-button !px-6 !py-2.5 flex items-center gap-2 flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase font-black tracking-widest">Add Loan</span>
          </button>
        </div>
      </div>

      {/* 4. Columns: Split Receivables and Payables Ledgers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10">
        
        {/* COLUMN A: LENT (Gave to people - others owe me) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
              <h4 className="text-base font-black text-ink uppercase tracking-tight">Receivables (Gave to People)</h4>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-mono font-black">
              ${totalLent.toLocaleString()} Pending
            </span>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredLoans.filter(l => l.type === 'lent').length > 0 ? (
                filteredLoans.filter(l => l.type === 'lent').map((loan, idx) => (
                  <LoanItemCard
                    key={loan.id}
                    loan={loan}
                    index={idx}
                    onToggle={onToggleStatus}
                    onEdit={handleOpenEditModal}
                    onDelete={setLoanToDelete}
                    formatDate={formatDateSafely}
                  />
                ))
              ) : (
                <EmptyState icon={Coins} text={searchTerm ? "No counterparty match" : "No pending receivables logged"} />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* COLUMN B: BORROWED (Have to give - I owe others) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-alert shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
              <h4 className="text-base font-black text-ink uppercase tracking-tight">Payables (Have to Give)</h4>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-alert/10 text-alert text-[10px] font-mono font-black">
              ${totalBorrowed.toLocaleString()} Pending
            </span>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredLoans.filter(l => l.type === 'borrowed').length > 0 ? (
                filteredLoans.filter(l => l.type === 'borrowed').map((loan, idx) => (
                  <LoanItemCard
                    key={loan.id}
                    loan={loan}
                    index={idx}
                    onToggle={onToggleStatus}
                    onEdit={handleOpenEditModal}
                    onDelete={setLoanToDelete}
                    formatDate={formatDateSafely}
                  />
                ))
              ) : (
                <EmptyState icon={Scale} text={searchTerm ? "No counterparty match" : "No pending payables logged"} />
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* 5. Logging / Editing Modal */}
      <LogLoanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={onAddLoan}
        onUpdate={onEditLoan}
        editingLoan={editingLoan}
      />

      {/* 6. Delete Confirmation Modal */}
      <AnimatePresence>
        {loanToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLoanToDelete(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="relative bg-surface w-full max-w-xs rounded-[32px] shadow-2xl border border-white/10 p-10 text-center">
              <div className="w-16 h-16 bg-alert/20 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 className="w-6 h-6 text-alert" /></div>
              <h3 className="text-2xl font-display font-black text-ink mb-2 uppercase tracking-tight">Delete Loan?</h3>
              <p className="text-muted text-[11px] mb-8 font-bold tracking-widest">IRREVERSIBLE ACTION</p>
              <div className="flex gap-4">
                <button onClick={() => setLoanToDelete(null)} className="flex-1 py-3 bg-white/5 border border-white/5 rounded-full font-bold text-[9px] uppercase tracking-widest text-muted">Cancel</button>
                <button onClick={() => { onDeleteLoan(loanToDelete); setLoanToDelete(null); }} className="flex-1 py-3 bg-alert text-white rounded-full font-bold text-[9px] uppercase tracking-widest shadow-2xl shadow-alert/30">Confirm</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Compact Sub-component for Loan List Cards
interface LoanItemCardProps {
  loan: Loan;
  index: number;
  onToggle: (id: string, cur: 'pending' | 'settled') => void;
  onEdit: (loan: Loan) => void;
  onDelete: (id: string) => void;
  formatDate: (str?: string) => string;
}

function LoanItemCard({ loan: l, onToggle, onEdit, onDelete, formatDate }: LoanItemCardProps) {
  const isSettled = l.status === 'settled';
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`glass-card p-4 sm:p-5 flex items-center justify-between gap-4 border transition-all relative overflow-hidden ${
        isSettled 
          ? 'opacity-50 bg-black/[0.02] border-border line-through' 
          : 'bg-white/[0.01] hover:bg-black/[0.01]'
      }`}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Settlement Check Box Toggle */}
        <button 
          onClick={() => onToggle(l.id, l.status)}
          className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
            isSettled 
              ? 'bg-success border-success text-white' 
              : 'border-border hover:border-accent'
          }`}
          aria-label={isSettled ? "Mark as active" : "Mark as settled"}
        >
          {isSettled ? <RotateCcw className="w-3.5 h-3.5" /> : <Check className="w-4 h-4 opacity-0 hover:opacity-100 transition-opacity text-accent" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className={`text-sm sm:text-base font-black text-ink leading-none truncate ${isSettled ? 'text-muted' : ''}`}>
              {l.personName}
            </span>
            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest leading-none ${
              isSettled 
                ? 'bg-muted/10 text-muted' 
                : l.type === 'lent' 
                ? 'bg-success/10 text-success' 
                : 'bg-alert/10 text-alert'
            }`}>
              {isSettled ? 'Settled' : 'Active'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-muted text-[10px]">
            {l.notes && (
              <>
                <span className="truncate max-w-[140px] sm:max-w-[200px] font-semibold">{l.notes}</span>
                <span className="w-1 h-1 bg-white/10 rounded-full" />
              </>
            )}
            {l.dueDate && (
              <span className="flex items-center gap-1 font-mono">
                <Calendar className="w-3 h-3 text-muted/60" />
                Due {formatDate(l.dueDate)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <span className={`text-base sm:text-lg font-mono font-black tabular-nums ${
          isSettled 
            ? 'text-muted' 
            : l.type === 'lent' 
            ? 'text-success' 
            : 'text-alert'
        }`}>
          ${l.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => onEdit(l)} 
            className="p-2 text-muted hover:text-accent transition-colors"
            title="Edit record"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onDelete(l.id)} 
            className="p-2 text-muted hover:text-alert transition-colors"
            title="Delete record"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Compact Sub-component for Empty State
function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="p-8 sm:p-12 text-center rounded-[28px] border border-dashed border-border/40 bg-surface-subtle/10" role="status">
      <Icon className="w-6 h-6 mx-auto text-muted/30 mb-3" />
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted/50">{text}</p>
    </div>
  );
}
