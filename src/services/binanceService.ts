import axios from 'axios';
import { BinanceTrade, Position, PositionLot } from '../types/binance';

export const STABLE_MAP: Record<string, number> = { 'USDT': 1, 'USDC': 1, 'FDUSD': 1, 'BUSD': 1 };
const DUST_THRESHOLD_USD = 0.10;

/**
 * Normalizes any stablecoin quote to a virtual USD unit (1.0).
 * Future expansion: Add real-time peg API here for extreme precision.
 */
const normalizeToUSD = (quote: string, amount: number): number => {
  return amount * (STABLE_MAP[quote] || 1.0);
};

/**
 * Fetches the historical price of an asset at a specific timestamp.
 * Used for precise fee conversion (e.g. BNB -> USD).
 */
export const getHistoricalPrice = async (
  idToken: string,
  symbol: string,
  timestamp: number,
  baseUrl: string = 'https://api.binance.com'
): Promise<number> => {
  try {
    const response = await axios.post('/api/binance/proxy', {
      method: 'GET',
      endpoint: '/api/v3/klines',
      params: { symbol, interval: '1m', startTime: timestamp, limit: 1 },
      baseUrl
    }, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
    if (response.data && response.data[0]) {
      return parseFloat(response.data[0][4]); // Use Close price
    }
    return 0;
  } catch {
    return 0;
  }
};

export const fetchBinanceTrades = async (
  idToken: string,
  symbol: string,
  baseUrl: string = 'https://api.binance.com',
  encryptedApiKey?: string,
  encryptedApiSecret?: string
): Promise<BinanceTrade[]> => {
  const allTrades: BinanceTrade[] = [];
  let fromId: number | undefined = undefined;
  let fetching = true;

  try {
    while (fetching) {
      const response = await axios.post('/api/binance/proxy', {
        method: 'GET',
        endpoint: '/api/v3/myTrades',
        params: { symbol, limit: 1000, fromId },
        baseUrl,
        encryptedApiKey,
        encryptedApiSecret,
      }, {
        headers: { Authorization: `Bearer ${idToken}` }
      });

      const trades: BinanceTrade[] = response.data;
      if (trades.length === 0) {
        fetching = false;
      } else {
        allTrades.push(...trades);
        if (trades.length < 1000) {
          fetching = false;
        } else {
          // Point to next id for recursive fetch
          fromId = trades[trades.length - 1].id + 1;
        }
      }
    }
    return allTrades;
  } catch (error) {
    console.error(`Error fetching trades for ${symbol}:`, error);
    throw error;
  }
};

export const fetchBinanceAccount = async (
  idToken: string,
  baseUrl: string = 'https://api.binance.com',
  encryptedApiKey?: string,
  encryptedApiSecret?: string
): Promise<any> => {
  try {
    const response = await axios.post('/api/binance/proxy', {
      method: 'GET',
      endpoint: '/api/v3/account',
      params: {},
      baseUrl,
      encryptedApiKey,
      encryptedApiSecret,
    }, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching account:', error);
    throw error;
  }
};

export const validateBinanceCredentials = async (
  idToken: string,
  apiKey: string,
  apiSecret: string,
  baseUrl: string = 'https://api.binance.com'
): Promise<{ ok: boolean; msg?: string; code?: number | null }> => {
  try {
    const response = await axios.post('/api/binance/validate', {
      apiKey,
      apiSecret,
      baseUrl,
    }, {
      headers: { 
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      withCredentials: false
    });

    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data;
    }
    throw error;
  }
};

export const fetchBinanceExchangeInfo = async (
  idToken: string,
  baseUrl: string = 'https://api.binance.com'
): Promise<{ symbols: Array<{ symbol: string; baseAsset: string; quoteAsset: string }> }> => {
  try {
    const response = await axios.post('/api/binance/proxy', {
      method: 'GET',
      endpoint: '/api/v3/exchangeInfo',
      params: {},
      baseUrl
    }, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching exchange info:', error);
    throw error;
  }
};

export const getQuoteAsset = (symbol: string): string => {
  const quotes = ['USDT', 'USDC', 'FDUSD', 'BUSD', 'BNB', 'BTC', 'ETH', 'EUR', 'TRY', 'GBP'];
  for (const q of quotes) {
    if (symbol.endsWith(q)) return q;
  }
  return '';
};

const getBaseAsset = (symbol: string): string => {
  const quote = getQuoteAsset(symbol);
  return symbol.slice(0, symbol.length - quote.length);
};

export const processTradesIntoPositions = (
  trades: BinanceTrade[], 
  historicalPrices: Record<string, number> = {}, // Map of "BNBUSDT_timestamp" -> price
  existingPositions: Position[] = [] // THE METADATA PRESERVATION LAYER
): Position[] => {
  if (!trades.length) return [];
  
  // Index existing positions for fast metadata lookup
  const existingMetadataMap = new Map<string, { notes?: string; tags?: string[] }>();
  (existingPositions || []).forEach(p => {
    if (p.notes || (p.tags && p.tags.length > 0)) {
      existingMetadataMap.set(p.id, { notes: p.notes, tags: p.tags });
    }
  });

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
      const quote = getQuoteAsset(trade.symbol);
      const rawQty = parseFloat(trade.qty);
      const quoteQty = parseFloat(trade.quoteQty);
      const commission = parseFloat(trade.commission);
      const commissionAsset = trade.commissionAsset;

      // 1. Normalize Trade Value to USD (The Numeraire Layer)
      let normalizedEntryValueUSD = 0;
      if (STABLE_MAP[quote]) {
        normalizedEntryValueUSD = normalizeToUSD(quote, quoteQty);
      } else {
        const priceKey = `${quote}USDT_${Math.floor(trade.time / 60000) * 60000}`;
        const hPrice = historicalPrices[priceKey] || 0;
        
        if (hPrice === 0) {
          console.warn(`[Math Engine] Missing historical price for ${quote} at ${trade.time} (1-minute resolution). P&L for trade ${trade.id} will be deferred.`);
          normalizedEntryValueUSD = 0; // FORCE ZERO TO PREVENT BTC -> USD CORRUPTION
        } else {
          normalizedEntryValueUSD = quoteQty * hPrice;
        }
      }

      // 2. Normalize Commission to USD (The Fee Layer)
      let commissionUSD = 0;
      if (STABLE_MAP[commissionAsset]) {
        commissionUSD = commission;
      } else if (commissionAsset === base) {
        // Fee paid in the asset being traded (e.g. JUP)
        // Its USD value is (commission / rawQty) * normalizedEntryValueUSD
        commissionUSD = rawQty > 0 ? (commission / rawQty) * normalizedEntryValueUSD : 0;
      } else {
        // Fee paid in something else (usually BNB)
        const feeKey = `${commissionAsset}USDT_${Math.floor(trade.time / 60000) * 60000}`;
        commissionUSD = commission * (historicalPrices[feeKey] || 0);
      }

      let effectiveQty = rawQty;
      let effectiveCostUSD = normalizedEntryValueUSD;
      trade.commissionUSD = commissionUSD; // Capture for Learning Engine (Fee Drag)

      if (trade.isBuyer) {
        if (commissionAsset === base) {
          effectiveQty -= commission;
        } else {
          effectiveCostUSD += commissionUSD;
        } 
        
        const newLot: PositionLot = {
           qty: effectiveQty,
           costUSD: effectiveCostUSD,
           time: trade.time,
           tradeId: trade.id
        };

        if (!currentPosition || currentPosition.status === 'CLOSED') {
          // Use trade.id for collision-proof metadata mapping
          const posId = `pos_${base}_${trade.id}_${trade.time}`;
          const metadata = existingMetadataMap.get(posId);
          currentPosition = {
            id: posId,
            symbol: base,
            status: 'OPEN',
            totalQty: effectiveQty,
            remainingQty: effectiveQty,
            avgEntryPrice: newLot.costUSD / newLot.qty,
            trades: [trade],
            entryTime: trade.time,
            grossRealizedPnl: 0,
            realizedPnl: 0,
            totalFees: commissionUSD,
            realizedPnlPercentage: 0,
            notes: metadata?.notes,
            tags: metadata?.tags || [],
            lots: [newLot]
          };
        } else {
          currentPosition.totalQty! += effectiveQty;
          currentPosition.remainingQty! += effectiveQty;
          currentPosition.totalFees! += commissionUSD;
          currentPosition.trades!.push(trade);
          currentPosition.lots!.push(newLot);
          
          // Re-calculate weighted avg for display
          const totalBasis = currentPosition.lots!.reduce((acc, l) => acc + l.costUSD, 0);
          currentPosition.avgEntryPrice = totalBasis / currentPosition.remainingQty!;
        }
      } else {
        // Seller logic - INSTITUTIONAL FIFO REFACOR
        const rawExitValueUSD = normalizedEntryValueUSD - commissionUSD;
        const sellPrice = rawExitValueUSD / effectiveQty; 

        if (currentPosition && currentPosition.status === 'OPEN') {
          let remainingToSell = effectiveQty;
          let totalPnlForThisSell = 0;

          // Consume lots from the front (FIFO) using costUSD
          while (remainingToSell > 0 && currentPosition.lots!.length > 0) {
             const lot = currentPosition.lots![0];
             const qtyToTake = Math.min(lot.qty, remainingToSell);
             
             // Lot-Specific Basis Calculation
             const costBasisForThisPiece = (lot.costUSD / lot.qty) * qtyToTake;
             const pieceGrossExitValue = sellPrice * qtyToTake;
             
             const pieceGrossPnl = pieceGrossExitValue - costBasisForThisPiece;
             totalPnlForThisSell += pieceGrossPnl; // Gross for now, net later
             
             lot.costUSD -= costBasisForThisPiece;
             lot.qty -= qtyToTake;
             remainingToSell -= qtyToTake;

             if (lot.qty <= 0) {
                currentPosition.lots!.splice(0, 1);
             }
          }
          
          currentPosition.grossRealizedPnl! += totalPnlForThisSell;
          currentPosition.totalFees! += commissionUSD;
          currentPosition.realizedPnl! = currentPosition.grossRealizedPnl! - currentPosition.totalFees!;
          currentPosition.remainingQty! -= effectiveQty;
          currentPosition.trades!.push(trade);

          if (!currentPosition.avgExitPrice) {
            currentPosition.avgExitPrice = 0;
            (currentPosition as any).totalExitValue = 0;
            (currentPosition as any).totalExitQty = 0;
          }
          (currentPosition as any).totalExitValue += normalizedEntryValueUSD - commissionUSD;
          (currentPosition as any).totalExitQty += effectiveQty;

          const remainingValueUSD = currentPosition.remainingQty! * currentPosition.avgEntryPrice!;
          if (currentPosition.remainingQty! <= 0 || remainingValueUSD < DUST_THRESHOLD_USD) { 
            currentPosition.status = 'CLOSED';
            currentPosition.exitTime = trade.time;
            currentPosition.avgExitPrice = (currentPosition as any).totalExitValue / (currentPosition as any).totalExitQty;
            
            const totalEntryBasis = currentPosition.totalQty! * currentPosition.avgEntryPrice!;
            currentPosition.realizedPnlPercentage = (currentPosition.realizedPnl! / totalEntryBasis) * 100;
            
            allPositions.push(currentPosition as Position);
            currentPosition = null;
          } else {
              // For open positions, keep avgEntryPrice as the average of REMAINING lots
              if (currentPosition.lots!.length > 0) {
                const remainingBasisUSD = currentPosition.lots!.reduce((acc, l) => acc + l.costUSD, 0);
                currentPosition.avgEntryPrice = remainingBasisUSD / currentPosition.remainingQty!;
              }
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
  const totalGrossPnl = closedPositions.reduce((acc, p) => acc + p.grossRealizedPnl, 0);
  const profitableTrades = closedPositions.filter(p => p.realizedPnl > 0).length;
  const winRate = closedPositions.length > 0 ? (profitableTrades / closedPositions.length) * 100 : 0;
  
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

  // PROFIT FACTOR GUARD: Return null if no losses to prevent Infinity
  const profitFactor = grossLoss === 0 ? null : grossProfit / grossLoss;
  const feeDragPct = totalGrossPnl > 0 ? (totalFees / totalGrossPnl) * 100 : 0;

  return {
    totalNetPnl,
    totalGrossPnl,
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
