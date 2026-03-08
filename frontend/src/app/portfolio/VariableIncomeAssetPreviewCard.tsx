import { Asset } from "@/core/api";
import { formatPrivacyCurrency } from "@/lib/utils";
import { Building, TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";
import { FmpService, FmpQuote } from "@/core/api/providers/FmpService";
import { useExchangeRate } from "@/core/hooks/useExchangeRate";
import { AssetTransaction } from "@/core/api/types";
import { ApiClient } from "@/core/api";

interface VariableIncomeAssetPreviewCardProps {
    asset: Asset;
    currency: string;
    hideBalances: boolean;
    onClick: () => void;
}

export function VariableIncomeAssetPreviewCard({ asset, currency, hideBalances, onClick }: VariableIncomeAssetPreviewCardProps) {
    const [quote, setQuote] = useState<FmpQuote | null>(null);
    const [isLoadingQuote, setIsLoadingQuote] = useState(false);
    const [transactions, setTransactions] = useState<AssetTransaction[]>([]);

    // Live exchange rate
    const assetCurrency = asset.currency || 'USD';
    const { rate: exchangeRate, isLoading: isRateLoading } = useExchangeRate(assetCurrency, currency);

    // Calcs for profit percentage based on transactions
    const totalShares = transactions.reduce((sum, tx) => (tx.type === 'buy' ? sum + Number(tx.quantity) : sum - Number(tx.quantity)), 0);
    const totalInvested = transactions.reduce((sum, tx) => {
        const val = Number(tx.quantity) * Number(tx.price_per_share);
        return tx.type === 'buy' ? sum + val : sum - val;
    }, 0);

    const currentMktVal = quote ? totalShares * quote.price : 0;
    const profitPerc = totalInvested > 0 ? ((currentMktVal - totalInvested) / totalInvested) * 100 : 0;

    useEffect(() => {
        const fetchData = async () => {
            setIsLoadingQuote(true);
            try {
                const [txs, qData] = await Promise.all([
                    ApiClient.getAssetTransactions(asset.id),
                    asset.ticker_symbol ? FmpService.getQuote(asset.ticker_symbol) : Promise.resolve(null)
                ]);
                setTransactions(txs);
                if (qData) setQuote(qData);
            } catch (err) {
                console.error("Error fetching preview card data", err);
            } finally {
                setIsLoadingQuote(false);
            }
        };

        fetchData();
    }, [asset.id, asset.ticker_symbol]);

    return (
        <div onClick={onClick} className="bg-card border border-border/50 rounded-[24px] p-5 flex flex-col hover:border-primary/50 transition-colors group cursor-pointer shadow-sm hover:shadow-md relative overflow-hidden h-full">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="font-bold text-foreground text-[17px] leading-tight pr-4 flex flex-wrap items-center gap-2 break-words">
                        {asset.name}
                        {asset.ticker_symbol && (
                            <span className="text-[10px] uppercase font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border/50">
                                {asset.ticker_symbol}
                            </span>
                        )}
                        <span className="text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-md">
                            Renta Variable
                        </span>
                    </p>
                </div>
                <div className="bg-muted text-muted-foreground p-2 rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                    <Building size={16} />
                </div>
            </div>

            <div className="mt-auto flex flex-col gap-3">
                {/* Fallback to static current_value if no ticker yet */}
                <div>
                    <div className="flex items-center gap-3">
                        <p className="font-black text-foreground text-2xl tracking-tight break-words leading-none">
                            {formatPrivacyCurrency(quote ? currentMktVal : asset.current_value, assetCurrency, hideBalances)}
                        </p>
                        {quote && (
                            <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${profitPerc >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                {profitPerc >= 0 ? '+' : ''}{profitPerc.toFixed(1)}%
                            </div>
                        )}
                    </div>
                    {assetCurrency !== currency && (
                        <p className="text-sm font-bold text-muted-foreground mt-1">
                            {isRateLoading ? 'Convirtiendo...' : `≈ ${formatPrivacyCurrency((quote ? currentMktVal : asset.current_value) * exchangeRate, currency, hideBalances)}`}
                        </p>
                    )}
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">
                        {quote ? 'Valor de Mercado Actual' : 'Saldo / Inversión Inicial'}
                    </p>
                </div>

                {isLoadingQuote && (
                    <div className="animate-pulse bg-muted h-6 w-24 rounded-md"></div>
                )}

                {quote && !isLoadingQuote && (
                    <div className="flex items-center gap-2 bg-background/50 p-2 rounded-xl border border-border/30">
                        <div className="flex-1">
                            <p className="text-[10px] uppercase text-muted-foreground font-bold leading-none mb-1">Precio Mercado</p>
                            <p className="font-bold text-sm leading-none flex items-center gap-1.5">
                                ${quote.price.toFixed(2)}
                            </p>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${quote.change >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {quote.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {quote.changesPercentage.toFixed(2)}%
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
