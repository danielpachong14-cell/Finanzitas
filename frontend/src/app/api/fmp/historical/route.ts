import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');

    if (!ticker) {
        return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    if (!FMP_API_KEY) {
        console.error('FMP_API_KEY is missing');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
        const response = await fetch(`${BASE_URL}/historical-price-full/${ticker}?apikey=${FMP_API_KEY}`, {
            next: { revalidate: 86400 } // Cache for exactly 24 hours
        });

        if (!response.ok) {
            throw new Error(`FMP API responded with ${response.status}`);
        }

        const data = await response.json();

        if (!data || !data.historical) {
            return NextResponse.json({ error: 'Historical data not found' }, { status: 404 });
        }

        // Limit to 30 days reversed (chronological order)
        const last30Days = data.historical.slice(0, 30).reverse();

        return NextResponse.json(last30Days);

    } catch (error) {
        console.error('Error fetching FMP historical data:', error);
        return NextResponse.json({ error: 'Failed to fetch historical data' }, { status: 500 });
    }
}
