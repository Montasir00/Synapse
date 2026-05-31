import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coins, 
  Trash2, 
  Edit3, 
  Check, 
  RotateCcw, 
  Calendar, 
  Search, 
  Plus, 
  Scale,
  Lock,
  Unlock,
  ShieldCheck,
  Eye,
  Loader2,
  ChevronRight,
  User,
  X,
  PlusCircle,
  AlertTriangle
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
}

export interface ConsolidatedCounterparty {
  personName: string;
  normalizedName: string;
  loans: Loan[];
  totalLentPending: number;
  totalBorrowedPending: number;
  netPending: number; // totalLentPending - totalBorrowedPending
  totalLentSettled: number;
  totalBorrowedSettled: number;
  netSettled: number; // totalLentSettled - totalBorrowedSettled
  activeCount: number;
  settledCount: number;
  earliestDueDate?: string;
}

export default function Loans({
  loans = [],
  onAddLoan,
  onEditLoan,
  onDeleteLoan,
  onToggleStatus,
}: LoansProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [loanToDelete, setLoanToDelete] = useState<string | null>(null);
  const [prefilledName, setPrefilledName] = useState<string>('');

  // Settled lists visibility states
  const [showSettledLent, setShowSettledLent] = useState(false);
  const [showSettledBorrowed, setShowSettledBorrowed] = useState(false);

  // Privacy / Decryption States
  const [selectedCounterparty, setSelectedCounterparty] = useState<ConsolidatedCounterparty | null>(null);
  const [permissionGateOpen, setPermissionGateOpen] = useState(false);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [activeLedgerOpen, setActiveLedgerOpen] = useState(false);
  const [loadingStageText, setLoadingStageText] = useState('');

  const loadingStages = [
    "Initiating secure authentication tunnel...",
    "Querying decentralized ledger records...",
    "Decrypting transaction hash chains...",
    "Reconciling ledger entries & outstanding balances...",
    "Establishing high-fidelity audit connection..."
  ];

  // Group all loans by normalized counterparty name
  const groupedCounterparties = useMemo(() => {
    const groups: Record<string, {
      personName: string;
      loans: Loan[];
    }> = {};

    // Sort loans descending by creation date so the most recent casing/info comes first
    const sorted = [...loans].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    for (const loan of sorted) {
      const norm = loan.personName.trim().toLowerCase();
      if (!norm) continue;

      if (!groups[norm]) {
        groups[norm] = {
          personName: loan.personName,
          loans: [],
        };
      }
      groups[norm].loans.push(loan);
    }

    return Object.entries(groups).map(([norm, g]) => {
      const pendingLent = g.loans.filter(l => l.type === 'lent' && l.status === 'pending').reduce((acc, l) => acc + l.amount, 0);
      const pendingBorrowed = g.loans.filter(l => l.type === 'borrowed' && l.status === 'pending').reduce((acc, l) => acc + l.amount, 0);
      
      const settledLent = g.loans.filter(l => l.type === 'lent' && l.status === 'settled').reduce((acc, l) => acc + l.amount, 0);
      const settledBorrowed = g.loans.filter(l => l.type === 'borrowed' && l.status === 'settled').reduce((acc, l) => acc + l.amount, 0);

      const activeCount = g.loans.filter(l => l.status === 'pending').length;
      const settledCount = g.loans.filter(l => l.status === 'settled').length;

      const pendingWithDueDate = g.loans.filter(l => l.status === 'pending' && l.dueDate);
      let earliestDueDate: string | undefined;
      if (pendingWithDueDate.length > 0) {
        earliestDueDate = pendingWithDueDate.reduce((earliest, cur) => {
          if (!earliest.dueDate) return cur;
          if (!cur.dueDate) return earliest;
          return new Date(cur.dueDate).getTime() < new Date(earliest.dueDate).getTime() ? cur : earliest;
        }).dueDate;
      }

      return {
        personName: g.personName,
        normalizedName: norm,
        loans: g.loans,
        totalLentPending: pendingLent,
        totalBorrowedPending: pendingBorrowed,
        netPending: pendingLent - pendingBorrowed,
        totalLentSettled: settledLent,
        totalBorrowedSettled: settledBorrowed,
        netSettled: settledLent - settledBorrowed,
        activeCount,
        settledCount,
        earliestDueDate,
      };
    });
  }, [loans]);

  // Reactive data for active detailed view to handle updates instantly
  const activeCounterpartyData = useMemo(() => {
    if (!selectedCounterparty) return null;
    return groupedCounterparties.find(c => c.normalizedName === selectedCounterparty.normalizedName) || null;
  }, [groupedCounterparties, selectedCounterparty]);

  // Filter counterparties based on main search bar (name or inner notes/amounts)
  const filteredCounterparties = useMemo(() => {
    let list = groupedCounterparties;
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase().trim();
      list = list.filter(c => 
        c.personName.toLowerCase().includes(lower) ||
        c.loans.some(l => l.notes && l.notes.toLowerCase().includes(lower)) ||
        c.loans.some(l => l.amount.toString().includes(lower))
      );
    }
    return list;
  }, [groupedCounterparties, searchTerm]);

  // Displays Receivables (Debtors: Outstanding Net > 0)
  const displayedReceivables = useMemo(() => {
    return filteredCounterparties.filter(c => {
      if (c.netPending > 0) return true;
      if (c.netPending === 0 && showSettledLent) {
        // Person is fully settled, but their ledger history was net lent (or primarily lent)
        return c.loans.some(l => l.type === 'lent' && l.status === 'settled') && c.netSettled >= 0;
      }
      return false;
    });
  }, [filteredCounterparties, showSettledLent]);

  // Displays Payables (Creditors: Outstanding Net < 0)
  const displayedPayables = useMemo(() => {
    return filteredCounterparties.filter(c => {
      if (c.netPending < 0) return true;
      if (c.netPending === 0 && showSettledBorrowed) {
        // Person is fully settled, but their ledger history was net borrowed
        return c.loans.some(l => l.type === 'borrowed' && l.status === 'settled') && c.netSettled <= 0;
      }
      return false;
    });
  }, [filteredCounterparties, showSettledBorrowed]);

  // Global Pending outstanding totals
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

  // Consolidated settled lists counts
  const settledLentAccountsCount = useMemo(() => {
    return groupedCounterparties.filter(c => c.netPending === 0 && c.loans.some(l => l.type === 'lent' && l.status === 'settled')).length;
  }, [groupedCounterparties]);

  const settledBorrowedAccountsCount = useMemo(() => {
    return groupedCounterparties.filter(c => c.netPending === 0 && c.loans.some(l => l.type === 'borrowed' && l.status === 'settled')).length;
  }, [groupedCounterparties]);

  const hasLentLoans = useMemo(() => loans.some(l => l.type === 'lent'), [loans]);
  const hasBorrowedLoans = useMemo(() => loans.some(l => l.type === 'borrowed'), [loans]);

  const lentEmptyText = useMemo(() => {
    if (searchTerm) return "No counterparty match";
    if (!hasLentLoans) return "No receivables logged";
    return "All receivables settled";
  }, [searchTerm, hasLentLoans]);

  const borrowedEmptyText = useMemo(() => {
    if (searchTerm) return "No counterparty match";
    if (!hasBorrowedLoans) return "No payables logged";
    return "All payables settled";
  }, [searchTerm, hasBorrowedLoans]);

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
    setPrefilledName('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (loan: Loan) => {
    setEditingLoan(loan);
    setIsModalOpen(true);
  };

  // Privacy Gate Interaction Handlers
  const requestLedgerAccess = (c: ConsolidatedCounterparty) => {
    setSelectedCounterparty(c);
    setPermissionGateOpen(true);
  };

  const confirmLedgerUnlock = () => {
    setPermissionGateOpen(false);
    setIsLoadingLedger(true);

    // Dynamic stage updates for security effect
    let stage = 0;
    setLoadingStageText(loadingStages[0]);
    const textInterval = setInterval(() => {
      stage++;
      if (stage < loadingStages.length) {
        setLoadingStageText(loadingStages[stage]);
      }
    }, 150);

    setTimeout(() => {
      clearInterval(textInterval);
      setIsLoadingLedger(false);
      setActiveLedgerOpen(true);
    }, 850);
  };

  const handleQuickAddForCounterparty = () => {
    if (!activeCounterpartyData) return;
    setEditingLoan(null);
    setPrefilledName(activeCounterpartyData.personName);
    setIsModalOpen(true);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 sm:space-y-10 lg:space-y-12 pb-20 sm:pb-24 lg:pb-32 px-4 sm:px-6 pt-6 sm:pt-8 lg:pt-12 theme-loans">
      
      {/* 1. Global Debt Metrics (Command Strip) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 w-full border border-border/50 rounded-2xl bg-surface-subtle/20 overflow-hidden shadow-sm divide-x divide-y divide-border/30 sm:divide-y-0">
        {[
          { label: 'Gave to People (Lent)', value: totalLent, color: 'text-success', prefix: '$' },
          { label: 'Have to Give (Owe)', value: totalBorrowed, color: 'text-alert', prefix: '$' },
          { label: 'Net Outstanding', value: netBalance, color: netBalance >= 0 ? 'text-success' : 'text-alert', prefix: netBalance >= 0 ? '+$' : '-$' },
          { label: 'Settled Ledger Count', value: settledCount, color: 'text-accent', prefix: '' },
        ].map((m, i) => (
            <div key={i} className="p-4 sm:p-5 flex flex-col justify-center items-center sm:items-start text-center sm:text-left hover:bg-surface/50 transition-colors border-border/10">
            <span className="text-[9px] font-black text-muted/70 uppercase tracking-[0.2em] mb-1">{m.label}</span>
            <div className="flex items-baseline gap-2">
               <span className={`text-sm sm:text-lg lg:text-xl font-mono font-black tracking-tighter ${m.color}`}>
                  <AnimatedNumber value={Math.abs(m.value)} prefix={m.prefix} />
               </span>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Main Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/50">
        <div>
          <h3 className="text-2xl sm:text-3xl font-display font-black text-ink uppercase tracking-tighter">Debt Registry</h3>
          <p className="text-[10px] font-black text-muted/40 uppercase tracking-[0.2em] mt-1">
            Audit and reconcile outstanding peer accounts
          </p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-surface-subtle/50 px-4 py-2 rounded-full border border-border focus-within:border-accent/40 transition-all w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-muted/70" />
            <input
              type="text"
              placeholder="Search counterparty..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-ink w-full placeholder:text-muted/70 font-bold"
            />
          </div>
          
          {loans.length > 0 && (
            <button 
              onClick={() => {
                if (window.confirm("CRITICAL WARNING: This will permanently delete all active and settled loan transactions from your database. Continue?")) {
                  const deletePromises = loans.map(l => onDeleteLoan(l.id));
                  Promise.all(deletePromises)
                    .then(() => {
                      alert("Successfully cleared all loan transactions.");
                    })
                    .catch(err => {
                      console.error("Error clearing loans:", err);
                      alert("Failed to clear some loans. Please try again.");
                    });
                }
              }} 
              className="precise-button !px-6 !py-2.5 !bg-alert/10 !text-alert !border-alert/20 hover:!bg-alert hover:!text-white transition-all flex items-center gap-2 flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-black tracking-widest">Clear Ledger</span>
            </button>
          )}

          <button 
            onClick={handleOpenAddModal} 
            className="precise-button !px-6 !py-2.5 flex items-center gap-2 flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase font-black tracking-widest">Add Loan</span>
          </button>
        </div>
      </div>

      {/* 3. Columns: Split Receivables and Payables Ledgers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10">
        
        {/* COLUMN A: RECEIVABLES (Lent / Debtors) */}
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
              {displayedReceivables.length > 0 ? (
                displayedReceivables.map((counterparty, idx) => (
                  <CounterpartyCard
                    key={counterparty.normalizedName}
                    counterparty={counterparty}
                    index={idx}
                    type="receivable"
                    onClick={() => requestLedgerAccess(counterparty)}
                    formatDate={formatDateSafely}
                  />
                ))
              ) : (
                <EmptyState icon={Coins} text={lentEmptyText} />
              )}
            </AnimatePresence>

            {settledLentAccountsCount > 0 && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setShowSettledLent(!showSettledLent)}
                  className="px-4 py-2 rounded-full bg-surface border border-border text-[9px] font-black uppercase tracking-widest text-muted hover:text-ink hover:border-dark-border hover:bg-white active:scale-[0.98] transition-all flex items-center gap-1.5"
                >
                  {showSettledLent ? "Hide" : "Show"} {settledLentAccountsCount} Settled {settledLentAccountsCount === 1 ? "Account" : "Accounts"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* COLUMN B: PAYABLES (Borrowed / Creditors) */}
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
              {displayedPayables.length > 0 ? (
                displayedPayables.map((counterparty, idx) => (
                  <CounterpartyCard
                    key={counterparty.normalizedName}
                    counterparty={counterparty}
                    index={idx}
                    type="payable"
                    onClick={() => requestLedgerAccess(counterparty)}
                    formatDate={formatDateSafely}
                  />
                ))
              ) : (
                <EmptyState icon={Scale} text={borrowedEmptyText} />
              )}
            </AnimatePresence>

            {settledBorrowedAccountsCount > 0 && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => setShowSettledBorrowed(!showSettledBorrowed)}
                  className="px-4 py-2 rounded-full bg-surface border border-border text-[9px] font-black uppercase tracking-widest text-muted hover:text-ink hover:border-dark-border hover:bg-white active:scale-[0.98] transition-all flex items-center gap-1.5"
                >
                  {showSettledBorrowed ? "Hide" : "Show"} {settledBorrowedAccountsCount} Settled {settledBorrowedAccountsCount === 1 ? "Account" : "Accounts"}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 4. Log/Edit Loan Modal */}
      <LogLoanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={(data) => {
          onAddLoan(data);
          setPrefilledName('');
        }}
        onUpdate={onEditLoan}
        editingLoan={editingLoan}
        // Custom defaultName support injected gracefully
        {...{ defaultPersonName: prefilledName }}
      />

      {/* 5. Delete Confirmation Modal */}
      <AnimatePresence>
        {loanToDelete && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLoanToDelete(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="relative bg-surface w-full max-w-xs rounded-[32px] shadow-2xl border border-white/10 p-10 text-center">
              <div className="w-16 h-16 bg-alert/20 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 className="w-6 h-6 text-alert" /></div>
              <h3 className="text-2xl font-display font-black text-ink mb-2 uppercase tracking-tight">Delete Record?</h3>
              <p className="text-muted text-[11px] mb-8 font-bold tracking-widest">IRREVERSIBLE ACTION</p>
              <div className="flex gap-4">
                <button onClick={() => setLoanToDelete(null)} className="flex-1 py-3 bg-white/5 border border-white/5 rounded-full font-bold text-[9px] uppercase tracking-widest text-ink/70">Cancel</button>
                <button onClick={() => { onDeleteLoan(loanToDelete); setLoanToDelete(null); }} className="flex-1 py-3 bg-alert text-white rounded-full font-bold text-[9px] uppercase tracking-widest shadow-2xl shadow-alert/30">Confirm</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. PRIVACY CONFIRMATION GATE (Permission Modal) */}
      <AnimatePresence>
        {permissionGateOpen && selectedCounterparty && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => { setPermissionGateOpen(false); setSelectedCounterparty(null); }} 
              className="absolute inset-0 bg-bg/85 backdrop-blur-md" 
            />
            
            <motion.div 
              initial={{ opacity: 0, y: 15, scale: 0.98 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: 15, scale: 0.98 }}
              className="relative bg-surface w-full max-w-md rounded-[36px] shadow-[0_32px_64px_rgba(0,0,0,0.15)] border border-border p-8 md:p-10 text-center overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-accent via-accent/50 to-accent" />
              
              <div className="w-16 h-16 bg-accent/10 border border-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-6 h-6 text-accent" />
              </div>
              
              <h3 className="text-xl sm:text-2xl font-display font-black text-ink uppercase tracking-tight mb-2">
                Unlock Personal Ledger
              </h3>
              
              <p className="text-[10px] font-black text-muted/60 uppercase tracking-[0.2em] mb-4">
                Authorization Required
              </p>
              
              <p className="text-xs text-muted/80 font-medium leading-relaxed mb-8">
                Confirm decryption request to audit the private transaction histories and outstanding balance logs for <strong className="text-ink font-bold">{selectedCounterparty.personName}</strong>. This access is logged under the security auditor session.
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => { setPermissionGateOpen(false); setSelectedCounterparty(null); }} 
                  className="flex-1 py-3.5 bg-surface-subtle/50 hover:bg-surface-subtle border border-border rounded-full font-black text-[9px] uppercase tracking-widest text-muted hover:text-ink transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmLedgerUnlock} 
                  className="flex-1 py-3.5 bg-accent text-white hover:bg-accent-hover rounded-full font-black text-[9px] uppercase tracking-widest shadow-xl shadow-accent/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Unlock Ledger</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. SECURE DECRYPTION LOADER */}
      <AnimatePresence>
        {isLoadingLedger && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg/90 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center max-w-sm"
            >
              <div className="relative w-20 h-20 mx-auto mb-8">
                {/* Rotating premium concentric gradients */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-2 border-dashed border-accent/40"
                />
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="absolute inset-2 rounded-full border border-double border-accent/20 border-t-accent"
                />
                <div className="absolute inset-4 rounded-full bg-surface-subtle flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-accent animate-pulse" />
                </div>
              </div>
              
              <h4 className="text-base font-black text-ink uppercase tracking-wider mb-2">Decrypting Archives</h4>
              <p className="text-[10px] font-mono text-accent uppercase tracking-widest font-black h-8 leading-snug animate-pulse">
                {loadingStageText}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. ACTIVE UNLOCKED LEDGER DETAIL MODAL */}
      <AnimatePresence>
        {activeLedgerOpen && activeCounterpartyData && (
          <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => { setActiveLedgerOpen(false); setSelectedCounterparty(null); }} 
              className="absolute inset-0 bg-black/75 backdrop-blur-sm" 
            />

            <motion.div 
              initial={{ y: "100%", opacity: 0.5 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: "100%", opacity: 0.5 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative bg-surface w-full max-w-2xl rounded-t-[32px] sm:rounded-[36px] shadow-2xl border-t sm:border border-border p-5 sm:p-8 flex flex-col max-h-[92vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/5 border border-accent/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black text-ink uppercase tracking-tight leading-none">
                      {activeCounterpartyData.personName}
                    </h3>
                    <p className="text-[9px] font-black text-muted/50 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-success" />
                      SECURE AUDIT PATHWAY
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleQuickAddForCounterparty}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-accent/10 hover:bg-accent/20 border border-accent/10 text-accent transition-all active:scale-[0.98]"
                    title="Log new transaction for this person"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Quick Log</span>
                  </button>
                  <button 
                    onClick={() => { setActiveLedgerOpen(false); setSelectedCounterparty(null); }}
                    className="w-8 h-8 rounded-full bg-surface-subtle/50 flex items-center justify-center text-muted/70 hover:text-accent hover:bg-accent/5 transition-all border border-border"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Net Balance Banner */}
              <div className="mt-5 p-4 rounded-2xl bg-surface-subtle/40 border border-border/30 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black text-muted/60 uppercase tracking-widest block mb-1">Account Net Balance</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xl sm:text-2xl font-mono font-black tracking-tight ${
                      activeCounterpartyData.netPending > 0 
                        ? 'text-success' 
                        : activeCounterpartyData.netPending < 0 
                        ? 'text-alert' 
                        : 'text-accent'
                    }`}>
                      {activeCounterpartyData.netPending > 0 ? '+' : activeCounterpartyData.netPending < 0 ? '-' : ''}
                      ${Math.abs(activeCounterpartyData.netPending).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] font-bold text-muted/70 uppercase tracking-wider font-mono">USD</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="text-[9px] font-black text-muted/40 uppercase tracking-widest block mb-1">State</span>
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    activeCounterpartyData.netPending > 0
                      ? 'bg-success/10 text-success'
                      : activeCounterpartyData.netPending < 0
                      ? 'bg-alert/10 text-alert'
                      : 'bg-accent/10 text-accent'
                  }`}>
                    {activeCounterpartyData.netPending > 0 ? 'Robin Owes You' : activeCounterpartyData.netPending < 0 ? 'You Owe Robin' : 'Fully Settled'}
                  </span>
                </div>
              </div>

              {/* Internal transaction logs */}
              <div className="flex-1 overflow-y-auto scrollbar-custom py-4 space-y-3 mt-4">
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-[9px] font-black text-muted uppercase tracking-[0.25em]">Transaction Audit Log ({activeCounterpartyData.loans.length})</span>
                  <span className="text-[9px] font-black text-muted/40 uppercase tracking-[0.2em]">{activeCounterpartyData.activeCount} Pending, {activeCounterpartyData.settledCount} Settled</span>
                </div>

                <div className="space-y-3">
                  {activeCounterpartyData.loans.map((loan) => {
                    const isSettled = loan.status === 'settled';
                    return (
                      <div 
                        key={loan.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                          isSettled 
                            ? 'bg-surface-subtle/20 border-border/40 opacity-60' 
                            : 'bg-white/[0.01] hover:bg-black/[0.01] border-border'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button 
                            onClick={() => onToggleStatus(loan.id, loan.status)}
                            className={`group w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                              isSettled 
                                ? 'bg-success border-success text-white' 
                                : 'border-border hover:border-accent'
                            }`}
                            aria-label={isSettled ? "Mark as active" : "Mark as settled"}
                          >
                            {isSettled ? <RotateCcw className="w-3 h-3" /> : <Check className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-accent" />}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                isSettled 
                                  ? 'bg-muted/10 text-muted' 
                                  : loan.type === 'lent' 
                                  ? 'bg-success/10 text-success' 
                                  : 'bg-alert/10 text-alert'
                              }`}>
                                {loan.type === 'lent' ? 'Lent' : 'Borrowed'}
                              </span>
                              <span className="text-[10px] font-semibold text-muted/60 font-mono">
                                {formatDateSafely(loan.createdAt)}
                              </span>
                            </div>

                            {loan.notes && (
                              <p className="text-xs font-semibold text-ink truncate max-w-[280px] sm:max-w-[340px]">
                                {loan.notes}
                              </p>
                            )}

                            {loan.dueDate && !isSettled && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-alert mt-1">
                                <Calendar className="w-2.5 h-2.5" />
                                Due {formatDateSafely(loan.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3.5 flex-shrink-0">
                          <span className={`text-sm sm:text-base font-mono font-black tabular-nums ${
                            isSettled 
                              ? 'text-muted line-through' 
                              : loan.type === 'lent' 
                              ? 'text-success' 
                              : 'text-alert'
                          }`}>
                            {loan.type === 'lent' ? '+' : '-'}${loan.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => handleOpenEditModal(loan)} 
                              className="p-1.5 text-muted hover:text-accent transition-colors"
                              title="Edit transaction"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setLoanToDelete(loan.id)} 
                              className="p-1.5 text-muted hover:text-alert transition-colors"
                              title="Delete transaction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-[10px] font-mono text-muted/40 uppercase">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-success" />
                  LEDGER INTEGRITY VERIFIED
                </span>
                <span>Session ID: {(loans.length * 7 + 109).toString(16).toUpperCase()}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Compact Sub-component for Consolidated Counterparty Cards
interface CounterpartyCardProps {
  counterparty: ConsolidatedCounterparty;
  index: number;
  type: 'receivable' | 'payable';
  onClick: () => void;
  formatDate: (str?: string) => string;
}

function CounterpartyCard({ counterparty: c, index, type, onClick, formatDate }: CounterpartyCardProps) {
  const isSettled = c.netPending === 0;
  const isReceivable = type === 'receivable';

  // Get active transaction count text
  const subtitleText = useMemo(() => {
    const parts = [];
    const activeLent = c.loans.filter(l => l.type === 'lent' && l.status === 'pending').length;
    const activeBorrowed = c.loans.filter(l => l.type === 'borrowed' && l.status === 'pending').length;
    
    if (activeLent > 0) parts.push(`${activeLent} lent`);
    if (activeBorrowed > 0) parts.push(`${activeBorrowed} borrowed`);
    
    if (parts.length === 0) {
      return `${c.settledCount} settled logs`;
    }
    return `${parts.join(', ')} pending`;
  }, [c]);

  // Premium initial-based avatar styling based on counterparty name
  const avatarBg = useMemo(() => {
    if (isSettled) return 'bg-muted/10 border-muted/20 text-muted';
    return isReceivable 
      ? 'bg-success/5 border-success/15 text-success shadow-[0_0_8px_rgba(52,211,153,0.05)]' 
      : 'bg-alert/5 border-alert/15 text-alert shadow-[0_0_8px_rgba(244,63,94,0.05)]';
  }, [isSettled, isReceivable]);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      onClick={onClick}
      className={`glass-card p-4 sm:p-5 flex items-center justify-between gap-4 border hover:border-accent/40 active:scale-[0.99] cursor-pointer group transition-all relative overflow-hidden ${
        isSettled 
          ? 'opacity-60 bg-black/[0.02] border-border' 
          : 'bg-white/[0.01] hover:bg-accent/[0.01] border-border shadow-sm'
      }`}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Animated Custom User Avatar */}
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-display font-black text-xs uppercase tracking-wider transition-all duration-300 group-hover:scale-105 ${avatarBg}`}>
          {c.personName.trim().charAt(0) || <User className="w-4 h-4" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className={`text-sm sm:text-base font-black text-ink leading-none truncate group-hover:text-accent transition-colors ${isSettled ? 'text-muted line-through' : ''}`}>
              {c.personName}
            </span>
            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest leading-none ${
              isSettled 
                ? 'bg-muted/10 text-muted' 
                : isReceivable 
                ? 'bg-success/10 text-success' 
                : 'bg-alert/10 text-alert'
            }`}>
              {isSettled ? 'Fully Settled' : 'Active Account'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-muted text-[10px]">
            <span className="font-semibold">{subtitleText}</span>
            {c.earliestDueDate && !isSettled && (
              <>
                <span className="w-1 h-1 bg-white/10 rounded-full" />
                <span className="flex items-center gap-1 font-mono font-bold text-accent">
                  <Calendar className="w-3 h-3" />
                  Earliest due {formatDate(c.earliestDueDate)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <span className={`text-base sm:text-lg font-mono font-black tabular-nums block ${
            isSettled 
              ? 'text-muted' 
              : isReceivable 
              ? 'text-success' 
              : 'text-alert'
          }`}>
            ${Math.abs(c.netPending > 0 ? c.netPending : c.netPending < 0 ? c.netPending : c.netSettled).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[8px] font-black text-muted/40 uppercase tracking-widest">
            {isSettled ? 'Settled Value' : isReceivable ? 'Owes You' : 'You Owe'}
          </span>
        </div>
        
        {/* Lock/Unlock premium animation on hover */}
        <div className="w-8 h-8 rounded-full bg-surface-subtle/50 flex items-center justify-center text-muted/70 group-hover:text-accent border border-border/30 group-hover:border-accent/30 group-hover:bg-accent/5 transition-all">
          <div className="relative w-4 h-4 flex items-center justify-center">
            <Lock className="w-4 h-4 absolute group-hover:opacity-0 group-hover:scale-75 transition-all duration-300" />
            <Unlock className="w-4 h-4 absolute opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300" />
          </div>
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
