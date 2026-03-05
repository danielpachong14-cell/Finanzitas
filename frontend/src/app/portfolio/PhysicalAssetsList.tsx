import { useState } from "react";
import { Asset } from "@/core/api";
import { formatPrivacyCurrency } from "@/lib/utils";
import { AlignJustify, LayoutGrid } from "lucide-react";
import { PhysicalAssetCard } from "./PhysicalAssetCard";

interface PhysicalAssetsListProps {
    assets: Asset[]; // Pre-filtered to type === 'physical'
    currency: string;
    hideBalances: boolean;
    onAssetClick: (asset: Asset) => void;
}

export function PhysicalAssetsList({ assets, currency, hideBalances, onAssetClick }: PhysicalAssetsListProps) {
    const [physicalSortBy, setPhysicalSortBy] = useState<'category' | 'alpha' | 'value_desc' | 'value_asc'>('category');
    const [physicalViewMode, setPhysicalViewMode] = useState<'list' | 'gallery'>('list');

    if (assets.length === 0) return null;

    const getAssetNetValue = (a: Asset) => {
        if (a.has_credit && a.credit_amount) {
            const pendingDebt = a.credit_amount - (a.credit_paid || 0);
            return Number(a.current_value) - pendingDebt;
        }
        return Number(a.current_value);
    };

    // Sort logic for physical assets
    const sortedPhysicalAssets = [...assets].sort((a, b) => {
        if (physicalSortBy === 'alpha') {
            return a.name.localeCompare(b.name);
        } else if (physicalSortBy === 'value_desc') {
            return getAssetNetValue(b) - getAssetNetValue(a);
        } else if (physicalSortBy === 'value_asc') {
            return getAssetNetValue(a) - getAssetNetValue(b);
        }
        // Default 'category'
        const typeA = a.physical_type || 'other';
        const typeB = b.physical_type || 'other';
        return typeA.localeCompare(typeB);
    });

    const physicalByType: { [key: string]: Asset[] } = {};
    sortedPhysicalAssets.forEach(a => {
        const t = a.physical_type || 'other';
        if (!physicalByType[t]) physicalByType[t] = [];
        physicalByType[t].push(a);
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card/50 p-3 rounded-2xl border border-border/50">
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <span className="text-sm font-bold text-muted-foreground whitespace-nowrap">Ordenar por:</span>
                    <select
                        value={physicalSortBy}
                        onChange={(e) => setPhysicalSortBy(e.target.value as any)}
                        className="bg-card w-full sm:w-auto h-10 rounded-xl px-3 font-bold text-foreground text-sm border border-border/50 focus-visible:ring-primary focus-visible:outline-none"
                    >
                        <option value="category">Categoría</option>
                        <option value="alpha">Alfabético</option>
                        <option value="value_desc">Mayor Valor</option>
                        <option value="value_asc">Menor Valor</option>
                    </select>
                </div>
                <div className="flex bg-muted p-1 rounded-xl border border-border/50 shrink-0 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => setPhysicalViewMode('list')}
                        className={`flex-1 sm:px-4 py-2 text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${physicalViewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-card/50'}`}
                    >
                        <AlignJustify size={16} /> Lista
                    </button>
                    <button
                        type="button"
                        onClick={() => setPhysicalViewMode('gallery')}
                        className={`flex-1 sm:px-4 py-2 text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${physicalViewMode === 'gallery' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-card/50'}`}
                    >
                        <LayoutGrid size={16} /> Galería
                    </button>
                </div>
            </div>

            {physicalSortBy === 'category' ? (
                Object.entries(physicalByType).map(([typeGroup, gAssets]) => {
                    const groupTotal = gAssets.reduce((sum, a) => sum + getAssetNetValue(a), 0);
                    const tName = typeGroup === 'real_estate' ? 'Bienes Raíces' : typeGroup === 'vehicle' ? 'Vehículos' : typeGroup === 'business' ? 'Empresas / Negocios' : typeGroup === 'tech' ? 'Tecnología' : typeGroup === 'jewelry' ? 'Joyas / Arte' : 'Otros Físicos';

                    return (
                        <div key={typeGroup} className="mb-8">
                            <div className="flex items-center justify-between mb-4 pl-2">
                                <h4 className="font-black text-foreground text-lg tracking-tight flex items-center">
                                    {tName}
                                    <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full ml-2">
                                        {gAssets.length}
                                    </span>
                                </h4>
                                <span className="text-sm font-black text-foreground">{formatPrivacyCurrency(groupTotal, currency, hideBalances)}</span>
                            </div>
                            <div className={physicalViewMode === 'gallery' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-3"}>
                                {gAssets.map(asset => (
                                    <PhysicalAssetCard key={asset.id} asset={asset} viewMode={physicalViewMode} onClick={() => onAssetClick(asset)} />
                                ))}
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className={physicalViewMode === 'gallery' ? "grid grid-cols-1 md:grid-cols-2 gap-4 mt-6" : "space-y-3 mt-6"}>
                    {sortedPhysicalAssets.map(asset => (
                        <PhysicalAssetCard key={asset.id} asset={asset} viewMode={physicalViewMode} onClick={() => onAssetClick(asset)} />
                    ))}
                </div>
            )}
        </div>
    );
}
