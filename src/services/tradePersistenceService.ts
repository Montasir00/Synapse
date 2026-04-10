import {
  collection,
  deleteDoc,
  doc,
  DocumentReference,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  BinanceTrade,
  DashboardMetrics,
  PersistedBinanceTrade,
  PersistedMetrics,
  PersistedPosition,
  Position,
  TRADE_CALCULATION_VERSION,
  TradeSyncMetadata,
} from '../types/binance';

const BATCH_LIMIT = 400;
const PRUNE_BATCH_LIMIT = 250;

const normalizeSymbol = (symbol: string) => symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

const getBaseAsset = (symbol: string) => {
  return symbol.replace(/USDT$|USDC$|BUSD$|FDUSD$|BNB$|BTC$|ETH$/, '');
};

export const createSyncId = () => {
  return `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const toTradeDocId = (trade: BinanceTrade) => `${normalizeSymbol(trade.symbol)}_${trade.id}_${trade.orderId}`;

const toPersistedTrade = (uid: string, syncId: string, trade: BinanceTrade): PersistedBinanceTrade => {
  const symbol = normalizeSymbol(trade.symbol);
  return {
    uid,
    symbol,
    baseAsset: getBaseAsset(symbol),
    id: trade.id,
    orderId: trade.orderId,
    price: Number(trade.price),
    qty: Number(trade.qty),
    quoteQty: Number(trade.quoteQty),
    commission: Number(trade.commission),
    commissionAsset: trade.commissionAsset,
    commissionUSD: trade.commissionUSD,
    time: trade.time,
    isBuyer: trade.isBuyer,
    isMaker: trade.isMaker,
    syncId,
    fetchedAt: serverTimestamp(),
  };
};

const toPersistedPosition = (uid: string, syncId: string, position: Position): PersistedPosition => {
  const tradeIds = position.trades.map(toTradeDocId);
  return {
    uid,
    symbol: normalizeSymbol(position.symbol),
    status: position.status,
    avgEntryPrice: position.avgEntryPrice,
    avgExitPrice: position.avgExitPrice,
    totalQty: position.totalQty,
    remainingQty: position.remainingQty,
    grossRealizedPnl: position.grossRealizedPnl,
    realizedPnl: position.realizedPnl,
    totalFees: position.totalFees,
    realizedPnlPercentage: position.realizedPnlPercentage,
    entryTime: position.entryTime,
    exitTime: position.exitTime,
    holdingPeriod: position.holdingPeriod,
    lots: position.lots || [],
    tradeIds,
    tradesCount: position.trades.length,
    calculationVersion: TRADE_CALCULATION_VERSION,
    computedAt: Date.now(),
    syncId,
    updatedAt: serverTimestamp(),
  };
};

const toPersistedMetrics = (uid: string, syncId: string, metrics: DashboardMetrics): PersistedMetrics => ({
  uid,
  ...metrics,
  calculationVersion: TRADE_CALCULATION_VERSION,
  computedAt: Date.now(),
  syncId,
  updatedAt: serverTimestamp(),
});

const toSyncMetadata = (
  uid: string,
  syncId: string,
  symbolsSynced: string[],
  tradeCountSynced: number,
  positionsCount: number,
  hasError: boolean,
  lastError?: string
): TradeSyncMetadata => ({
  uid,
  lastSyncTime: Date.now(),
  lastSyncId: syncId,
  symbolsSynced,
  tradeCountSynced,
  positionsCount,
  hasError,
  lastError,
  updatedAt: serverTimestamp(),
});

// Recursively remove undefined values from Firestore documents
const sanitize = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitize(v)])
    );
  }
  return obj;
};

const commitInChunks = async (entries: Array<{ ref: DocumentReference; data: unknown }>) => {
  let batch = writeBatch(db);
  let opCount = 0;
  const commits: Array<Promise<void>> = [];

  const enqueue = (ref: DocumentReference, data: unknown) => {
    // Crucial: Sanitize data to remove 'undefined' fields before Firestore set
    const sanitizedData = sanitize(data);
    batch.set(ref, sanitizedData as Record<string, unknown>, { merge: true });
    opCount += 1;

    if (opCount >= BATCH_LIMIT) {
      commits.push(batch.commit());
      batch = writeBatch(db);
      opCount = 0;
    }
  };

  for (const entry of entries) {
    enqueue(entry.ref, entry.data);
  }

  if (opCount > 0) {
    commits.push(batch.commit());
  }

  await Promise.all(commits);
};

export const persistTradeSyncSnapshot = async (args: {
  uid: string;
  syncId: string;
  symbolsSynced: string[];
  trades: BinanceTrade[];
  positions: Position[];
  metrics: DashboardMetrics;
  balances?: any[];
  status: 'SYNCING' | 'COMPLETED';
}) => {
  const { uid, syncId, symbolsSynced, trades, positions, metrics, balances, status } = args;

  const entries: Array<{ ref: DocumentReference; data: unknown }> = [];

  for (const trade of trades) {
    const tradeDocId = toTradeDocId(trade);
    const tradeData = toPersistedTrade(uid, syncId, trade);
    entries.push({
      ref: doc(db, 'binance_trades', uid, 'items', tradeDocId),
      data: tradeData,
    });
  }

  for (const position of positions) {
    const positionData = toPersistedPosition(uid, syncId, position);
    entries.push({
      ref: doc(db, 'binance_positions', uid, 'items', position.id),
      data: positionData,
    });
  }

  entries.push({
    ref: doc(db, 'binance_metrics', uid),
    data: toPersistedMetrics(uid, syncId, metrics),
  });

  if (balances && balances.length > 0) {
    entries.push({
      ref: doc(db, 'binance_balances', uid),
      data: {
        uid,
        items: balances,
        syncId,
        updatedAt: serverTimestamp()
      }
    });
  }

  entries.push({
    ref: doc(db, 'user_trades_sync', uid),
    data: {
      ...toSyncMetadata(uid, syncId, symbolsSynced, trades.length, positions.length, false),
      status
    },
  });

  await commitInChunks(entries);
};

export const loadPersistedBalances = async (uid: string): Promise<any[]> => {
  const snap = await getDoc(doc(db, 'binance_balances', uid));
  if (!snap.exists()) return [];
  const data = snap.data();
  return data.items || [];
};

export const persistTradeSyncError = async (args: {
  uid: string;
  syncId: string;
  symbolsSynced: string[];
  lastError: string;
}) => {
  const { uid, syncId, symbolsSynced, lastError } = args;

  await commitInChunks([
    {
      ref: doc(db, 'user_trades_sync', uid),
      data: toSyncMetadata(uid, syncId, symbolsSynced, 0, 0, true, lastError),
    },
  ]);
};

const deleteInChunks = async (refs: DocumentReference[]) => {
  let batch = writeBatch(db);
  let opCount = 0;
  const commits: Array<Promise<void>> = [];

  for (const ref of refs) {
    batch.delete(ref);
    opCount += 1;

    if (opCount >= BATCH_LIMIT) {
      commits.push(batch.commit());
      batch = writeBatch(db);
      opCount = 0;
    }
  }

  if (opCount > 0) {
    commits.push(batch.commit());
  }

  await Promise.all(commits);
};

export const prunePersistedTrades = async (uid: string) => {
  let hasMore = true;
  while (hasMore) {
    const q = query(collection(db, 'binance_trades', uid, 'items'), limit(400));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      hasMore = false;
    } else {
      await deleteInChunks(snapshot.docs.map(d => d.ref));
    }
  }
};

export const prunePersistedPositions = async (uid: string) => {
  let hasMore = true;
  while (hasMore) {
    const q = query(collection(db, 'binance_positions', uid, 'items'), limit(400));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      hasMore = false;
    } else {
      await deleteInChunks(snapshot.docs.map(d => d.ref));
    }
  }
};

export const loadPersistedPositions = async (uid: string): Promise<Position[]> => {
  const snap = await getDocs(collection(db, 'binance_positions', uid, 'items'));
  const positions: Position[] = [];

  snap.forEach((docSnap) => {
    const data = docSnap.data() as Partial<PersistedPosition>;

    if (!data.symbol || !data.status || typeof data.entryTime !== 'number') {
      return;
    }

    positions.push({
      id: docSnap.id,
      symbol: data.symbol,
      status: data.status,
      avgEntryPrice: Number(data.avgEntryPrice || 0),
      avgExitPrice: typeof data.avgExitPrice === 'number' ? data.avgExitPrice : undefined,
      totalQty: Number(data.totalQty || 0),
      remainingQty: Number(data.remainingQty || 0),
      grossRealizedPnl: Number(data.grossRealizedPnl || 0),
      realizedPnl: Number(data.realizedPnl || 0),
      totalFees: Number(data.totalFees || 0),
      realizedPnlPercentage: Number(data.realizedPnlPercentage || 0),
      trades: [],
      entryTime: data.entryTime,
      exitTime: typeof data.exitTime === 'number' ? data.exitTime : undefined,
      holdingPeriod: data.holdingPeriod,
      lots: data.lots || [],
    });
  });

  return positions.sort((a, b) => b.entryTime - a.entryTime);
};

export const loadPersistedLastSyncMetadata = async (uid: string): Promise<TradeSyncMetadata | null> => {
  const snap = await getDoc(doc(db, 'user_trades_sync', uid));
  if (!snap.exists()) return null;
  return snap.data() as TradeSyncMetadata;
};

export const loadPersistedLastSync = async (uid: string): Promise<number | null> => {
  const snap = await getDoc(doc(db, 'user_trades_sync', uid));
  if (!snap.exists()) return null;
  const data = snap.data() as Partial<TradeSyncMetadata>;
  return typeof data.lastSyncTime === 'number' ? data.lastSyncTime : null;
};

export const loadPersistedMetrics = async (uid: string): Promise<DashboardMetrics | null> => {
  const snap = await getDoc(doc(db, 'binance_metrics', uid));
  if (!snap.exists()) return null;

  const data = snap.data() as Partial<PersistedMetrics>;
  if (typeof data.totalNetPnl !== 'number' || typeof data.winRate !== 'number') {
    return null;
  }

  return {
    totalNetPnl: data.totalNetPnl,
    totalUnrealizedPnl: Number(data.totalUnrealizedPnl || 0),
    totalEquityPnl: Number(data.totalEquityPnl || 0),
    profitFactor: typeof data.profitFactor === 'number' ? data.profitFactor : null,
    feeDragPct: Number(data.feeDragPct || 0),
    winRate: data.winRate,
    totalTrades: Number(data.totalTrades || 0),
    profitableTrades: Number(data.profitableTrades || 0),
    largestWinner: Number(data.largestWinner || 0),
    largestLoser: Number(data.largestLoser || 0),
    totalFees: Number(data.totalFees || 0),
    avgHoldTimeWinner: Number(data.avgHoldTimeWinner || 0),
    avgHoldTimeLoser: Number(data.avgHoldTimeLoser || 0),
    performanceByPair: (data.performanceByPair || {}) as Record<string, number>,
  };
};

