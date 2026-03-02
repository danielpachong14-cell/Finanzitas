"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ApiClient, Asset, Institution } from "@/core/api/ApiClient";
import { useUserOptions } from "@/core/context/UserContext";
import { formatCurrency } from "@/lib/utils";
import { Plus, Briefcase, Activity, Flame, ShieldAlert, PlusCircle, Building, Wallet, LayoutGrid, Pencil, Trash2, List, AlignJustify } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FinancialAssetDashboard } from "./FinancialAssetDashboard";
import { PhysicalAssetCard } from "./PhysicalAssetCard";

export default function PortfolioPage() {
    const { currency } = useUserOptions();
    const [loading, setLoading] = useState(true);

    // Data
    const [assets, setAssets] = useState<Asset[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);

    // Active View Tab (Financial, Digital, Physical)
    const [activeTab, setActiveTab] = useState<'financial' | 'digital' | 'physical'>('financial');

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newName, setNewName] = useState("");
    const [newType, setNewType] = useState<'financial' | 'digital' | 'physical'>('financial');
    const [newLiquidity, setNewLiquidity] = useState<'L1_immediate' | 'L2_medium' | 'L3_low'>('L1_immediate');
    const [newVal, setNewVal] = useState("");
    const [newRate, setNewRate] = useState("");
    const [newInstitutionId, setNewInstitutionId] = useState("NONE");
    const [creatingInstitution, setCreatingInstitution] = useState(false);
    const [newInstName, setNewInstName] = useState("");
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [newOpeningDate, setNewOpeningDate] = useState("");
    const [newIsPaymentAccount, setNewIsPaymentAccount] = useState(false);
    const [dashboardAsset, setDashboardAsset] = useState<Asset | null>(null);

    // Physical Asset State
    const [newPhysicalType, setNewPhysicalType] = useState<'real_estate' | 'vehicle' | 'business' | 'tech' | 'jewelry' | 'other'>('other');
    const [newHasCredit, setNewHasCredit] = useState(false);
    const [newCreditAmount, setNewCreditAmount] = useState("");
    const [newCreditPaid, setNewCreditPaid] = useState("");

    // Edit Institution State
    const [showEditInstModal, setShowEditInstModal] = useState(false);
    const [editingInst, setEditingInst] = useState<Institution | null>(null);
    const [editInstName, setEditInstName] = useState("");

    // Physical View State
    const [physicalSortBy, setPhysicalSortBy] = useState<'category' | 'alpha' | 'value_desc' | 'value_asc'>('category');
    const [physicalViewMode, setPhysicalViewMode] = useState<'list' | 'gallery'>('list');

    const refreshData = async () => {
        try {
            const [loadedAssets, loadedInstitutions] = await Promise.all([
                ApiClient.getAssets(),
                ApiClient.getInstitutions()
            ]);
            setAssets(loadedAssets);
            setInstitutions(loadedInstitutions);
        } catch (error) {
            console.error("Failed to refresh portfolio", error);
        }
    };

    // Load Data
    useEffect(() => {
        async function loadPortfolio() {
            setLoading(true);
            await refreshData();
            setLoading(false);
        }
        loadPortfolio();
    }, []);

    const openAddModal = () => {
        setEditingAsset(null);
        setNewName("");
        setNewVal("");
        setNewRate("");
        setNewType(activeTab);
        setNewLiquidity('L1_immediate');
        setNewInstitutionId("NONE");
        setNewOpeningDate(new Date().toISOString().split('T')[0]);
        setNewIsPaymentAccount(false);
        setNewPhysicalType('other');
        setNewHasCredit(false);
        setNewCreditAmount("");
        setNewCreditPaid("");
        setShowAddModal(true);
    };

    const openEditModal = (asset: Asset) => {
        setEditingAsset(asset);
        setNewName(asset.name);
        setNewVal(asset.current_value.toString());
        setNewRate(asset.interest_rate_nominal.toString());
        setNewType(asset.type);
        setNewLiquidity(asset.liquidity_layer);
        setNewInstitutionId(asset.institution_id || "NONE");
        setNewIsPaymentAccount(asset.is_payment_account || false);
        setNewPhysicalType(asset.physical_type || 'other');
        setNewHasCredit(asset.has_credit || false);
        setNewCreditAmount(asset.credit_amount?.toString() || "");
        setNewCreditPaid(asset.credit_paid?.toString() || "");
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

        setSaving(true);
        try {
            await ApiClient.deleteAsset(editingAsset.id);
            setShowAddModal(false);
            await refreshData();
        } catch (error) {
            console.error("Error deleting asset", error);
            alert("Error al eliminar activo");
        } finally {
            setSaving(false);
        }
    };

    const openEditInstModal = (inst: Institution) => {
        setEditingInst(inst);
        setEditInstName(inst.name);
        setShowEditInstModal(true);
    };

    const handleDeleteInst = async () => {
        if (!editingInst) return;
        if (!confirm(`¿Estás seguro de eliminar la entidad "${editingInst.name}"? Los activos vinculados pasarán a Posesión Propia.`)) return;

        setSaving(true);
        try {
            await ApiClient.deleteInstitution(editingInst.id);
            setShowEditInstModal(false);
            await refreshData();
        } catch (error) {
            console.error("Error deleting institution", error);
            alert("Error al eliminar entidad");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveInst = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingInst || !editInstName.trim()) return;
        setSaving(true);
        try {
            await ApiClient.updateInstitution(editingInst.id, { name: editInstName.trim() });
            setShowEditInstModal(false);
            await refreshData();
        } catch (error) {
            console.error("Error updating institution", error);
            alert("Error al editar entidad");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || !newVal) return;
        setSaving(true);
        try {
            let instId = newInstitutionId;

            // Inline Institution creation
            if (instId === "NEW" && newInstName.trim()) {
                const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444'];
                const randomColor = colors[Math.floor(Math.random() * colors.length)];

                const inst = await ApiClient.createInstitution(newInstName.trim(), 'other', 'building', randomColor);
                instId = inst.id;
            }

            const payload: Partial<Asset> = {
                name: newName,
                type: newType,
                liquidity_layer: newLiquidity,
                current_value: parseFloat(newVal) || 0,
                interest_rate_nominal: parseFloat(newRate) || 0,
                institution_id: instId === "NONE" || instId === "NEW" ? null : instId,
                is_payment_account: newIsPaymentAccount,
            };

            if (newType === 'physical') {
                payload.physical_type = newPhysicalType;
                payload.has_credit = newHasCredit;
                if (newHasCredit) {
                    payload.credit_amount = parseFloat(newCreditAmount) || 0;
                    payload.credit_paid = parseFloat(newCreditPaid) || 0;
                } else {
                    payload.credit_amount = 0;
                    payload.credit_paid = 0;
                }
            }

            if (editingAsset) {
                await ApiClient.updateAsset(editingAsset.id, payload);
            } else {
                await ApiClient.createAsset({
                    currency: currency,
                    is_manual: true,
                    opening_date: newType === 'financial' && newOpeningDate ? newOpeningDate : undefined,
                    ...payload as any
                });
            }

            setShowAddModal(false);

            // Reset form
            setNewName("");
            setNewVal("");
            setNewRate("");
            setNewInstitutionId("NONE");
            setNewInstName("");
            setNewOpeningDate("");
            setNewIsPaymentAccount(false);
            setNewPhysicalType('other');
            setNewHasCredit(false);
            setNewCreditAmount("");
            setNewCreditPaid("");

            await refreshData();
        } catch (error) {
            console.error("Error saving asset", error);
            alert("Error al guardar activo");
        } finally {
            setSaving(false);
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
                    <Button onClick={openAddModal} className="w-12 h-12 rounded-full p-0 flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-1">
                        <Plus size={24} />
                    </Button>
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
                                        {formatCurrency(totalNetWorth, currency)}
                                    </h2>
                                </div>

                                {/* Liquidity Ring Simplified Concept */}
                                <div className="flex gap-4 md:flex-col md:gap-2 text-right">
                                    <div className="flex items-center space-x-2 md:justify-end">
                                        <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                                        <span className="text-sm font-bold text-muted-foreground">L1: {formatCurrency(l1Total, currency)}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 md:justify-end">
                                        <span className="w-3 h-3 rounded-full bg-brand-orange shadow-[0_0_10px_rgba(249,115,22,0.5)]"></span>
                                        <span className="text-sm font-bold text-muted-foreground">L2: {formatCurrency(l2Total, currency)}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 md:justify-end">
                                        <span className="w-3 h-3 rounded-full bg-brand-blue shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
                                        <span className="text-sm font-bold text-muted-foreground">L3: {formatCurrency(l3Total, currency)}</span>
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
                                    <p className="text-3xl font-black text-foreground tracking-tight">{formatCurrency(idleMoney, currency)}</p>
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
                                                    <span className="font-bold text-foreground">{formatCurrency(c.total, currency)}</span>
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
                                                            <span className="text-sm font-black text-foreground">{formatCurrency(groupTotal, currency)}</span>
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
                                                                        <p className="font-black text-foreground text-lg tracking-tight">{formatCurrency(asset.current_value, asset.currency)}</p>
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
                                                                <span className="text-sm font-black text-foreground">{formatCurrency(groupTotal, currency)}</span>
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

                {/* MODAL: EDIT INSTITUTION */}
                {showEditInstModal && (
                    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowEditInstModal(false)}></div>
                        <div className="bg-card w-full sm:w-[500px] h-auto rounded-t-[32px] sm:rounded-[36px] p-6 sm:p-8 relative z-10 flex flex-col animate-in slide-in-from-bottom-5 border border-border/20">
                            <div className="w-16 h-1.5 bg-muted rounded-full mx-auto mb-8 sm:hidden"></div>

                            <div className="flex justify-between items-center mb-6 shrink-0">
                                <h2 className="text-2xl font-bold text-foreground">Editar Entidad</h2>
                                <Button type="button" variant="ghost" onClick={handleDeleteInst} className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl p-2 h-auto">
                                    <Trash2 size={20} />
                                </Button>
                            </div>

                            <form onSubmit={handleSaveInst} className="flex flex-col space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Nombre de Entidad / Custodio</label>
                                    <input
                                        type="text"
                                        required
                                        value={editInstName}
                                        onChange={e => setEditInstName(e.target.value)}
                                        placeholder="Ej. NuBank, JPMorgan..."
                                        className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-lg"
                                    />
                                </div>

                                <div className="pt-6 border-t border-border/50 flex gap-3 shrink-0 mt-8">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowEditInstModal(false)}
                                        className="flex-1 h-14 rounded-2xl text-muted-foreground font-bold border-border/50 bg-card hover:bg-muted"
                                        disabled={saving}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1 h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-all hover:-translate-y-0.5"
                                        disabled={saving || !editInstName.trim()}
                                    >
                                        {saving ? 'Guardando...' : 'Guardar Edición'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL: ADD ASSET */}
                {showAddModal && (
                    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowAddModal(false)}></div>
                        <div className="bg-card w-full sm:w-[500px] h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-[32px] sm:rounded-[36px] p-6 sm:p-8 relative z-10 flex flex-col animate-in slide-in-from-bottom-5 border border-border/20">
                            <div className="w-16 h-1.5 bg-muted rounded-full mx-auto mb-8 sm:hidden"></div>

                            <div className="flex justify-between items-center mb-6 shrink-0">
                                <h2 className="text-2xl font-bold text-foreground">{editingAsset ? 'Editar Activo' : 'Añadir Activo'}</h2>
                                {editingAsset && (
                                    <Button type="button" variant="ghost" onClick={handleDeleteAsset} className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl">
                                        Eliminar
                                    </Button>
                                )}
                            </div>

                            <form onSubmit={handleSaveAsset} className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar pb-6 relative">
                                <div>
                                    <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Nombre del Activo</label>
                                    <input
                                        type="text"
                                        required
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        placeholder="Ej. Cuenta Ahorros Bancolombia"
                                        className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-lg"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className={newType === 'financial' && !editingAsset ? 'col-span-1' : 'col-span-2'}>
                                        <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Valor Actual / Balance Inicial</label>
                                        <input
                                            type="number"
                                            required
                                            step="0.01"
                                            value={newVal}
                                            onChange={e => setNewVal(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-lg"
                                        />
                                    </div>
                                    {newType === 'financial' && !editingAsset && (
                                        <div className="col-span-1">
                                            <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Fecha de Apertura</label>
                                            <input
                                                type="date"
                                                required
                                                value={newOpeningDate}
                                                onChange={e => setNewOpeningDate(e.target.value)}
                                                className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Rendimiento (EA %)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={newRate}
                                            onChange={e => setNewRate(e.target.value)}
                                            placeholder="0.0"
                                            className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-lg"
                                        />
                                    </div>
                                    <div className="flex flex-col justify-end pb-2">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only"
                                                    checked={newIsPaymentAccount}
                                                    onChange={e => setNewIsPaymentAccount(e.target.checked)}
                                                />
                                                <div className={`block w-14 h-8 rounded-full transition-colors ${newIsPaymentAccount ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
                                                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${newIsPaymentAccount ? 'translate-x-6' : ''}`}></div>
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground text-sm">Usar para Pagos</p>
                                                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Permite vincular transacciones</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Tipo</label>
                                        <select
                                            value={newType}
                                            onChange={e => {
                                                setNewType(e.target.value as any);
                                                // Default physical type when choosing physical
                                                if (e.target.value === 'physical' && newPhysicalType === 'other') {
                                                    setNewPhysicalType('real_estate');
                                                }
                                            }}
                                            className="w-full h-14 bg-muted border border-transparent rounded-2xl px-4 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none"
                                        >
                                            <option value="financial">Financiero</option>
                                            <option value="digital">Digital (Crypto/Bolsa)</option>
                                            <option value="physical">Físico (Bienes)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Liquidez</label>
                                        <select
                                            value={newLiquidity}
                                            onChange={e => setNewLiquidity(e.target.value as any)}
                                            className="w-full h-14 bg-muted border border-transparent rounded-2xl px-4 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none"
                                        >
                                            <option value="L1_immediate">L1 Inmediata (24hr)</option>
                                            <option value="L2_medium">L2 Media (2-7 días)</option>
                                            <option value="L3_low">L3 Baja (Meses)</option>
                                        </select>
                                    </div>
                                </div>

                                {newType === 'physical' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Tipología de Bien Físico</label>
                                            <select
                                                value={newPhysicalType}
                                                onChange={e => setNewPhysicalType(e.target.value as any)}
                                                className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-base appearance-none"
                                            >
                                                <option value="real_estate">Inmueble / Bien Raíz</option>
                                                <option value="vehicle">Vehículo</option>
                                                <option value="business">Empresa / Negocio</option>
                                                <option value="tech">Tecnología / Equipos</option>
                                                <option value="jewelry">Joyería / Arte</option>
                                                <option value="other">Otro Bien</option>
                                            </select>
                                        </div>

                                        <div className="bg-muted/50 border border-border/50 rounded-2xl p-5 space-y-5">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-bold text-foreground text-sm">¿Financiado / Apalancado?</p>
                                                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Control de deudas sobre este activo</p>
                                                </div>
                                                <div className="relative cursor-pointer" onClick={() => setNewHasCredit(!newHasCredit)}>
                                                    <div className={`block w-14 h-8 rounded-full transition-colors ${newHasCredit ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
                                                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${newHasCredit ? 'translate-x-6' : ''}`}></div>
                                                </div>
                                            </div>

                                            {newHasCredit && (
                                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                                                    <div>
                                                        <label className="block text-xs font-bold text-muted-foreground mb-1.5 ml-1">Monto Deuda Inicial</label>
                                                        <input
                                                            type="number"
                                                            required={newHasCredit}
                                                            min="0"
                                                            step="0.01"
                                                            value={newCreditAmount}
                                                            onChange={e => setNewCreditAmount(e.target.value)}
                                                            placeholder="0.00"
                                                            className="w-full h-11 bg-card border border-border/50 rounded-xl px-3 text-foreground font-bold outline-none focus:border-primary/50 transition-all text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-emerald-500 mb-1.5 ml-1">Total Pagado Aportado</label>
                                                        <input
                                                            type="number"
                                                            required={newHasCredit}
                                                            min="0"
                                                            step="0.01"
                                                            value={newCreditPaid}
                                                            onChange={e => setNewCreditPaid(e.target.value)}
                                                            placeholder="0.00"
                                                            className="w-full h-11 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 text-emerald-600 dark:text-emerald-400 font-bold outline-none focus:border-emerald-500 transition-all text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Custodio / Entidad</label>
                                    <select
                                        value={newInstitutionId}
                                        onChange={e => {
                                            setNewInstitutionId(e.target.value);
                                            setCreatingInstitution(e.target.value === 'NEW');
                                        }}
                                        className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-base appearance-none"
                                    >
                                        <option value="NONE">Ninguno / Posesión Propia</option>
                                        {institutions.map(inst => (
                                            <option key={inst.id} value={inst.id}>{inst.name}</option>
                                        ))}
                                        <option value="NEW">+ Añadir nueva entidad...</option>
                                    </select>
                                </div>

                                {creatingInstitution && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <input
                                            type="text"
                                            required
                                            value={newInstName}
                                            onChange={e => setNewInstName(e.target.value)}
                                            placeholder="Nombre de la nueva entidad (ej. JPMorgan)"
                                            className="w-full h-14 bg-card border border-primary/30 rounded-2xl px-5 text-foreground font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                                        />
                                    </div>
                                )}

                                <div className="pt-6 border-t border-border/50 flex gap-3 shrink-0 mt-8">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 h-14 rounded-2xl text-muted-foreground font-bold border-border/50 bg-card hover:bg-muted"
                                        disabled={saving}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1 h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-all hover:-translate-y-0.5"
                                        disabled={saving || !newName.trim() || !newVal}
                                    >
                                        {saving ? 'Guardando...' : 'Guardar Activo'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ADVANCED FINANCIAL DASHBOARD */}
                {dashboardAsset && (
                    <FinancialAssetDashboard
                        asset={dashboardAsset}
                        currency={currency}
                        onClose={() => setDashboardAsset(null)}
                        onUpdate={refreshData}
                        onEdit={() => openEditModal(dashboardAsset)}
                    />
                )}
            </div>
        </AppLayout >
    );
}
