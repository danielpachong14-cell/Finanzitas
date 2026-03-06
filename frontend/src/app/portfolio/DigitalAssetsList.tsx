import { Asset, Institution } from "@/core/api";
import { formatPrivacyCurrency } from "@/lib/utils";
import { Building, Pencil, Landmark, HandCoins, Activity } from "lucide-react";
import LoanAssetPreviewCard from "./LoanAssetPreviewCard";
import { CDTAssetPreviewCard } from "./CDTAssetPreviewCard";
import { VariableIncomeAssetPreviewCard } from "./VariableIncomeAssetPreviewCard";

interface DigitalAssetsListProps {
    assets: Asset[]; // Pre-filtered to type === 'digital'
    institutions: Institution[];
    currency: string;
    hideBalances: boolean;
    onAssetClick: (asset: Asset) => void;
    onEditInstClick: (inst: Institution) => void;
}

export function DigitalAssetsList({ assets, institutions, currency, hideBalances, onAssetClick, onEditInstClick }: DigitalAssetsListProps) {
    if (assets.length === 0) return null;

    const cdts = assets.filter(a => a.digital_type === 'cdt' || (a.digital_type === 'investment' && a.cdt_details));
    const loans = assets.filter(a => a.digital_type === 'loan');
    const variableIncome = assets.filter(a => a.digital_type === 'investment' && !a.cdt_details);

    const viGrouped = variableIncome.reduce((acc, asset) => {
        const instId = asset.institution_id || 'NONE';
        if (!acc[instId]) acc[instId] = [];
        acc[instId].push(asset);
        return acc;
    }, {} as Record<string, Asset[]>);

    return (
        <div className="space-y-8">
            {/* --- SECCIÓN CDT --- */}
            {cdts.length > 0 && (
                <section>
                    <h3 className="font-black text-xl text-foreground mb-4 flex items-center gap-2">
                        <Landmark className="text-brand-blue" />
                        Certificados de Depósito (CDT)
                    </h3>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 font-sans">
                        {cdts.map(asset => (
                            <CDTAssetPreviewCard key={asset.id} asset={asset} currency={currency} hideBalances={hideBalances} formatPrivacyCurrency={formatPrivacyCurrency} onClick={() => onAssetClick(asset)} />
                        ))}
                    </div>
                </section>
            )}

            {/* --- SECCIÓN PRÉSTAMOS --- */}
            {loans.length > 0 && (
                <section>
                    <h3 className="font-black text-xl text-foreground mb-4 flex items-center gap-2">
                        <HandCoins className="text-emerald-500" />
                        Préstamos Otorgados
                    </h3>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 font-sans">
                        {loans.map(asset => (
                            <LoanAssetPreviewCard key={asset.id} asset={asset} currency={currency} hideBalances={hideBalances} formatPrivacyCurrency={formatPrivacyCurrency} onClick={() => onAssetClick(asset)} />
                        ))}
                    </div>
                </section>
            )}

            {/* --- SECCIÓN RENTA VARIABLE --- */}
            {variableIncome.length > 0 && (
                <section>
                    <h3 className="font-black text-xl text-foreground mb-4 flex items-center gap-2">
                        <Activity className="text-brand-orange" />
                        Renta Variable (Acciones, Cripto, ETFs)
                    </h3>

                    <div className="space-y-4">
                        {Object.entries(viGrouped).map(([instId, groupAssets]) => {
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
                                    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 font-sans">
                                        {groupAssets.map(asset => (
                                            <VariableIncomeAssetPreviewCard
                                                key={asset.id}
                                                asset={asset}
                                                currency={currency}
                                                hideBalances={hideBalances}
                                                onClick={() => onAssetClick(asset)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}
