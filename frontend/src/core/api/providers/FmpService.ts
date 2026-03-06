export interface FmpQuote {
    symbol: string;
    name: string;
    price: number;
    changesPercentage: number;
    change: number;
    dayLow: number;
    dayHigh: number;
    yearHigh: number;
    yearLow: number;
    marketCap: number;
    volume: number;
    avgVolume: number;
    previousClose: number;
    timestamp: number;
}

export interface FmpHistoricalPrice {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    adjClose: number;
    volume: number;
    unadjustedVolume: number;
    change: number;
    changePercent: number;
    vwap: number;
    label: string;
    changeOverTime: number;
}

export interface FmpSearchResult {
    symbol: string;
    name: string;
    currency: string;
    stockExchange: string;
    exchangeShortName: string;
}

export class FmpService {
    /**
     * Obtiene la cuota de precio en tiempo real (o más reciente) para un símbolo
     */
    static async getQuote(ticker: string): Promise<FmpQuote | null> {
        try {
            const response = await fetch(`/api/fmp/quote?ticker=${encodeURIComponent(ticker)}`);
            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error(`Error fetching quote: ${response.statusText}`);
            }
            return await response.json() as FmpQuote;
        } catch (error) {
            console.error('FmpService.getQuote error:', error);
            return null;
        }
    }

    /**
     * Obtiene el historial de precios (últimos 30 días) para armar una gráfica
     */
    static async getHistorical(ticker: string): Promise<FmpHistoricalPrice[]> {
        try {
            const response = await fetch(`/api/fmp/historical?ticker=${encodeURIComponent(ticker)}`);
            if (!response.ok) {
                throw new Error(`Error fetching historical data: ${response.statusText}`);
            }
            return await response.json() as FmpHistoricalPrice[];
        } catch (error) {
            console.error('FmpService.getHistorical error:', error);
            return [];
        }
    }

    /**
     * Busca instrumentos financieros por nombre o ticker
     */
    static async searchTickers(query: string): Promise<FmpSearchResult[]> {
        if (!query.trim()) return [];
        try {
            const response = await fetch(`/api/fmp/search?query=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error(`Error searching tickers: ${response.statusText}`);
            }
            return await response.json() as FmpSearchResult[];
        } catch (error) {
            console.error('FmpService.searchTickers error:', error);
            return [];
        }
    }
}
