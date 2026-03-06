"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ApiClient, Asset, Institution, LoanOptions } from "@/core/api";
import { useAssets, useInstitutions, PORTFOLIO_KEYS } from "@/core/hooks/useQueries";
import { handleApiError } from "@/core/errors/handleApiError";
import { useQueryClient } from "@tanstack/react-query";
import { useUserOptions } from "@/core/context/UserContext";
import { formatCurrency, formatPrivacyCurrency } from "@/lib/utils";
import { Plus, Wallet, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

import { TransferModal } from "@/components/ui/TransferModal";
import { PortfolioHeader } from "./PortfolioHeader";
import { FinancialAssetsList } from "./FinancialAssetsList";
import { DigitalAssetsList } from "./DigitalAssetsList";
import { PhysicalAssetsList } from "./PhysicalAssetsList";
import dynamic from 'next/dynamic';
import { Suspense, lazy } from "react";

const FinancialAssetDashboard = lazy(() => import('./FinancialAssetDashboard').then(mod => ({ default: mod.FinancialAssetDashboard })));
const LoanAssetDashboard = lazy(() => import('./LoanAssetDashboard').then(mod => ({ default: mod.LoanAssetDashboard })));
const CDTAssetDashboard = lazy(() => import('./CDTAssetDashboard').then(mod => ({ default: mod.CDTAssetDashboard })));
const VariableIncomeAssetDashboard = lazy(() => import('./VariableIncomeAssetDashboard').then(mod => ({ default: mod.VariableIncomeAssetDashboard })));

const InstitutionEditModal = dynamic(() => import('./InstitutionEditModal').then(mod => mod.InstitutionEditModal), {
    ssr: false,
});

const FinancialAssetFormModal = dynamic(() => import('./FinancialAssetFormModal').then(mod => mod.FinancialAssetFormModal), {
    ssr: false,
});

const DigitalAssetFormModal = dynamic(() => import('./DigitalAssetFormModal').then(mod => mod.DigitalAssetFormModal), {
    ssr: false,
});

const PhysicalAssetFormModal = dynamic(() => import('./PhysicalAssetFormModal').then(mod => mod.PhysicalAssetFormModal), {
    ssr: false,
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
    const [showFinancialModal, setShowFinancialModal] = useState(false);
    const [showDigitalModal, setShowDigitalModal] = useState(false);
    const [showPhysicalModal, setShowPhysicalModal] = useState(false);

    // El 'editingAsset' puede servir para cualquiera de los tres
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [dashboardAsset, setDashboardAsset] = useState<Asset | null>(null);

    // Transfer Modal
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferSourceId, setTransferSourceId] = useState<string>("");

    // Edit Institution State
    const [showEditInstModal, setShowEditInstModal] = useState(false);
    const [editingInst, setEditingInst] = useState<Institution | null>(null);

    const invalidateData = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEYS.assets }),
            queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEYS.institutions })
        ]);
    };

    const openAddModal = () => {
        setEditingAsset(null);
        if (activeTab === 'financial') setShowFinancialModal(true);
        if (activeTab === 'digital') setShowDigitalModal(true);
        if (activeTab === 'physical') setShowPhysicalModal(true);
    };

    const openTransferModal = (sourceId: string = "") => {
        setTransferSourceId(sourceId);
        setShowTransferModal(true);
    };

    const openEditModal = (asset: Asset) => {
        setEditingAsset(asset);
        if (asset.type === 'financial') setShowFinancialModal(true);
        if (asset.type === 'digital') setShowDigitalModal(true);
        if (asset.type === 'physical') setShowPhysicalModal(true);
    };

    const handleAssetClick = (asset: Asset) => {
        if (asset.type === 'financial' || (asset.type === 'digital' && asset.digital_type === 'loan')) {
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
            setShowFinancialModal(false);
            setShowDigitalModal(false);
            setShowPhysicalModal(false);
            await invalidateData();
        } catch (error) {
            handleApiError(error, "Error al eliminar activo");
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
            handleApiError(error, "Error al eliminar entidad");
        }
    };

    const handleSaveInst = async (id: string, newName: string) => {
        try {
            await ApiClient.updateInstitution(id, { name: newName });
            setShowEditInstModal(false);
            await invalidateData();
        } catch (error) {
            handleApiError(error, "Error al editar entidad");
            throw error;
        }
    };

    // Helper to create Institution if needed
    const _resolveInstitution = async (instId: string, customInstName: string) => {
        if (instId === "NEW" && customInstName.trim()) {
            const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            const inst = await ApiClient.createInstitution(customInstName.trim(), 'other', 'building', randomColor);
            return inst.id;
        }
        return instId === "NONE" ? null : instId;
    };

    const handleSaveFinancial = async (payload: Partial<Asset>, instId: string, customInstName: string) => {
        try {
            const finalInstId = await _resolveInstitution(instId, customInstName);
            const completePayload = { ...payload, institution_id: finalInstId };

            if (editingAsset && editingAsset.type === 'financial') {
                await ApiClient.updateAsset(editingAsset.id, completePayload);
            } else {
                await ApiClient.createAsset({ currency, is_manual: true, ...completePayload as any });
            }

            setShowFinancialModal(false);
            await invalidateData();
        } catch (error) {
            handleApiError(error, "Error al guardar Financiero");
        }
    };

    const handleSaveDigital = async (payload: Partial<Asset>, instId: string, customInstName: string, loanPayload?: Partial<LoanOptions>, cdtPayload?: any, investmentPayload?: { quantity: number; purchasePrice: number; currency: string }) => {
        try {
            const finalInstId = await _resolveInstitution(instId, customInstName);
            const completePayload = { ...payload, institution_id: finalInstId };

            if (editingAsset && editingAsset.type === 'digital') {
                await ApiClient.updateAsset(editingAsset.id, completePayload);
                if (loanPayload && completePayload.digital_type === 'loan') {
                    await ApiClient.updateLoanDetails(editingAsset.id, loanPayload);
                }
                if (cdtPayload && completePayload.digital_type === 'cdt') {
                    await ApiClient.updateCdtDetails(editingAsset.id, cdtPayload);
                }
            } else {
                const newAsset = await ApiClient.createAsset({ currency, is_manual: true, ...completePayload as any });
                if (loanPayload && completePayload.digital_type === 'loan') {
                    await ApiClient.createLoanDetails({
                        asset_id: newAsset.id,
                        debtor: loanPayload.debtor || "Deudor Desconocido",
                        principal_amount: loanPayload.principal_amount || 0,
                        term_months: loanPayload.term_months || 12,
                        grace_period_months: loanPayload.grace_period_months || 0,
                        amortization_type: loanPayload.amortization_type as any,
                        interest_rate_annual: loanPayload.interest_rate_annual || 0
                    });
                }
                if (cdtPayload && completePayload.digital_type === 'cdt') {
                    await ApiClient.createCdtDetails({
                        asset_id: newAsset.id,
                        principal_amount: cdtPayload.principal_amount || 0,
                        term_months: cdtPayload.term_months || null,
                        term_days: cdtPayload.term_days || null,
                    });
                }
                // INITIAL BUY TRANSACTION FOR INVESTMENTS
                if (investmentPayload && completePayload.digital_type === 'investment') {
                    await ApiClient.createAssetTransaction(
                        newAsset.id,
                        'buy',
                        investmentPayload.quantity,
                        investmentPayload.purchasePrice,
                        currency,
                        new Date().toISOString().split('T')[0]
                    );
                }
            }

            setShowDigitalModal(false);
            await invalidateData();
        } catch (error) {
            handleApiError(error, "Error al guardar Inversión");
        }
    };

    const handleSavePhysical = async (payload: Partial<Asset>) => {
        try {
            if (editingAsset && editingAsset.type === 'physical') {
                await ApiClient.updateAsset(editingAsset.id, payload);
            } else {
                await ApiClient.createAsset({ currency, is_manual: true, ...payload as any, institution_id: null });
            }

            setShowPhysicalModal(false);
            await invalidateData();
        } catch (error) {
            handleApiError(error, "Error al guardar Patrimonio");
        }
    };

    // Filtered lists
    const filteredAssets = assets.filter(a => a.type === activeTab);

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
                        {/* Remove Universal Plus Button, delegated to specific tabs now, or keeping it strictly tied to activeTab */}
                        <Button onClick={openAddModal} className="w-12 h-12 rounded-[16px] p-0 flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-1" title="Añadir Activo Rápido">
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
                        <PortfolioHeader
                            assets={assets}
                            institutions={institutions}
                            currency={currency}
                            hideBalances={hideBalances}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                        />

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
                            <div className="space-y-6">
                                {activeTab === 'financial' && (
                                    <FinancialAssetsList
                                        assets={filteredAssets}
                                        institutions={institutions}
                                        currency={currency}
                                        hideBalances={hideBalances}
                                        onAssetClick={handleAssetClick}
                                        onEditInstClick={openEditInstModal}
                                    />
                                )}
                                {activeTab === 'digital' && (
                                    <DigitalAssetsList
                                        assets={filteredAssets}
                                        institutions={institutions}
                                        currency={currency}
                                        hideBalances={hideBalances}
                                        onAssetClick={handleAssetClick}
                                        onEditInstClick={openEditInstModal}
                                    />
                                )}
                                {activeTab === 'physical' && (
                                    <PhysicalAssetsList
                                        assets={filteredAssets}
                                        currency={currency}
                                        hideBalances={hideBalances}
                                        onAssetClick={handleAssetClick}
                                    />
                                )}
                            </div>
                        )}
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
                    <FinancialAssetFormModal
                        isOpen={showFinancialModal}
                        editingAsset={editingAsset}
                        institutions={institutions}
                        onClose={() => setShowFinancialModal(false)}
                        onSave={handleSaveFinancial}
                        onDelete={editingAsset ? handleDeleteAsset : undefined}
                    />
                </Suspense>

                <Suspense fallback={null}>
                    <DigitalAssetFormModal
                        isOpen={showDigitalModal}
                        editingAsset={editingAsset}
                        institutions={institutions}
                        onClose={() => setShowDigitalModal(false)}
                        onSave={handleSaveDigital}
                        onDelete={editingAsset ? handleDeleteAsset : undefined}
                    />
                </Suspense>

                <Suspense fallback={null}>
                    <PhysicalAssetFormModal
                        isOpen={showPhysicalModal}
                        editingAsset={editingAsset}
                        onClose={() => setShowPhysicalModal(false)}
                        onSave={handleSavePhysical}
                        onDelete={editingAsset ? handleDeleteAsset : undefined}
                    />
                </Suspense>

                {/* ADVANCED FINANCIAL DASHBOARD (Only non-CDT) */}
                {dashboardAsset && dashboardAsset.type === 'financial' && (
                    <Suspense fallback={null}>
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
                    </Suspense>
                )}

                {/* ADVANCED DIGITAL INVESTMENT (Non-CDT) */}
                {dashboardAsset && dashboardAsset.type === 'digital' && dashboardAsset.digital_type === 'investment' && !dashboardAsset.cdt_details && (
                    <Suspense fallback={null}>
                        <VariableIncomeAssetDashboard
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
                    </Suspense>
                )}

                {/* ADVANCED CDT DASHBOARD */}
                {dashboardAsset && dashboardAsset.type === 'digital' && (dashboardAsset.digital_type === 'cdt' || (dashboardAsset.digital_type === 'investment' && dashboardAsset.cdt_details)) && (
                    <Suspense fallback={null}>
                        <CDTAssetDashboard
                            asset={dashboardAsset}
                            currency={currency}
                            onClose={() => setDashboardAsset(null)}
                            onUpdate={invalidateData}
                            onEdit={() => {
                                setDashboardAsset(null);
                                openEditModal(dashboardAsset);
                            }}
                        />
                    </Suspense>
                )}

                {/* ADVANCED LOANS DASHBOARD */}
                {dashboardAsset && dashboardAsset.type === 'digital' && dashboardAsset.digital_type === 'loan' && (
                    <Suspense fallback={null}>
                        <LoanAssetDashboard
                            asset={dashboardAsset}
                            currency={currency}
                            onClose={() => setDashboardAsset(null)}
                            onUpdate={invalidateData}
                            onEdit={() => {
                                setDashboardAsset(null);
                                openEditModal(dashboardAsset);
                            }}
                        />
                    </Suspense>
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
