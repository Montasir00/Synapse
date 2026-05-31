import { Position, DashboardMetrics } from '../types/binance';

export const calculateMetrics = (positions: Position[], currentPrices: Record<string, number> = {}): DashboardMetrics => {
  const closedPositions = positions.filter(p => p.status === 'CLOSED');
  const openPositions = positions.filter(p => p.status === 'OPEN');
  
  const totalNetPnl = closedPositions.reduce((acc, p) => acc + p.realizedPnl, 0);
  const totalGrossPnl = closedPositions.reduce((acc, p) => acc + p.grossRealizedPnl, 0);
  const profitableTrades = closedPositions.filter(p => p.realizedPnl > 0).length;
  const winRate = closedPositions.length > 0 ? (profitableTrades / closedPositions.length) * 100 : 0;
  
  let totalUnrealizedPnl = 0;
  openPositions.forEach(pos => {
    const priceKeyUSDT = `${pos.symbol}USDT`;
    const priceKeyUSDC = `${pos.symbol}USDC`;
    const cp = currentPrices[priceKeyUSDT] ?? currentPrices[priceKeyUSDC] ?? null;
    
    // Fallback to 0 P&L if price is missing, but explicitly handle the null price state
    const unrealized = cp !== null ? (cp - pos.avgEntryPrice) * pos.remainingQty : 0;
    totalUnrealizedPnl += unrealized;
  });

  const totalEquityPnl = totalNetPnl + totalUnrealizedPnl;

  const largestWinner = Math.max(...closedPositions.map(p => p.realizedPnl), 0);
  const largestLoser = Math.min(...closedPositions.map(p => p.realizedPnl), 0);
  
  let totalFees = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let winnerHoldSum = 0;
  let loserHoldSum = 0;
  const performanceByPair: Record<string, number> = {};

  closedPositions.forEach(p => {
    totalFees += p.totalFees || 0;
    
    if (p.grossRealizedPnl > 0) {
      grossProfit += p.grossRealizedPnl;
      winnerHoldSum += (p.exitTime || 0) - (p.entryTime || 0);
    } else {
      grossLoss += Math.abs(p.grossRealizedPnl);
      loserHoldSum += (p.exitTime || 0) - (p.entryTime || 0);
    }

    performanceByPair[p.symbol] = (performanceByPair[p.symbol] || 0) + p.realizedPnl;
  });

  const avgHoldTimeWinner = profitableTrades > 0 ? (winnerHoldSum / profitableTrades) : 0;
  const numLosers = closedPositions.length - profitableTrades;
  const avgHoldTimeLoser = numLosers > 0 ? (loserHoldSum / numLosers) : 0;

  const profitFactor = grossLoss === 0 ? null : grossProfit / grossLoss;
  const feeDragPct = totalGrossPnl > 0 ? (totalFees / totalGrossPnl) * 100 : 0;

  return {
    totalNetPnl,
    totalGrossPnl,
    totalUnrealizedPnl,
    totalEquityPnl,
    totalFees,
    winRate,
    profitFactor,
    feeDragPct,
    totalTrades: closedPositions.length,
    profitableTrades,
    largestWinner,
    largestLoser,
    avgHoldTimeWinner,
    avgHoldTimeLoser,
    performanceByPair
  };
};
