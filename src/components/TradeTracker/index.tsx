import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Settings, 
  RefreshCw, 
  Plus, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Tag, 
  MessageSquare, 
  Download, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Save,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { BinanceTrade, Position, DashboardMetrics, TradeNote } from '../../types/binance';
import { fetchBinanceTrades, processTradesIntoPositions, calculateMetrics } from '../../services/binanceService';
import { db, auth } from '../../firebase';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell } from 'recharts';
import { format } from 'date-fns';

const TradeTracker = () => {
  const [apiKey, setApiKey] = useState(localStorage.getItem('binance_api_key') || '');
  const [apiSecret, setApiSecret] = useState(localStorage.getItem('binance_api_secret') || '');
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('binance_base_url') || 'https://api.binance.com');
  const [symbols, setSymbols] = useState<string[]>(() => {
    const stored = localStorage.getItem('binance_symbols');
    const defaultSymbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
    if (!stored) return defaultSymbols;
    try {
      const parsed = JSON.parse(stored) as string[];
      // Sanitize existing symbols (remove slashes, etc.)
      const sanitized = parsed.map(s => s.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()).filter(Boolean);
      return sanitized.length > 0 ? sanitized : defaultSymbols;
    } catch {
      return defaultSymbols;
    }
  });
  const [newSymbol, setNewSymbol] = useState('');
  const [showSettings, setShowSettings] = useState(!apiKey);
  const [isLoading, setIsLoading] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [tradeNotes, setTradeNotes] = useState<Record<string, TradeNote>>({});
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState({ note: '', tags: [] as string[] });
  const [filter, setFilter] = useState('ALL'); // ALL, OPEN, CLOSED
  const [lastSynced, setLastSynced] = useState<string | null>(localStorage.getItem('binance_last_synced'));

  const user = auth.currentUser;

  // Initial fetch on mount
  useEffect(() => {
    const trimmedKey = apiKey.trim();
    const trimmedSecret = apiSecret.trim();
    if (trimmedKey && trimmedSecret) {
      handleFetchTrades();
    }
  }, []);

  // Fetch Trade Notes from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'tradeNotes'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notes: Record<string, TradeNote> = {};
      snapshot.forEach((doc) => {
        const data = doc.data() as TradeNote;
        notes[data.tradeId] = { ...data, id: doc.id };
      });
      setTradeNotes(notes);
    });
    return () => unsubscribe();
  }, [user]);

  const handleFetchTrades = async () => {
    // Strictly sanitize keys: remove any non-alphanumeric characters
    const cleanKey = apiKey.replace(/[^a-zA-Z0-9]/g, '').trim();
    const cleanSecret = apiSecret.replace(/[^a-zA-Z0-9]/g, '').trim();

    if (!cleanKey || !cleanSecret) {
      toast.error('Please configure API Key and Secret in Settings');
      setShowSettings(true);
      return;
    }

    if (cleanKey.length < 32 || cleanSecret.length < 32) {
      toast.error('API Key or Secret seems too short. Please double-check them.');
      setShowSettings(true);
      return;
    }

    setIsLoading(true);
    try {
      const allTrades: BinanceTrade[] = [];
      for (const symbol of symbols) {
        try {
          const trades = await fetchBinanceTrades(cleanKey, cleanSecret, symbol, baseUrl);
          allTrades.push(...trades);
        } catch (err: any) {
          const errorMsg = err.response?.data?.msg || err.message || 'Unknown error';
          console.error(`Failed to fetch trades for ${symbol}`, err);
          toast.error(`Failed to fetch trades for ${symbol}: ${errorMsg}`);
        }
      }

      const processedPositions = processTradesIntoPositions(allTrades);
      setPositions(processedPositions);
      const now = new Date().toISOString();
      setLastSynced(now);
      localStorage.setItem('binance_last_synced', now);
      toast.success('Trades updated successfully');
    } catch (err) {
      console.error('Failed to fetch trades', err);
      toast.error('Failed to fetch trades. Check your API credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = () => {
    const cleanKey = apiKey.replace(/[^a-zA-Z0-9]/g, '').trim();
    const cleanSecret = apiSecret.replace(/[^a-zA-Z0-9]/g, '').trim();

    if (!cleanKey || !cleanSecret) {
      toast.error('API Key and Secret are required');
      return;
    }

    if (cleanKey.length < 32 || cleanSecret.length < 32) {
      toast.error('API Key or Secret seems too short. Please double-check them.');
      return;
    }

    setApiKey(cleanKey);
    setApiSecret(cleanSecret);
    localStorage.setItem('binance_api_key', cleanKey);
    localStorage.setItem('binance_api_secret', cleanSecret);
    localStorage.setItem('binance_base_url', baseUrl);
    localStorage.setItem('binance_symbols', JSON.stringify(symbols));
    setShowSettings(false);
    toast.success('Settings saved');
    handleFetchTrades();
  };

  // Sync symbols to localStorage
  useEffect(() => {
    localStorage.setItem('binance_symbols', JSON.stringify(symbols));
  }, [symbols]);

  const addSymbol = () => {
    if (!newSymbol) return;
    // Remove any non-alphanumeric characters (like / or -)
    const cleanSymbol = newSymbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    if (symbols.includes(cleanSymbol)) {
      toast.error('Symbol already added');
      return;
    }
    setSymbols([...symbols, cleanSymbol]);
    setNewSymbol('');
  };

  const removeSymbol = (symbol: string) => {
    setSymbols(symbols.filter(s => s !== symbol));
  };

  const metrics = useMemo(() => calculateMetrics(positions), [positions]);

  const filteredPositions = useMemo(() => {
    if (filter === 'ALL') return positions;
    return positions.filter(p => p.status === filter);
  }, [positions, filter]);

  const handleOpenNoteModal = (position: Position) => {
    setSelectedPosition(position);
    const existing = tradeNotes[position.id];
    setEditingNote({
      note: existing?.note || '',
      tags: existing?.tags || []
    });
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!user || !selectedPosition) return;

    const noteId = tradeNotes[selectedPosition.id]?.id || `note_${selectedPosition.id}`;
    const noteData: TradeNote = {
      uid: user.uid,
      tradeId: selectedPosition.id,
      symbol: selectedPosition.symbol,
      note: editingNote.note,
      tags: editingNote.tags,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'tradeNotes', noteId), noteData);
      setIsNoteModalOpen(false);
      toast.success('Note saved');
    } catch (err) {
      console.error('Failed to save note', err);
      toast.error('Failed to save note');
    }
  };

  const toggleTag = (tag: string) => {
    setEditingNote(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag) 
        : [...prev.tags, tag]
    }));
  };

  const commonMistakes = ['FOMO', 'No Stop Loss', 'Chasing Green', 'Revenge Trading', 'Over-leveraged', 'Followed Plan', 'Early Exit', 'Late Entry'];

  const exportData = () => {
    const data = positions.map(p => ({
      ...p,
      note: tradeNotes[p.id]?.note || '',
      tags: tradeNotes[p.id]?.tags?.join(', ') || ''
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades_export_${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-bg text-ink p-6 font-sans">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-serif font-bold tracking-tight mb-1">Trade Tracker</h1>
          <div className="flex items-center gap-2">
            <p className="text-muted/60 text-sm">Analyze your Binance spot trading performance.</p>
            {lastSynced && (
              <span className="flex items-center gap-1 text-[10px] text-success/60 bg-success/5 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-2 h-2" />
                Synced {format(new Date(lastSynced), 'HH:mm')}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleFetchTrades}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Syncing...' : 'Sync Trades'}
          </button>
          
          <button 
            onClick={exportData}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all"
            title="Export Data"
          >
            <Download className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="max-w-7xl mx-auto overflow-hidden mb-8"
          >
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-serif font-bold">Binance API Settings</h2>
                <button onClick={() => setShowSettings(false)} className="text-muted/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="md:col-span-2">
                  <label className="block text-xs uppercase tracking-widest text-muted/60 mb-2">Binance Region</label>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setBaseUrl('https://api.binance.com')}
                      className={`flex-1 py-3 px-4 rounded-xl border text-sm transition-all ${baseUrl === 'https://api.binance.com' ? 'bg-accent/10 border-accent text-accent' : 'bg-bg/40 border-white/10 text-muted/60 hover:border-white/20'}`}
                    >
                      Binance.com (Global)
                    </button>
                    <button 
                      onClick={() => setBaseUrl('https://api.binance.us')}
                      className={`flex-1 py-3 px-4 rounded-xl border text-sm transition-all ${baseUrl === 'https://api.binance.us' ? 'bg-accent/10 border-accent text-accent' : 'bg-bg/40 border-white/10 text-muted/60 hover:border-white/20'}`}
                    >
                      Binance.us (USA)
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted/60 mb-2">
                    API Key <span className="text-[10px] lowercase opacity-40">(alphanumeric only)</span>
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full bg-bg/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none transition-all pr-12"
                      placeholder="Enter your read-only API key"
                    />
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono ${(apiKey.trim().length >= 64) ? 'text-success' : 'text-muted/40'}`}>
                      {apiKey.trim().length}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted/60 mb-2">
                    API Secret <span className="text-[10px] lowercase opacity-40">(alphanumeric only)</span>
                  </label>
                  <div className="relative">
                    <input 
                      type="password" 
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      className="w-full bg-bg/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none transition-all pr-12"
                      placeholder="Enter your API secret"
                    />
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono ${(apiSecret.trim().length >= 64) ? 'text-success' : 'text-muted/40'}`}>
                      {apiSecret.trim().length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-accent/5 border border-accent/10 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-accent mt-0.5" />
                  <div className="text-xs text-muted/80 leading-relaxed">
                    <p className="font-bold text-accent mb-1">Binance API Setup Guide:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Use <span className="text-white">HMAC</span> key type on Binance.com or Binance.us.</li>
                      <li>Enable <span className="text-white">"Spot & Margin Reading"</span> only.</li>
                      <li>Ensure your keys are <span className="text-white">64 characters</span> long.</li>
                      <li>Symbols should be like <span className="text-white">BTCUSDT</span> (no slashes).</li>
                      <li>Your keys are stored <span className="text-white">locally in your browser</span> and never sent to our servers.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs uppercase tracking-widest text-muted/60 mb-2">Tracked Pairs (e.g. BTCUSDT)</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {symbols.map(s => (
                    <span key={s} className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-full text-xs text-accent">
                      {s}
                      <button onClick={() => removeSymbol(s)} className="hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSymbol()}
                    className="bg-bg/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-accent outline-none transition-all"
                    placeholder="Add pair..."
                  />
                  <button 
                    onClick={addSymbol}
                    className="p-2 bg-accent text-black rounded-xl hover:bg-accent/90 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={saveSettings}
                  className="px-6 py-2.5 bg-white text-black font-bold rounded-full hover:bg-white/90 transition-all"
                >
                  Save & Sync
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-accent/10 rounded-xl">
              <Activity className="w-5 h-5 text-accent" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-muted/40">Total Net P&L</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-serif font-bold ${metrics.totalNetPnl >= 0 ? 'text-success' : 'text-alert'}`}>
              {metrics.totalNetPnl >= 0 ? '+' : ''}${Math.abs(metrics.totalNetPnl).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-muted/40">Win Rate</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-white">
              {metrics.winRate.toFixed(1)}%
            </span>
            <span className="text-xs text-muted/40">
              {metrics.profitableTrades}/{metrics.totalTrades} trades
            </span>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-success/10 rounded-xl">
              <ArrowUpRight className="w-5 h-5 text-success" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-muted/40">Largest Winner</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-success">
              +${metrics.largestWinner.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-alert/10 rounded-xl">
              <ArrowDownRight className="w-5 h-5 text-alert" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-muted/40">Largest Loser</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-serif font-bold text-alert">
              -${Math.abs(metrics.largestLoser).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Positions List */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif font-bold">Positions</h2>
            <div className="flex gap-2">
              {['ALL', 'OPEN', 'CLOSED'].map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest transition-all ${filter === f ? 'bg-white text-black' : 'bg-white/5 text-muted/60 hover:text-white'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredPositions.length === 0 ? (
              <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-2xl p-12 text-center">
                <AlertCircle className="w-8 h-8 text-muted/20 mx-auto mb-4" />
                <p className="text-muted/40">No positions found. Sync your trades to begin.</p>
              </div>
            ) : (
              filteredPositions.map(pos => (
                <motion.div 
                  key={pos.id}
                  layout
                  className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden group hover:border-white/20 transition-all"
                >
                  <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${pos.realizedPnl >= 0 ? 'bg-success/10 text-success' : 'bg-alert/10 text-alert'}`}>
                        {pos.symbol.replace('USDT', '')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold">{pos.symbol}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter ${pos.status === 'OPEN' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-muted/60'}`}>
                            {pos.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted/40 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {format(pos.entryTime, 'MMM d, HH:mm')}
                          {pos.exitTime && (
                            <>
                              <ArrowRight className="w-2 h-2" />
                              {format(pos.exitTime, 'MMM d, HH:mm')}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-8 w-full md:w-auto">
                      <div>
                        <span className="block text-[10px] uppercase tracking-widest text-muted/40 mb-1">Avg Entry</span>
                        <span className="font-mono text-sm">${pos.avgEntryPrice.toFixed(pos.avgEntryPrice < 1 ? 6 : 2)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase tracking-widest text-muted/40 mb-1">Qty</span>
                        <span className="font-mono text-sm">{pos.totalQty.toFixed(4)}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] uppercase tracking-widest text-muted/40 mb-1">P&L</span>
                        <div className={`font-mono font-bold ${pos.realizedPnl >= 0 ? 'text-success' : 'text-alert'}`}>
                          {pos.realizedPnl >= 0 ? '+' : ''}{pos.realizedPnl.toFixed(2)}
                          <span className="text-[10px] ml-1 opacity-60">({pos.realizedPnlPercentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                      <button 
                        onClick={() => handleOpenNoteModal(pos)}
                        className={`p-2 rounded-xl transition-all ${tradeNotes[pos.id]?.note ? 'bg-accent/10 text-accent' : 'bg-white/5 text-muted/40 hover:text-white'}`}
                        title="Add Note/Tags"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Tags Preview */}
                  {tradeNotes[pos.id]?.tags?.length > 0 && (
                    <div className="px-5 pb-4 flex flex-wrap gap-2">
                      {tradeNotes[pos.id].tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-[9px] text-muted/60">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar / Insights */}
        <div className="space-y-8">
          {/* Performance Chart */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-serif font-bold mb-6">P&L Performance</h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(metrics.performanceByPair).map(([name, value]) => ({ name, value }))}>
                  <XAxis dataKey="name" hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="value">
                    {Object.entries(metrics.performanceByPair).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(entry[1] as number) >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pattern Analysis */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-serif font-bold mb-4">Pattern Analysis</h3>
            <div className="space-y-4">
              {(commonMistakes as string[]).map(mistake => {
                const count = (Object.values(tradeNotes) as TradeNote[]).filter(n => n.tags.includes(mistake)).length;
                if (count === 0) return null;
                const pnl = positions
                  .filter(p => (tradeNotes[p.id]?.tags as string[])?.includes(mistake))
                  .reduce((acc, p) => acc + p.realizedPnl, 0);

                return (
                  <div key={mistake} className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium">{mistake}</span>
                      <span className="text-[10px] text-muted/40 ml-2">{count} times</span>
                    </div>
                    <span className={`text-xs font-mono ${pnl >= 0 ? 'text-success' : 'text-alert'}`}>
                      {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                    </span>
                  </div>
                );
              })}
              {((Object.values(tradeNotes) as TradeNote[])).every(n => n.tags.length === 0) && (
                <p className="text-xs text-muted/40 text-center py-4 italic">Add tags to trades to see patterns.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Note Modal */}
      <AnimatePresence>
        {isNoteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-serif font-bold">Review Position</h3>
                  <p className="text-xs text-muted/40">{selectedPosition?.symbol} • {selectedPosition?.id}</p>
                </div>
                <button onClick={() => setIsNoteModalOpen(false)} className="text-muted/40 hover:text-ink">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-muted/60 mb-3">Mistake Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {(commonMistakes as string[]).map(tag => (
                      <button 
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs transition-all ${editingNote.tags.includes(tag) ? 'bg-accent text-bg font-bold' : 'bg-white/5 text-muted/60 hover:bg-white/10'}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-muted/60 mb-3">Personal Notes</label>
                  <textarea 
                    value={editingNote.note}
                    onChange={(e) => setEditingNote(prev => ({ ...prev, note: e.target.value }))}
                    className="w-full bg-bg/40 border border-white/10 rounded-2xl px-4 py-4 text-sm focus:border-accent outline-none transition-all min-h-[120px] resize-none"
                    placeholder="What happened during this trade? What did you learn?"
                  />
                </div>
              </div>

              <div className="p-6 bg-white/[0.02] border-t border-white/5 flex justify-end gap-3">
                <button 
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold text-muted/60 hover:text-ink transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveNote}
                  className="px-8 py-2.5 bg-ink text-bg font-bold rounded-full hover:bg-ink/90 transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Review
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TradeTracker;
