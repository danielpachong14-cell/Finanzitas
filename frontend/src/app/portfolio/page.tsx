"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ApiClient, Asset, Institution } from "@/core/api/ApiClient";
import { useAssets, useInstitutions, PORTFOLIO_KEYS } from "@/core/hooks/useQueries";
import { useQueryClient } from "@tanstack/react-query";
import { useUserOptions } from "@/core/context/UserContext";
import { formatCurrency, formatPrivacyCurrency } from "@/lib/utils";
import { Plus, Briefcase, Activity, Flame, ShieldAlert, PlusCircle, Building, Wallet, LayoutGrid, Pencil, Trash2, List, AlignJustify, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FinancialAssetDashboard } from "./FinancialAssetDashboard";
import { PhysicalAssetCard } from "./PhysicalAssetCard";
import { TransferModal } from "@/components/ui/TransferModal";
import dynamic from 'next/dynamic';
import { Suspense } from "react";

const InstitutionEditModal = dynamic(() => import('./InstitutionEditModal').then(mod => mod.InstitutionEditModal), {
    ssr: false,
});

const AssetFormModal = dynamic(() => import('./AssetFormModal').then(mod => mod.AssetFormModal), {
    ssr: true, // AssetFormModal might benefit from hydration earlier, but SSR disabled is generally safer for client-only modals. Let's keep it default.
});

