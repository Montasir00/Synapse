import { useMemo } from 'react';
import { format } from 'date-fns';
import { Position, JournalEntry } from '../../types/binance';
import { calculateMetrics } from '../../services/binanceService';

export const useTradeAnalytics = (positions: Position[], journals: Record<string, JournalEntry>, currentPrices: Record<string, number> = {}) => {
  // 1. Core Metrics (Derived from raw positions)
  const metrics = useMemo(() => calculateMetrics(positions, currentPrices), [positions, currentPrices]);

  // 2. Equity Progression Graph (Derived from closed positions)
  const equityCurveData = useMemo(() => {
    const closed = [...positions]
      .filter(p => p.status === 'CLOSED')
      .sort((a, b) => (a.exitTime || 0) - (b.exitTime || 0));
    
    let cumulative = 0;
    return closed.map(p => {
      cumulative += p.realizedPnl;
      return {
        time: format(p.exitTime || 0, 'MMM d'),
        pnl: Number(cumulative.toFixed(2)),
        tradePnl: Number(p.realizedPnl.toFixed(2))
      };
    });
  }, [positions]);

  // 3. Golden Hour Analysis (Derived from entry timestamps)
  const heatmapData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, pnl: 0, count: 0 }));
    
    positions.filter(p => p.status === 'CLOSED').forEach(p => {
      // Calibrate to Sicily (Europe/Rome)
      const date = new Date(p.entryTime);
      const hour = parseInt(date.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Europe/Rome' }));
      hours[hour].pnl += p.realizedPnl;
      hours[hour].count += 1;
    });
    
    return hours.map(h => ({ ...h, pnl: Number(h.pnl.toFixed(2)) }));
  }, [positions]);

  // 4. Bias & Pattern Detection (Derived from cross-joining positions and journals)
  const biasMetrics = useMemo(() => {
    const commonMistakes = ['FOMO', 'No Stop Loss', 'Chasing Green', 'Revenge Trading', 'Over-leveraged', 'Followed Plan', 'Early Exit', 'Late Entry'];
    
    const mistakeMetrics = commonMistakes.map(mistake => {
      const relatedJournals = Object.values(journals).filter(j => j.tags.includes(mistake));
      const relatedIds = new Set(relatedJournals.map(j => j.id));
      
      const relatedPositions = positions.filter(p => relatedIds.has(p.id));
      const count = relatedPositions.length;
      const pnl = relatedPositions.reduce((acc, p) => acc + p.realizedPnl, 0);

      return {
        tag: mistake,
        count,
        pnl: Number(pnl.toFixed(2))
      };
    }).filter(m => m.count > 0);

    return mistakeMetrics;
  }, [positions, journals]);

  return {
    metrics,
    equityCurveData,
    heatmapData,
    biasMetrics
  };
};
