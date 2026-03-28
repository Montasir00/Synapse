import axios from 'axios';
import { BinanceTrade, Position } from '../types/binance';

export const fetchBinanceTrades = async (
  apiKey: string,
  apiSecret: string,
  symbol: string,
  baseUrl: string = 'https://api.binance.com'
): Promise<BinanceTrade[]> => {
  try {
    const response = await axios.post('/api/binance/proxy', {
      method: 'GET',
      endpoint: '/api/v3/myTrades',
      params: { symbol },
      apiKey,
      apiSecret,
      baseUrl
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching trades for ${symbol}:`, error);
    throw error;
  }
};

export const processTradesIntoPositions = (trades: BinanceTrade[]): Position[] => {
  // Sort trades by time ascending
  const sortedTrades = [...trades].sort((a, b) => a.time - b.time);
  
  const positions: Position[] = [];
  let currentPosition: Partial<Position> | null = null;

  for (const trade of sortedTrades) {
    const price = parseFloat(trade.price);
    const qty = parseFloat(trade.qty);
    const quoteQty = parseFloat(trade.quoteQty);
    const commission = parseFloat(trade.commission);
    
    if (trade.isBuyer) {
      // Buy trade
      if (!currentPosition || currentPosition.status === 'CLOSED') {
        // Start new position
        currentPosition = {
          id: `pos_${trade.symbol}_${trade.time}`,
          symbol: trade.symbol,
          status: 'OPEN',
          totalQty: qty,
          remainingQty: qty,
          avgEntryPrice: (quoteQty + commission) / qty, // Include commission in entry cost
          trades: [trade],
          entryTime: trade.time,
          realizedPnl: 0,
          realizedPnlPercentage: 0
        };
      } else {
        // Add to existing position (DCA)
        const totalCost = (currentPosition.avgEntryPrice! * currentPosition.totalQty!) + quoteQty + commission;
        currentPosition.totalQty! += qty;
        currentPosition.remainingQty! += qty;
        currentPosition.avgEntryPrice = totalCost / currentPosition.totalQty!;
        currentPosition.trades!.push(trade);
      }
    } else {
      // Sell trade
      if (currentPosition && currentPosition.status === 'OPEN') {
        const sellPrice = price;
        const sellQty = qty;
        const sellQuoteQty = quoteQty - commission; // Deduct commission from proceeds
        
        const entryCostForThisQty = currentPosition.avgEntryPrice! * sellQty;
        const pnl = sellQuoteQty - entryCostForThisQty;
        
        currentPosition.realizedPnl! += pnl;
        currentPosition.remainingQty! -= sellQty;
        currentPosition.trades!.push(trade);

        if (currentPosition.remainingQty! <= 0.00000001) { // Floating point safety
          currentPosition.status = 'CLOSED';
          currentPosition.exitTime = trade.time;
          currentPosition.avgExitPrice = currentPosition.trades!
            .filter(t => !t.isBuyer)
            .reduce((acc, t) => acc + parseFloat(t.quoteQty), 0) / currentPosition.totalQty!;
          
          currentPosition.realizedPnlPercentage = (currentPosition.realizedPnl! / (currentPosition.avgEntryPrice! * currentPosition.totalQty!)) * 100;
          
          positions.push(currentPosition as Position);
          currentPosition = null;
        }
      }
    }
  }

  // If there's an open position left, add it to the list
  if (currentPosition && currentPosition.status === 'OPEN') {
    positions.push(currentPosition as Position);
  }

  return positions.reverse(); // Newest first
};

export const calculateMetrics = (positions: Position[]) => {
  const closedPositions = positions.filter(p => p.status === 'CLOSED');
  
  const totalNetPnl = closedPositions.reduce((acc, p) => acc + p.realizedPnl, 0);
  const profitableTrades = closedPositions.filter(p => p.realizedPnl > 0).length;
  const winRate = closedPositions.length > 0 ? (profitableTrades / closedPositions.length) * 100 : 0;
  
  const largestWinner = Math.max(...closedPositions.map(p => p.realizedPnl), 0);
  const largestLoser = Math.min(...closedPositions.map(p => p.realizedPnl), 0);
  
  const performanceByPair: Record<string, number> = {};
  closedPositions.forEach(p => {
    performanceByPair[p.symbol] = (performanceByPair[p.symbol] || 0) + p.realizedPnl;
  });

  return {
    totalNetPnl,
    winRate,
    totalTrades: closedPositions.length,
    profitableTrades,
    largestWinner,
    largestLoser,
    performanceByPair
  };
};
