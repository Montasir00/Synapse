import React, { useState, useRef, useEffect } from 'react';
import { X, Calendar, User, FileText, Plus, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Loan } from '../types';
import { haptics } from '../utils/haptics';

interface LogLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (loan: Omit<Loan, 'id' | 'uid'>) => void | Promise<void>;
  onUpdate?: (id: string, updates: Partial<Loan>) => void | Promise<void>;
  editingLoan?: Loan | null;
  defaultPersonName?: string;
}

export default function LogLoanModal({ 
  isOpen, 
  onClose, 
  onAdd, 
  onUpdate,
  editingLoan,
  defaultPersonName = '',
}: LogLoanModalProps) {
  const [amount, setAmount] = useState('');
  const [personName, setPersonName] = useState('');
  const [type, setType] = useState<'lent' | 'borrowed'>('lent');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const parsedAmount = parseFloat(amount);
  const amountError = submitAttempted && (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0);
  const nameError = submitAttempted && !personName.trim();

  useEffect(() => {
    if (editingLoan) {
      setAmount(editingLoan.amount.toString());
      setPersonName(editingLoan.personName);
      setType(editingLoan.type);
      setDueDate(editingLoan.dueDate || '');
      setNotes(editingLoan.notes || '');
    } else {
      setAmount('');
      setPersonName(defaultPersonName);
      setType('lent');
      setDueDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
    setSubmitAttempted(false);
    setIsSubmitting(false);
  }, [editingLoan, isOpen, defaultPersonName]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusFirstElement = () => {
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      focusable[0]?.focus();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!dialogRef.current) return;

      if (event.key === 'Escape' && !isSubmitting) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const timer = window.setTimeout(focusFirstElement, 0);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, isSubmitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (amountError || nameError) {
      haptics.error();
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);

    const loanData = {
      amount: parsedAmount,
      personName: personName.trim(),
      type: type,
      status: (editingLoan ? editingLoan.status : 'pending') as 'pending' | 'settled',
      dueDate: dueDate || null,
      notes: notes.trim() || null,
      createdAt: editingLoan ? editingLoan.createdAt : new Date().toISOString()
    };

    try {
      if (editingLoan && onUpdate) {
        await onUpdate(editingLoan.id, loanData);
      } else {
        await onAdd(loanData);
      }
      onClose();
    } catch (error) {
      console.error("Submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-label={editingLoan ? 'Edit loan' : 'Add loan'}>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-bg/80 backdrop-blur-xl"
          />
          
          <motion.div 
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative bg-surface w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden rounded-[42px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-border"
          >
            {/* Glossy Header Overlay */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none z-10" />

            <div className="relative flex-1 overflow-y-auto scrollbar-custom p-4 sm:p-8">
              {/* Header */}
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-3 h-3 rounded-full bg-accent animate-ping absolute inset-0" />
                    <div className="w-3 h-3 rounded-full bg-accent relative" />
                  </div>
                  <span className="text-xs font-black text-ink uppercase tracking-[0.25em]">Debt Ledger Synchronization</span>
                </div>
                  <button 
                    onClick={() => !isSubmitting && onClose()}
                    className="w-10 h-10 rounded-full bg-surface-subtle/50 flex items-center justify-center text-muted/70 hover:text-accent hover:bg-accent/5 transition-all border border-border"
                  >
                    <X className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>

                {/* Type Switcher */}
                <div className="flex p-1.5 bg-surface-subtle/50 rounded-full mb-10 border border-border backdrop-blur-sm">
                  <button 
                    type="button"
                    onClick={() => { setType('lent'); haptics.light(); }}
                    className={`flex-1 py-3 text-center rounded-full text-xs font-black uppercase tracking-widest transition-all ${type === 'lent' ? 'bg-surface text-ink shadow-sm border border-border' : 'text-muted hover:text-ink'}`}
                  >
                    Lent (Gave to)
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setType('borrowed'); haptics.light(); }}
                    className={`flex-1 py-3 text-center rounded-full text-xs font-black uppercase tracking-widest transition-all ${type === 'borrowed' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted hover:text-ink'}`}
                  >
                    Borrowed (Owe)
                  </button>
              </div>

              <form className="space-y-10" onSubmit={handleSubmit}>
                {/* Hero Amount Field */}
                <div className="space-y-4 group">
                  <div className="flex justify-between items-end px-1">
                    <label htmlFor="loan-amount" className="text-xs font-black text-muted/70 uppercase tracking-[0.2em]">Principal Value</label>
                    <div className="flex items-center gap-1.5 text-accent">
                      <Sparkles className="w-3 h-3" />
                      <span className="text-xs font-bold uppercase tracking-widest">Precision Entry</span>
                    </div>
                  </div>
                  
                  <div className={`relative flex items-center p-5 sm:p-8 bg-surface-subtle/30 rounded-[32px] border-2 transition-all duration-300 ${amountError ? 'border-alert/50' : 'border-border group-focus-within:border-accent group-focus-within:bg-accent/[0.02]'}`}>
                    <span className={`text-3xl sm:text-5xl font-mono font-bold mr-2 ${type === 'lent' ? 'text-success' : 'text-ink'}`}>
                      {type === 'lent' ? '+' : '-'}
                    </span>
                    <input 
                      id="loan-amount"
                      type="number" 
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      onBlur={() => setSubmitAttempted(true)}
                      placeholder="0.00" 
                      className={`w-full bg-transparent text-4xl sm:text-5xl font-mono font-bold tabular-nums outline-none transition-colors placeholder:text-muted/30 ${type === 'lent' ? 'text-success' : 'text-ink'}`}
                      inputMode="decimal"
                      required
                      autoFocus
                    />
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
                        <span className="text-xl font-mono font-black tracking-widest">USD</span>
                    </div>
                  </div>
                  {amountError && (
                    <p className="text-xs font-black text-alert uppercase tracking-widest px-2">Verify loan principal magnitude</p>
                  )}
                </div>

                {/* Secondary Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Counterparty Name Field */}
                  <div className="space-y-3">
                    <label htmlFor="loan-name" className="text-xs font-black text-muted/60 uppercase tracking-[0.2em] px-1">Counterparty (Person)</label>
                    <div className="relative group">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 text-muted w-4 h-4 transition-colors group-focus-within:text-accent" aria-hidden="true" />
                      <input 
                        id="loan-name"
                        type="text" 
                        value={personName}
                        onChange={(e) => setPersonName(e.target.value)}
                        onBlur={() => setSubmitAttempted(true)}
                        placeholder="E.G. JOHN DOE" 
                        className={`w-full bg-surface-subtle/50 rounded-2xl py-3.5 pl-12 pr-5 text-xs font-bold focus:border-accent/40 outline-none transition-all border text-ink placeholder:text-muted/70 uppercase tracking-widest ${nameError ? 'border-alert/50' : 'border-border'}`}
                        autoComplete="off"
                        required
                      />
                    </div>
                    {nameError && (
                      <p className="text-xs font-black text-alert uppercase tracking-widest px-2">Counterparty is required</p>
                    )}
                  </div>

                  {/* Due Date Field */}
                  <div className="space-y-3">
                    <label htmlFor="loan-due-date" className="text-xs font-black text-muted/60 uppercase tracking-[0.2em] px-1">Due Date (Optional)</label>
                    <div className="relative">
                      <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 text-muted/70 w-4 h-4 pointer-events-none" aria-hidden="true" />
                      <input 
                        id="loan-due-date"
                        type="date" 
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        min={editingLoan ? undefined : new Date().toISOString().split('T')[0]}
                        className="w-full bg-surface-subtle/50 rounded-2xl py-3.5 px-5 text-xs font-bold focus:border-accent/40 outline-none transition-all border border-border text-ink appearance-none tracking-widest"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-3">
                  <label htmlFor="loan-notes" className="text-xs font-black text-muted/60 uppercase tracking-[0.2em] px-1">Internal Log / Memo</label>
                  <div className="relative group">
                    <FileText className="absolute left-5 top-4.5 text-muted w-4 h-4 transition-colors group-focus-within:text-accent" aria-hidden="true" />
                    <textarea 
                      id="loan-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="ENTER MEMO DETAILS…" 
                      className="w-full bg-surface-subtle/50 rounded-[28px] py-4 pl-12 pr-5 text-xs font-bold focus:border-accent/40 outline-none transition-all min-h-[120px] resize-none border border-border text-ink placeholder:text-muted/70 uppercase tracking-widest"
                    />
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className={`group relative w-full h-16 rounded-[24px] overflow-hidden shadow-lg active:scale-[0.98] transition-all ${
                      type === 'lent' 
                        ? 'bg-accent shadow-accent/20' 
                        : 'bg-alert shadow-alert/20'
                    }`}
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-center justify-center gap-3">
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <span className="text-sm font-black text-white uppercase tracking-[0.3em]">
                          {editingLoan ? 'Update Record' : `Commit ${type === 'lent' ? 'Receivable' : 'Payable'}`}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
