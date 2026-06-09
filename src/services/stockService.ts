import { FINNHUB_API_KEY } from '../config';

interface FinnhubQuote {
  c:  number; // current price
  d:  number; // change from prev close
  dp: number; // % change from prev close
  h:  number; // day high
  l:  number; // day low
  o:  number; // open
  pc: number; // previous close
}

export interface LiveQuote {
  ticker:    string;
  price:     number;
  change:    number; // $ change from prev close
  changePct: number; // % change from prev close
  high:      number;
  low:       number;
  prevClose: number;
}

async function fetchRawQuote(symbol: string): Promise<FinnhubQuote | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
    );
    if (!res.ok) return null;
    const data = await res.json() as FinnhubQuote;
    return data.c > 0 ? data : null;
  } catch {
    return null;
  }
}

export async function fetchRealPrices(symbols: string[]): Promise<Record<string, number>> {
  if (!FINNHUB_API_KEY) return {};
  const pairs = await Promise.all(
    symbols.map(async sym => {
      const q = await fetchRawQuote(sym);
      return [sym, q ? q.c : null] as [string, number | null];
    })
  );
  return Object.fromEntries(pairs.filter(([, p]) => p !== null)) as Record<string, number>;
}

export async function fetchUSStockCount(): Promise<number | null> {
  if (!FINNHUB_API_KEY) return null;
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${FINNHUB_API_KEY}`
    );
    if (!res.ok) return null;
    const data = await res.json() as unknown[];
    return Array.isArray(data) ? data.length : null;
  } catch { return null; }
}

export async function fetchLiveQuotes(symbols: string[]): Promise<Record<string, LiveQuote>> {
  if (!FINNHUB_API_KEY) return {};
  const pairs = await Promise.all(
    symbols.map(async sym => {
      const q = await fetchRawQuote(sym);
      if (!q) return null;
      const quote: LiveQuote = {
        ticker:    sym,
        price:     q.c,
        change:    q.d,
        changePct: q.dp,
        high:      q.h,
        low:       q.l,
        prevClose: q.pc,
      };
      return [sym, quote] as [string, LiveQuote];
    })
  );
  return Object.fromEntries(pairs.filter(Boolean) as [string, LiveQuote][]);
}
