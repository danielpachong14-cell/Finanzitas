import { NextResponse } from "next/server";

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
        const response = await fetch(`${BASE_URL}/quote/${ticker}?apikey=${FMP_API_KEY}`, {
            next: { revalidate: 3600 } // Cache for exactly 1 hour
        });

        if (!response.ok) {
            throw new Error(`FMP API responded with ${response.status}`);
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'Ticker not found' }, { status: 404 });
        }

        return NextResponse.json(data[0]);

    } catch (error) {
        console.error('Error fetching FMP quote:', error);
        return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
    }
}
