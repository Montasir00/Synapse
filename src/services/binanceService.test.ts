import axios from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { fetchTickerPrices, processTradesIntoPositions } from './binanceService';
import type { BinanceTrade } from '../types/binance';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const makeTrade = (overrides: Partial<BinanceTrade>): BinanceTrade => ({
  symbol: 'BTCUSDT',
  id: 1,
  orderId: 1,
  orderListId: -1,
  price: '0',
  qty: '0',
  quoteQty: '0',
  commission: '0',
  commissionAsset: 'USDT',
  time: 0,
  isBuyer: true,
  isMaker: false,
  isBestMatch: true,
  ...overrides,
});

describe('fetchTickerPrices', () => {
  it('limits concurrent proxy calls to 10 and returns all unique symbol prices', async () => {
    const symbols = Array.from({ length: 27 }, (_, i) => `COIN${i}USDT`);
    const withDuplicates = [...symbols, symbols[0], symbols[1]];

    let inFlight = 0;
    let maxInFlight = 0;

    const postMock = vi.spyOn(axios, 'post').mockImplementation(async (_url, payload: any) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);

      await delay(2);

      inFlight -= 1;
      const symbol = String(payload.params.symbol);
      const price = symbol.length;
      return { data: [[0, 0, 0, 0, String(price)]] } as any;
    });

    const result = await fetchTickerPrices('token', 'https://api.binance.com', withDuplicates);

    expect(maxInFlight).toBeLessThanOrEqual(10);
    expect(Object.keys(result)).toHaveLength(symbols.length);
    expect(postMock).toHaveBeenCalledTimes(symbols.length);
    expect(result[symbols[0]]).toBe(symbols[0].length);
  });
});

describe('processTradesIntoPositions', () => {
  it('keeps realized PnL invariant: realizedPnl = grossRealizedPnl - totalFees', () => {
    const trades: BinanceTrade[] = [
      makeTrade({
        id: 1001,
        orderId: 5001,
        price: '100',
        qty: '10',
        quoteQty: '1000',
        commission: '10',
        commissionAsset: 'USDT',
        time: 1,
        isBuyer: true,
      }),
      makeTrade({
        id: 1002,
        orderId: 5002,
        price: '120',
        qty: '10',
        quoteQty: '1200',
        commission: '12',
        commissionAsset: 'USDT',
        time: 2,
        isBuyer: false,
      }),
    ];

    const positions = processTradesIntoPositions(trades, {});
    expect(positions).toHaveLength(1);

    const pos = positions[0];
    expect(pos.status).toBe('CLOSED');
    expect(pos.grossRealizedPnl).toBeCloseTo(190, 8);
    expect(pos.totalFees).toBeCloseTo(22, 8);
    expect(pos.realizedPnl).toBeCloseTo(168, 8);
    expect(pos.realizedPnl).toBeCloseTo(pos.grossRealizedPnl - pos.totalFees, 8);
  });

  it('does not double-count sell commission in multi-lot FIFO closes', () => {
    const trades: BinanceTrade[] = [
      makeTrade({
        id: 2001,
        orderId: 6001,
        price: '100',
        qty: '5',
        quoteQty: '500',
        commission: '5',
        commissionAsset: 'USDT',
        time: 10,
        isBuyer: true,
      }),
      makeTrade({
        id: 2002,
        orderId: 6002,
        price: '110',
        qty: '5',
        quoteQty: '550',
        commission: '5',
        commissionAsset: 'USDT',
        time: 11,
        isBuyer: true,
      }),
      makeTrade({
        id: 2003,
        orderId: 6003,
        price: '120',
        qty: '10',
        quoteQty: '1200',
        commission: '10',
        commissionAsset: 'USDT',
        time: 12,
        isBuyer: false,
      }),
    ];

    const positions = processTradesIntoPositions(trades, {});
    const pos = positions[0];

    // Expected values with correct single fee application:
    // cost basis = (500 + 5) + (550 + 5) = 1060
    // gross = 1200 - 1060 = 140
    // total fees = 5 + 5 + 10 = 20
    // realized = 140 - 20 = 120
    expect(pos.grossRealizedPnl).toBeCloseTo(140, 8);
    expect(pos.totalFees).toBeCloseTo(20, 8);
    expect(pos.realizedPnl).toBeCloseTo(120, 8);
    expect(pos.realizedPnl).toBeCloseTo(pos.grossRealizedPnl - pos.totalFees, 8);
  });
});
