import { useState, useEffect } from "react";
import { FmpService } from "../api/providers/FmpService";

export function useExchangeRate(fromCurrency: string, toCurrency: string) {
    const [rate, setRate] = useState<number>(1);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) {
            setRate(1);
            return;
        }

        const fetchRate = async () => {
            setIsLoading(true);
            try {
                // Try direct: FROM/TO=X
                let ticker = `${fromCurrency}${toCurrency}=X`;
                let quote = await FmpService.getQuote(ticker);
                if (quote && quote.price) {
                    setRate(quote.price);
                } else {
                    // Try inverse: TO/FROM=X
                    ticker = `${toCurrency}${fromCurrency}=X`;
                    quote = await FmpService.getQuote(ticker);
                    if (quote && quote.price) {
                        setRate(1 / quote.price);
                    } else {
                        console.warn(`Could not fetch exchange rate for ${fromCurrency}/${toCurrency}`);
                        setRate(1); // Fallback
                    }
                }
            } catch (error) {
                console.error("Error fetching exchange rate:", error);
                setRate(1); // Fallback
            } finally {
                setIsLoading(false);
            }
        };

        fetchRate();
    }, [fromCurrency, toCurrency]);

    return { rate, isLoading };
}
