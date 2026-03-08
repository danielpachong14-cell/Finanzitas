import { useState, useEffect, useMemo } from 'react';
import { Asset } from '@/core/api';
import { FmpService } from '../api/providers/FmpService';

export function useConvertedPortfolio(assets: Asset[], baseCurrency: string) {
    const [rates, setRates] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(false);

    // Reset rates when baseCurrency changes to avoid stale conversion factors
    useEffect(() => {
        setRates({ [baseCurrency]: 1 });
    }, [baseCurrency]);

    const assetCurrencies = useMemo(() => {
        const curs = new Set<string>();
        assets.forEach(a => {
            if (a.currency) curs.add(a.currency);
        });
        return Array.from(curs);
    }, [assets]);

    useEffect(() => {
        const fetchRates = async () => {
            const needed = assetCurrencies.filter(c => c !== baseCurrency && !rates[c]);
            if (needed.length === 0) return;

            setIsLoading(true);
            const newRates = { ...rates };

            await Promise.all(needed.map(async (cur) => {
                // Try direct: CUR/BASE=X
                let ticker = `${cur}${baseCurrency}=X`;
                let quote = await FmpService.getQuote(ticker);

                if (quote && quote.price) {
                    newRates[cur] = quote.price;
                } else {
                    // Try inverse: BASE/CUR=X
                    ticker = `${baseCurrency}${cur}=X`;
                    quote = await FmpService.getQuote(ticker);
                    if (quote && quote.price) {
                        newRates[cur] = 1 / quote.price;
                    } else {
                        newRates[cur] = 1; // Fallback
                    }
                }
            }));

            setRates(newRates);
            setIsLoading(false);
        };

        fetchRates();
    }, [assetCurrencies, baseCurrency]);

    const getAssetNetValueConverted = (a: Asset) => {
        const currentValue = Number(a.current_value || 0);
        let netValue = currentValue;

        if (a.has_credit) {
            const creditAmount = Number(a.credit_amount || 0);
            const creditPaid = Number(a.credit_paid || 0);
            const pendingDebt = Math.max(0, creditAmount - creditPaid);
            netValue = currentValue - pendingDebt;
        }

        const rate = rates[a.currency || baseCurrency] || 1;
        return netValue * rate;
    };

    const totals = useMemo(() => {
        const netWorth = assets.reduce((sum, a) => sum + getAssetNetValueConverted(a), 0);
        const l1 = assets.filter(a => a.liquidity_layer === 'L1_immediate').reduce((sum, a) => sum + getAssetNetValueConverted(a), 0);
        const l2 = assets.filter(a => a.liquidity_layer === 'L2_medium').reduce((sum, a) => sum + getAssetNetValueConverted(a), 0);
        const l3 = assets.filter(a => a.liquidity_layer === 'L3_low').reduce((sum, a) => sum + getAssetNetValueConverted(a), 0);

        const idleMoney = assets
            .filter(a => a.liquidity_layer === 'L1_immediate' && (Number(a.interest_rate_nominal) === 0 || !a.interest_rate_nominal))
            .reduce((sum, a) => sum + getAssetNetValueConverted(a), 0);

        // Institution totals for Concentration Map
        const institutionTotals = assets.reduce((acc, a) => {
            const inst = a.institution_id || 'NONE';
            acc[inst] = (acc[inst] || 0) + getAssetNetValueConverted(a);
            return acc;
        }, {} as Record<string, number>);

        // Weighted yield calculation
        const totalWithYield = assets.reduce((sum, a) => {
            const val = getAssetNetValueConverted(a);
            const rate = Number(a.interest_rate_nominal || 0) / 100;
            return sum + (val * rate);
        }, 0);

        const averageYield = netWorth > 0 ? (totalWithYield / netWorth) * 100 : 0;

        return { netWorth, l1, l2, l3, idleMoney, averageYield, institutionTotals };
    }, [assets, rates, baseCurrency]);

    return { ...totals, isLoading, rates, getAssetNetValueConverted };
}
