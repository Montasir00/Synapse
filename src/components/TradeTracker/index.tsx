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
  const TRADE_RETENTION_DAYS = 180;
  const PRUNE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
  const LAST_PRUNE_KEY = 'binance_last_prune_ms';

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
  const [suggestedSymbols, setSuggestedSymbols] = useState<string[]>([]);
  const [persistedMetrics, setPersistedMetrics] = useState<ReturnType<typeof calculateMetrics> | null>(null);
  const [syncSource, setSyncSource] = useState<'none' | 'cached' | 'live'>('none');
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  const user = auth.currentUser;

  // Initial fetch on mount - now using centralized service
  useEffect(() => {
    if (user) {
      handleFetchTrades();
    }
  }, [user]);

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
      if (livePositions.length > 0) {
        setPositions(livePositions.sort((a: any, b: any) => b.entryTime - a.entryTime));
      }
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
        if (result.tradeCount > 0) {
          toast.success(`Synced ${result.tradeCount} trades.`);
        } else {
          toast.info('No new trades found.');
        }
      } else {
        toast.error(result.error || 'Failed to fetch trades.');
      }
    } catch (err: any) {
      console.error('Failed to trigger global sync:', err);
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
  } = useTradeAnalytics(positions, journals);

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
      console.error('Failed to save journal', err);
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
    <div className="w-full max-w-6xl mx-auto space-y-8 sm:space-y-10 lg:space-y-12 pb-20 sm:pb-24 lg:pb-32 px-3 sm:px-4 lg:px-6 pt-6 sm:pt-8 lg:pt-12">

      <div className="soothing-card p-4 sm:p-6 lg:p-8 bg-surface border-border">
         <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
            <div>
               <h2 className="text-xl sm:text-2xl font-black text-ink tracking-tight uppercase">Operational Ledger</h2>
               <p className="text-[10px] font-black text-muted/60 uppercase tracking-[0.2em] mt-1">High-frequency position tracking</p>
            </div>
            <div className="flex gap-3">
               <button onClick={handleFetchTrades} className={`precise-button !pl-5 !pr-5 !py-2.5 flex-1 sm:flex-none flex items-center justify-center gap-2 ${isLoading ? 'opacity-50' : ''}`} disabled={isLoading}>
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Processing' : 'Sync Hub'}
               </button>
               <button 
                  onClick={() => toast.info('Manual Position Entry: Initializing structural update...')}
                  className="precise-button !pl-5 !pr-5 !py-2.5 flex-1 sm:flex-none border-accent/20 text-accent hover:bg-accent/5"
               >
                  + Manual Log
               </button>
            </div>
         </div>
      </div>

      {/* Action Bar - Replaced by header but kept for export/status */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
          <button 
            onClick={exportData}
            className="w-11 h-11 bg-surface-subtle hover:bg-surface border border-border rounded-full flex items-center justify-center transition-all active:scale-95 shadow-sm text-muted hover:text-ink"
            title="Export Ledger"
          >
            <Download className="w-4 h-4" />
          </button>

          {syncSource !== 'none' && (
            <div className={`h-11 px-4 rounded-full border text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
              syncSource === 'live'
                ? 'bg-success/5 border-success/20 text-success'
                : 'bg-accent/5 border-accent/20 text-accent'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${syncSource === 'live' ? 'bg-success' : 'bg-accent'}`} />
              <span>{syncSource === 'live' ? 'Live Sync' : 'Cached Snapshot'}</span>
              {lastSyncAt && (
                <span className="opacity-40 font-mono">
                  [{format(new Date(lastSyncAt), 'HH:mm')}]
                </span>
              )}
            </div>
          )}
        </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-10 sm:mb-14 lg:mb-16">
        {[
          { label: 'PROFIT FACTOR', value: displayMetrics.profitFactor !== null ? displayMetrics.profitFactor.toFixed(2) : 'PERFECT', type: 'value', icon: TrendingUp, color: 'text-accent', chipClass: 'bg-accent/5 border-accent/10' },
          { label: 'WIN RATE', value: `${(displayMetrics.winRate || 0).toFixed(1)}%`, sub: `${displayMetrics.profitableTrades || 0}/${displayMetrics.totalTrades || 0}`, icon: Activity, color: 'text-ink', chipClass: 'bg-surface-subtle border-border' },
          { label: 'FEE DRAG', value: displayMetrics.feeDragPct ? `${displayMetrics.feeDragPct.toFixed(1)}%` : '0%', unit: 'OF GROSS', icon: RefreshCw, color: 'text-coral', chipClass: 'bg-coral/5 border-coral/10' },
          { label: 'NET PNL', value: displayMetrics.totalNetPnl, type: 'currency', icon: Activity, color: displayMetrics.totalNetPnl >= 0 ? 'text-success' : 'text-coral', chipClass: displayMetrics.totalNetPnl >= 0 ? 'bg-success/5 border-success/10' : 'bg-coral/5 border-coral/10' },
        ].map((m, i) => (
          <div key={i} className="soothing-card p-5 min-h-[130px] flex flex-col justify-between group">
            <div className="flex justify-between items-center">
              <div className={`w-9 h-9 ${m.chipClass} border rounded-full flex items-center justify-center`}>
                <m.icon className={`w-4 h-4 ${m.color}`} aria-hidden="true" />
              </div>
              <span className="micro-label text-muted text-[10px] tracking-widest">{m.label}</span>
            </div>
            <div className="flex items-baseline gap-2 mt-4 truncate">
              <span className={`text-2xl font-mono font-black tracking-tighter ${m.color || 'text-ink'}`}>
                {m.type === 'currency' ? `${m.value >= 0 ? '+' : ''}${m.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : m.value}
              </span>
              {m.sub && <span className="text-[10px] font-bold text-muted uppercase opacity-60">{m.sub}</span>}
              {m.unit && <span className="text-[10px] font-bold text-muted uppercase opacity-60">{m.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        <div className="lg:col-span-2 relative">
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
                <p className="micro-label text-muted uppercase mb-10 tracking-[0.3em] opacity-60">Ledger Void</p>
                
                {suggestedSymbols.length > 0 && (
                  <div className="bg-surface-subtle/30 rounded-3xl p-8 text-left max-w-md mx-auto border border-border/50 shadow-2xl">
                    <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <TrendingUp className="w-3 h-3" />
                      Holding Suggestions
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {suggestedSymbols.filter(s => !symbols.includes(s)).slice(0, 8).map(s => (
                        <button 
                          key={s}
                          onClick={() => {
                            setSymbols([...symbols, s]);
                            setNewSymbol('');
                          }}
                          className="px-3 py-1.5 bg-accent/5 border border-accent/20 rounded-full text-[10px] font-black text-accent hover:bg-accent hover:text-bg transition-all active:scale-95"
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

                    <div className="grid grid-cols-3 gap-8 md:gap-12 w-full md:w-auto">
                      <div className="text-left">
                        <span className="block micro-label text-muted/50 mb-2 uppercase tracking-[0.2em] text-[9px]">AVG_IN</span>
                        <span className="font-mono font-bold text-sm text-ink">${pos.avgEntryPrice.toLocaleString(undefined, { minimumFractionDigits: pos.avgEntryPrice < 1 ? 6 : 2 })}</span>
                      </div>
                      <div className="text-center">
                        <span className="block micro-label text-muted/50 mb-2 uppercase tracking-[0.2em] text-[9px]">VOLUME</span>
                        <span className="font-mono font-bold text-sm text-ink">{pos.totalQty.toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="block micro-label text-muted/50 mb-2 uppercase tracking-[0.2em] text-[9px]">REALIZED</span>
                        <div className={`font-mono font-black text-lg tracking-tighter leading-none ${pos.realizedPnl >= 0 ? 'text-success' : 'text-coral'}`}>
                          {pos.realizedPnl >= 0 ? '+' : ''}{(pos.realizedPnl || 0).toFixed(2)}
                          <div className="text-[10px] font-bold text-muted opacity-50 mt-1">({(pos.realizedPnlPercentage || 0).toFixed(1)}%)</div>
                        </div>
                      </div>
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
              ))
            )}
          </div>
        </div>

        {/* Sidebar / Insights */}
        <div className="space-y-12">
          {/* Advanced Visualizations */}
          <div className="space-y-6">
            <div className="glass-card p-6 sm:p-8">
              <h3 className="text-xl font-display font-black text-ink uppercase tracking-tight mb-8">Equity Progression</h3>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height={200}>
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

            <div className="glass-card p-6 sm:p-8">
              <h3 className="text-xl font-display font-black text-ink uppercase tracking-tight mb-8">Golden Hour Analysis</h3>
              <div className="h-[120px] w-full flex items-end gap-1 px-1">
                {heatmapData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group/h">
                    <div 
                      className={`w-full rounded-t-sm transition-all ${d.pnl >= 0 ? 'bg-success/40 group-hover/h:bg-success' : 'bg-coral/40 group-hover/h:bg-coral'}`}
                      style={{ height: `${Math.min(100, (Math.abs(d.pnl) / (Math.max(...heatmapData.map(h => Math.abs(h.pnl))) || 1)) * 100)}%` }}
                    />
                    <span className="text-[7px] font-mono font-bold text-muted/30 group-hover/h:text-ink">{d.hour}</span>
                  </div>
                ))}
              </div>
              <p className="micro-label mt-4 opacity-30 text-center">Calibrated: Europe/Rome (Sicily)</p>
            </div>
          </div>

          {/* Pattern Analysis */}
          <div className="glass-card p-6 sm:p-8">
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

          {/* Wallet Balance Analysis */}
          <div className="glass-card p-6 sm:p-8">
            <h3 className="text-xl font-display font-black text-ink uppercase tracking-tight mb-8">Buffer states</h3>
            <div className="space-y-6">
              {balances.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[10px] font-bold text-muted/40 uppercase tracking-widest mb-3">
                    {(!localStorage.getItem('binance_api_key') || !localStorage.getItem('binance_api_secret')) 
                      ? 'Credentials Missing' 
                      : 'Sync required'}
                  </p>
                  {(!localStorage.getItem('binance_api_key') || !localStorage.getItem('binance_api_secret')) && (
                    <p className="text-[9px] font-medium text-muted/30 uppercase leading-relaxed max-w-[200px] mx-auto">
                      Configure your Binance API keys in Settings to authorize the Buffer State balance fetch.
                    </p>
                  )}
                </div>
              ) : (
                balances
                  .sort((a, b) => (parseFloat(b.free) + parseFloat(b.locked)) - (parseFloat(a.free) + parseFloat(a.locked)))
                  .filter(b => parseFloat(b.free) + parseFloat(b.locked) > 0.0001)
                  .map(b => (
                    <div key={b.asset} className="flex justify-between items-center group/bal">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-surface-subtle border border-border flex items-center justify-center font-mono font-black text-[10px] group-hover/bal:border-accent/40 group-hover/bal:text-accent transition-all uppercase shadow-sm">
                          {b.asset.slice(0, 3)}
                        </div>
                        <span className="text-[10px] font-black text-ink uppercase tracking-widest">{b.asset}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono font-black text-ink tracking-tighter">{(parseFloat(b.free) + parseFloat(b.locked)).toLocaleString(undefined, { maximumFractionDigits: b.asset.includes('US') ? 2 : 4 })}</div>
                        <div className="text-[9px] font-bold text-muted/60 uppercase tracking-[0.15em] mt-1">VOL_TOTAL</div>
                      </div>
                    </div>
                  ))
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
                    <label className="micro-label mb-2 block opacity-40">PnL realized</label>
                    <p className={`text-lg font-mono font-black ${selectedPosition!.realizedPnl >= 0 ? 'text-success' : 'text-coral'}`}>
                      {selectedPosition!.realizedPnl >= 0 ? '+' : ''}{selectedPosition!.realizedPnl.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-surface-subtle p-4 rounded-xl border border-border">
                    <label className="micro-label mb-2 block opacity-40">rMultiple</label>
                    <p className="text-lg font-mono font-black text-ink">
                      {editingNote.plannedStopUSD ? (selectedPosition!.realizedPnl / editingNote.plannedStopUSD).toFixed(2) : '--'}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <label className="micro-label block">Cognitive & Psychological State</label>
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
                  <label className="micro-label block">Structural Risk (USD)</label>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <span className="text-[9px] font-bold text-muted uppercase mb-2 block">Planned Stop</span>
                      <input 
                        type="number" 
                        value={editingNote.plannedStopUSD || ''} 
                        onChange={e => setEditingNote(prev => ({ ...prev, plannedStopUSD: parseFloat(e.target.value) }))}
                        className="w-full bg-surface-subtle border border-border rounded-lg px-4 py-3 text-sm font-bold text-ink outline-none focus:border-accent"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-muted uppercase mb-2 block">Planned Target</span>
                      <input 
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
                  <label className="micro-label block">Execution Notes</label>
                  <textarea 
                    value={editingNote.notes}
                    onChange={(e) => setEditingNote(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full bg-surface-subtle border border-border rounded-xl px-4 py-4 text-sm font-bold text-ink focus:border-accent outline-none transition-all min-h-[120px] resize-none placeholder:text-muted"
                    placeholder="Describe the setup and your level of adherence..."
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-accent/5 border border-accent/20 rounded-xl">
                  <label className="text-[10px] font-black text-accent uppercase tracking-widest">Followed Pre-Trade Plan</label>
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
