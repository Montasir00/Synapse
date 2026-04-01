import React, { useState } from 'react';
import { X, DollarSign, Calendar, Tag, FileText, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction } from '../types';

interface LogExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
  onUpdate?: (id: string, updates: Partial<Transaction>) => void;
  editingTransaction?: Transaction | null;
  categories: string[];
  merchantToCategory: Record<string, string>;
}

export default function LogExpenseModal({ 
  isOpen, 
  onClose, 
  onAdd, 
  onUpdate,
  editingTransaction,
  categories, 
  merchantToCategory 
}: LogExpenseModalProps) {
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('Technology');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');

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
  }, [editingTransaction, isOpen]);

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
      setCategory(newCategory.trim());
      setNewCategory('');
      setIsAddingCategory(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !merchant) return;

    const transactionData = {
      amount: parseFloat(amount),
      merchant: merchant,
      category: category,
      type: type,
      date: date,
      status: 'Completed' as const,
      description: description
    };

    if (editingTransaction && onUpdate) {
      onUpdate(editingTransaction.id, transactionData);
    } else {
      onAdd(transactionData);
    }
    
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative bg-surface w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[42px] shadow-2xl border border-white/10"
            >
              <div className="p-8 lg:p-10">
                <div className="flex justify-between items-center mb-10">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-[10px] font-black text-ink uppercase tracking-[0.3em]">Ledger Synchronization</span>
                  </div>
                  <button 
                    onClick={onClose}
                    className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-muted hover:text-accent hover:bg-white/10 transition-all border border-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex p-1 bg-black/20 rounded-full mb-8 border border-white/5">
                  <button 
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex-1 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${type === 'expense' ? 'bg-white/10 text-ink shadow-lg' : 'text-muted hover:text-ink'}`}
                  >
                    Outflow
                  </button>
                  <button 
                    type="button"
                    onClick={() => setType('income')}
                    className={`flex-1 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${type === 'income' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted hover:text-ink'}`}
                  >
                    Inflow
                  </button>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="space-y-4 mb-10">
                    <label className="micro-label opacity-40">Value Injection</label>
                    <div className="relative">
                      <span className={`absolute left-0 top-1/2 -translate-y-1/2 text-3xl font-mono font-bold ${type === 'income' ? 'text-success' : 'text-ink'}`}>
                        {type === 'income' ? '+' : '-'}
                      </span>
                      <input 
                        type="number" 
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00" 
                        className={`w-full bg-transparent border-b border-white/10 py-4 pl-8 text-5xl font-mono font-bold focus:border-accent outline-none transition-colors placeholder:text-muted/20 ${type === 'income' ? 'text-success' : 'text-ink'}`}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="micro-label opacity-40">Merchant / Source</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={merchant}
                          onChange={(e) => handleMerchantChange(e.target.value)}
                          placeholder={type === 'income' ? "e.g. Salary" : "e.g. Terminal"} 
                          className="w-full bg-black/20 rounded-full py-4 px-6 text-sm font-semibold focus:border-accent/40 outline-none transition-all border border-white/5 text-ink placeholder:text-muted/50"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="micro-label opacity-40">Timestamp</label>
                      <div className="relative">
                        <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-muted/30 w-4 h-4" />
                        <input 
                          type="date" 
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full bg-black/20 rounded-full py-4 px-6 text-sm font-semibold focus:border-accent/40 outline-none transition-all border border-white/5 text-ink appearance-none [color-scheme:dark]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="micro-label opacity-40">Classification</label>
                      <button 
                        type="button"
                        onClick={() => setIsAddingCategory(!isAddingCategory)}
                        className="text-[9px] font-bold uppercase tracking-widest text-accent hover:text-ink transition-colors"
                      >
                        {isAddingCategory ? 'Cancel' : '+ Define New'}
                      </button>
                    </div>
                    
                    {isAddingCategory ? (
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          placeholder="Category name..."
                          className="flex-1 bg-black/20 rounded-full py-4 px-6 text-sm font-semibold focus:border-accent/40 outline-none transition-all border border-white/5 text-ink"
                          autoFocus
                        />
                        <button 
                          type="button"
                          onClick={handleAddCategory}
                          className="px-6 bg-accent text-white rounded-full font-bold text-xs"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <div className="relative group">
                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/30 w-4 h-4 transition-colors group-focus-within:text-accent" />
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted/30 w-4 h-4" />
                        <select 
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full bg-black/20 rounded-full py-4 pl-12 pr-10 text-sm font-semibold focus:border-accent/40 outline-none transition-all appearance-none cursor-pointer border border-white/5 text-ink"
                        >
                          {categories.map(cat => (
                            <option key={cat} value={cat} className="bg-surface">{cat}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="micro-label opacity-40">Context Notes</label>
                    <div className="relative group">
                      <FileText className="absolute left-4 top-4 text-muted/30 w-4 h-4 transition-colors group-focus-within:text-accent" />
                      <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Mindful justification..." 
                        className="w-full bg-black/20 rounded-[32px] py-4 pl-12 pr-5 text-sm font-semibold focus:border-accent/40 outline-none transition-all min-h-[100px] resize-none border border-white/5 text-ink placeholder:text-muted/50"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className={`precise-button w-full py-4 text-xs tracking-[0.3em] font-black mt-4 shadow-xl active:scale-[0.98] ${type === 'income' ? 'bg-success hover:bg-success/80 !text-white' : ''}`}
                  >
                    {editingTransaction ? 'Re-apply' : 'Apply'} {type === 'income' ? 'Injection' : 'Outflow'}
                  </button>
                </form>
              </div>
            </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

