export interface BinanceTrade {
  symbol: string;
  id: number;
  orderId: number;
  orderListId: number;
  price: string;
  qty: string;
  quoteQty: string;
  commission: string;
  commissionAsset: string;
  time: number;
  isBuyer: boolean;
  isMaker: boolean;
  isBestMatch: boolean;
}

export interface Position {
  id: string;
  symbol: string;
  status: 'OPEN' | 'CLOSED';
  avgEntryPrice: number;
  avgExitPrice?: number;
  totalQty: number;
  remainingQty: number;
  realizedPnl: number;
  realizedPnlPercentage: number;
  trades: BinanceTrade[];
  entryTime: number;
  exitTime?: number;
  holdingPeriod?: string;
  notes?: string;
  tags?: string[];
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
  winRate: number;
  totalTrades: number;
  profitableTrades: number;
  largestWinner: number;
  largestLoser: number;
  performanceByPair: Record<string, number>;
}

export const TRADE_CALCULATION_VERSION = 1;

export interface PersistedBinanceTrade {
  uid: string;
  symbol: string;
  baseAsset: string;
  id: number;
  orderId: number;
  orderListId: number;
  price: number;
  qty: number;
  quoteQty: number;
  commission: number;
  commissionAsset: string;
  time: number;
  isBuyer: boolean;
  isMaker: boolean;
  isBestMatch: boolean;
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
  realizedPnl: number;
  realizedPnlPercentage: number;
  entryTime: number;
  exitTime?: number;
  holdingPeriod?: string;
  notes?: string;
  tags?: string[];
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
  winRate: number;
  totalTrades: number;
  profitableTrades: number;
  largestWinner: number;
  largestLoser: number;
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
}
