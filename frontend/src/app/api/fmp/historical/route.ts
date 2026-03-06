import { NextResponse } from 'next/server';

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');

    if (!ticker) {
        return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    try {
        // Fetch 30 days with daily intervals
        const response = await fetch(`${YAHOO_BASE}/${encodeURIComponent(ticker)}?interval=1d&range=1mo`, {
            headers: { 'User-Agent': USER_AGENT },
            next: { revalidate: 86400 } // Cache for exactly 24 hours
        });

        if (!response.ok) {
            throw new Error(`Yahoo Finance API responded with ${response.status}`);
        }

        const raw = await response.json();
        const result = raw?.chart?.result?.[0];

        if (!result || !result.timestamp) {
            return NextResponse.json({ error: 'Historical data not found' }, { status: 404 });
        }

        const timestamps: number[] = result.timestamp;
        const ohlcv = result.indicators?.quote?.[0];
        const adjClose = result.indicators?.adjclose?.[0]?.adjclose;

        if (!ohlcv) {
            return NextResponse.json({ error: 'OHLCV data not found' }, { status: 404 });
        }

        // Build array in our FmpHistoricalPrice-compatible shape
        const historical = timestamps.map((ts: number, i: number) => {
            const date = new Date(ts * 1000);
            const dateStr = date.toISOString().split('T')[0];
            const open = ohlcv.open?.[i] ?? 0;
            const high = ohlcv.high?.[i] ?? 0;
            const low = ohlcv.low?.[i] ?? 0;
            const close = ohlcv.close?.[i] ?? 0;
            const volume = ohlcv.volume?.[i] ?? 0;
            const adj = adjClose?.[i] ?? close;

            return {
                date: dateStr,
                open: +open.toFixed(2),
                high: +high.toFixed(2),
                low: +low.toFixed(2),
                close: +close.toFixed(2),
                adjClose: +adj.toFixed(2),
                volume,
                unadjustedVolume: volume,
                change: +(close - open).toFixed(2),
                changePercent: open > 0 ? +((close - open) / open * 100).toFixed(4) : 0,
                vwap: +((high + low + close) / 3).toFixed(2),
                label: dateStr,
                changeOverTime: 0,
            };
        });

        return NextResponse.json(historical);

    } catch (error) {
        console.error('Error fetching Yahoo Finance historical data:', error);
        return NextResponse.json({ error: 'Failed to fetch historical data' }, { status: 500 });
    }
}
