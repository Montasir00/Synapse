import { BinanceTrade, Position, DashboardMetrics } from '../types/binance';
import { 
  fetchBinanceTrades, 
  fetchBinanceAccount, 
  processTradesIntoPositions, 
  calculateMetrics,
  STABLE_MAP,
  getQuoteAsset,
  fetchTickerPrices
} from './binanceService';
import {
  createSyncId,
  persistTradeSyncSnapshot,
  persistTradeSyncError,
  prunePersistedPositions,
  prunePersistedTrades
} from './tradePersistenceService';
import { db } from '../firebase';
import { doc, getDoc, collection, getDocs, limit, query, where } from 'firebase/firestore';

export interface SyncResult {
  success: boolean;
  tradeCount: number;
  balances?: any[];
  currentPrices?: Record<string, number>;
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

      // Auto-add USDT/USDC pairs for every non-stable asset in the wallet
      // This ensures coins like DOGE, XRP, etc. are always synced even if not manually added.
      activeAssets.forEach((asset: string) => {
        if (!STABLE_MAP[asset]) {
          masterSymbolList.add(`${asset}USDT`);
          masterSymbolList.add(`${asset}USDC`);
        }
      });
    } catch (accErr) {
      console.warn('[Sync Service] Account lookup failed', accErr);
      symbols.forEach(s => activeAssets.add(getQuoteAsset(s) === s ? s : s.replace(getQuoteAsset(s), '')));
    }

    // Stage 3: Exchange Symbol Filtering & Delisting Verification
    const discoverySymbols = new Set<string>();
    let validMarketPairs = new Set<string>();
    try {
      const { fetchBinanceExchangeInfo } = await import('./binanceService');
      const exchangeInfo = await fetchBinanceExchangeInfo(idToken, baseUrl);
      
      // Map all valid + actively trading pairs
      (exchangeInfo?.symbols || []).forEach((s: any) => {
         if (s.status === 'TRADING') {
            validMarketPairs.add(s.symbol);
         }
      });

      // Filter raw manual symbols (prevents 400 Bad Request spam for delisted coins)
      symbols.forEach(rawSym => {
         if (validMarketPairs.has(rawSym)) discoverySymbols.add(rawSym);
      });
      
      // Auto-discovery of random pairs based on dust balances has been removed
      // to prevent fetching coins the user is not actively trading.
    } catch {
      // Fallback: if exchange info lookup fails, use all manually-configured symbols
      // This prevents a silent failure where zero trades are fetched with no error shown.
      console.warn('[Sync Service] Exchange info lookup failed — falling back to manual symbol list.');
      symbols.forEach(s => discoverySymbols.add(s));
    }

    // Stage 4: Tracking Epoch Filter (Moved up to prevent ReferenceError)
    let epochMs = 0;
    const epochStr = localStorage.getItem('binance_trade_epoch');
    if (epochStr) {
      const parsed = parseInt(epochStr, 10);
      epochMs = Number.isFinite(parsed) ? parsed : 0;
    }

    // Fallback for installed PWA/browser storage mismatch: use cloud app_settings epoch if local is missing.
    if (epochMs <= 0) {
      try {
        const settingsQuery = query(collection(db, 'app_settings'), where('uid', '==', uid), limit(1));
        const settingsSnap = await getDocs(settingsQuery);
        if (!settingsSnap.empty) {
          const settings = settingsSnap.docs[0].data() as Record<string, unknown>;
          const cloudEpoch = Number(settings.tradeTrackerEpoch || 0);
          if (Number.isFinite(cloudEpoch) && cloudEpoch > 0) {
            epochMs = cloudEpoch;
            localStorage.setItem('binance_trade_epoch', String(cloudEpoch));
            localStorage.setItem('binance_last_pruned_epoch', String(cloudEpoch));
          }
        }
      } catch (epochLookupErr) {
        console.warn('[Sync Service] Failed to load cloud epoch fallback', epochLookupErr);
      }
    }

    // Stage 5: Delta-Filtered Trade Fetch (Optimized)
    const allTrades: BinanceTrade[] = [];
    const syncList = Array.from(discoverySymbols);
    const symbolBatchSize = 3; // Reduced batch size to respect proxy limits while being parallel

    for (let i = 0; i < syncList.length; i += symbolBatchSize) {
      const batch = syncList.slice(i, i + symbolBatchSize);
      await Promise.all(batch.map(async (symbolS) => {
        try {
          const trades = await fetchBinanceTrades(idToken, symbolS, baseUrl, encryptedApiKey, encryptedApiSecret, epochMs);
          if (trades.length > 0) allTrades.push(...trades);
        } catch (err) {
          if (symbols.includes(symbolS)) console.error(`[Sync] Failed ${symbolS}`, err);
        }
      }));
      if (syncList.length > symbolBatchSize) await sleep(150); // Minimal throttle between batches
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

    // 3. Baseline Discovery: If tracking from epochMs, we need the historical price of wallet assets AT epochMs to establish the starting value.
    if (epochMs > 0) {
      finalBalances.forEach((b: any) => {
        if (!STABLE_MAP[b.asset]) {
          const totalQty = parseFloat(b.free || 0) + parseFloat(b.locked || 0);
          if (totalQty > 0.0001) {
            discoveryKeys.add(`${b.asset}USDT_${Math.floor(epochMs / 60000) * 60000}`);
          }
        }
      });
    }

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

    // (Epoch fetch moved up to prevent ReferenceError)

    const epochFilteredTrades = allTrades.filter(t => t.time >= epochMs);

    // Stage 6A: Daily Price Snapshot & Balances USD
    // We must fetch prices FIRST so we can establish synthetic entry prices if an epoch reset occurred.
    let currentPrices: Record<string, number> = {};
    try {
      const symbolsToFetch = new Set<string>();
      const addQuoteCandidates = (asset: string) => {
        if (!asset || STABLE_MAP[asset]) return;

        const candidates = [`${asset}USDT`, `${asset}USDC`];
        candidates.forEach((candidate) => {
          // If we have populated valid pairs, strictly filter to prevent 400 Bad Request on delisted coins.
          if (validMarketPairs.size > 0) {
            if (validMarketPairs.has(candidate)) {
              symbolsToFetch.add(candidate);
            }
          } else {
            // If exchangeInfo lookup failed, fallback ONLY to USDT to minimize error risk.
            if (candidate.endsWith('USDT')) {
              symbolsToFetch.add(candidate);
            }
          }
        });
      };

      // Active-pairs-only pricing: open position assets + non-stable wallet assets with non-zero balance.
      existingPositions
        .filter((p) => p.status === 'OPEN' && p.remainingQty > 0)
        .forEach((p) => addQuoteCandidates(p.symbol));

      finalBalances
        .filter((b: any) => {
          const total = parseFloat(b.free || 0) + parseFloat(b.locked || 0);
          return total > 0.00001; // Ignore extreme dust to prevent API spam
        })
        .forEach((b: any) => {
          addQuoteCandidates(String(b.asset || ''));
        });

      currentPrices = await fetchTickerPrices(idToken, baseUrl, Array.from(symbolsToFetch));
      if (Object.keys(currentPrices).length > 0) {
        localStorage.setItem('binance_price_snapshot', JSON.stringify({ timestamp: Date.now(), prices: currentPrices }));
      }

      // Append USD value to balances
      finalBalances = finalBalances.map((b: any) => {
        const totalQty = parseFloat(b.free) + parseFloat(b.locked);
        let usdValue = totalQty;
        if (!STABLE_MAP[b.asset]) {
           const price = currentPrices[`${b.asset}USDT`] || currentPrices[`${b.asset}USDC`] || 0;
           usdValue = totalQty * price;
        }
        return { ...b, usdValue };
      });
    } catch (e) {
      console.warn('[Sync Service] Failed to execute snapshot pricing', e);
    }

    const getBaseAssetFromSymbol = (symbol: string): string => {
      const quote = getQuoteAsset(symbol);
      return symbol.endsWith(quote) ? symbol.slice(0, -quote.length) : symbol;
    };

    const tradedAssets = new Set<string>(
      allTrades
        .map((t) => getBaseAssetFromSymbol(t.symbol))
        .filter(Boolean)
    );

    // Stage 6B: Synthetic Epoch Baseline Injection
    // Convert current wallet holdings into fresh "OPEN" positions exactly at the epoch reset time.
    if (epochMs > 0) {
        let baselineTrades: BinanceTrade[] = [];
        const baselineSaved = localStorage.getItem('binance_baseline_trades');

        // Always force-bust the baseline cache if it exists, to prevent stale entries from
        // persisting across sell events (e.g. sold DOGE appearing as ghost OPEN).
        // We regenerate fresh from current balances on every sync.
        if (baselineSaved) {
            try {
                const parsed = JSON.parse(baselineSaved);
                if (parsed.epoch === epochMs) {
                  const cached = Array.isArray(parsed.trades) ? parsed.trades : [];
                  // Build a zero-balance set: assets that are fully sold — exclude from baseline.
                  const zeroBalanceAssets = new Set<string>(
                    finalBalances
                      .filter((b: any) => (parseFloat(b.free || 0) + parseFloat(b.locked || 0)) <= 0.0001)
                      .map((b: any) => String(b.asset || ''))
                  );
                  // Filter out any cached baseline entries for assets now at zero balance,
                  // then use the filtered cache to avoid a full regen.
                  const filteredCache = cached.filter((t: any) => {
                    const asset = String(t.commissionAsset || '');
                    return !zeroBalanceAssets.has(asset);
                  });
                  if (filteredCache.length > 0) {
                    baselineTrades = filteredCache;
                  } else {
                    // Cache is empty after filtering — regenerate fresh.
                    localStorage.removeItem('binance_baseline_trades');
                  }
                } else {
                  // Epoch mismatch — bust the stale cache.
                  localStorage.removeItem('binance_baseline_trades');
                }
            } catch (e) {
              localStorage.removeItem('binance_baseline_trades');
            }
        }

        // Generate a fresh baseline from current wallet balances.
        // Inject a synthetic BUY for every non-stable asset with a sufficient USD balance.
        // USD threshold ($5+) prevents dust amounts from creating phantom OPEN positions.
        const BASELINE_MIN_USD = 5.0;
        if (baselineTrades.length === 0) {
           finalBalances.forEach((b: any) => {
              if (!STABLE_MAP[b.asset]) {
                 const totalQty = parseFloat(b.free) + parseFloat(b.locked);
                 if (totalQty > 0.0001) {
                    const usdtSymbol = `${b.asset}USDT`;
                    const usdcSymbol = `${b.asset}USDC`;
                    // Use historical price at epochMs for accurate cost basis, fallback to current price only if missing.
                    const priceKey = `${b.asset}USDT_${Math.floor(epochMs / 60000) * 60000}`;
                    const snapshotPrice = historicalPricesMap[priceKey] || currentPrices[usdtSymbol] || currentPrices[usdcSymbol] || 0;
                    
                    const usdValue = totalQty * snapshotPrice;
                    const pairSymbol = currentPrices[usdtSymbol] ? usdtSymbol : usdcSymbol;
                    // Only track if worth >= $5 to exclude dust/leftover amounts.
                    if (snapshotPrice > 0 && usdValue >= BASELINE_MIN_USD) {
                       baselineTrades.push({
                          symbol: pairSymbol,
                          id: `synthetic_${b.asset}_${epochMs}`,
                          orderId: 0,
                          orderListId: -1,
                          price: String(snapshotPrice),
                          qty: String(totalQty),
                          quoteQty: String(totalQty * snapshotPrice),
                          commission: "0",
                          commissionAsset: b.asset,
                          time: epochMs,
                          isBuyer: true,
                          isMaker: true,
                          isBestMatch: true
                       });
                    }
                 }
              }
           });

           if (baselineTrades.length > 0) {
               localStorage.setItem('binance_baseline_trades', JSON.stringify({
                   epoch: epochMs,
                   trades: baselineTrades
               }));
           }
        }

        epochFilteredTrades.push(...baselineTrades);
    }

    // Ensure trades are sorted again just in case synthetic trades clash with exact milliseconds
    const sortedFinalTrades = epochFilteredTrades.sort((a, b) => a.time - b.time);

    // Stage 6C: P&L Handover
    const processedPositions = processTradesIntoPositions(sortedFinalTrades, historicalPricesMap, existingPositions);
    const metricsSnapshot = calculateMetrics(processedPositions, currentPrices);

    // Stage 7: Persistence Promotion
    await persistTradeSyncSnapshot({
      uid,
      syncId,
      symbolsSynced: Array.from(discoverySymbols),
      trades: sortedFinalTrades,
      positions: processedPositions,
      metrics: metricsSnapshot,
      balances: finalBalances,
      status: 'COMPLETED'
    });

    localStorage.setItem('binance_last_synced', new Date().toISOString());
    return { success: true, tradeCount: sortedFinalTrades.length, balances: finalBalances, currentPrices };

  } catch (err: any) {
    const errorMsg = err?.response?.data?.msg || err?.message || 'Trade sync failed';
    await persistTradeSyncError({ uid, syncId, symbolsSynced: symbols, lastError: errorMsg });
    return { success: false, tradeCount: 0, error: errorMsg };
  }
};
