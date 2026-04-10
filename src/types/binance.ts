export interface BinanceTrade {
  symbol: string;
  id: number | string;
  orderId: number;
  orderListId: number;
  price: string;
  qty: string;
  quoteQty: string;
  commission: string;
  commissionAsset: string;
  commissionUSD?: number; // Normalized to USD during ingestion
  time: number;
  isBuyer: boolean;
  isMaker: boolean;
  isBestMatch: boolean;
}

export interface PositionLot {
  qty: number;
  costUSD: number; // Normalized USD value after numeraire layer
  time: number;
  tradeId: number | string;
}

export interface JournalEntry {
  id: string; // Matches Position.id
  uid: string;
  symbol: string;
  entryReason?: string;
  exitReason?: string;
  emotionTag?: 'FOMO' | 'REVENGE' | 'DISCIPLINED' | 'UNCERTAIN';
  setupType?: string;
  plannedStopUSD?: number;
  plannedTargetUSD?: number;
  followedPlan: boolean;
  rating: number; // 1-5
  rMultiple?: number; // (RealizedPnL / PlannedRisk)
  notes?: string;   // Legacy notes migration
  tags: string[];   // Legacy tags migration
  updatedAt: unknown;
}

export interface Position {
  id: string;
  symbol: string;
  status: 'OPEN' | 'CLOSED';
  avgEntryPrice: number;
  avgExitPrice?: number;
  totalQty: number;
  remainingQty: number;
  grossRealizedPnl: number;
  realizedPnl: number; // Net after fees
  totalFees: number;
  realizedPnlPercentage: number;
  trades: BinanceTrade[];
  entryTime: number;
  exitTime?: number;
  holdingPeriod?: string;
  notes?: string;
  tags?: string[];
  lots: PositionLot[];
}

export interface TradeNote {
  id?: string;
  uid: string;
  tradeId: string;
  symbol: string;
  note: string;
  tags: string[];
  createdAt: string;
}

export interface DashboardMetrics {
  totalNetPnl: number;
  totalUnrealizedPnl: number;
  totalEquityPnl: number;
  profitFactor: number | null;
  feeDragPct: number;
  winRate: number;
  totalTrades: number;
  profitableTrades: number;
  largestWinner: number;
  largestLoser: number;
  totalFees?: number;
  avgHoldTimeWinner?: number;
  avgHoldTimeLoser?: number;
  tagPerformance?: Record<string, { pnl: number; count: number }>;
  performanceByPair: Record<string, number>;
}

export const TRADE_CALCULATION_VERSION = 1;

export interface PersistedBinanceTrade {
  uid: string;
  symbol: string;
  baseAsset: string;
  id: number | string;
  orderId: number;
  price: number;
  qty: number;
  quoteQty: number;
  commission: number;
  commissionAsset: string;
  commissionUSD?: number;
  time: number;
  isBuyer: boolean;
  isMaker: boolean;
  syncId: string;
  fetchedAt: unknown;
}

export interface PersistedPosition {
  uid: string;
  symbol: string;
  status: 'OPEN' | 'CLOSED';
  avgEntryPrice: number;
  avgExitPrice?: number;
  totalQty: number;
  remainingQty: number;
  grossRealizedPnl: number;
  realizedPnl: number;
  totalFees: number;
  realizedPnlPercentage: number;
  entryTime: number;
  exitTime?: number;
  holdingPeriod?: string;
  notes?: string;
  tags?: string[];
  lots: PositionLot[];
  tradeIds: string[];
  tradesCount: number;
  calculationVersion: number;
  computedAt: number;
  syncId: string;
  updatedAt: unknown;
}

export interface PersistedMetrics {
  uid: string;
  totalNetPnl: number;
  totalUnrealizedPnl: number;
  totalEquityPnl: number;
  profitFactor: number | null;
  feeDragPct: number;
  winRate: number;
  totalTrades: number;
  profitableTrades: number;
  largestWinner: number;
  largestLoser: number;
  totalFees?: number;
  avgHoldTimeWinner?: number;
  avgHoldTimeLoser?: number;
  tagPerformance?: Record<string, { pnl: number; count: number }>;
  performanceByPair: Record<string, number>;
  calculationVersion: number;
  computedAt: number;
  syncId: string;
  updatedAt: unknown;
}

export interface TradeSyncMetadata {
  uid: string;
  lastSyncTime: number;
  lastSyncId: string;
  symbolsSynced: string[];
  tradeCountSynced: number;
  positionsCount: number;
  hasError: boolean;
  lastError?: string;
  updatedAt: unknown;
  status?: 'SYNCING' | 'COMPLETED';
}
