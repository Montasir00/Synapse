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
import { fetchBinanceTrades, fetchBinanceAccount, processTradesIntoPositions, calculateMetrics } from '../../services/binanceService';
import { db, auth } from '../../firebase';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell } from 'recharts';
import { format } from 'date-fns';

const TradeTracker = () => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('binance_base_url') || 'https://api.binance.com');
  const [isConfigured, setIsConfigured] = useState(false);
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
  const [balances, setBalances] = useState<any[]>([]);
  const [suggestedSymbols, setSuggestedSymbols] = useState<string[]>([]);

  const user = auth.currentUser;

  // Initial fetch on mount
  useEffect(() => {
    if (user) {
      handleFetchTrades();
    }
  }, [user]);

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
    if (!user) return;

    setIsLoading(true);
    try {
      const idToken = await user.getIdToken();
      // 1. Fetch account balances to suggest symbols
      try {
        const account = await fetchBinanceAccount(idToken, baseUrl);
        const activeBalances = account.balances.filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
        setBalances(activeBalances);
        
        // Suggest symbols for these assets (against USDT/USDC)
        const suggestions: string[] = [];
        activeBalances.forEach((b: any) => {
          if (['USDT', 'USDC', 'FDUSD', 'BNB', 'BTC'].includes(b.asset)) return;
          suggestions.push(`${b.asset}USDT`, `${b.asset}USDC`);
        });
        setSuggestedSymbols(suggestions);
      } catch (accErr) {
        console.error('Failed to fetch account info', accErr);
      }

      // 2. Fetch trades for current symbols
      setIsConfigured(true);
      if (showSettings) setShowSettings(false);
      
      const allTrades: BinanceTrade[] = [];
      for (const symbol of symbols) {
        try {
          const trades = await fetchBinanceTrades(idToken, symbol, baseUrl);
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
      
      if (allTrades.length > 0) {
        toast.success(`Synced ${allTrades.length} trades for ${symbols.length} pairs.`);
      } else {
        toast.info(symbols.length > 0 ? 'No trades found for current pairs.' : 'Add pairs in settings to see trades.');
      }
    } catch (err: any) {
      console.error('Failed to fetch trades', err);
      if (err?.response?.status === 400 && err.response.data?.error?.includes('not configured')) {
        setIsConfigured(false);
        if (!showSettings) {
          toast.error('Binance API not configured. Please add keys.');
          setShowSettings(true);
        }
      } else {
        toast.error('Failed to fetch trades. Check your API credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    const cleanKey = apiKey.trim();
    const cleanSecret = apiSecret.trim();

    if (!cleanKey || !cleanSecret) {
      toast.error('API Key and Secret are required');
      return;
    }

    if (cleanKey.length < 32 || cleanSecret.length < 32) {
      toast.error('API Key or Secret seems too short. Please double-check them.');
      return;
    }

    if (!user) {
      toast.error('Must be logged in to save API keys');
      return;
    }

    try {
      await setDoc(doc(db, 'user_secrets', user.uid), {
        binanceApiKey: cleanKey,
        binanceApiSecret: cleanSecret
      });
      setApiKey('********************************');
      setApiSecret('********************************');
      setIsConfigured(true);
      localStorage.setItem('binance_base_url', baseUrl);
      localStorage.setItem('binance_symbols', JSON.stringify(symbols));
      setShowSettings(false);
      toast.success('Settings securely saved to Firebase');
      handleFetchTrades();
    } catch (err) {
      toast.error('Failed to save API keys securely');
      console.error(err);
    }
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
    <div className="pt-10 lg:pt-12 pb-28 lg:pb-16 px-4 md:px-10 w-full min-h-screen">
      {/* Page Header Removed */}
      <div className="flex items-center gap-3 mb-10 lg:mb-16">
          <button 
            onClick={handleFetchTrades}
            disabled={isLoading}
            className="precise-button px-6 py-3 text-[10px]"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="ml-2">{isLoading ? 'Processing...' : 'Sync_State'}</span>
          </button>
          
          <button 
            onClick={exportData}
            className="w-11 h-11 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-black/20"
            title="Export Ledger"
          >
            <Download className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="w-11 h-11 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-black/20"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-16"
          >
            <div className="glass-card p-6 md:p-10">
              <div className="flex justify-end mb-6">
                <button onClick={() => setShowSettings(false)} className="text-muted/30 hover:text-ink transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="md:col-span-2">
                  <label className="micro-label opacity-40">Exchange Region</label>
                  <div className="flex gap-4 mt-3">
                    <button 
                      onClick={() => setBaseUrl('https://api.binance.com')}
                      className={`flex-1 py-4 px-6 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${baseUrl === 'https://api.binance.com' ? 'bg-accent/10 border-accent text-accent' : 'bg-black/20 border-white/5 text-muted/40 hover:border-white/10'}`}
                    >
                      Global Protocol
                    </button>
                    <button 
                      onClick={() => setBaseUrl('https://api.binance.us')}
                      className={`flex-1 py-4 px-6 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${baseUrl === 'https://api.binance.us' ? 'bg-accent/10 border-accent text-accent' : 'bg-black/20 border-white/5 text-muted/40 hover:border-white/10'}`}
                    >
                      US Protocol
                    </button>
                  </div>
                </div>
                <div>
                  <label className="micro-label opacity-40">Credential Hash (API_KEY)</label>
                  <div className="relative mt-3">
                    <input 
                      type="text" 
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full bg-black/20 border border-white/5 rounded-full px-6 py-4 text-sm font-mono font-bold text-ink focus:border-accent/40 outline-none transition-all pr-12"
                      placeholder="AUTH_ID"
                    />
                    <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold ${(apiKey.trim().length >= 64) ? 'text-success' : 'text-muted/20'}`}>
                      {apiKey.trim().length}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="micro-label opacity-40">Security Secret (SECRET_KEY)</label>
                  <div className="relative mt-3">
                    <input 
                      type="password" 
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      className="w-full bg-black/20 border border-white/5 rounded-full px-6 py-4 text-sm font-mono font-bold text-ink focus:border-accent/40 outline-none transition-all pr-12"
                      placeholder="AUTH_SECRET"
                    />
                    <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold ${(apiSecret.trim().length >= 64) ? 'text-success' : 'text-muted/20'}`}>
                      {apiSecret.trim().length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-accent/5 border border-accent/10 rounded-3xl p-8 mb-10">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-5 h-5 text-accent flex-shrink-0" />
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wide leading-relaxed opacity-60">
                    <p className="text-accent mb-3 font-black tracking-widest">Setup_Protocol:</p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                      <li className="flex items-center gap-2"><div className="w-1 h-1 bg-accent rounded-full" /> Use HMAC key type</li>
                      <li className="flex items-center gap-2"><div className="w-1 h-1 bg-accent rounded-full" /> Enable Read Only</li>
                      <li className="flex items-center gap-2"><div className="w-1 h-1 bg-accent rounded-full" /> 64-character hash required</li>
                      <li className="flex items-center gap-2"><div className="w-1 h-1 bg-accent rounded-full" /> Assets: No slashes (e.g. BTCUSDT)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mb-10">
                <label className="micro-label opacity-40 mb-4 block">Tracked Asset Protocols</label>
                <div className="flex flex-wrap gap-2 mb-6">
                  {symbols.map(s => (
                    <span key={s} className="flex items-center gap-2 px-3 py-1.5 bg-accent/5 border border-accent/20 rounded-full text-[9px] font-black uppercase tracking-widest text-accent">
                      {s}
                      <button onClick={() => removeSymbol(s)} className="hover:text-ink transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-3 max-w-sm">
                  <input 
                    type="text" 
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSymbol()}
                    className="flex-1 bg-black/20 border border-white/5 rounded-full px-5 py-3 text-sm font-mono font-bold text-ink focus:border-accent/40 outline-none"
                    placeholder="BTCUSDT..."
                  />
                  <button 
                    onClick={addSymbol}
                    className="w-12 h-12 flex items-center justify-center bg-accent text-white rounded-full hover:scale-95 transition-all shadow-lg shadow-accent/20"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-10 border-t border-white/5">
                <button 
                  onClick={saveSettings}
                  className="precise-button px-10 py-5 active:scale-95 shadow-xl"
                >
                  Confirm Registration
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        <div className="glass-card p-8 group">
          <div className="flex justify-between items-start mb-6">
            <div className="w-10 h-10 bg-accent/5 border border-accent/10 rounded-full flex items-center justify-center">
              <Activity className="w-5 h-5 text-accent" />
            </div>
            <span className="micro-label opacity-40 uppercase tracking-[0.2em]">{filter} NET PNL</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-mono font-black tracking-tighter ${metrics.totalNetPnl >= 0 ? 'text-success' : 'text-coral'}`}>
              {metrics.totalNetPnl >= 0 ? '+' : ''}{metrics.totalNetPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="glass-card p-8 group">
          <div className="flex justify-between items-start mb-6">
            <div className="w-10 h-10 bg-indigo-500/5 border border-indigo-500/10 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="micro-label opacity-40 uppercase tracking-[0.2em]">WIN RATE</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-mono font-black tracking-tighter text-ink">
              {metrics.winRate.toFixed(1)}%
            </span>
            <span className="text-[10px] font-bold text-muted/30 uppercase">{metrics.profitableTrades}/{metrics.totalTrades}</span>
          </div>
        </div>

        <div className="glass-card p-8 group">
          <div className="flex justify-between items-start mb-6">
            <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-ink/40" />
            </div>
            <span className="micro-label opacity-40 uppercase tracking-[0.2em]">AVAILABLE</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-mono font-black tracking-tighter text-ink uppercase">
              {balances.find(b => b.asset === 'USDC')?.free ? parseFloat(balances.find(b => b.asset === 'USDC')?.free).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
            </span>
            <span className="text-[10px] font-bold text-muted/30 uppercase">USDC</span>
          </div>
        </div>

        <div className="glass-card p-8 group">
          <div className="flex justify-between items-start mb-6">
            <div className="w-10 h-10 bg-success/5 border border-success/10 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <span className="micro-label opacity-40 uppercase tracking-[0.2em]">TOP PERFORMER</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-display font-black tracking-tighter text-success uppercase truncate">
              {Object.entries(metrics.performanceByPair).sort((a,b) => (b[1] as number) - (a[1] as number))[0]?.[0].replace('USDT', '') || 'NONE'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-10 px-2">
            <h2 className="text-3xl font-display font-black text-ink uppercase tracking-tight">Active Ledger</h2>
            <div className="flex gap-2">
              {['ALL', 'OPEN', 'CLOSED'].map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] transition-all ${filter === f ? 'bg-ink text-bg' : 'bg-white/5 text-muted/30 hover:bg-white/10 hover:text-ink'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {filteredPositions.length === 0 ? (
              <div className="glass-card p-12 text-center border-dashed">
                <AlertCircle className="w-12 h-12 text-muted opacity-5 mx-auto mb-6" />
                <p className="micro-label opacity-20 uppercase mb-10">Ledger Void</p>
                
                {suggestedSymbols.length > 0 && (
                  <div className="bg-white/[0.02] rounded-3xl p-8 text-left max-w-md mx-auto border border-white/5 shadow-2xl">
                    <h4 className="text-[9px] font-black text-accent uppercase tracking-[0.2em] mb-6">Holding Suggestions:</h4>
                    <div className="flex flex-wrap gap-2">
                      {suggestedSymbols.filter(s => !symbols.includes(s)).slice(0, 8).map(s => (
                        <button 
                          key={s}
                          onClick={() => {
                            setSymbols([...symbols, s]);
                            setNewSymbol('');
                          }}
                          className="px-3 py-1.5 bg-accent/5 border border-accent/20 rounded-full text-[9px] font-black text-accent hover:bg-accent hover:text-bg transition-all"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              filteredPositions.map(pos => (
                <motion.div 
                  key={pos.id}
                  layout
                  className="glass-card overflow-hidden group"
                >
                  <div className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 rounded-full border flex items-center justify-center font-mono font-black text-sm uppercase tracking-tighter ${pos.realizedPnl >= 0 ? 'bg-success/5 border-success/20 text-success shadow-[0_0_15px_rgba(52,211,153,0.2)]' : 'bg-coral/5 border-coral/20 text-coral shadow-[0_0_15px_rgba(255,107,107,0.2)]'}`}>
                        {pos.symbol.slice(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl font-display font-bold text-ink uppercase tracking-tight">{pos.symbol}</span>
                          <span className={`text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest border ${pos.status === 'OPEN' ? 'bg-accent/10 border-accent/30 text-accent shadow-[0_0_10px_rgba(114,137,253,0.3)]' : 'bg-white/5 border-white/10 text-muted/30'}`}>
                            {pos.status}
                          </span>
                        </div>
                        <div className="text-[9px] font-mono font-bold text-muted/30 flex items-center gap-3 uppercase tracking-widest">
                          <Clock className="w-3.5 h-3.5" />
                          {format(pos.entryTime, 'MMM d HH:mm')}
                          {pos.exitTime && (
                            <>
                              <ArrowRight className="w-3 h-3 text-white/5" />
                              {format(pos.exitTime, 'MMM d HH:mm')}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-10 w-full md:w-auto">
                      <div>
                        <span className="block micro-label opacity-30 mb-2 uppercase tracking-[0.2em]">AVG_IN</span>
                        <span className="font-mono font-bold text-sm text-ink">${pos.avgEntryPrice.toLocaleString(undefined, { minimumFractionDigits: pos.avgEntryPrice < 1 ? 6 : 2 })}</span>
                      </div>
                      <div className="hidden sm:block">
                        <span className="block micro-label opacity-30 mb-2 uppercase tracking-[0.2em]">VOLUME</span>
                        <span className="font-mono font-bold text-sm text-ink">{pos.totalQty.toLocaleString()}</span>
                      </div>
                      <div className="sm:text-right">
                        <span className="block micro-label opacity-30 mb-2 uppercase tracking-[0.2em]">PNL</span>
                        <div className={`font-mono font-black text-lg tracking-tighter ${pos.realizedPnl >= 0 ? 'text-success' : 'text-coral'}`}>
                          {pos.realizedPnl >= 0 ? '+' : ''}{pos.realizedPnl.toFixed(2)}
                          <span className="text-[9px] font-bold ml-2 opacity-30">({pos.realizedPnlPercentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 border-white/5 pt-6 md:pt-0">
                      <button 
                        onClick={() => handleOpenNoteModal(pos)}
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 border ${tradeNotes[pos.id]?.note ? 'bg-accent/10 border-accent/40 text-accent' : 'bg-white/5 border-white/5 text-muted/30 hover:text-ink hover:bg-white/10 shadow-lg shadow-black/20'}`}
                      >
                        <MessageSquare className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Tags Preview */}
                  {tradeNotes[pos.id]?.tags?.length > 0 && (
                    <div className="px-8 pb-8 flex flex-wrap gap-2.5">
                      {tradeNotes[pos.id].tags.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-black/40 border border-white/5 rounded-full text-[8px] font-black text-muted/40 uppercase tracking-widest transition-all hover:border-accent/40 hover:text-accent">
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
        <div className="space-y-12">
          {/* Performance Chart */}
          <div className="glass-card p-8">
            <h3 className="text-xl font-display font-black text-ink uppercase tracking-tight mb-10">Alpha variance</h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(metrics.performanceByPair).map(([name, value]) => ({ name, value }))}>
                  <XAxis dataKey="name" hide />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    contentStyle={{ backgroundColor: '#050507', border: '1px solid #1a1a1c', borderRadius: '4px', padding: '12px' }}
                    itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                  />
                  <Bar dataKey="value" radius={[20, 20, 20, 20]}>
                    {Object.entries(metrics.performanceByPair).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(entry[1] as number) >= 0 ? '#00d4aa' : '#ff6b6b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pattern Analysis */}
          <div className="glass-card p-8">
            <h3 className="text-xl font-display font-black text-ink uppercase tracking-tight mb-8">Bias detection</h3>
            <div className="space-y-6">
              {(commonMistakes as string[]).map(mistake => {
                const count = (Object.values(tradeNotes) as TradeNote[]).filter(n => n.tags.includes(mistake)).length;
                if (count === 0) return null;
                const pnl = positions
                  .filter(p => (tradeNotes[p.id]?.tags as string[])?.includes(mistake))
                  .reduce((acc, p) => acc + p.realizedPnl, 0);

                return (
                  <div key={mistake} className="flex justify-between items-center group">
                    <div>
                      <span className="text-[11px] font-black text-ink uppercase tracking-widest">{mistake}</span>
                      <span className="text-[9px] font-mono font-bold text-muted/20 ml-3 uppercase">FREQ: {count}</span>
                    </div>
                    <span className={`text-[11px] font-mono font-black ${pnl >= 0 ? 'text-success' : 'text-coral'}`}>
                      {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                    </span>
                  </div>
                );
              })}
              {((Object.values(tradeNotes) as TradeNote[])).every(n => n.tags.length === 0) && (
                <p className="text-[10px] font-bold text-muted/20 text-center py-6 uppercase tracking-widest">Protocol tags missing.</p>
              )}
            </div>
          </div>

          {/* Wallet Balance Analysis */}
          <div className="glass-card p-8">
            <h3 className="text-xl font-display font-black text-ink uppercase tracking-tight mb-8">Buffer states</h3>
            <div className="space-y-6">
              {balances.length === 0 ? (
                <p className="text-[10px] font-bold text-muted/20 text-center py-6 uppercase tracking-widest italic">Sync required.</p>
              ) : (
                balances
                  .sort((a, b) => (parseFloat(b.free) + parseFloat(b.locked)) - (parseFloat(a.free) + parseFloat(a.locked)))
                  .filter(b => parseFloat(b.free) + parseFloat(b.locked) > 0.0001)
                  .map(b => (
                    <div key={b.asset} className="flex justify-between items-center group/bal">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-mono font-black text-[10px] group-hover/bal:border-accent/40 group-hover/bal:text-accent transition-all uppercase shadow-lg shadow-black/20">
                          {b.asset.slice(0, 3)}
                        </div>
                        <span className="text-[11px] font-black text-ink uppercase tracking-widest">{b.asset}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono font-black text-ink tracking-tighter">{(parseFloat(b.free) + parseFloat(b.locked)).toLocaleString(undefined, { maximumFractionDigits: b.asset.includes('US') ? 2 : 4 })}</div>
                        <div className="text-[8px] font-bold text-muted/20 uppercase tracking-[0.2em] mt-1">VOL_TOTAL</div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Note Modal */}
      <AnimatePresence>
        {isNoteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNoteModalOpen(false)}
              className="absolute inset-0 bg-bg/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative bg-surface border border-white/10 rounded-[42px] w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="p-6 md:p-10 border-b border-white/5 flex justify-between items-start">
                <div>
                  <p className="text-[9px] font-mono font-bold text-accent uppercase tracking-[0.2em]">{selectedPosition?.symbol} // REF_{selectedPosition?.id.slice(0, 8)}</p>
                </div>
                <button onClick={() => setIsNoteModalOpen(false)} className="text-muted/30 hover:text-accent transition-colors">
                  <X className="w-7 h-7" />
                </button>
              </div>
              
              <div className="p-6 md:p-10 space-y-10">
                <div>
                  <label className="micro-label opacity-40 mb-6 block">Classification_Tags</label>
                  <div className="flex flex-wrap gap-2.5">
                    {(commonMistakes as string[]).map(tag => (
                      <button 
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${editingNote.tags.includes(tag) ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-white/5 text-muted/30 hover:bg-white/10 hover:text-ink'}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="micro-label opacity-40 mb-4 block">Personal Ledger Insight</label>
                  <textarea 
                    value={editingNote.note}
                    onChange={(e) => setEditingNote(prev => ({ ...prev, note: e.target.value }))}
                    className="w-full bg-black/20 border border-white/5 rounded-3xl px-6 py-6 text-sm font-bold text-ink focus:border-accent/40 outline-none transition-all min-h-[160px] resize-none uppercase tracking-tight placeholder:opacity-10 shadow-inner"
                    placeholder="Log cognitive state during execution..."
                  />
                </div>
              </div>

              <div className="p-6 md:p-10 bg-black/20 border-t border-white/5 flex justify-end gap-4">
                <button 
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-8 py-3 text-[10px] font-black text-muted/30 hover:text-ink uppercase tracking-widest transition-all"
                >
                  Discard
                </button>
                <button 
                  onClick={handleSaveNote}
                  className="precise-button px-10 py-5 active:scale-95 shadow-xl"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Persist Audit
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
