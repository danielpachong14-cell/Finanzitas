import { NextResponse } from 'next/server';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
        return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (!FMP_API_KEY) {
        console.error('FMP_API_KEY is missing');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
        const response = await fetch(`${BASE_URL}/search?query=${encodeURIComponent(query)}&limit=10&apikey=${FMP_API_KEY}`, {
            // Search data doesn't change rapidly, caching for 1 hour is fine
            next: { revalidate: 3600 }
        });

        if (!response.ok) {
            throw new Error(`FMP API responded with ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching FMP search results:', error);
        return NextResponse.json({ error: 'Failed to search market data' }, { status: 500 });
    }
}
