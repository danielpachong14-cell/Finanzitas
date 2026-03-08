import { useState } from "react";
import { Asset, Institution } from "@/core/api";
import {
    Briefcase, Flame, Activity, Building, LayoutGrid, ShieldAlert,
    X, TrendingUp, Wallet, ArrowRight, ChevronRight
} from "lucide-react";
import { formatPrivacyCurrency } from "@/lib/utils";
import { useConvertedPortfolio } from "@/core/hooks/useConvertedPortfolio";

interface PortfolioHeaderProps {
    assets: Asset[];
    institutions: Institution[];
    currency: string;
    hideBalances: boolean;
    activeTab: 'financial' | 'digital' | 'physical';
    setActiveTab: (tab: 'financial' | 'digital' | 'physical') => void;
    portfolio: {
        netWorth: number;
        l1: number;
        l2: number;
        l3: number;
        idleMoney: number;
        averageYield: number;
        institutionTotals: Record<string, number>;
        isLoading: boolean;
        getAssetNetValueConverted: (a: Asset) => number;
    };
}

export function PortfolioHeader({ assets, institutions, currency, hideBalances, activeTab, setActiveTab, portfolio }: PortfolioHeaderProps) {
    const [showIdleModal, setShowIdleModal] = useState(false);
    const [showYieldModal, setShowYieldModal] = useState(false);

    const { netWorth, l1, l2, l3, idleMoney, averageYield, institutionTotals, isLoading, getAssetNetValueConverted } = portfolio;

    // Assets for Idle Money Detail
    const idleAssets = assets.filter(a => a.liquidity_layer === 'L1_immediate' && (Number(a.interest_rate_nominal) === 0 || !a.interest_rate_nominal));

    // Assets for Yield Detail (those with yield > 0)
    const yieldAssets = assets
        .filter(a => Number(a.interest_rate_nominal || 0) > 0)
        .sort((a, b) => Number(b.interest_rate_nominal) - Number(a.interest_rate_nominal));

    const concentrationMap = Object.entries(institutionTotals || {})
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
                percentage: netWorth > 0 ? (total / netWorth) * 100 : 0
            };
        })
        .sort((a, b) => b.total - a.total);

    return (
        <div className="space-y-8 mb-6">
            {/* HERO VIEW: Total Portfolio */}
            <div className="bg-card border border-border/50 rounded-[40px] p-8 relative overflow-hidden group hover:border-border transition-colors">
                <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none"></div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                    <div>
                        <div className="flex items-center space-x-2 mb-2">
                            <Briefcase size={20} className="text-primary" />
                            <p className="font-bold text-muted-foreground uppercase tracking-widest text-xs">Patrimonio Neto Total</p>
                        </div>
                        <h2 className="text-5xl md:text-6xl font-black text-foreground tracking-tighter">
                            {formatPrivacyCurrency(netWorth, currency, hideBalances)}
                        </h2>
                        {isLoading && <p className="text-xs font-bold text-muted-foreground animate-pulse mt-1">Calculando conversiones en vivo...</p>}
                    </div>

                    {/* Liquidity Ring Simplified Concept */}
                    <div className="flex gap-4 md:flex-col md:gap-2 text-right">
                        <div className="flex items-center space-x-2 md:justify-end">
                            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                            <span className="text-sm font-bold text-muted-foreground">L1: {formatPrivacyCurrency(l1, currency, hideBalances)}</span>
                        </div>
                        <div className="flex items-center space-x-2 md:justify-end">
                            <span className="w-3 h-3 rounded-full bg-brand-orange shadow-[0_0_10px_rgba(249,115,22,0.5)]"></span>
                            <span className="text-sm font-bold text-muted-foreground">L2: {formatPrivacyCurrency(l2, currency, hideBalances)}</span>
                        </div>
                        <div className="flex items-center space-x-2 md:justify-end">
                            <span className="w-3 h-3 rounded-full bg-brand-blue shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
                            <span className="text-sm font-bold text-muted-foreground">L3: {formatPrivacyCurrency(l3, currency, hideBalances)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* WIDGET GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Idle Money Widget */}
                <div
                    onClick={() => setShowIdleModal(true)}
                    className="bg-card border border-border/50 rounded-[32px] p-6 flex flex-col justify-between hover:shadow-lg transition-all cursor-pointer group active:scale-[0.98]"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center group-hover:bg-destructive group-hover:text-white transition-colors">
                            <Flame size={24} />
                        </div>
                        <div className="bg-destructive/10 text-destructive px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-1">
                            Detalle <ChevronRight size={12} />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-muted-foreground font-bold text-sm mb-1">Dinero Ocioso (Rendimiento 0%)</h3>
                        <p className="text-3xl font-black text-foreground tracking-tight">{formatPrivacyCurrency(idleMoney, currency, hideBalances)}</p>
                        <p className="text-xs text-muted-foreground font-medium mt-2">Este dinero de Liquidez Inmediata está perdiendo valor contra la inflación. Haz clic para ver el desglose.</p>
                    </div>
                </div>

                {/* Performance Thermometer Widget */}
                <div
                    onClick={() => setShowYieldModal(true)}
                    className="bg-card border border-border/50 rounded-[32px] p-6 flex flex-col justify-between hover:shadow-lg transition-all cursor-pointer group active:scale-[0.98] relative overflow-hidden"
                >
                    <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
                        <Activity size={160} />
                    </div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                            <Activity size={24} />
                        </div>
                        <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-1">
                            Analizar <ChevronRight size={12} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-muted-foreground font-bold text-sm mb-1">Termómetro de Rendimiento</h3>
                        <p className="text-3xl font-black text-foreground tracking-tight">
                            {averageYield >= 0 ? '+' : ''}{averageYield.toFixed(2)}% <span className="text-base text-muted-foreground">Nominal Estimado</span>
                        </p>
                        <p className={`text-xs font-bold mt-2 inline-block px-2 py-1 rounded-lg ${averageYield > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-brand-orange/10 text-brand-orange'}`}>
                            {averageYield > 3 ? 'Rendimiento saludable' : averageYield > 0 ? 'Rendimiento positivo' : 'Optimización requerida'}
                        </p>
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
                        <LayoutGrid size={16} /> <span className="hidden sm:inline">Inversiones</span>
                    </button>
                    <button
                        className={`flex-1 flex items-center justify-center text-sm font-bold rounded-[12px] z-10 transition-colors duration-300 gap-2 ${activeTab === 'physical' ? 'text-background' : 'text-muted-foreground hover:text-foreground/80'}`}
                        onClick={() => setActiveTab('physical')}
                    >
                        <ShieldAlert size={16} /> <span className="hidden sm:inline">Físicos</span>
                    </button>
                </div>
            </div>

            {/* --- MODALES DE DETALLE --- */}

            {/* Modal Dinero Ocioso */}
            {showIdleModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-card border border-border/50 rounded-[40px] p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center">
                                    <Flame size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-foreground tracking-tight">Análisis de Dinero Ocioso</h3>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Activos con 0% de interés</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowIdleModal(false)}
                                className="w-10 h-10 flex items-center justify-center bg-muted rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="space-y-3">
                                {idleAssets.length > 0 ? (
                                    idleAssets.map(a => (
                                        <div key={a.id} className="bg-muted/30 border border-border/50 rounded-2xl p-4 flex justify-between items-center group hover:border-border transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-card border border-border/50 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                                    <Wallet size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-foreground text-sm">{a.name}</p>
                                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                                                        {a.institution_id ? institutions.find(i => i.id === a.institution_id)?.name : 'Sin Custodio'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-foreground">
                                                    {formatPrivacyCurrency(getAssetNetValueConverted ? getAssetNetValueConverted(a) : Number(a.current_value), currency, hideBalances)}
                                                </p>
                                                <p className="text-[10px] font-bold text-destructive flex items-center justify-end gap-1">
                                                    0% Interés <ArrowRight size={8} /> ⚠️
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 opacity-50">
                                        <ShieldAlert size={48} className="mx-auto mb-4 text-emerald-500" />
                                        <p className="font-bold">No tienes dinero ocioso.</p>
                                        <p className="text-sm">¡Todo tu capital está trabajando!</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-border/50 shrink-0">
                            <div className="flex justify-between items-center bg-destructive/5 p-4 rounded-2xl border border-destructive/10">
                                <span className="font-bold text-destructive text-sm uppercase tracking-wider">Total Ocioso</span>
                                <span className="text-2xl font-black text-destructive">{formatPrivacyCurrency(idleMoney, currency, hideBalances)}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground text-center mt-4 font-medium italic">
                                Sugerencia: Mueve estos fondos a instrumentos de renta fija o inversión con liquidez controlada.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Termómetro de Rendimiento */}
            {showYieldModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-card border border-border/50 rounded-[40px] p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-foreground tracking-tight">Desglose de Rendimientos</h3>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Activos con tasa de interés EA</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowYieldModal(false)}
                                className="w-10 h-10 flex items-center justify-center bg-muted rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="space-y-3">
                                {yieldAssets.length > 0 ? (
                                    yieldAssets.map(a => (
                                        <div key={a.id} className="bg-muted/30 border border-border/50 rounded-2xl p-4 flex justify-between items-center group hover:border-border transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                                    <TrendingUp size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-foreground text-sm">{a.name}</p>
                                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                                                        Ponderación: {netWorth > 0 ? ((getAssetNetValueConverted ? getAssetNetValueConverted(a) : Number(a.current_value)) / netWorth * 100).toFixed(1) : 0}% del portafolio
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-foreground">
                                                    {formatPrivacyCurrency(getAssetNetValueConverted ? getAssetNetValueConverted(a) : Number(a.current_value), currency, hideBalances)}
                                                </p>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${Number(a.interest_rate_nominal) >= averageYield ? 'bg-emerald-500/20 text-emerald-600' : 'bg-brand-orange/20 text-brand-orange'}`}>
                                                        {a.interest_rate_nominal}% EA
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 opacity-50">
                                        <Activity size={48} className="mx-auto mb-4 text-muted-foreground" />
                                        <p className="font-bold">No tienes activos con rendimiento declarado.</p>
                                        <p className="text-sm">Toda tu cartera tiene rendimiento 0%.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-border/50 shrink-0">
                            <div className="flex justify-between items-center bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                                <span className="font-bold text-emerald-600 text-sm uppercase tracking-wider">Promedio Ponderado</span>
                                <span className="text-2xl font-black text-emerald-600">+{averageYield.toFixed(2)}%</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground text-center mt-4 font-medium italic">
                                Los rendimientos son estimaciones basadas en tasas nominales anuales.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
