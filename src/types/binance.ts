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
