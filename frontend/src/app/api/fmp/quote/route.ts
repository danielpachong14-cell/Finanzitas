import { NextResponse } from "next/server";

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');

    if (!ticker) {
        return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    try {
        const response = await fetch(`${YAHOO_BASE}/${encodeURIComponent(ticker)}?interval=1d&range=1d`, {
            headers: { 'User-Agent': USER_AGENT },
            next: { revalidate: 86400 } // Cache for exactly 24 hours (1 query per day)
        });

        if (!response.ok) {
            throw new Error(`Yahoo Finance API responded with ${response.status}`);
        }

        const raw = await response.json();
        const result = raw?.chart?.result?.[0];

        if (!result) {
            return NextResponse.json({ error: 'Ticker not found' }, { status: 404 });
        }

        const meta = result.meta;

        // Transform to our normalized FmpQuote-compatible shape
        const quote = {
            symbol: meta.symbol,
            name: meta.longName || meta.shortName || meta.symbol,
            price: meta.regularMarketPrice,
            changesPercentage: meta.chartPreviousClose
                ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
                : 0,
            change: meta.chartPreviousClose
                ? meta.regularMarketPrice - meta.chartPreviousClose
                : 0,
            dayLow: meta.regularMarketDayLow ?? 0,
            dayHigh: meta.regularMarketDayHigh ?? 0,
            yearHigh: meta.fiftyTwoWeekHigh ?? 0,
            yearLow: meta.fiftyTwoWeekLow ?? 0,
            marketCap: 0, // Yahoo chart endpoint doesn't include marketCap
            volume: meta.regularMarketVolume ?? 0,
            avgVolume: 0,
            previousClose: meta.chartPreviousClose ?? 0,
            timestamp: meta.regularMarketTime ?? 0,
        };

        return NextResponse.json(quote);

    } catch (error) {
        console.error('Error fetching Yahoo Finance quote:', error);
        return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
    }
}
