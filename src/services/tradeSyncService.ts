import { BinanceTrade, Position, DashboardMetrics } from '../types/binance';
import { 
  fetchBinanceTrades, 
  fetchBinanceAccount, 
  processTradesIntoPositions, 
  calculateMetrics,
  STABLE_MAP,
  getQuoteAsset
} from './binanceService';
import {
  createSyncId,
  persistTradeSyncSnapshot,
  persistTradeSyncError,
} from './tradePersistenceService';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface SyncResult {
  success: boolean;
  tradeCount: number;
  balances?: any[];
  error?: string;
}

// Cross-sync session cache for high-precision historical prices
const historicalPriceCache: Record<string, number> = {};

export const performGlobalTradeSync = async (
  idToken: string,
  uid: string
): Promise<SyncResult> => {
  const syncId = createSyncId();
  
  // 1. Get configurations from localStorage
  const baseUrl = localStorage.getItem('binance_base_url') || 'https://api.binance.com';
  let encryptedApiKey: string | undefined = undefined;
  let encryptedApiSecret: string | undefined = undefined;

  try {
    const secretDoc = await getDoc(doc(db, 'user_secrets', uid));
    if (secretDoc.exists()) {
      const data = secretDoc.data();
      encryptedApiKey = data?.binanceApiKey;
      encryptedApiSecret = data?.binanceApiSecret;
    }
  } catch (err) {
    console.warn('[Sync Service] Failed to read user_secrets via client SDK', err);
  }

  if (!encryptedApiKey || !encryptedApiSecret) {
    return { success: false, tradeCount: 0, error: 'Binance credentials not found in vault. Please save them in Settings first.' };
  }
  
  // 1. Load Cloud Infrastructure (Stale Lock check + Symbol Discovery + Metadata Preservation)
  let existingPositions: Position[] = [];
  let masterSymbolList = new Set<string>(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'NEARUSDC']);
  
  try {
    const { loadPersistedPositions, loadPersistedLastSyncMetadata } = await import('./tradePersistenceService');
    const [positions, metadata] = await Promise.all([
      loadPersistedPositions(uid),
      loadPersistedLastSyncMetadata(uid)
    ]);
    existingPositions = positions;

    if (metadata) {
      // Stale Lock Check
      if (metadata.status === 'SYNCING') {
        const tenMinutesMs = 10 * 60 * 1000;
        if (Date.now() - (metadata.lastSyncTime || 0) < tenMinutesMs) {
          return { success: false, tradeCount: 0, error: 'Sync already in progress. Please wait.' };
        }
        console.warn('[Sync Service] Stale lock detected and bypassed.');
      }
      // Symbol Discovery
      if (metadata.symbolsSynced && Array.isArray(metadata.symbolsSynced)) {
        (metadata.symbolsSynced || []).forEach(s => masterSymbolList.add(s));
      }
    }
  } catch (infraErr) {
    console.warn('[Sync Service] Cloud infra lookup failed, using local defaults', infraErr);
  }

  // Include local storage symbols as well
  const storedSymbols = localStorage.getItem('binance_symbols');
  if (storedSymbols) {
    try {
      const parsed = JSON.parse(storedSymbols);
      (Array.isArray(parsed) ? parsed : []).forEach(s => masterSymbolList.add(String(s).toUpperCase()));
    } catch {}
  }

  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
  const symbols = Array.from(masterSymbolList);
  let finalBalances: any[] = [];

  try {
    // Stage 1: Mark as Syncing (The Transaction Boundary)
    await persistTradeSyncSnapshot({
      uid,
      syncId,
      symbolsSynced: symbols,
      trades: [],
      positions: existingPositions,
      metrics: calculateMetrics(existingPositions),
      status: 'SYNCING'
    });

    // Stage 2: Wallet-Asset Discovery (Strict Order)
    let activeAssets = new Set<string>();
    try {
      const account = await fetchBinanceAccount(idToken, baseUrl, encryptedApiKey, encryptedApiSecret);
      finalBalances = account.balances || [];
      activeAssets = new Set(finalBalances
        .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
        .map((b: any) => b.asset)
      );
    } catch (accErr) {
      console.warn('[Sync Service] Account lookup failed', accErr);
      symbols.forEach(s => activeAssets.add(getQuoteAsset(s) === s ? s : s.replace(getQuoteAsset(s), '')));
    }

    // Stage 3: Exchange Symbol Filtering
    const discoverySymbols = new Set<string>(symbols);
    try {
      const { fetchBinanceExchangeInfo } = await import('./binanceService');
      const exchangeInfo = await fetchBinanceExchangeInfo(idToken, baseUrl);
      const quoteAssets = ['USDT', 'USDC', 'FDUSD', 'BTC', 'ETH', 'BNB', 'EUR', 'BUSD'];
      
      (exchangeInfo?.symbols || []).forEach((s: any) => {
        if (activeAssets.has(s.baseAsset) && quoteAssets.includes(s.quoteAsset)) {
          discoverySymbols.add(s.symbol);
        }
      });
    } catch {}

    // Stage 4: Full-History Trade Fetch (NO MORE SLICING - Issue #1)
    const allTrades: BinanceTrade[] = [];
    const syncList = Array.from(discoverySymbols); 
    
    for (const symbolS of syncList) {
      try {
        const trades = await fetchBinanceTrades(idToken, symbolS, baseUrl, encryptedApiKey, encryptedApiSecret);
        if (trades.length > 0) allTrades.push(...trades);
        await sleep(250); // Safety Throttle
      } catch (err) {
        if (symbols.includes(symbolS)) console.error(`[Sync] Failed ${symbolS}`, err);
      }
    }

    // 4. Audit Pass: Discover fees and non-stable quote assets for USD normalization
    const historicalPricesMap: Record<string, number> = {};
    const discoveryKeys = new Set<string>();
    
    allTrades.forEach(t => {
      const q = getQuoteAsset(t.symbol);
      const c = t.commissionAsset;
      const isBase = t.symbol.startsWith(c);
      
      // 1. Fee Discovery: If fee is paid in a non-stable that isn't the coin we bought, fetch its USD price
      if (!STABLE_MAP[c] && !isBase) {
        discoveryKeys.add(`${c}USDT_${Math.floor(t.time / 60000) * 60000}`);
      }
      
      // 2. Quote Discovery: For cross-quote pairs (e.g. NEARBTC), we need the quote (BTC) USD price
      if (!STABLE_MAP[q]) {
        discoveryKeys.add(`${q}USDT_${Math.floor(t.time / 60000) * 60000}`);
      }
    });

    // Unified Rate-Limited Lookup Pass (NO MORE SLICING - Issue #2)
    const lookupList = Array.from(discoveryKeys);
    const { getHistoricalPrice } = await import('./binanceService');

    for (const key of lookupList) {
      if (historicalPriceCache[key]) {
        historicalPricesMap[key] = historicalPriceCache[key];
        continue;
      }
      const [sym, timeStr] = key.split('_');
      try {
        const price = await getHistoricalPrice(idToken, sym, parseInt(timeStr), baseUrl);
        if (price > 0) {
          historicalPriceCache[key] = price;
          historicalPricesMap[key] = price;
          await sleep(150); // Rate limit jitter
        }
      } catch {}
    }

    // Stage 6: P&L Handover
    const processedPositions = processTradesIntoPositions(allTrades, historicalPricesMap, existingPositions);
    const metricsSnapshot = calculateMetrics(processedPositions);

    // Stage 7: Persistence Promotion
    await persistTradeSyncSnapshot({
      uid,
      syncId,
      symbolsSynced: Array.from(discoverySymbols),
      trades: allTrades,
      positions: processedPositions,
      metrics: metricsSnapshot,
      balances: finalBalances,
      status: 'COMPLETED'
    });

    localStorage.setItem('binance_last_synced', new Date().toISOString());
    return { success: true, tradeCount: allTrades.length, balances: finalBalances };

  } catch (err: any) {
    const errorMsg = err?.response?.data?.msg || err?.message || 'Trade sync failed';
    await persistTradeSyncError({ uid, syncId, symbolsSynced: symbols, lastError: errorMsg });
    return { success: false, tradeCount: 0, error: errorMsg };
  }
};
