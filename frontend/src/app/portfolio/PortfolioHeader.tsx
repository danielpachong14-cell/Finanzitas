import { Asset, Institution } from "@/core/api";
import { Briefcase, Flame, Activity, Building, LayoutGrid, ShieldAlert } from "lucide-react";
import { formatPrivacyCurrency } from "@/lib/utils";

interface PortfolioHeaderProps {
    assets: Asset[];
    institutions: Institution[];
    currency: string;
    hideBalances: boolean;
    activeTab: 'financial' | 'digital' | 'physical';
    setActiveTab: (tab: 'financial' | 'digital' | 'physical') => void;
}

export function PortfolioHeader({ assets, institutions, currency, hideBalances, activeTab, setActiveTab }: PortfolioHeaderProps) {
    const getAssetNetValue = (a: Asset) => {
        if (a.type === 'physical' && a.has_credit && a.credit_amount) {
            const pendingDebt = a.credit_amount - (a.credit_paid || 0);
            return Number(a.current_value) - pendingDebt;
        }
        return Number(a.current_value);
    };

    const totalNetWorth = assets.reduce((sum, a) => sum + getAssetNetValue(a), 0);
    const l1Total = assets.filter(a => a.liquidity_layer === 'L1_immediate').reduce((sum, a) => sum + getAssetNetValue(a), 0);
    const l2Total = assets.filter(a => a.liquidity_layer === 'L2_medium').reduce((sum, a) => sum + getAssetNetValue(a), 0);
    const l3Total = assets.filter(a => a.liquidity_layer === 'L3_low').reduce((sum, a) => sum + getAssetNetValue(a), 0);

    const idleMoney = assets
        .filter(a => a.liquidity_layer === 'L1_immediate' && Number(a.interest_rate_nominal) === 0)
        .reduce((sum, a) => sum + getAssetNetValue(a), 0);

    // Concentration Map
    const institutionTotals = assets.reduce((acc, asset) => {
        const inst = asset.institution_id || 'NONE';
        acc[inst] = (acc[inst] || 0) + getAssetNetValue(asset);
        return acc;
    }, {} as Record<string, number>);

    const concentrationMap = Object.entries(institutionTotals)
        .map(([instId, total]) => {
            const inst = instId === 'NONE' ? { name: 'Posesión Propia / Sin Custodio', color: '#64748b' } : institutions.find(i => i.id === instId);

            let finalColor = inst?.color || 'var(--color-primary)';
            if (finalColor === '#888888' || finalColor === 'bg-muted-foreground' || !finalColor) {
                const legacyColors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444'];
                let hash = 0;
                const seedStr = inst?.name || instId;
                for (let i = 0; i < seedStr.length; i++) {
                    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
                }
                finalColor = legacyColors[Math.abs(hash) % legacyColors.length];
            }

            return {
                id: instId,
                name: inst?.name || 'Desconocido',
                color: finalColor,
                total,
                percentage: totalNetWorth > 0 ? (total / totalNetWorth) * 100 : 0
            };
        })
        .sort((a, b) => b.total - a.total);

    return (
        <div className="space-y-8 mb-6">
            {/* HER0 VIEW: Total Portfolio */}
            <div className="bg-card border border-border/50 rounded-[40px] p-8 relative overflow-hidden group hover:border-border transition-colors">
                <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none"></div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                    <div>
                        <div className="flex items-center space-x-2 mb-2">
                            <Briefcase size={20} className="text-primary" />
                            <p className="font-bold text-muted-foreground uppercase tracking-widest text-xs">Patrimonio Neto Total</p>
                        </div>
                        <h2 className="text-5xl md:text-6xl font-black text-foreground tracking-tighter">
                            {formatPrivacyCurrency(totalNetWorth, currency, hideBalances)}
                        </h2>
                    </div>

                    {/* Liquidity Ring Simplified Concept */}
                    <div className="flex gap-4 md:flex-col md:gap-2 text-right">
                        <div className="flex items-center space-x-2 md:justify-end">
                            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                            <span className="text-sm font-bold text-muted-foreground">L1: {formatPrivacyCurrency(l1Total, currency, hideBalances)}</span>
                        </div>
                        <div className="flex items-center space-x-2 md:justify-end">
                            <span className="w-3 h-3 rounded-full bg-brand-orange shadow-[0_0_10px_rgba(249,115,22,0.5)]"></span>
                            <span className="text-sm font-bold text-muted-foreground">L2: {formatPrivacyCurrency(l2Total, currency, hideBalances)}</span>
                        </div>
                        <div className="flex items-center space-x-2 md:justify-end">
                            <span className="w-3 h-3 rounded-full bg-brand-blue shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
                            <span className="text-sm font-bold text-muted-foreground">L3: {formatPrivacyCurrency(l3Total, currency, hideBalances)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* WIDGET GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Idle Money Widget */}
                <div className="bg-card border border-border/50 rounded-[32px] p-6 flex flex-col justify-between hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
                            <Flame size={24} />
                        </div>
                        <div className="bg-destructive/10 text-destructive px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
                            Alerta
                        </div>
                    </div>
                    <div>
                        <h3 className="text-muted-foreground font-bold text-sm mb-1">Dinero Ocioso (Rendimiento 0%)</h3>
                        <p className="text-3xl font-black text-foreground tracking-tight">{formatPrivacyCurrency(idleMoney, currency, hideBalances)}</p>
                        <p className="text-xs text-muted-foreground font-medium mt-2">Este dinero de Liquidez Inmediata está perdiendo valor contra la inflación. Sugerimos moverlo a vehículos L2.</p>
                    </div>
                </div>

                {/* Performance Thermometer Widget */}
                <div className="bg-card border border-border/50 rounded-[32px] p-6 flex flex-col justify-between hover:shadow-lg transition-shadow relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
                        <Activity size={160} />
                    </div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <Activity size={24} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-muted-foreground font-bold text-sm mb-1">Termómetro de Rendimiento</h3>
                        <p className="text-3xl font-black text-foreground tracking-tight">+0.00% <span className="text-base text-muted-foreground">Real</span></p>
                        <p className="text-xs text-emerald-500 font-bold mt-2 bg-emerald-500/10 inline-block px-2 py-1 rounded-lg">Impacto inflacionario integrado próximamente</p>
                    </div>
                </div>
            </div>

            {/* CONCENTRATION MAP AREA */}
            {concentrationMap.length > 0 && (
                <div className="bg-card border border-border/50 rounded-[32px] p-6 sm:p-8">
                    <div className="flex items-center space-x-2 mb-6">
                        <Building size={20} className="text-primary" />
                        <h3 className="text-xl font-bold text-foreground">Mapa de Concentración</h3>
                    </div>

                    <div className="space-y-4">
                        {/* Progress Bar Representation */}
                        <div className="h-4 w-full rounded-full overflow-hidden flex shadow-inner">
                            {concentrationMap.map(c => (
                                <div
                                    key={c.id}
                                    className="h-full hover:opacity-80 transition-opacity"
                                    style={{ width: `${c.percentage}%`, backgroundColor: c.color }}
                                    title={`${c.name}: ${c.percentage.toFixed(1)}%`}
                                ></div>
                            ))}
                        </div>

                        {/* Legend Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            {concentrationMap.map(c => (
                                <div key={c.id} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center space-x-2 truncate">
                                        <span
                                            className="w-3 h-3 rounded-full shrink-0"
                                            style={{ backgroundColor: c.color }}
                                        ></span>
                                        <span className="font-bold text-foreground truncate">{c.name}</span>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="font-bold text-muted-foreground mr-2">{c.percentage.toFixed(1)}%</span>
                                        <span className="font-bold text-foreground">{formatPrivacyCurrency(c.total, currency, hideBalances)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB SYSTEM FOR INVENTORY */}
            <div className="pt-4">
                <div className="flex p-1.5 bg-card/60 rounded-2xl border border-border/50 relative w-full h-14 backdrop-blur-sm mx-auto">
                    <div
                        className={`absolute top-1.5 bottom-1.5 w-[calc(33.333%-4px)] bg-foreground rounded-[12px] transition-transform duration-300 ease-spring ${activeTab === 'financial' ? 'translate-x-0' :
                            activeTab === 'digital' ? 'translate-x-[calc(100%+4.5px)]' :
                                'translate-x-[calc(200%+9px)]'
                            }`}
                    />

                    <button
                        className={`flex-1 flex items-center justify-center text-sm font-bold rounded-[12px] z-10 transition-colors duration-300 gap-2 ${activeTab === 'financial' ? 'text-background' : 'text-muted-foreground hover:text-foreground/80'}`}
                        onClick={() => setActiveTab('financial')}
                    >
                        <Building size={16} /> <span className="hidden sm:inline">Financieros</span>
                    </button>
                    <button
                        className={`flex-1 flex items-center justify-center text-sm font-bold rounded-[12px] z-10 transition-colors duration-300 gap-2 ${activeTab === 'digital' ? 'text-background' : 'text-muted-foreground hover:text-foreground/80'}`}
                        onClick={() => setActiveTab('digital')}
                    >
                        <LayoutGrid size={16} /> <span className="hidden sm:inline">Digitales</span>
                    </button>
                    <button
                        className={`flex-1 flex items-center justify-center text-sm font-bold rounded-[12px] z-10 transition-colors duration-300 gap-2 ${activeTab === 'physical' ? 'text-background' : 'text-muted-foreground hover:text-foreground/80'}`}
                        onClick={() => setActiveTab('physical')}
                    >
                        <ShieldAlert size={16} /> <span className="hidden sm:inline">Físicos</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
