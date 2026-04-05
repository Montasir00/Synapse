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
    orderListId: trade.orderListId,
    price: Number(trade.price),
    qty: Number(trade.qty),
    quoteQty: Number(trade.quoteQty),
    commission: Number(trade.commission),
    commissionAsset: trade.commissionAsset,
    time: trade.time,
    isBuyer: trade.isBuyer,
    isMaker: trade.isMaker,
    isBestMatch: trade.isBestMatch,
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
    realizedPnl: position.realizedPnl,
    realizedPnlPercentage: position.realizedPnlPercentage,
    entryTime: position.entryTime,
    exitTime: position.exitTime,
    holdingPeriod: position.holdingPeriod,
    notes: position.notes,
    tags: position.tags ?? [],
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

const commitInChunks = async (entries: Array<{ ref: DocumentReference; data: unknown }>) => {
  let batch = writeBatch(db);
  let opCount = 0;
  const commits: Array<Promise<void>> = [];

  const enqueue = (ref: DocumentReference, data: unknown) => {
    batch.set(ref, data as Record<string, unknown>, { merge: true });
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
}) => {
  const { uid, syncId, symbolsSynced, trades, positions, metrics } = args;

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

  entries.push({
    ref: doc(db, 'user_trades_sync', uid),
    data: toSyncMetadata(uid, syncId, symbolsSynced, trades.length, positions.length, false),
  });

  await commitInChunks(entries);
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
      realizedPnl: Number(data.realizedPnl || 0),
      realizedPnlPercentage: Number(data.realizedPnlPercentage || 0),
      trades: [],
      entryTime: data.entryTime,
      exitTime: typeof data.exitTime === 'number' ? data.exitTime : undefined,
      holdingPeriod: data.holdingPeriod,
      notes: data.notes,
      tags: data.tags || [],
    });
  });

  return positions.sort((a, b) => b.entryTime - a.entryTime);
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
    winRate: data.winRate,
    totalTrades: Number(data.totalTrades || 0),
    profitableTrades: Number(data.profitableTrades || 0),
    largestWinner: Number(data.largestWinner || 0),
    largestLoser: Number(data.largestLoser || 0),
    performanceByPair: (data.performanceByPair || {}) as Record<string, number>,
  };
};

export const prunePersistedTrades = async (uid: string, olderThanMs: number): Promise<number> => {
  const tradesRef = collection(db, 'binance_trades', uid, 'items');
  const q = query(tradesRef, where('time', '<', olderThanMs), limit(PRUNE_BATCH_LIMIT));
  const snap = await getDocs(q);

  if (snap.empty) {
    return 0;
  }

  const deletions = snap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletions);
  return snap.size;
};
