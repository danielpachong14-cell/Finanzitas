import { Asset } from "@/core/api";
import { formatPrivacyCurrency } from "@/lib/utils";
import { Building, TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";
import { FmpService, FmpQuote } from "@/core/api/providers/FmpService";

interface VariableIncomeAssetPreviewCardProps {
    asset: Asset;
    currency: string;
    hideBalances: boolean;
    onClick: () => void;
}

export function VariableIncomeAssetPreviewCard({ asset, currency, hideBalances, onClick }: VariableIncomeAssetPreviewCardProps) {
    const [quote, setQuote] = useState<FmpQuote | null>(null);
    const [isLoadingQuote, setIsLoadingQuote] = useState(false);

    // Sumar las cantidades en transacciones para saber cuánto tenemos (si tuvieramos los movimientos aquí).
    // Como no bajamos transactions pre-pobladas en Asset (solo cdt/loans), we'll assume current_value represents initial investment
    // OR if we have shares, we multiply. For now, the user manually types total invested or we assume `current_value` is fallback.
    // However, the proper way is to fetch the Transactions. To avoid blocking the render of the list, 
    // the card can just show the ticker price!

    useEffect(() => {
        if (!asset.ticker_symbol) return;

        const fetchQuote = async () => {
            setIsLoadingQuote(true);
            const data = await FmpService.getQuote(asset.ticker_symbol!);
            if (data) setQuote(data);
            setIsLoadingQuote(false);
        };

        fetchQuote();
    }, [asset.ticker_symbol]);

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
                    <p className="font-black text-foreground text-2xl tracking-tight break-words">
                        {formatPrivacyCurrency(asset.current_value, asset.currency, hideBalances)}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Valor total invertido / Saldo</p>
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
