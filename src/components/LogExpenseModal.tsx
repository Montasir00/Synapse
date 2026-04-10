import React, { useState } from 'react';
import { X, Calendar, Tag, FileText, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction } from '../types';

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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSource, setNewSource] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

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

  React.useEffect(() => {
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
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
    }
    setSubmitAttempted(false);
    setIsSubmitting(false);
  }, [editingTransaction, isOpen]);

  React.useEffect(() => {
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

  // Auto-fill category when merchant changes
  const handleMerchantChange = (val: string) => {
    setMerchant(val);
    const suggestedCategory = merchantToCategory[val.toLowerCase()];
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
    }
  };

  const handleAddSource = () => {
    if (newSource.trim()) {
      const normalized = newSource.trim();
      setMerchant(normalized);
      onAddSource?.(normalized);
      setNewSource('');
      setIsAddingSource(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (amountError || merchantError) return;
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
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-label={editingTransaction ? 'Edit transaction' : 'Add transaction'}>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-bg/70 backdrop-blur-md"
          />
          
            <motion.div 
              ref={dialogRef}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative bg-surface w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-[42px] shadow-2xl border border-border"
            >
              <div className="p-4 sm:p-6 lg:p-10">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    <span className="text-xs font-black text-ink uppercase tracking-[0.12em] sm:tracking-[0.3em]">Ledger Synchronization</span>
                  </div>
                  <button 
                    onClick={() => !isSubmitting && onClose()}
                    aria-label="Close expense modal"
                    disabled={isSubmitting}
                    className="w-12 h-12 rounded-full bg-surface-subtle flex items-center justify-center text-muted hover:text-accent hover:bg-accent/5 transition-all border border-border"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex p-1 bg-surface-subtle rounded-full mb-10 border border-border">
                  <button 
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex-1 py-2.5 text-center rounded-full text-xs font-bold uppercase tracking-wider transition-all ${type === 'expense' ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
                  >
                    Expense
                  </button>
                  <button 
                    type="button"
                    onClick={() => setType('income')}
                    className={`flex-1 py-2.5 text-center rounded-full text-xs font-bold uppercase tracking-wider transition-all ${type === 'income' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted hover:text-ink'}`}
                  >
                    Income
                  </button>
                </div>

                <form className="space-y-8" onSubmit={handleSubmit}>
                  <div className="space-y-3 mb-8">
                    <label htmlFor="expense-amount" className="block micro-label text-muted">Amount</label>
                    <div className="relative flex items-center">
                      <span className={`absolute left-1 top-1/2 -translate-y-1/2 text-4xl font-mono font-bold ${type === 'income' ? 'text-success' : 'text-ink'}`}>
                        {type === 'income' ? '+' : '-'}
                      </span>
                      <input 
                        id="expense-amount"
                        type="number" 
                        step="0.01"
                        min="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        onBlur={() => setSubmitAttempted(true)}
                        placeholder="0.00" 
                        className={`w-full bg-transparent border-b py-3 pl-10 text-4xl font-mono font-bold focus:border-accent outline-none transition-colors placeholder:text-muted/60 ${amountError ? 'border-alert/50' : 'border-border'} ${type === 'income' ? 'text-success' : 'text-ink'}`}
                        aria-invalid={amountError}
                        aria-describedby={amountError ? 'expense-amount-error' : undefined}
                        required
                      />
                    </div>
                    {amountError && (
                      <p id="expense-amount-error" className="text-xs font-semibold text-alert mt-1">Enter a valid amount greater than 0.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <label htmlFor="expense-merchant" className="block micro-label text-muted">Merchant or source</label>
                        <button 
                          type="button"
                          onClick={() => setIsAddingSource(!isAddingSource)}
                          className="text-xs font-bold uppercase tracking-wide text-accent hover:text-ink transition-colors"
                        >
                          {isAddingSource ? 'Cancel' : '+ Add merchant'}
                        </button>
                      </div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted/50">Choosing a known merchant can suggest a category automatically.</p>

                      {isAddingSource ? (
                        <div className="flex gap-2">
                          <input 
                            id="expense-merchant"
                            type="text"
                            value={newSource}
                            onChange={(e) => setNewSource(e.target.value)}
                            placeholder="Source name..."
                            className="flex-1 bg-surface-subtle rounded-full py-3 px-5 text-sm font-semibold focus:border-accent/40 outline-none transition-all border border-border text-ink"
                            autoFocus
                          />
                          <button 
                            type="button"
                            onClick={handleAddSource}
                            className="px-5 bg-accent text-white rounded-full font-bold text-xs"
                          >
                            Add
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input 
                            id="expense-merchant"
                            type="text" 
                            value={merchant}
                            onChange={(e) => handleMerchantChange(e.target.value)}
                            onBlur={() => setSubmitAttempted(true)}
                            placeholder={type === 'income' ? "e.g. Salary" : "e.g. Grocery Store"} 
                            className={`w-full bg-surface-subtle rounded-full py-3 px-5 text-sm font-semibold focus:border-accent/40 outline-none transition-all border text-ink placeholder:text-muted/60 ${merchantError ? 'border-alert/50' : 'border-border'}`}
                            list="merchant-history"
                            aria-invalid={merchantError}
                            aria-describedby={merchantError ? 'expense-merchant-error' : undefined}
                            required
                          />
                          <datalist id="merchant-history">
                            {mergedMerchantOptions.map(m => (
                              <option key={m} value={m} />
                            ))}
                          </datalist>
                        </div>
                      )}
                      {merchantError && (
                        <p id="expense-merchant-error" className="text-xs font-semibold text-alert mt-1">Merchant or source is required.</p>
                      )}
                    </div>
                    <div className="space-y-2.5">
                      <label htmlFor="expense-date" className="block micro-label text-muted">Date</label>
                      <div className="relative">
                        <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                        <input 
                          id="expense-date"
                          type="date" 
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full bg-surface-subtle rounded-full py-3 px-5 text-sm font-semibold focus:border-accent/40 outline-none transition-all border border-border text-ink appearance-none [color-scheme:light]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <label htmlFor="expense-category" className="block micro-label text-muted">Expense category</label>
                      <button 
                        type="button"
                        onClick={() => setIsAddingCategory(!isAddingCategory)}
                        className="text-xs font-bold uppercase tracking-wide text-accent hover:text-ink transition-colors"
                      >
                        {isAddingCategory ? 'Cancel' : '+ New category'}
                      </button>
                    </div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted/50">Pick an existing category or define a new one inline.</p>
                    
                    {isAddingCategory ? (
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          placeholder="Category name..."
                          className="flex-1 bg-surface-subtle rounded-full py-3 px-5 text-sm font-semibold focus:border-accent/40 outline-none transition-all border border-border text-ink"
                          autoFocus
                        />
                        <button 
                          type="button"
                          onClick={handleAddCategory}
                          className="px-5 bg-accent text-white rounded-full font-bold text-xs"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <div className="relative group">
                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-4 h-4 transition-colors group-focus-within:text-accent" />
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                        <select 
                          id="expense-category"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full bg-surface-subtle rounded-full py-3 pl-11 pr-10 text-sm font-semibold focus:border-accent/40 outline-none transition-all appearance-none cursor-pointer border border-border text-ink"
                        >
                          {mergedCategories.map(cat => (
                            <option key={cat} value={cat} className="bg-surface">{cat}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <label htmlFor="expense-notes" className="block micro-label text-muted">Notes</label>
                    <div className="relative group">
                      <FileText className="absolute left-4 top-4 text-muted w-4 h-4 transition-colors group-focus-within:text-accent" />
                      <textarea 
                        id="expense-notes"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Mindful justification..." 
                        className="w-full bg-surface-subtle rounded-[32px] py-3 pl-11 pr-5 text-sm font-semibold focus:border-accent/40 outline-none transition-all min-h-[100px] resize-none border border-border text-ink placeholder:text-muted/60"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className={`precise-button w-full py-3 text-xs tracking-[0.12em] sm:tracking-[0.3em] font-black mt-6 shadow-xl active:scale-[0.98] ${type === 'income' ? 'bg-success hover:bg-success/80 !text-white' : ''}`}
                  >
                    {isSubmitting ? 'Saving...' : editingTransaction ? 'Save Entry' : `Add ${type === 'income' ? 'Income' : 'Expense'}`}
                  </button>
                </form>
              </div>
            </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

