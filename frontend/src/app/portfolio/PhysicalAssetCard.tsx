import React from 'react';
import { Asset } from '@/core/api';
import { formatCurrency, formatPrivacyCurrency } from '@/lib/utils';
import { useUserOptions } from '@/core/context/UserContext';

export function PhysicalAssetCard({
    asset,
    viewMode,
    onClick
}: {
    asset: Asset;
    viewMode: 'list' | 'gallery';
    onClick: () => void;
}) {
    const { currency: baseCurrency, hideBalances } = useUserOptions();
    const assetCurrency = asset.currency || baseCurrency;

    // Calculate values
    const isFinanced = asset.has_credit && asset.credit_amount;
    const progressPercent = isFinanced ? Math.min(100, Math.round(((asset.credit_paid || 0) / asset.credit_amount!) * 100)) : 0;
    const equityReal = isFinanced ? Math.max(0, asset.current_value - (asset.credit_amount! - (asset.credit_paid || 0))) : asset.current_value;

    return (
        <div
            onClick={onClick}
            className="bg-card border border-border/50 rounded-[24px] p-4 flex flex-col justify-between hover:border-primary/50 transition-colors group cursor-pointer shadow-sm hover:shadow-md"
        >
            <div className={`flex justify-between items-start gap-4 ${viewMode === 'list' ? 'flex-row items-center' : 'flex-col items-start'}`}>
                <div className="w-full">
                    <p className={`font-bold text-foreground ${viewMode === 'gallery' ? 'text-lg truncate mb-1' : 'text-[17px]'}`}>
                        {asset.name}
                    </p>
                    <div className="flex space-x-2 mt-1.5 items-center flex-wrap gap-y-2">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${asset.liquidity_layer === 'L1_immediate' ? 'bg-emerald-500/10 text-emerald-500' :
                            asset.liquidity_layer === 'L2_medium' ? 'bg-brand-orange/10 text-brand-orange' :
                                'bg-brand-blue/10 text-brand-blue'
                            }`}>
                            {asset.liquidity_layer.split('_')[0]}
                        </span>

                        {isFinanced ? (
                            <span className="text-[11px] text-brand-orange/80 font-bold border border-brand-orange/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                                Financiado
                            </span>
                        ) : (
                            <span className="text-[11px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                Posesión 100%
                            </span>
                        )}
                    </div>

                    {isFinanced ? (
                        <div className={`mt-4 w-full ${viewMode === 'list' ? 'max-w-48' : ''}`}>
                            <div className="flex justify-between text-[10px] font-bold text-muted-foreground mb-1">
                                <span>Progreso</span>
                                <span className={progressPercent === 100 ? "text-emerald-500" : ""}>{progressPercent}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted/80 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-brand-orange'}`}
                                    style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                                />
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className={`text-right flex flex-col items-end shrink-0 ${viewMode === 'gallery' ? 'w-full !items-start mt-2 border-t border-border/30 pt-3' : ''}`}>
                    {isFinanced ? (
                        <>
                            <p className={`font-black tracking-tight ${progressPercent === 100 ? 'text-emerald-500' : 'text-foreground'} ${viewMode === 'gallery' ? 'text-2xl' : 'text-lg'}`}>
                                {formatPrivacyCurrency(equityReal, assetCurrency, hideBalances)}
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Equity Real</p>
                        </>
                    ) : (
                        <>
                            <p className={`font-black text-foreground tracking-tight ${viewMode === 'gallery' ? 'text-2xl' : 'text-lg'}`}>
                                {formatPrivacyCurrency(asset.current_value, assetCurrency, hideBalances)}
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Valor Estimado</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

