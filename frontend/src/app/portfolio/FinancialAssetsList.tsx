import { Asset, Institution } from "@/core/api";
import { formatPrivacyCurrency } from "@/lib/utils";
import { Building, Pencil } from "lucide-react";

interface FinancialAssetsListProps {
    assets: Asset[]; // Pre-filtered to type === 'financial'
    institutions: Institution[];
    currency: string;
    hideBalances: boolean;
    onAssetClick: (asset: Asset) => void;
    onEditInstClick: (inst: Institution) => void;
}

export function FinancialAssetsList({ assets, institutions, currency, hideBalances, onAssetClick, onEditInstClick }: FinancialAssetsListProps) {
    if (assets.length === 0) return null;

    const grouped = assets.reduce((acc, asset) => {
        const instId = asset.institution_id || 'NONE';
        if (!acc[instId]) acc[instId] = [];
        acc[instId].push(asset);
        return acc;
    }, {} as Record<string, Asset[]>);

    return (
        <div className="space-y-4">
            {Object.entries(grouped).map(([instId, groupAssets]) => {
                const inst = instId === 'NONE' ? null : institutions.find(i => i.id === instId);
                const instName = inst ? inst.name : 'Posesión Propia / Sin Custodio';
                const groupTotal = groupAssets.reduce((sum, a) => sum + Number(a.current_value), 0);

                return (
                    <div key={instId} className="bg-card/40 border border-border/30 rounded-[32px] p-4 sm:p-6 relative overflow-hidden">
                        <div className="flex justify-between items-center mb-4 pl-2">
                            <h4 className="font-bold text-foreground text-sm uppercase tracking-wider flex items-center gap-2">
                                <Building size={16} className="text-primary" />
                                {instName}
                                <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full ml-2">
                                    {groupAssets.length}
                                </span>
                                {inst && (
                                    <button
                                        onClick={() => onEditInstClick(inst)}
                                        className="ml-1 p-1.5 text-muted-foreground hover:text-primary transition-colors bg-card hover:bg-muted rounded-md border border-transparent hover:border-border/50"
                                        title="Editar Entidad"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                )}
                            </h4>
                            <span className="text-sm font-black text-foreground">{formatPrivacyCurrency(groupTotal, currency, hideBalances)}</span>
                        </div>
                        <div className="space-y-3">
                            {groupAssets.map(asset => (
                                <div key={asset.id} onClick={() => onAssetClick(asset)} className="bg-card border border-border/50 rounded-[24px] p-4 flex items-center justify-between hover:border-primary/50 transition-colors group cursor-pointer shadow-sm hover:shadow-md">
                                    <div>
                                        <p className="font-bold text-foreground text-[17px] flex items-center">
                                            {asset.name}
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
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
