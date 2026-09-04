import React, { useState, useRef, useEffect } from 'react';
import { X, Calendar, Tag, FileText, ChevronDown, Plus, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction } from '../types';
import { format as formatDate } from 'date-fns';
import { haptics } from '../utils/haptics';

interface LogExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (transaction: Omit<Transaction, 'id'>) => void | Promise<void>;
  onUpdate?: (id: string, updates: Partial<Transaction>) => void | Promise<void>;
  editingTransaction?: Transaction | null;
  categories: string[];
  merchantToCategory: Record<string, string>;
  onLearnMerchantCategory?: (merchant: string, category: string) => void;
  uniqueMerchants?: string[];
  sourceOptions?: string[];
  onAddCategory?: (category: string) => void;
  onAddSource?: (source: string) => void;
}

export default function LogExpenseModal({ 
  isOpen, 
  onClose, 
  onAdd, 
  onUpdate,
  editingTransaction,
  categories, 
  merchantToCategory,
  onLearnMerchantCategory,
  uniqueMerchants = [],
  sourceOptions = [],
  onAddCategory,
  onAddSource,
}: LogExpenseModalProps) {
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('Technology');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [date, setDate] = useState(formatDate(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSource, setNewSource] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const parsedAmount = parseFloat(amount);
  const amountError = submitAttempted && (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0);
  const merchantError = submitAttempted && !merchant.trim();

  const mergedMerchantOptions = React.useMemo(() => {
    const merged = [...sourceOptions, ...uniqueMerchants];
    return Array.from(new Set(merged.map((m) => m.trim()).filter(Boolean)));
  }, [sourceOptions, uniqueMerchants]);

  const mergedCategories = React.useMemo(() => {
    const merged = [category, ...categories];
    return Array.from(new Set(merged.map((c) => c.trim()).filter(Boolean)));
  }, [categories, category]);

  useEffect(() => {
    if (editingTransaction) {
      setAmount(editingTransaction.amount.toString());
      setMerchant(editingTransaction.merchant);
      setCategory(editingTransaction.category);
      setType(editingTransaction.type);
      setDate(editingTransaction.date);
      setDescription(editingTransaction.description || '');
    } else {
      setAmount('');
      setMerchant('');
      setCategory('Technology');
      setType('expense');
      setDate(formatDate(new Date(), 'yyyy-MM-dd'));
      setDescription('');
    }
    setSubmitAttempted(false);
    setIsSubmitting(false);
  }, [editingTransaction, isOpen]);

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

  const handleMerchantChange = (val: string) => {
    setMerchant(val);
    const lowerVal = val.toLowerCase().trim();
    if (!lowerVal) return;

    let suggestedCategory = merchantToCategory[lowerVal];
    if (!suggestedCategory) {
      const keys = Object.keys(merchantToCategory);
      const match = keys.find(k => lowerVal.includes(k) || k.includes(lowerVal));
      if (match) suggestedCategory = merchantToCategory[match];
    }

    if (suggestedCategory) {
      setCategory(suggestedCategory);
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      const normalized = newCategory.trim();
      setCategory(normalized);
      onAddCategory?.(normalized);
      setNewCategory('');
      setIsAddingCategory(false);
      haptics.light();
    }
  };

  const handleAddSource = () => {
    if (newSource.trim()) {
      const normalized = newSource.trim();
      setMerchant(normalized);
      onAddSource?.(normalized);
      setNewSource('');
      setIsAddingSource(false);
      haptics.light();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (amountError || merchantError) {
      haptics.error();
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);

    const transactionData = {
      amount: parsedAmount,
      merchant: merchant.trim(),
      category: category,
      type: type,
      date: date,
      status: 'Completed' as const,
      description: description
    };

    try {
      if (editingTransaction && onUpdate) {
        await Promise.resolve(onUpdate(editingTransaction.id, transactionData));
      } else {
        await Promise.resolve(onAdd(transactionData));
      }

      onLearnMerchantCategory?.(merchant, category);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-bg/80 backdrop-blur-xl"
          />
          
          <motion.div 
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', duration: 0.32, bounce: 0.08 }}
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
                  <h2 id="expense-modal-title" className="text-xs font-black text-ink uppercase tracking-[0.25em]">Ledger Synchronization</h2>
                </div>
                <button 
                  onClick={() => !isSubmitting && onClose()}
                  aria-label="Close dialog"
                  className="w-10 h-10 rounded-full bg-surface-subtle/50 flex items-center justify-center text-muted/70 hover:text-accent hover:bg-accent/5 transition-all border border-border"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Type Switcher */}
              <div className="flex p-1.5 bg-surface-subtle/50 rounded-full mb-10 border border-border backdrop-blur-sm">
                <button 
                  type="button"
                  onClick={() => { setType('expense'); haptics.light(); }}
                  aria-pressed={type === 'expense'}
                  className={`flex-1 py-3 text-center rounded-full text-xs font-black uppercase tracking-widest transition-all ${type === 'expense' ? 'bg-surface text-ink shadow-sm border border-border' : 'text-muted hover:text-ink'}`}
                >
                  Expense
                </button>
                <button 
                  type="button"
                  onClick={() => { setType('income'); haptics.light(); }}
                  aria-pressed={type === 'income'}
                  className={`flex-1 py-3 text-center rounded-full text-xs font-black uppercase tracking-widest transition-all ${type === 'income' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted hover:text-ink'}`}
                >
                  Income
                </button>
              </div>

              <form className="space-y-10" onSubmit={handleSubmit}>
                {/* Hero Amount Field */}
                <div className="space-y-4 group">
                  <div className="flex justify-between items-end px-1">
                    <label htmlFor="expense-amount" className="text-xs font-black text-muted/70 uppercase tracking-[0.2em]">Transaction Flow</label>
                    <div className="flex items-center gap-1.5 text-accent">
                      <Sparkles className="w-3 h-3" />
                      <span className="text-xs font-bold uppercase tracking-widest">Precision Entry</span>
                    </div>
                  </div>
                  
                  <div className={`relative flex items-center p-5 sm:p-7 bg-surface-subtle/30 rounded-2xl border transition-all duration-300 ${amountError ? 'border-alert/70 ring-1 ring-alert/30' : 'border-border/80 group-focus-within:border-accent group-focus-within:ring-1 group-focus-within:ring-accent/40 group-focus-within:bg-accent/[0.02]'}`}>
                    <span className={`text-3xl sm:text-5xl font-mono font-bold mr-2 ${type === 'income' ? 'text-success' : 'text-ink'}`}>
                      {type === 'income' ? '+' : '-'}
                    </span>
                      <input 
                      id="expense-amount"
                      name="amount"
                      type="number" 
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      onBlur={() => setSubmitAttempted(true)}
                      placeholder="0.00" 
                      className={`w-full bg-transparent text-4xl sm:text-5xl font-mono font-bold tabular-nums outline-none transition-colors placeholder:text-muted/70 ${type === 'income' ? 'text-success' : 'text-ink'}`}
                      inputMode="decimal"
                      required
                      autoFocus
                    />
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
                        <span className="text-xl font-mono font-black tracking-widest">USD</span>
                    </div>
                  </div>
                  {amountError && (
                    <p className="text-xs font-black text-alert uppercase tracking-widest px-2">Verify transaction magnitude</p>
                  )}
                </div>

                {/* Secondary Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Merchant Field */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <label htmlFor="expense-merchant" className="text-xs font-black text-muted/70 uppercase tracking-[0.2em]">Counterparty</label>
                      <button 
                        type="button"
                        onClick={() => setIsAddingSource(!isAddingSource)}
                        className="text-xs font-black text-accent hover:text-ink transition-colors"
                      >
                        {isAddingSource ? 'CLOSE' : '+ SOURCE'}
                      </button>
                    </div>
                    
                    {isAddingSource ? (
                      <div className="flex gap-2">
                        <input 
                          id="expense-merchant"
                          type="text"
                          value={newSource}
                          onChange={(e) => setNewSource(e.target.value)}
                          placeholder="IDENTIFIER…"
                          className="flex-1 bg-surface-subtle/50 rounded-2xl py-3.5 px-5 text-xs font-bold focus:border-accent/40 outline-none transition-all border border-border text-ink placeholder:text-muted/70"
                          autoComplete="off"
                          autoFocus
                        />
                        <button type="button" onClick={handleAddSource} className="w-12 h-12 bg-accent text-white rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20 active:scale-95 transition-transform">
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input 
                          id="expense-merchant"
                          name="merchant"
                          type="text" 
                          value={merchant}
                          onChange={(e) => handleMerchantChange(e.target.value)}
                          onBlur={() => setSubmitAttempted(true)}
                          placeholder={type === 'income' ? "E.G. SALARY" : "E.G. AMAZON"} 
                          className={`w-full bg-surface-subtle/50 rounded-2xl py-3.5 px-5 text-xs font-bold focus:border-accent/40 outline-none transition-all border text-ink placeholder:text-muted/70 uppercase tracking-widest ${merchantError ? 'border-alert/50' : 'border-border'}`}
                          list="merchant-history"
                          autoComplete="off"
                          required
                        />
                        <datalist id="merchant-history">
                          {mergedMerchantOptions.map(m => (
                            <option key={m} value={m} />
                          ))}
                        </datalist>
                      </div>
                    )}
                  </div>

                  {/* Date Field */}
                  <div className="space-y-3">
                    <label htmlFor="expense-date" className="text-xs font-black text-muted/70 uppercase tracking-[0.2em] px-1">Execution Date</label>
                    <div className="relative">
                      <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 text-muted/70 w-4 h-4 pointer-events-none" aria-hidden="true" />
                      <input 
                        id="expense-date"
                        name="date"
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-surface-subtle/50 rounded-2xl py-3.5 px-5 text-xs font-bold focus:border-accent/40 outline-none transition-all border border-border text-ink appearance-none [color-scheme:light] tracking-widest"
                      />
                    </div>
                  </div>
                </div>

                {/* Category Picker */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <label htmlFor="expense-category" className="text-xs font-black text-muted/70 uppercase tracking-[0.2em]">Allocation Class</label>
                    <button 
                      type="button"
                      onClick={() => setIsAddingCategory(!isAddingCategory)}
                      className="text-xs font-black text-accent hover:text-ink transition-colors"
                    >
                      {isAddingCategory ? 'CLOSE' : '+ CLASS'}
                    </button>
                  </div>
                  
                  {isAddingCategory ? (
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="CATEGORY NAME…"
                        className="flex-1 bg-surface-subtle/50 rounded-2xl py-3.5 px-5 text-xs font-bold focus:border-accent/40 outline-none transition-all border border-border text-ink placeholder:text-muted/60"
                        autoComplete="off"
                        autoFocus
                      />
                      <button type="button" onClick={handleAddCategory} className="w-12 h-12 bg-accent text-white rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20 active:scale-95 transition-transform">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative group">
                      <Tag className="absolute left-5 top-1/2 -translate-y-1/2 text-muted/70 w-4 h-4 transition-colors group-focus-within:text-accent" aria-hidden="true" />
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-muted/70 w-4 h-4 pointer-events-none" aria-hidden="true" />
                      <select 
                        id="expense-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-surface-subtle/50 rounded-2xl py-3.5 pl-12 pr-10 text-xs font-bold focus:border-accent/40 outline-none transition-all appearance-none cursor-pointer border border-border text-ink uppercase tracking-widest"
                      >
                        {mergedCategories.map(cat => (
                          <option key={cat} value={cat} className="bg-surface">{cat}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-3">
                  <label htmlFor="expense-notes" className="text-xs font-black text-muted/70 uppercase tracking-[0.2em] px-1">Internal Log</label>
                  <div className="relative group">
                    <FileText className="absolute left-5 top-4.5 text-muted/70 w-4 h-4 transition-colors group-focus-within:text-accent" aria-hidden="true" />
                    <textarea 
                      id="expense-notes"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="MINDLOG DESCRIPTION…" 
                      className="w-full bg-surface-subtle/50 rounded-[28px] py-4 pl-12 pr-5 text-xs font-bold focus:border-accent/40 outline-none transition-all min-h-[120px] resize-none border border-border text-ink placeholder:text-muted/70 uppercase tracking-widest"
                    />
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className={`group relative w-full h-16 rounded-[24px] overflow-hidden shadow-[0_12px_24px_-8px_rgba(var(--ds-color-success-rgb, 80, 140, 120),0.3)] active:scale-[0.98] transition-all bg-success`}
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-center justify-center gap-3">
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <span className="text-sm font-black text-white uppercase tracking-[0.3em]">
                          {editingTransaction ? 'Update Record' : `Commit ${type === 'income' ? 'Income' : 'Expense'}`}
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
