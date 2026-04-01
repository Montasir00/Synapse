import axios from 'axios';
import { BinanceTrade, Position } from '../types/binance';

export const fetchBinanceTrades = async (
  idToken: string,
  symbol: string,
  baseUrl: string = 'https://api.binance.com'
): Promise<BinanceTrade[]> => {
  try {
    const response = await axios.post('/api/binance/proxy', {
      method: 'GET',
      endpoint: '/api/v3/myTrades',
      params: { symbol },
      baseUrl
    }, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching trades for ${symbol}:`, error);
    throw error;
  }
};

export const fetchBinanceAccount = async (
  idToken: string,
  baseUrl: string = 'https://api.binance.com'
): Promise<any> => {
  try {
    const response = await axios.post('/api/binance/proxy', {
      method: 'GET',
      endpoint: '/api/v3/account',
      params: {},
      baseUrl
    }, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching account:', error);
    throw error;
  }
};

export const processTradesIntoPositions = (trades: BinanceTrade[]): Position[] => {
  if (!trades.length) return [];
  
  const getBaseAsset = (symbol: string) => {
    return symbol.replace(/USDT$|USDC$|BUSD$|FDUSD$|BNB$|BTC$|ETH$/, '');
  };

  // Sort trades by time ascending
  const sortedTrades = [...trades].sort((a, b) => a.time - b.time);
  
  // Group trades by BASE ASSET (e.g. JUP) to handle cross-pair trades
  const tradesByBase: Record<string, BinanceTrade[]> = {};
  for (const trade of sortedTrades) {
    const base = getBaseAsset(trade.symbol);
    if (!tradesByBase[base]) tradesByBase[base] = [];
    tradesByBase[base].push(trade);
  }

  const allPositions: Position[] = [];

  for (const base in tradesByBase) {
    const baseTrades = tradesByBase[base];
    let currentPosition: Partial<Position> | null = null;

    for (const trade of baseTrades) {
      const rawQty = parseFloat(trade.qty);
      const quoteQty = parseFloat(trade.quoteQty);
      const commission = parseFloat(trade.commission);
      const commissionAsset = trade.commissionAsset;

      let effectiveQty = rawQty;
      let effectiveCost = quoteQty;

      if (trade.isBuyer) {
        if (commissionAsset === base) {
          effectiveQty -= commission;
        } else if (/USDT|USDC|BUSD|FDUSD/.test(commissionAsset)) {
          effectiveCost += commission;
        }
        
        if (!currentPosition || currentPosition.status === 'CLOSED') {
          currentPosition = {
            id: `pos_${base}_${trade.time}`,
            symbol: base, // Use base asset as the display name
            status: 'OPEN',
            totalQty: effectiveQty,
            remainingQty: effectiveQty,
            avgEntryPrice: effectiveCost / effectiveQty,
            trades: [trade],
            entryTime: trade.time,
            realizedPnl: 0,
            realizedPnlPercentage: 0
          };
        } else {
          const prevCost = (currentPosition.avgEntryPrice! * currentPosition.totalQty!);
          currentPosition.totalQty! += effectiveQty;
          currentPosition.remainingQty! += effectiveQty;
          currentPosition.avgEntryPrice = (prevCost + effectiveCost) / currentPosition.totalQty!;
          currentPosition.trades!.push(trade);
        }
      } else {
        if (/USDT|USDC|BUSD|FDUSD/.test(commissionAsset)) {
          effectiveCost -= commission;
        }

        if (currentPosition && currentPosition.status === 'OPEN') {
          const entryCostForThisQty = currentPosition.avgEntryPrice! * effectiveQty;
          const pnl = effectiveCost - entryCostForThisQty;
          
          currentPosition.realizedPnl! += pnl;
          currentPosition.remainingQty! -= effectiveQty;
          currentPosition.trades!.push(trade);

          if (currentPosition.remainingQty! <= 0.001) { 
            currentPosition.status = 'CLOSED';
            currentPosition.exitTime = trade.time;
            
            const totalEntryBasis = currentPosition.avgEntryPrice! * currentPosition.totalQty!;
            currentPosition.realizedPnlPercentage = (currentPosition.realizedPnl! / totalEntryBasis) * 100;
            
            allPositions.push(currentPosition as Position);
            currentPosition = null;
          }
        }
      }
    }

    if (currentPosition && currentPosition.status === 'OPEN') {
      allPositions.push(currentPosition as Position);
    }
  }

  return allPositions.sort((a, b) => b.entryTime - a.entryTime);
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
