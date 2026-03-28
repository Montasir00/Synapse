import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Wallet, 
  History, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight,
  MessageSquare,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CryptoHolding, CryptoTrade } from '../types';

interface CryptoProps {
  holdings: CryptoHolding[];
  trades: CryptoTrade[];
  onAddHolding: (holding: Omit<CryptoHolding, 'id' | 'last_updated'>) => Promise<void>;
  onAddTrade: (trade: Omit<CryptoTrade, 'id'>) => Promise<void>;
}

export default function Crypto({ holdings, trades, onAddHolding, onAddTrade }: CryptoProps) {
  const [showHoldingModal, setShowHoldingModal] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [newHolding, setNewHolding] = useState({ asset: '', amount: 0, avg_buy_price: 0 });
  const [newTrade, setNewTrade] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    asset: '', 
    type: 'Buy' as 'Buy' | 'Sell', 
    amount: 0, 
    price: 0, 
    profit_loss: 0,
    notes_right: '',
    notes_wrong: ''
  });

  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onAddHolding(newHolding);
      setShowHoldingModal(false);
      setNewHolding({ asset: '', amount: 0, avg_buy_price: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onAddTrade(newTrade);
      setShowTradeModal(false);
      setNewTrade({ 
        date: new Date().toISOString().split('T')[0], 
        asset: '', 
        type: 'Buy', 
        amount: 0, 
        price: 0, 
        profit_loss: 0,
        notes_right: '',
        notes_wrong: ''
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-28 md:pt-32 px-6 md:px-12 pb-24 max-w-[1400px] mx-auto w-full min-h-screen">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
        <div>
          <p className="micro-label mb-3 text-accent">Digital Assets</p>
          <h1 className="text-5xl md:text-7xl font-serif italic text-ink leading-tight tracking-tight">Crypto Sanctuary</h1>
          <p className="text-muted mt-6 text-base md:text-lg max-w-xl font-medium leading-relaxed">
            Track your digital assets and refine your trading protocol.
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowHoldingModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/[0.03] border border-white/5 hover:bg-white/5 text-ink px-8 py-3 rounded-full font-bold text-[10px] uppercase tracking-widest transition-all"
          >
            <Wallet className="w-4 h-4" />
            Holdings
          </button>
          <button 
            onClick={() => setShowTradeModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-ink text-bg px-8 py-3 rounded-full font-bold text-[10px] uppercase tracking-widest transition-all hover:bg-accent hover:text-bg shadow-xl shadow-accent/5"
          >
            <Plus className="w-4 h-4" />
            Log Trade
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-12">
        {/* Holdings Overview */}
        <div className="col-span-12 lg:col-span-4 space-y-10">
          <div className="glass-card rounded-[2.5rem] p-10 border-white/5">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent border border-accent/20">
                <Wallet className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-serif italic text-ink">Current Holdings</h2>
            </div>

            <div className="space-y-6">
              {holdings.length === 0 ? (
                <p className="text-[11px] text-muted font-medium italic py-6 opacity-40">No holdings tracked yet.</p>
              ) : (
                holdings.map((holding) => (
                  <div key={holding.id} className="p-6 bg-white/[0.02] rounded-3xl border border-white/[0.03] group hover:bg-white/[0.05] transition-all duration-500">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xl font-serif italic text-ink group-hover:text-accent transition-colors">{holding.asset}</span>
                      <span className="text-[10px] font-mono text-muted opacity-60">Avg: ${holding.avg_buy_price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-3xl font-mono text-accent tracking-tighter">{holding.amount.toLocaleString()}</span>
                      <span className="micro-label !opacity-30">Total Amount</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-card rounded-[2.5rem] p-10 bg-accent/[0.02] border-accent/10">
            <h3 className="micro-label text-accent !opacity-100 mb-4">Trading Protocol</h3>
            <p className="text-[13px] text-muted leading-relaxed font-medium opacity-80">
              Every trade is a lesson. Log your wins and losses to identify patterns in your cognitive state during execution.
            </p>
          </div>
        </div>

        {/* Trade History */}
        <div className="col-span-12 lg:col-span-8">
          <div className="glass-card rounded-[2.5rem] p-10 h-full border-white/5">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-12 h-12 bg-white/[0.03] rounded-2xl flex items-center justify-center text-ink border border-white/5">
                <History className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-serif italic text-ink">Trade Journal</h2>
            </div>

            <div className="space-y-12">
              {trades.length === 0 ? (
                <div className="text-center py-32 border-2 border-dashed border-white/[0.03] rounded-[2.5rem]">
                  <MessageSquare className="w-16 h-16 text-muted opacity-10 mx-auto mb-6" />
                  <p className="micro-label !opacity-20">Your journal is empty</p>
                </div>
              ) : (
                trades.map((trade) => (
                  <div key={trade.id} className="relative pl-12 border-l border-white/[0.05] pb-12 last:pb-0">
                    <div className={`absolute left-[-6px] top-0 w-3 h-3 rounded-full ${trade.type === 'Buy' ? 'bg-accent' : 'bg-red-500'} shadow-[0_0_10px_rgba(var(--color-accent-rgb),0.3)]`} />
                    
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-mono text-muted uppercase tracking-widest">{trade.date}</span>
                          <span className={`text-[8px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-[0.2em] ${trade.type === 'Buy' ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {trade.type}
                          </span>
                        </div>
                        <h3 className="text-3xl font-serif italic text-ink">{trade.asset} <span className="text-sm font-sans font-medium text-muted ml-2 opacity-50">@ ${trade.price.toLocaleString()}</span></h3>
                      </div>

                      {trade.profit_loss !== undefined && (
                        <div className={`text-right ${trade.profit_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          <div className="flex items-center justify-end gap-2 font-mono font-bold text-2xl tracking-tighter">
                            {trade.profit_loss >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                            ${Math.abs(trade.profit_loss).toLocaleString()}
                          </div>
                          <span className="micro-label !opacity-30">Realized P/L</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-green-500/[0.02] rounded-[2rem] border border-green-500/10 group hover:bg-green-500/[0.04] transition-all">
                        <p className="text-[9px] font-bold text-green-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Sanctuary Insight
                        </p>
                        <p className="text-[12px] text-ink opacity-70 leading-relaxed italic font-medium">
                          {trade.notes_right || 'No notes recorded.'}
                        </p>
                      </div>
                      <div className="p-6 bg-red-500/[0.02] rounded-[2rem] border border-red-500/10 group hover:bg-red-500/[0.04] transition-all">
                        <p className="text-[9px] font-bold text-red-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Cognitive Friction
                        </p>
                        <p className="text-[12px] text-ink opacity-70 leading-relaxed italic font-medium">
                          {trade.notes_wrong || 'No notes recorded.'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Holding Modal */}
      <AnimatePresence>
        {showHoldingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHoldingModal(false)}
              className="absolute inset-0 bg-bg/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }}
              className="relative w-full max-w-md glass-card rounded-[3rem] p-12 shadow-2xl border-white/5"
            >
              <button 
                onClick={() => setShowHoldingModal(false)}
                className="absolute top-8 right-8 text-muted hover:text-ink transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-3xl font-serif italic text-ink mb-10">Update Holdings</h2>
              
              <form onSubmit={handleAddHolding} className="space-y-8">
                <div className="space-y-3">
                  <label className="micro-label">Asset Symbol</label>
                  <input 
                    required
                    type="text"
                    placeholder="BTC, ETH, SOL..."
                    value={newHolding.asset}
                    onChange={e => setNewHolding({...newHolding, asset: e.target.value.toUpperCase()})}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-ink font-mono focus:outline-none focus:border-accent transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="micro-label">Amount</label>
                    <input 
                      required
                      type="number"
                      step="any"
                      value={newHolding.amount}
                      onChange={e => setNewHolding({...newHolding, amount: parseFloat(e.target.value)})}
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-ink font-mono focus:outline-none focus:border-accent transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="micro-label">Avg Buy Price</label>
                    <input 
                      required
                      type="number"
                      step="any"
                      value={newHolding.avg_buy_price}
                      onChange={e => setNewHolding({...newHolding, avg_buy_price: parseFloat(e.target.value)})}
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-ink font-mono focus:outline-none focus:border-accent transition-all"
                    />
                  </div>
                </div>
                <button 
                  disabled={loading}
                  type="submit"
                  className="w-full bg-ink text-bg font-bold py-5 rounded-2xl hover:bg-accent hover:text-bg transition-all duration-300 disabled:opacity-50 text-[10px] uppercase tracking-widest"
                >
                  {loading ? 'Updating...' : 'Update Holding'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Trade Modal */}
      <AnimatePresence>
        {showTradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTradeModal(false)}
              className="absolute inset-0 bg-bg/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }}
              className="relative w-full max-w-2xl glass-card rounded-[3rem] p-12 shadow-2xl border-white/5 max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setShowTradeModal(false)}
                className="absolute top-8 right-8 text-muted hover:text-ink transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-3xl font-serif italic text-ink mb-10">Log New Trade</h2>
              
              <form onSubmit={handleAddTrade} className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="micro-label">Date</label>
                    <input 
                      required
                      type="date"
                      value={newTrade.date}
                      onChange={e => setNewTrade({...newTrade, date: e.target.value})}
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-ink focus:outline-none focus:border-accent transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="micro-label">Asset Symbol</label>
                    <input 
                      required
                      type="text"
                      placeholder="BTC, ETH..."
                      value={newTrade.asset}
                      onChange={e => setNewTrade({...newTrade, asset: e.target.value.toUpperCase()})}
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-ink font-mono focus:outline-none focus:border-accent transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="micro-label">Trade Type</label>
                    <select 
                      value={newTrade.type}
                      onChange={e => setNewTrade({...newTrade, type: e.target.value as 'Buy' | 'Sell'})}
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-ink focus:outline-none focus:border-accent transition-all appearance-none"
                    >
                      <option value="Buy">Buy</option>
                      <option value="Sell">Sell</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="micro-label">Realized P/L (Optional)</label>
                    <input 
                      type="number"
                      step="any"
                      placeholder="Profit or Loss amount"
                      value={newTrade.profit_loss}
                      onChange={e => setNewTrade({...newTrade, profit_loss: parseFloat(e.target.value)})}
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-ink font-mono focus:outline-none focus:border-accent transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="micro-label">Amount</label>
                    <input 
                      required
                      type="number"
                      step="any"
                      value={newTrade.amount}
                      onChange={e => setNewTrade({...newTrade, amount: parseFloat(e.target.value)})}
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-ink font-mono focus:outline-none focus:border-accent transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="micro-label">Price</label>
                    <input 
                      required
                      type="number"
                      step="any"
                      value={newTrade.price}
                      onChange={e => setNewTrade({...newTrade, price: parseFloat(e.target.value)})}
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-ink font-mono focus:outline-none focus:border-accent transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="micro-label text-green-400">Sanctuary Insight</label>
                    <textarea 
                      rows={3}
                      placeholder="Strategy followed, good entry, calm execution..."
                      value={newTrade.notes_right}
                      onChange={e => setNewTrade({...newTrade, notes_right: e.target.value})}
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-ink focus:outline-none focus:border-accent transition-all resize-none italic text-sm"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="micro-label text-red-400">Cognitive Friction</label>
                    <textarea 
                      rows={3}
                      placeholder="FOMO, missed exit, emotional trading..."
                      value={newTrade.notes_wrong}
                      onChange={e => setNewTrade({...newTrade, notes_wrong: e.target.value})}
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-ink focus:outline-none focus:border-accent transition-all resize-none italic text-sm"
                    />
                  </div>
                </div>

                <button 
                  disabled={loading}
                  type="submit"
                  className="w-full bg-ink text-bg font-bold py-5 rounded-2xl hover:bg-accent hover:text-bg transition-all duration-300 disabled:opacity-50 text-[10px] uppercase tracking-widest"
                >
                  {loading ? 'Logging...' : 'Save Trade to Journal'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
