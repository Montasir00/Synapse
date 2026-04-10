import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Activity, 
  RefreshCw, 
  MessageSquare, 
  Download, 
  AlertCircle, 
  Clock,
  ArrowRight,
  X,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { Position, JournalEntry } from '../../types/binance';
import { calculateMetrics } from '../../services/binanceService';
import {
  loadPersistedLastSync,
  loadPersistedMetrics,
  loadPersistedPositions,
  loadPersistedBalances,
} from '../../services/tradePersistenceService';
import { db, auth } from '../../firebase';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, AreaChart, Area, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { performGlobalTradeSync } from '../../services/tradeSyncService';
import { useTradeAnalytics } from './useTradeAnalytics';

const TradeTracker = () => {
  const [baseUrl] = useState(localStorage.getItem('binance_base_url') || 'https://api.binance.com');
  const [symbols, setSymbols] = useState<string[]>(() => {
    const stored = localStorage.getItem('binance_symbols');
    const defaultSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'NEARUSDC'];
    if (!stored) return defaultSymbols;
    try {
      const parsed = JSON.parse(stored) as string[];
      const sanitized = parsed.map(s => s.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()).filter(Boolean);
      return sanitized.length > 0 ? sanitized : defaultSymbols;
    } catch {
      return defaultSymbols;
    }
  });
  const [newSymbol, setNewSymbol] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [journals, setJournals] = useState<Record<string, JournalEntry>>({});
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState({
    notes: '',
    tags: [] as string[],
    entryReason: '',
    exitReason: '',
    emotionTag: undefined as any,
    setupType: '',
    plannedStopUSD: undefined as number | undefined,
    plannedTargetUSD: undefined as number | undefined,
    rating: 0,
    followedPlan: true
  });
  const [filter, setFilter] = useState('ALL'); // ALL, OPEN, CLOSED
  const [balances, setBalances] = useState<any[]>([]);
  const [persistedMetrics, setPersistedMetrics] = useState<ReturnType<typeof calculateMetrics> | null>(null);
  const [syncSource, setSyncSource] = useState<'none' | 'cached' | 'live'>('none');
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});

  const user = auth.currentUser;

  // Load price snapshot for unrealized PNL calculations
  useEffect(() => {
    const cacheStr = localStorage.getItem('binance_price_snapshot');
    if (cacheStr) {
      try {
        const cache = JSON.parse(cacheStr);
        if (cache.prices) {
           setCurrentPrices(cache.prices);
        }
      } catch {}
    }
  }, [lastSyncAt, syncSource]);

  // Preload latest persisted positions for faster first paint before live sync updates.
  useEffect(() => {
    if (!user) return;

    let active = true;
    (async () => {
      try {
        const persisted = await loadPersistedPositions(user.uid);
        const persistedMetricSnapshot = await loadPersistedMetrics(user.uid);
        const persistedBalances = await loadPersistedBalances(user.uid);
        if (!active || persisted.length === 0) {
          if (active && persistedBalances.length > 0) setBalances(persistedBalances);
          return;
        }

        setPositions((current) => (current.length > 0 ? current : persisted));
        if (persistedBalances.length > 0) setBalances(persistedBalances);
        if (persistedMetricSnapshot) {
          setPersistedMetrics(persistedMetricSnapshot);
        }
        setSyncSource('cached');

        const lastSyncMs = await loadPersistedLastSync(user.uid);
        if (lastSyncMs) {
          localStorage.setItem('binance_last_synced', new Date(lastSyncMs).toISOString());
          setLastSyncAt(lastSyncMs);
        }
      } catch (error) {
        console.error('Failed to load persisted trade state', error);
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

  // Sync Positions from Firestore in real-time
  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'binance_positions', user.uid, 'items');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const livePositions: Position[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        livePositions.push({ ...data, id: docSnap.id } as any);
      });
      setPositions(livePositions.sort((a: any, b: any) => b.entryTime - a.entryTime));
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch Trade Journals from isolated collection
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'trade_journals'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const journalMap: Record<string, JournalEntry> = {};
      snapshot.forEach((doc) => {
        const data = doc.data() as JournalEntry;
        journalMap[data.id] = { ...data, id: doc.id };
      });
      setJournals(journalMap);
    });
    return () => unsubscribe();
  }, [user]);

  const handleFetchTrades = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const idToken = await user.getIdToken();
      const result = await performGlobalTradeSync(idToken, user.uid);
      
      if (result.success) {
        setSyncSource('live');
        setLastSyncAt(Date.now());
        if (result.balances) {
          setBalances(result.balances);
        }
        if (result.currentPrices) {
          setCurrentPrices(result.currentPrices);
          // Also persist back to localStorage immediately for consistency
          localStorage.setItem('binance_price_snapshot', JSON.stringify({ 
            timestamp: Date.now(), 
            prices: result.currentPrices 
          }));
        }
        if (result.tradeCount > 0) {
          toast.success(`Synced ${result.tradeCount} trades.`);
        } else {
          toast.info('No new trades found.');
        }
      } else {
        toast.error(result.error || 'Failed to fetch trades.');
      }
    } catch (err: any) {
      toast.error('Sync failed.');
    } finally {
      setIsLoading(false);
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

  const {
    metrics,
    equityCurveData,
    heatmapData,
    biasMetrics
  } = useTradeAnalytics(positions, journals, currentPrices);

  const displayMetrics = positions.length > 0 ? metrics : persistedMetrics ?? metrics;

  const filteredPositions = useMemo(() => {
    if (filter === 'ALL') return positions;
    return positions.filter(p => p.status === filter);
  }, [positions, filter]);

  const handleOpenNoteModal = (position: Position) => {
    setSelectedPosition(position);
    const existing = journals[position.id];
    setEditingNote({
      notes: existing?.notes || '',
      tags: existing?.tags || [],
      entryReason: existing?.entryReason || '',
      exitReason: existing?.exitReason || '',
      emotionTag: existing?.emotionTag,
      setupType: existing?.setupType || '',
      plannedStopUSD: existing?.plannedStopUSD,
      plannedTargetUSD: existing?.plannedTargetUSD,
      rating: existing?.rating || 0,
      followedPlan: existing?.followedPlan ?? true
    });
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!user || !selectedPosition) return;

    const journalId = selectedPosition.id;
    
    // rMultiple Guard: PnL / Planned Risk
    let rMultiple: number | undefined = undefined;
    if (editingNote.plannedStopUSD && editingNote.plannedStopUSD > 0) {
      rMultiple = selectedPosition.realizedPnl / editingNote.plannedStopUSD;
    }

    const journalData: JournalEntry = {
      id: selectedPosition.id,
      uid: user.uid,
      symbol: selectedPosition.symbol,
      notes: editingNote.notes,
      tags: editingNote.tags,
      entryReason: editingNote.entryReason,
      exitReason: editingNote.exitReason,
      emotionTag: editingNote.emotionTag,
      setupType: editingNote.setupType,
      plannedStopUSD: editingNote.plannedStopUSD,
      plannedTargetUSD: editingNote.plannedTargetUSD,
      followedPlan: editingNote.followedPlan,
      rating: editingNote.rating,
      rMultiple,
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'trade_journals', journalId), journalData, { merge: true });
      setIsNoteModalOpen(false);
      toast.success('Journal persisted');
    } catch (err) {
      toast.error('Failed to persist journal');
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
      note: journals[p.id]?.notes || '',
      tags: journals[p.id]?.tags?.join(', ') || ''
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades_export_${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 sm:space-y-10 pb-20 sm:pb-24 lg:pb-32 px-3 sm:px-4 lg:px-6 pt-6 sm:pt-8 lg:pt-12">

      {/* Header & Integrated Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border/50 pb-6">
         <div>
            <h2 className="text-3xl font-black text-ink tracking-tight uppercase flex items-center gap-3">
              Trade Tracker
               {syncSource !== 'none' && (
                 <span className={`text-[9px] px-2 py-0.5 rounded-full border font-black uppercase tracking-widest ${
                   syncSource === 'live' ? 'bg-success/5 border-success/20 text-success' : 'bg-accent/5 border-accent/20 text-accent'
                 }`}>
                   {syncSource === 'live' ? 'Live ' : 'Cached '}
                   {lastSyncAt ? format(new Date(lastSyncAt), 'HH:mm') : ''}
                 </span>
               )}
            </h2>
            <p className="text-[10px] font-black text-muted/60 uppercase tracking-[0.2em] mt-2">Track open positions, closed trades, and live valuation</p>
         </div>
         
         <div className="flex flex-wrap items-center gap-3 mt-4 sm:mt-0">
            <button onClick={exportData} className="w-10 h-10 bg-surface-subtle hover:bg-surface border border-border rounded-full flex items-center justify-center transition-all active:scale-95 shadow-sm text-muted hover:text-ink">
              <Download className="w-4 h-4" />
            </button>
            <button 
               onClick={() => toast.info('Manual Position Entry: Initializing structural update...')}
               className="h-10 px-6 border bg-transparent border-accent/20 text-accent hover:bg-accent/5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
            >
               Manual Log
            </button>
            <button 
               onClick={handleFetchTrades} 
               disabled={isLoading}
               className={`h-10 px-8 flex items-center gap-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${isLoading ? 'opacity-50 border-teal-500/10 text-teal-500 bg-transparent' : 'border-teal-500/30 text-teal-500 bg-teal-500/5 hover:bg-teal-500/10'}`}
            >
               <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Syncing' : 'Sync Trades'}
            </button>
         </div>
      </div>

        {isLoading && (
          <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 px-4 py-3 text-center">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-500">Fetching latest trade data</p>
          </div>
        )}

      {/* High-Density Flight Deck (Consolidated Top Metrics) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 w-full">
        {/* Left: Total Wealth Cluster */}
          <div className="lg:col-span-5 p-5 lg:p-6 rounded-2xl border border-border/50 bg-surface-subtle/30 flex flex-col justify-between shadow-sm group hover:border-accent/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[9px] font-black text-muted uppercase tracking-[0.2em]">
               Total Liquid Wealth
            </span>
            <span className="text-[8px] font-bold px-2 py-0.5 rounded bg-teal-500/10 text-teal-500 uppercase tracking-widest border border-teal-500/20">
              USDC Base
            </span>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl lg:text-5xl font-mono font-black tracking-tighter text-ink mb-4 group-hover:text-accent transition-colors">
              ${balances.reduce((acc, b) => acc + (b.usdValue || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {balances
                .filter((b) => (b.usdValue || 0) > 1)
                .sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0))
                .map((b) => (
                 <div key={b.asset} className="flex items-center gap-2 px-2.5 py-1 bg-bg/50 rounded-md border border-border">
                    <span className="text-[9px] font-bold text-muted uppercase">{b.asset}</span>
                    <span className="text-[10px] sm:text-xs font-mono font-black text-ink">${Number(b.usdValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC</span>
                 </div>
              ))}
              {balances.filter((b) => (b.usdValue || 0) > 1).length === 0 && (
                <div className="rounded-md border border-dashed border-border px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted/60">
                  No active balances yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Intel Command Strip */}
        <div className="lg:col-span-7 flex flex-wrap sm:flex-nowrap divide-y sm:divide-y-0 divide-x-0 sm:divide-x divide-border/30 border border-border/50 rounded-2xl bg-surface-subtle/10 shadow-sm">
          {[
            { label: 'PROFIT FACTOR', value: displayMetrics.profitFactor !== null ? displayMetrics.profitFactor.toFixed(2) : 'PERF', color: 'text-accent' },
            { label: 'WIN RATE', value: `${(displayMetrics.winRate || 0).toFixed(1)}%`, sub: `${displayMetrics.profitableTrades || 0}/${displayMetrics.totalTrades || 0}`, color: 'text-ink' },
            { label: 'FEE DRAG', value: displayMetrics.feeDragPct ? `${displayMetrics.feeDragPct.toFixed(1)}%` : '0%', color: 'text-coral' },
            { 
              label: 'NET PNL', 
              value: `${displayMetrics.totalEquityPnl >= 0 ? '+' : ''}${displayMetrics.totalEquityPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
              sub: `R: ${displayMetrics.totalNetPnl.toFixed(1)} / U: ${displayMetrics.totalUnrealizedPnl.toFixed(1)}`,
              color: displayMetrics.totalEquityPnl >= 0 ? 'text-success' : 'text-coral' 
            },
          ].map((m, i) => (
            <div key={i} className="flex-1 w-1/2 sm:w-auto p-4 lg:p-5 flex flex-col justify-center items-center sm:items-start text-center sm:text-left hover:bg-surface/40 transition-colors border-border/30">
              <span className="text-[9px] font-bold text-muted/50 uppercase tracking-[0.2em] mb-1.5">{m.label}</span>
              <div className="flex items-baseline gap-2">
                 <span className={`text-lg sm:text-xl lg:text-2xl font-mono font-black tracking-tighter ${m.color}`}>{m.value}</span>
                 {m.sub && <span className="text-[9px] font-bold text-muted/40 uppercase hidden sm:inline-block">{m.sub}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col gap-12 lg:gap-16">
          <div className="w-full relative">
          <div className="sticky top-0 z-10 bg-bg/90 backdrop-blur-xl pb-6 pt-2 mb-4 px-2 flex justify-between items-center border-b border-border/50">
            <h2 className="text-2xl font-display font-black text-ink uppercase tracking-tight">Active Ledger</h2>
            <div className="flex gap-1.5 p-1 bg-surface-subtle/50 rounded-full border border-border">
              {['ALL', 'OPEN', 'CLOSED'].map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all ${filter === f ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted hover:text-ink'}`}
                  aria-label={`Filter by ${f}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {filteredPositions.length === 0 ? (
              <div className="glass-card p-16 text-center border-dashed border-border/30">
                <AlertCircle className="w-12 h-12 text-muted/60 mx-auto mb-6" />
                <p className="micro-label text-muted uppercase mb-4 tracking-[0.3em] opacity-60">
                  {positions.length === 0 ? 'No trades loaded yet' : 'No positions in this filter'}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted/40 max-w-sm mx-auto">
                  {positions.length === 0 ? 'Sync trades to populate the ledger and valuations.' : 'Try another filter to see open or closed positions.'}
                </p>
              </div>
            ) : (
              filteredPositions.map(pos => {
                // Determine Live Market Price and Unrealized PNL for Open positions
                const priceKeyUSDT = `${pos.symbol}USDT`;
                const priceKeyUSDC = `${pos.symbol}USDC`;
                const cp = currentPrices[priceKeyUSDT] || currentPrices[priceKeyUSDC] || pos.avgEntryPrice;
                const unrealizedPnl = pos.status === 'OPEN' ? (cp - pos.avgEntryPrice) * pos.remainingQty : 0;
                const unrealizedPct = pos.avgEntryPrice > 0 ? (unrealizedPnl / (pos.avgEntryPrice * pos.remainingQty)) * 100 : 0;

                return (
                <motion.div 
                  key={pos.id}
                  layout
                  className="glass-card overflow-hidden group hover:border-border transition-colors"
                >
                  <div className="p-5 sm:p-6 lg:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 sm:gap-8">
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 rounded-full border flex items-center justify-center font-mono font-black text-sm uppercase tracking-tighter transition-all group-hover:scale-105 ${pos.realizedPnl >= 0 ? 'bg-success/5 border-success/20 text-success shadow-[0_0_20px_rgba(52,211,153,0.1)]' : 'bg-coral/5 border-coral/20 text-coral shadow-[0_0_20px_rgba(255,107,107,0.1)]'}`}>
                        {pos.symbol.slice(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl font-display font-bold text-ink uppercase tracking-tight leading-none">{pos.symbol}</span>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border flex items-center justify-center ${pos.status === 'OPEN' ? 'bg-accent/10 border-accent/30 text-accent shadow-[0_0_10px_rgba(114,137,253,0.2)]' : 'bg-surface-subtle border-border text-muted'}`}>
                            {pos.status}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono font-bold text-muted/60 flex items-center gap-2.5 uppercase tracking-widest">
                          <Clock className="w-3 h-3" />
                          {format(pos.entryTime, 'MMM d HH:mm')}
                          {pos.exitTime && (
                            <>
                              <ArrowRight className="w-2.5 h-2.5 opacity-30" />
                              {format(pos.exitTime, 'MMM d HH:mm')}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-12 w-full md:w-auto mt-4 md:mt-0">
                      <div className="text-left">
                        <span className="block micro-label text-muted/50 mb-2 uppercase tracking-[0.2em] text-[9px]">AVG_IN</span>
                        <span className="font-mono font-bold text-sm text-ink">${pos.avgEntryPrice.toLocaleString(undefined, { minimumFractionDigits: pos.avgEntryPrice < 1 ? 6 : 2 })}</span>
                      </div>
                      
                      {pos.status === 'CLOSED' ? (
                        <div className="text-left md:text-center">
                          <span className="block micro-label text-muted/50 mb-2 uppercase tracking-[0.2em] text-[9px]">AVG_OUT</span>
                          <span className="font-mono font-bold text-sm text-ink">${pos.avgExitPrice ? pos.avgExitPrice.toLocaleString(undefined, { minimumFractionDigits: pos.avgExitPrice < 1 ? 6 : 2 }) : '--'}</span>
                        </div>
                      ) : (
                        <div className="text-left md:text-center">
                          <span className="block micro-label text-muted/50 mb-2 uppercase tracking-[0.2em] text-[9px]">CURRENT</span>
                          <span className="font-mono font-bold text-sm text-ink">${cp.toLocaleString(undefined, { minimumFractionDigits: cp < 1 ? 6 : 2 })}</span>
                        </div>
                      )}

                      {pos.status === 'CLOSED' ? (
                        <div className="text-left md:text-right col-span-2 md:col-span-1">
                          <span className="block micro-label text-muted/50 mb-2 uppercase tracking-[0.2em] text-[9px]">FINAL P&L</span>
                          <div className={`font-mono font-black text-lg tracking-tighter leading-none flex items-baseline gap-1.5 md:justify-end ${pos.realizedPnl >= 0 ? 'text-success' : 'text-coral'}`}>
                            {pos.realizedPnl >= 0 ? '+' : ''}{(pos.realizedPnl || 0).toFixed(2)} <span className="text-[10px] uppercase">USDC</span>
                            <div className="text-[10px] font-bold text-muted opacity-50 mt-1">({(pos.realizedPnlPercentage || 0).toFixed(1)}%)</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-left md:text-right col-span-2 md:col-span-1">
                          <span className="block micro-label text-muted/50 mb-2 uppercase tracking-[0.2em] text-[9px]">CURRENT P&L</span>
                          <div className={`font-mono font-black text-lg tracking-tighter leading-none flex items-baseline gap-1.5 md:justify-end ${unrealizedPnl >= 0 ? 'text-success' : 'text-coral'}`}>
                            {unrealizedPnl >= 0 ? '+' : ''}{unrealizedPnl.toFixed(2)} <span className="text-[10px] uppercase">USDC</span>
                            <div className="text-[10px] font-bold text-muted opacity-50 mt-1">({unrealizedPct.toFixed(1)}%)</div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 border-border pt-6 md:pt-0">
                      <button 
                        onClick={() => handleOpenNoteModal(pos)}
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 border ${journals[pos.id]?.notes ? 'bg-accent/10 border-accent/40 text-accent shadow-lg shadow-accent/10' : 'bg-surface-subtle border-border text-muted hover:text-ink hover:bg-surface shadow-sm'}`}
                      >
                        <MessageSquare className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Tags Preview */}
                  {journals[pos.id]?.tags?.length > 0 && (
                    <div className="px-5 sm:px-6 lg:px-8 pb-5 sm:pb-6 lg:pb-8 flex flex-wrap gap-2">
                      {journals[pos.id].tags.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-surface-subtle/50 border border-border rounded-full text-[9px] font-black text-muted uppercase tracking-widest transition-all hover:border-accent/40 hover:text-accent">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
               );
              })
            )}
            {positions.length > 0 && filteredPositions.length > 0 && filteredPositions.length < positions.length && (
              <div className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted/50 pt-2">
                Showing {filteredPositions.length} of {positions.length} positions
              </div>
            )}
          </div>
        </div>

        {/* Tactical Intel Section (Moved below Ledger) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 w-full pt-8 border-t border-border/50">
          
          {/* Advanced Visualizations */}
          <div className="space-y-6">
            <div className="glass-card p-6 sm:p-8 h-full">
              <h3 className="text-xl font-display font-black text-ink uppercase tracking-tight mb-8">Equity Progression</h3>
              <div className="h-[200px] w-full min-w-0 min-h-[200px]">
                <ResponsiveContainer width="100%" height={200} minWidth={0} minHeight={200}>
                  <AreaChart data={equityCurveData}>
                    <defs>
                      <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00d4aa" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <Tooltip 
                      cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }}
                      contentStyle={{ backgroundColor: '#050507', border: '1px solid #1a1a1c', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="pnl" 
                      stroke="#00d4aa" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorPnl)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Pattern Analysis */}
          <div className="glass-card p-6 sm:p-8 h-full">
            <h3 className="text-xl font-display font-black text-ink uppercase tracking-tight mb-8">Bias detection</h3>
            <div className="space-y-6">
              {biasMetrics.map(mistake => (
                <div key={mistake.tag} className="flex justify-between items-center group">
                  <div>
                    <span className="text-[10px] font-black text-ink uppercase tracking-widest">{mistake.tag}</span>
                    <span className="text-[10px] font-mono font-bold text-muted/50 ml-3 uppercase">FREQ: {mistake.count}</span>
                  </div>
                  <span className={`text-[11px] font-mono font-black ${mistake.pnl >= 0 ? 'text-success' : 'text-coral'}`}>
                    {mistake.pnl >= 0 ? '+' : ''}{(mistake.pnl || 0).toFixed(2)}
                  </span>
                </div>
              ))}
              {(Object.values(journals || {}) as JournalEntry[]).every(n => n.tags.length === 0) && (
                <div className="text-center py-8">
                  <p className="text-[10px] font-bold text-muted/40 uppercase tracking-widest mb-3">No symbol tags yet.</p>
                  <p className="text-[9px] font-medium text-muted/30 uppercase leading-relaxed max-w-[200px] mx-auto">Add cognitive tags to your closed positions to unlock bias detection analytics.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Institutional Quick-Journal Slide-out */}
      <AnimatePresence>
        {isNoteModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNoteModalOpen(false)}
              className="fixed inset-0 z-[60] bg-bg/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-xl z-[70] bg-surface border-l border-border shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-border flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-display font-black text-ink uppercase tracking-tight">Post-Execution Audit</h3>
                  <p className="text-[10px] font-mono font-bold text-accent uppercase tracking-[0.2em] mt-1">{selectedPosition?.symbol} // REF_{selectedPosition?.id.split('_').pop()?.slice(0, 8)}</p>
                </div>
                <button onClick={() => setIsNoteModalOpen(false)} className="w-10 h-10 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-surface-subtle transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-subtle p-4 rounded-xl border border-border">
                    <p className="micro-label mb-2 block opacity-40">PnL realized</p>
                    <p className={`text-lg font-mono font-black ${selectedPosition!.realizedPnl >= 0 ? 'text-success' : 'text-coral'}`}>
                      {selectedPosition!.realizedPnl >= 0 ? '+' : ''}{selectedPosition!.realizedPnl.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-surface-subtle p-4 rounded-xl border border-border">
                    <p className="micro-label mb-2 block opacity-40">rMultiple</p>
                    <p className="text-lg font-mono font-black text-ink">
                      {editingNote.plannedStopUSD ? (selectedPosition!.realizedPnl / editingNote.plannedStopUSD).toFixed(2) : '--'}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <p className="micro-label block">Cognitive & Psychological State</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['DISCIPLINED', 'FOMO', 'REVENGE', 'UNCERTAIN'].map(tag => (
                      <button 
                        key={tag}
                        onClick={() => setEditingNote(prev => ({ ...prev, emotionTag: tag }))}
                        className={`py-3 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${editingNote.emotionTag === tag ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20 scale-[1.02]' : 'bg-surface-subtle border-border text-muted hover:border-accent/40 hover:text-ink'}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <p className="micro-label block">Structural Risk (USD)</p>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="trade-note-planned-stop" className="text-[9px] font-bold text-muted uppercase mb-2 block">Planned Stop</label>
                      <input 
                        id="trade-note-planned-stop"
                        type="number" 
                        value={editingNote.plannedStopUSD || ''} 
                        onChange={e => setEditingNote(prev => ({ ...prev, plannedStopUSD: parseFloat(e.target.value) }))}
                        className="w-full bg-surface-subtle border border-border rounded-lg px-4 py-3 text-sm font-bold text-ink outline-none focus:border-accent"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label htmlFor="trade-note-planned-target" className="text-[9px] font-bold text-muted uppercase mb-2 block">Planned Target</label>
                      <input 
                        id="trade-note-planned-target"
                        type="number" 
                        value={editingNote.plannedTargetUSD || ''} 
                        onChange={e => setEditingNote(prev => ({ ...prev, plannedTargetUSD: parseFloat(e.target.value) }))}
                        className="w-full bg-surface-subtle border border-border rounded-lg px-4 py-3 text-sm font-bold text-ink outline-none focus:border-accent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <p className="micro-label block">Entry Thesis (The Why) / Post-Mortem (Loss Analysis)</p>
                  <textarea 
                    value={editingNote.notes}
                    onChange={(e) => setEditingNote(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full bg-surface-subtle border border-border rounded-xl px-4 py-4 text-sm font-bold text-ink focus:border-accent outline-none transition-all min-h-[120px] resize-none placeholder:text-muted"
                    placeholder="Describe the setup and your level of adherence..."
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-accent/5 border border-accent/20 rounded-xl">
                  <span className="text-[10px] font-black text-accent uppercase tracking-widest">Followed Pre-Trade Plan</span>
                  <button 
                    onClick={() => setEditingNote(prev => ({ ...prev, followedPlan: !prev.followedPlan }))}
                    className={`w-12 h-6 rounded-full relative transition-all ${editingNote.followedPlan ? 'bg-accent' : 'bg-muted/20'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${editingNote.followedPlan ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <div className="p-8 border-t border-border bg-surface-subtle/50 flex gap-4">
                <button 
                  onClick={() => setIsNoteModalOpen(false)}
                  className="flex-1 py-4 text-[10px] font-black text-muted hover:text-ink uppercase tracking-widest transition-all"
                >
                  Discard
                </button>
                <button 
                  onClick={handleSaveNote}
                  className="flex-[2] bg-accent text-white py-4 rounded-lg font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <Save className="w-4 h-4" />
                  Persist Ledger
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TradeTracker;