export default function PortfolioPage() {
    const { currency, hideBalances } = useUserOptions();
    const queryClient = useQueryClient();

    // Data via React Query
    const { data: qAssets, isLoading: isLoadingAssets } = useAssets();
    const { data: qInstitutions, isLoading: isLoadingInstitutions } = useInstitutions();

    const loading = isLoadingAssets || isLoadingInstitutions;
    const assets = qAssets || [];
    const institutions = qInstitutions || [];

    // Active View Tab (Financial, Digital, Physical)
    const [activeTab, setActiveTab] = useState<'financial' | 'digital' | 'physical'>('financial');

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [dashboardAsset, setDashboardAsset] = useState<Asset | null>(null);

    // Transfer Modal
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferSourceId, setTransferSourceId] = useState<string>("");

    // Edit Institution State
    const [showEditInstModal, setShowEditInstModal] = useState(false);
    const [editingInst, setEditingInst] = useState<Institution | null>(null);

    // Physical View State
    const [physicalSortBy, setPhysicalSortBy] = useState<'category' | 'alpha' | 'value_desc' | 'value_asc'>('category');
    const [physicalViewMode, setPhysicalViewMode] = useState<'list' | 'gallery'>('list');

    const invalidateData = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEYS.assets }),
            queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEYS.institutions })
        ]);
    };

    const openAddModal = () => {
        setEditingAsset(null);
        setShowAddModal(true);
    };

    const openTransferModal = (sourceId: string = "") => {
        setTransferSourceId(sourceId);
        setShowTransferModal(true);
    };

    const openEditModal = (asset: Asset) => {
        setEditingAsset(asset);
        setShowAddModal(true);
    };

    const handleAssetClick = (asset: Asset) => {
        if (asset.type === 'financial') {
            setDashboardAsset(asset);
        } else {
            openEditModal(asset);
        }
    };

    const handleDeleteAsset = async () => {
        if (!editingAsset) return;
        if (!confirm(`¿Estás seguro de eliminar el activo "${editingAsset.name}"?`)) return;

        try {
            await ApiClient.deleteAsset(editingAsset.id);
            setShowAddModal(false);
            await invalidateData();
        } catch (error) {
            console.error("Error deleting asset", error);
            alert("Error al eliminar activo");
        }
    };

    const openEditInstModal = (inst: Institution) => {
        setEditingInst(inst);
        setShowEditInstModal(true);
    };

    const handleDeleteInst = async (id: string) => {
        try {
            await ApiClient.deleteInstitution(id);
            setShowEditInstModal(false);
            await invalidateData();
        } catch (error) {
            console.error("Error deleting institution", error);
            alert("Error al eliminar entidad");
        }
    };

    const handleSaveInst = async (id: string, newName: string) => {
        try {
            await ApiClient.updateInstitution(id, { name: newName });
            setShowEditInstModal(false);
            await invalidateData();
        } catch (error) {
            console.error("Error updating institution", error);
            alert("Error al editar entidad");
            throw error;
        }
    };

    const handleSaveAsset = async (payload: Partial<Asset>, instId: string, customInstName: string) => {
        try {
            let finalInstId = instId;

            if (finalInstId === "NEW" && customInstName.trim()) {
                const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444'];
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                const inst = await ApiClient.createInstitution(customInstName.trim(), 'other', 'building', randomColor);
                finalInstId = inst.id;
            }

            const completePayload = {
                ...payload,
                institution_id: finalInstId === "NONE" || finalInstId === "NEW" ? null : finalInstId,
            };

            if (editingAsset) {
                await ApiClient.updateAsset(editingAsset.id, completePayload);
            } else {
                await ApiClient.createAsset({
                    currency: currency,
                    is_manual: true,
                    ...completePayload as any
                });
            }

            setShowAddModal(false);
            await invalidateData();
        } catch (error) {
            console.error("Error saving asset", error);
            alert("Error al guardar activo");
            throw error;
        }
    };

    // Filtered lists
    const filteredAssets = assets.filter(a => a.type === activeTab);

    // Totals
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

    const physicalAssets = assets.filter(a => a.type === 'physical');

    // Sort logic for physical assets
    const sortedPhysicalAssets = [...physicalAssets].sort((a, b) => {
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

    // Idle Money (L1 with 0 nominal return)
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
        <AppLayout>
            <div className="bg-background min-h-screen pb-24 relative overflow-hidden transition-colors">
                {/* Decorative Blur Backgrounds */}
                <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none rotate-12"></div>
                <div className="absolute top-[20%] left-[-10%] w-80 h-80 bg-brand-orange/10 rounded-full blur-[80px] pointer-events-none -rotate-12"></div>

                <header className="px-6 py-8 pb-4 sticky top-0 bg-background/80 backdrop-blur-xl z-10 border-b border-border/50 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Centro de Mando</h1>
                        <p className="text-sm font-medium text-muted-foreground mt-1 tracking-wide">Patrimonio Global & Liquidez</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => openTransferModal()}
                            className="h-12 px-4 rounded-[16px] flex items-center justify-center bg-card border border-border/50 hover:bg-muted text-foreground transition-all hover:-translate-y-1 font-bold"
                            title="Transferencia Interna"
                        >
                            <ArrowRightLeft size={20} className="sm:mr-2" />
                            <span className="hidden sm:inline">Transferir</span>
                        </Button>
                        <Button onClick={openAddModal} className="w-12 h-12 rounded-[16px] p-0 flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-1">
                            <Plus size={24} />
                        </Button>
                    </div>
                </header>

                {loading ? (
                    <div className="px-6 mt-8 max-w-5xl mx-auto space-y-6 animate-pulse">
                        <div className="h-40 bg-card rounded-[36px] w-full"></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="h-32 bg-card rounded-[32px]"></div>
                            <div className="h-32 bg-card rounded-[32px]"></div>
                        </div>
                    </div>
                ) : (
                    <div className="px-6 mt-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">

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

                            {/* Performance Thermometer Widget (MVP Static Inflation for now) */}
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
                            <div className="flex p-1.5 bg-card/60 rounded-2xl border border-border/50 relative w-full h-14 backdrop-blur-sm mx-auto mb-6">
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

                            {/* List of Assets Grouped by Institution or Category */}
                            <div className="space-y-6">
                                {/* Physical Assets Header Controls */}
                                {activeTab === 'physical' && physicalAssets.length > 0 && (
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
                                )}

                                {filteredAssets.length === 0 ? (
                                    <div className="text-center py-12 bg-card/30 border border-dashed border-border/60 rounded-[32px]">
                                        <Wallet size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                                        <p className="text-muted-foreground font-bold text-lg mb-2">Aún no hay activos registrados</p>
                                        <p className="text-muted-foreground/70 text-sm max-w-sm mx-auto mb-6">Añade tus primeros activos para poblar este cuadrante y calcular tu liquidez.</p>
                                        <Button onClick={() => { setActiveTab(activeTab); openAddModal(); }} variant="outline" className="rounded-full font-bold border-border/50 text-foreground">
                                            Añadir {activeTab === 'financial' ? 'Financiero' : activeTab === 'digital' ? 'Digital' : 'Físico'}
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Financial & Digital Render (Grouped by Institution) */}
                                        {activeTab !== 'physical' &&
                                            Object.entries(
                                                filteredAssets.reduce((acc, asset) => {
                                                    const instId = asset.institution_id || 'NONE';
                                                    if (!acc[instId]) acc[instId] = [];
                                                    acc[instId].push(asset);
                                                    return acc;
                                                }, {} as Record<string, Asset[]>)
                                            ).map(([instId, groupAssets]) => {
                                                const inst = instId === 'NONE' ? null : institutions.find(i => i.id === instId);
                                                const instName = inst ? inst.name : 'Posesión Propia / Sin Custodio';
                                                const groupTotal = groupAssets.reduce((sum, a) => sum + Number(a.current_value), 0);

                                                return (
                                                    <div key={instId} className="bg-card/40 border border-border/30 rounded-[32px] p-4 sm:p-6 mb-4 relative overflow-hidden">
                                                        <div className="flex justify-between items-center mb-4 pl-2">
                                                            <h4 className="font-bold text-foreground text-sm uppercase tracking-wider flex items-center gap-2">
                                                                <Building size={16} className="text-primary" />
                                                                {instName}
                                                                <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full ml-2">
                                                                    {groupAssets.length}
                                                                </span>
                                                                {inst && (
                                                                    <button
                                                                        onClick={() => openEditInstModal(inst)}
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
                                                                <div key={asset.id} onClick={() => handleAssetClick(asset)} className="bg-card border border-border/50 rounded-[24px] p-4 flex items-center justify-between hover:border-primary/50 transition-colors group cursor-pointer shadow-sm hover:shadow-md">
                                                                    <div>
                                                                        <p className="font-bold text-foreground text-[17px]">{asset.name}</p>
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
                                            })
                                        }

                                        {/* Physical Assets Render */}
                                        {activeTab === 'physical' && (
                                            physicalSortBy === 'category' ? (
                                                /* Grouped by physical_type */
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
                                                                    <PhysicalAssetCard key={asset.id} asset={asset} viewMode={physicalViewMode} onClick={() => handleAssetClick(asset)} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                /* Sorted continuous list */
                                                <div className={physicalViewMode === 'gallery' ? "grid grid-cols-1 md:grid-cols-2 gap-4 mt-6" : "space-y-3 mt-6"}>
                                                    {sortedPhysicalAssets.map(asset => (
                                                        <PhysicalAssetCard key={asset.id} asset={asset} viewMode={physicalViewMode} onClick={() => handleAssetClick(asset)} />
                                                    ))}
                                                </div>
                                            )
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                    </div>
                )}

                <Suspense fallback={null}>
                    <InstitutionEditModal
                        isOpen={showEditInstModal}
                        institution={editingInst}
                        onClose={() => setShowEditInstModal(false)}
                        onSave={handleSaveInst}
                        onDelete={handleDeleteInst}
                    />
                </Suspense>

                <Suspense fallback={null}>
                    <AssetFormModal
                        isOpen={showAddModal}
                        editingAsset={editingAsset}
                        institutions={institutions}
                        activeTab={activeTab}
                        onClose={() => setShowAddModal(false)}
                        onSave={handleSaveAsset}
                        onDelete={editingAsset ? handleDeleteAsset : undefined}
                    />
                </Suspense>

                {/* ADVANCED FINANCIAL DASHBOARD */}
                {dashboardAsset && (
                    <FinancialAssetDashboard
                        asset={dashboardAsset}
                        currency={currency}
                        onClose={() => setDashboardAsset(null)}
                        onUpdate={invalidateData}
                        onEdit={() => {
                            setDashboardAsset(null);
                            openEditModal(dashboardAsset);
                        }}
                        onTransfer={() => openTransferModal(dashboardAsset.id)}
                    />
                )}

                <TransferModal
                    isOpen={showTransferModal}
                    onClose={(updated) => {
                        setShowTransferModal(false);
                        if (updated) invalidateData();
                    }}
                    assets={assets}
                    defaultSourceId={transferSourceId}
                />
            </div>
        </AppLayout >
    );
}
