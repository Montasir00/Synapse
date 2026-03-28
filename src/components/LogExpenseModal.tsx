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
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-surface w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-border"
            >
              <div className="p-8 lg:p-10">
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-3xl font-display font-bold text-ink">
                    {editingTransaction ? 'Edit Entry' : 'Financial Entry'}
                  </h2>
                  <button 
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-bg flex items-center justify-center text-muted hover:bg-border transition-colors border border-border"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex p-1 bg-bg rounded-2xl mb-8 border border-border">
                  <button 
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${type === 'expense' ? 'bg-surface text-ink shadow-lg' : 'text-muted hover:text-ink'}`}
                  >
                    Expense
                  </button>
                  <button 
                    type="button"
                    onClick={() => setType('income')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${type === 'income' ? 'bg-accent text-bg shadow-lg shadow-accent/20' : 'text-muted hover:text-ink'}`}
                  >
                    Income
                  </button>
                </div>

                <form className="space-y-8" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <label className="micro-label">Amount</label>
                    <div className="relative">
                      <span className={`absolute left-0 top-1/2 -translate-y-1/2 text-3xl font-display font-bold ${type === 'income' ? 'text-success' : 'text-ink'}`}>
                        {type === 'income' ? '+' : '-'}
                      </span>
                      <input 
                        type="number" 
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00" 
                        className={`w-full bg-transparent border-b-2 border-border py-4 pl-8 text-5xl font-display font-bold focus:border-accent outline-none transition-colors placeholder:text-muted/20 ${type === 'income' ? 'text-success' : 'text-ink'}`}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="micro-label">Merchant / Source</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={merchant}
                          onChange={(e) => handleMerchantChange(e.target.value)}
                          placeholder={type === 'income' ? "e.g. Salary" : "e.g. Apple Store"} 
                          className="w-full bg-bg rounded-2xl py-4 px-5 text-sm font-semibold focus:ring-2 focus:ring-accent/20 outline-none transition-all border border-border text-ink placeholder:text-muted/50"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="micro-label">Date</label>
                      <div className="relative">
                        <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                        <input 
                          type="date" 
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full bg-bg rounded-2xl py-4 px-5 text-sm font-semibold focus:ring-2 focus:ring-accent/20 outline-none transition-all border border-border text-ink appearance-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="micro-label">Category</label>
                      <button 
                        type="button"
                        onClick={() => setIsAddingCategory(!isAddingCategory)}
                        className="text-[9px] font-bold uppercase tracking-widest text-accent hover:underline"
                      >
                        {isAddingCategory ? 'Cancel' : '+ New Category'}
                      </button>
                    </div>
                    
                    {isAddingCategory ? (
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          placeholder="Category name..."
                          className="flex-1 bg-bg rounded-2xl py-4 px-5 text-sm font-semibold focus:ring-2 focus:ring-accent/20 outline-none transition-all border border-border text-ink"
                          autoFocus
                        />
                        <button 
                          type="button"
                          onClick={handleAddCategory}
                          className="px-6 bg-accent text-bg rounded-2xl font-bold text-xs"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <div className="relative group">
                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                        <select 
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full bg-bg rounded-2xl py-4 pl-12 pr-10 text-sm font-semibold focus:ring-2 focus:ring-accent/20 outline-none transition-all appearance-none cursor-pointer border border-border text-ink"
                        >
                          {categories.map(cat => (
                            <option key={cat} value={cat} className="bg-surface">{cat}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="micro-label">Notes</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-4 text-muted w-4 h-4" />
                      <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add a mindful note..." 
                        className="w-full bg-bg rounded-2xl py-4 pl-12 pr-5 text-sm font-semibold focus:ring-2 focus:ring-accent/20 outline-none transition-all min-h-[100px] resize-none border border-border text-ink placeholder:text-muted/50"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className={`w-full py-5 rounded-2xl font-bold text-lg shadow-xl transition-all active:scale-[0.98] mt-4 ${type === 'income' ? 'bg-success text-bg shadow-success/20 hover:shadow-success/40' : 'bg-accent text-bg shadow-accent/20 hover:shadow-accent/40'}`}
                  >
                    {editingTransaction ? 'Update' : 'Log'} {type === 'income' ? 'Inflow' : 'Outflow'}
                  </button>
                </form>
              </div>
            </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

