import { NextResponse } from 'next/server';

const YAHOO_SEARCH = 'https://query2.finance.yahoo.com/v1/finance/search';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
        return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    try {
        const response = await fetch(
            `${YAHOO_SEARCH}?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&listsCount=0`,
            {
                headers: { 'User-Agent': USER_AGENT },
                next: { revalidate: 86400 } // Cache search results for 24 hours
            }
        );

        if (!response.ok) {
            throw new Error(`Yahoo Finance Search API responded with ${response.status}`);
        }

        const raw = await response.json();
        const quotes = raw?.quotes ?? [];

        // Transform to our FmpSearchResult-compatible shape
        const results = quotes
            .filter((q: any) => q.isYahooFinance)
            .map((q: any) => ({
                symbol: q.symbol,
                name: q.longname || q.shortname || q.symbol,
                currency: 'USD', // Default; Yahoo search doesn't always include currency
                stockExchange: q.exchDisp || q.exchange || '',
                exchangeShortName: q.exchange || '',
            }));

        return NextResponse.json(results);

    } catch (error) {
        console.error('Error fetching Yahoo Finance search results:', error);
        return NextResponse.json({ error: 'Failed to search market data' }, { status: 500 });
    }
}
