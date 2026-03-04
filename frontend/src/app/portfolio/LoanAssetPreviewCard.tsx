import React, { useEffect, useState } from 'react';
import { Asset, ApiClient, LoanOptions, LoanPayment } from '@/core/api/ApiClient';

interface Props {
    asset: Asset;
    currency: string;
    hideBalances: boolean;
    onClick: () => void;
    formatPrivacyCurrency: (amount: number, cur: string, hide: boolean) => string;
}

export default function LoanAssetPreviewCard({ asset, currency, hideBalances, onClick, formatPrivacyCurrency }: Props) {
    const [loanData, setLoanData] = useState<LoanOptions | null>(null);
    const [payments, setPayments] = useState<LoanPayment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const [data, pays] = await Promise.all([
                    ApiClient.getLoanData(asset.id),
                    ApiClient.getLoanPayments(asset.id)
                ]);
                if (mounted) {
                    setLoanData(data);
                    setPayments(pays);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error loading loan preview:", error);
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [asset.id]);

    const principal = loanData?.principal_amount || 0;
    const paidPrincipal = payments.reduce((sum, p) => sum + p.principal_amount + (p.extra_principal_amount || 0), 0);
    const paidInterest = payments.reduce((sum, p) => sum + p.interest_amount, 0);
    const progressPerc = principal > 0 ? Math.min((paidPrincipal / principal) * 100, 100) : 0;

    return (
        <div
            onClick={onClick}
            className="bg-card border border-border/50 rounded-[24px] p-4 flex flex-col hover:border-primary/50 transition-colors group cursor-pointer shadow-sm hover:shadow-md"
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-bold text-foreground text-[17px] flex items-center">
                        {asset.name}
                        <span className="ml-2 text-[10px] uppercase font-bold bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-md">Préstamo</span>
                    </p>
                    <div className="flex space-x-2 mt-1.5 items-center">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${asset.liquidity_layer === 'L1_immediate' ? 'bg-emerald-500/10 text-emerald-500' :
                            asset.liquidity_layer === 'L2_medium' ? 'bg-brand-orange/10 text-brand-orange' :
                                'bg-brand-blue/10 text-brand-blue'
                            }`}>
                            {asset.liquidity_layer.split('_')[0]}
                        </span>
                        <span className="text-[11px] text-emerald-500 font-bold">
                            {asset.interest_rate_nominal > 0 ? `+${asset.interest_rate_nominal}% EA` : '0% EA'}
                        </span>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end">
                    <p className="font-black text-foreground text-lg tracking-tight">{formatPrivacyCurrency(asset.current_value, asset.currency, hideBalances)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Saldo Vivo</p>
                </div>
            </div>

            {!loading && loanData && (
                <div className="mt-4 pt-4 border-t border-border/40 grid grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in">
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Prestado</p>
                        <p className="font-bold text-sm text-foreground">{formatPrivacyCurrency(principal, asset.currency, hideBalances)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Devuelto ($)</p>
                        <p className="font-bold text-sm text-blue-500">{formatPrivacyCurrency(paidPrincipal, asset.currency, hideBalances)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Avance (%)</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progressPerc}%` }}></div>
                            </div>
                            <span className="font-bold text-xs text-foreground">{progressPerc.toFixed(1)}%</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Rendimientos (INT)</p>
                        <p className="font-bold text-sm text-orange-500">+{formatPrivacyCurrency(paidInterest, asset.currency, hideBalances)}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
