# TradeOS: Quantitative Ledger System Documentation

This document serves as the internal technical blueprint for the Trade Tracker system. It details the end-to-end data lifecycle, from Binance API ingestion through mathematical processing to regional psychological analysis.

---

## 1. Data Acquisition (Binance Connectivity)

The system utilizes a secure cloud proxy to fetch multi-dimensional data sets:

| Dataset | Provider Endpoint | Mathematical Payload |
| :--- | :--- | :--- |
| **Trade Stream** | `/api/v3/myTrades` | Raw execution logs (Price, ID, OrderID, Time). |
| **Asset Wallet** | `/api/v3/account` | Current balances (Free/Locked) for wealth evaluation. |
| **Market Klines** | `/api/v3/klines` (1m) | 1-minute resolution pricing for USD normalization. |
| **Live Valuation** | *Proxy via Klines* | Real-time pricing proxy for Unrealized P&L (Planned: `/v3/ticker`). |

---

## 2. Advanced Mathematical Engine

### A. The Numeraire Layer (Cross-Quote Normalization)
Since many trades occur in non-USD pairs (e.g., `LINK/BNB` or `NEAR/BTC`), the engine executes a "normalization pass."
- **Logic**: For every trade, the engine looks up the historical price of the **Quote Asset** (e.g., BNB) in **USDC/USDT** terms at a **1-minute resolution** (nearest candle) relative to the trade timestamp.
- **Formula**: `TradeValue_USD = TradePrice_Primary * QuoteAsset_USD_1m_Price`

### B. FIFO Inventory & Cost Basis (First-In, First-Out)
We use institutional-grade inventory lot tracking to handle partial sells.
1.  **Batching**: Every buy trade creates a "Lot."
2.  **Consumption**: Sells reduce the quantity of the **oldest** Lot first.
3.  **Moving Average**: The `avgEntryPrice` for an **Open** position is calculated as the weighted average cost of the **remaining** lots only.

---

## 3. Calculation Matrix

### Primary P&L Metrics
| Metric | Calculation Logic | Purpose |
| :--- | :--- | :--- |
| **Realized P&L** | `(GrossExitValue - FinalCostBasis) - TotalFees` | Final profit after trade is closed. |
| **Unrealized P&L** | `(CurrentPrice - AvgEntryPrice) * RemainingQty` | "Live" floating profit on open bets. |
| **Total Equity P&L** | `Realized + Unrealized` | Response to market volatility. |

### Performance Coefficients
- **Profit Factor**: `Sum(GrossProfits) / Sum(GrossLosses)`. Measures strategy robustness. (Goal: > 2.0)
- **Win Rate**: `ProfitablePositions / TotalPositions * 100`.
- **Fee Drag**: `TotalFees / GrossRealizedProfit * 100`. Shows the impact of Binance fees on your net gains.
- **R-Multiple**: `RealizedPnl / PlannedRiskAmount`. Measures efficiency vs. your planned stop-loss.

---

## 4. Advanced System Intelligence

### A. Synthetic Epoch Baseline Injection (Phase 4.1 - Implemented)
When you set a "Trade Epoch" (Starting Date), the system uses a baseline injection logic:
- **Logic**: It looks at your current wallet balances at the epoch start time.
- **Action**: It generates **Synthetic Buy Trades** at the market price of that moment. This "bridges" existing holdings into the tracker without needing previous years' history.

### B. Psychological Bias Analysis
The system cross-references Firebase `trade_journals` with Binance `positions`:
- **Tags**: Cognitive markers like `FOMO` or `REVENGE` are mapped to IDs.
- **Logic**: The engine sums the P&L of all trades sharing a specific tag.
- **Goal**: Identifying which emotional states are costing you most (e.g., "Revenge trading accounts for 40% of my losses").

### C. Golden Hour Heatmap
- **Logic**: The system maps entry times to the `Europe/Rome` timezone (Sicily).
- **Calculation**: Grouping trades by `HourOfDay` and summing P&L to find your most/least profitable trading windows.

---

## 5. Database Architecture (Firestore)

| Collection | Role | Key Fields |
| :--- | :--- | :--- |
| `binance_trades` | Immutable Log | `id`, `price`, `qty`, `commissionUSD`, `time`. |
| `binance_positions` | State Container | `status`, `avgEntryPrice`, `realizedPnl`, `lots[]`. |
| `binance_metrics` | Global Cache | `totalEquityPnl`, `winRate`, `performanceByPair`. |
| `trade_journals` | Metadata | `emotionTag`, `entryReason`, `plannedStopUSD`. |

---

## 6. Visual Logic (Front-End)

1.  **The Flight Deck**: Sums `EquityPnl` from the global metrics cache.
2.  **Live Ledger**: Maps positions to real-time `currentPrices` fetched during the most recent sync session.
3.  **Sync Feedback**: Indicates if data is `Live` (Direct from Binance) or `Cached` (From Firestore snapshot).
