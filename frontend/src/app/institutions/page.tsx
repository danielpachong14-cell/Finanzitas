"use client";

import { useState, useEffect } from "react";
import { Institution, Asset } from "@/core/api";
import { ApiClient } from "@/core/api";
import { AppLayout } from "@/components/layout/AppLayout";
import { Building2, Plus, Edit2, Trash2, Shield, Landmark, Bitcoin, Home, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstitutionFormModal } from "./InstitutionFormModal";

// Helper to format currency
const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

// Helper for Icons
const getIconByType = (type: string) => {
    switch (type) {
        case 'bank': return <Landmark size={24} className="text-white" />;
        case 'broker': return <Shield size={24} className="text-white" />;
        case 'crypto_exchange': return <Bitcoin size={24} className="text-white" />;
        case 'real_estate': return <Home size={24} className="text-white" />;
        default: return <Building2 size={24} className="text-white" />;
    }
};

const getTypeName = (type: string) => {
    switch (type) {
        case 'bank': return 'Banco';
        case 'broker': return 'Broker';
        case 'crypto_exchange': return 'Exchange Cripto';
        case 'real_estate': return 'Inmobiliaria';
        default: return 'Otra Entidad';
    }
};

export default function InstitutionsPage() {
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [insts, assts] = await Promise.all([
                ApiClient.getInstitutions(),
                ApiClient.getAssets(),
            ]);
            setInstitutions(insts);
            setAssets(assts);
        } catch (error) {
            console.error("Error loading institutions page data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSaveInstitution = async (payload: Partial<Institution>) => {
        try {
            if (editingInstitution) {
                await ApiClient.updateInstitution(editingInstitution.id, payload);
            } else {
                await ApiClient.createInstitution(
                    payload.name || 'Nueva Entidad',
                    payload.type || 'other',
                    payload.icon || 'building',
                    payload.color || '#3b82f6'
                );
            }
            setIsModalOpen(false);
            setEditingInstitution(null);
            loadData();
        } catch (error) {
            console.error("Error saving institution:", error);
            alert("Error al guardar la entidad.");
        }
    };

    const handleDelete = async (id: string, name: string) => {
        const hasAssets = assets.some(a => a.institution_id === id);
        if (hasAssets) {
            alert(`No puedes eliminar "${name}" porque tiene activos asociados. Reasigna o elimina los activos primero.`);
            return;
        }

        if (confirm(`¿Estás seguro de que deseas eliminar la entidad "${name}"?`)) {
            try {
                await ApiClient.deleteInstitution(id);
                loadData();
            } catch (error) {
                console.error("Error deleting institution", error);
                alert("Error al eliminar la entidad.");
            }
        }
    };

    const openEdit = (inst: Institution) => {
        setEditingInstitution(inst);
        setIsModalOpen(true);
    };

    const openCreate = () => {
        setEditingInstitution(null);
        setIsModalOpen(true);
    };

    // Calculation mapping
    // Group totals by currency per institution.
    // For simplicity, we'll just sum the raw value and indicate the primary currencies used (or assume user currency if multiple)
    // Actually, let's group by currency and display a mapped string.

    const getInstitutionTotals = (instId: string) => {
        const instAssets = assets.filter(a => a.institution_id === instId);
        if (instAssets.length === 0) return [{ currency: 'USD', total: 0 }];

        const grouped: Record<string, number> = {};
        instAssets.forEach(a => {
            if (!grouped[a.currency]) grouped[a.currency] = 0;
            grouped[a.currency] += Number(a.current_value) || 0;
        });

        return Object.entries(grouped).map(([currency, total]) => ({ currency, total }));
    };

    return (
        <AppLayout>
            <div className="flex flex-col gap-8 p-6 lg:p-10 animate-fade-in pb-24 lg:pb-10 max-w-[1600px] mx-auto min-h-screen">
                <div className="flex flex-col gap-8 flex-1">

                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl lg:text-5xl font-black text-foreground tracking-tight">Entidades</h1>
                            <p className="text-lg text-muted-foreground font-bold mt-2">Administra tus bancos, brokers y custodios</p>
                        </div>
                        <Button
                            onClick={openCreate}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all shadow-lg rounded-2xl px-6 py-6 font-bold flex items-center gap-2"
                        >
                            <Plus size={20} />
                            <span className="hidden sm:inline">Añadir Entidad</span>
                        </Button>
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className="flex justify-center flex-1 items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                    ) : institutions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center flex-1 text-center bg-card border border-border/50 rounded-[40px] p-12">
                            <div className="bg-muted p-6 rounded-full mb-6 relative group">
                                <Building2 size={48} className="text-muted-foreground" />
                            </div>
                            <h2 className="text-2xl font-black text-foreground mb-3">No tienes entidades creadas</h2>
                            <p className="text-muted-foreground max-w-md">Registra tus bancos y brokers para poder asociarles portafolios de inversión o cuentas corrientes.</p>
                            <Button className="mt-8 px-8 py-6 rounded-2xl font-bold rounded-2xl" onClick={openCreate}>
                                <Plus size={20} className="mr-2" /> Crear tu primera Entidad
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {institutions.map(inst => {
                                const totals = getInstitutionTotals(inst.id);
                                const totalPortfolios = assets.filter(a => a.institution_id === inst.id).length;

                                return (
                                    <div key={inst.id} className="bg-card border border-border/50 rounded-[32px] overflow-hidden flex flex-col group hover:shadow-xl hover:border-border transition-all duration-300">
                                        <div className="h-24 w-full relative" style={{ backgroundColor: inst.color || '#3b82f6' }}>
                                            {/* Decorative Background Pattern */}
                                            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
                                            <div className="absolute -bottom-8 left-6 w-16 h-16 rounded-2xl bg-card border-[4px] border-card flex items-center justify-center shadow-lg overflow-hidden">
                                                <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: inst.color || '#3b82f6' }}>
                                                    {getIconByType(inst.type)}
                                                </div>
                                            </div>
                                            <div className="absolute top-4 right-4 flex gap-2">
                                                <button onClick={() => openEdit(inst)} className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md flex items-center justify-center text-white transition-colors">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(inst.id, inst.name)} className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md flex items-center justify-center text-white transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="pt-12 pb-6 px-6 flex-1 flex flex-col">
                                            <h3 className="text-xl font-black text-foreground truncate">{inst.name}</h3>
                                            <p className="text-sm font-bold text-muted-foreground mt-1">{getTypeName(inst.type)}</p>

                                            <div className="mt-6 flex-1">
                                                <p className="text-xs uppercase font-bold text-muted-foreground mb-2 tracking-wider">Activos Bajo Custodia</p>
                                                <div className="space-y-2">
                                                    {totals.map(t => (
                                                        <div key={t.currency} className="flex justify-between items-center bg-muted/30 p-2.5 rounded-xl border border-border/30">
                                                            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-primary/50" /> {t.currency}
                                                            </span>
                                                            <span className="font-bold text-sm text-foreground">{formatCurrency(t.total, t.currency)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-border/50 flex justify-between items-center text-xs font-bold text-muted-foreground">
                                                <span>Portafolios/Cuentas:</span>
                                                <span className="text-foreground bg-muted px-2 py-1 rounded-md">{totalPortfolios}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            <InstitutionFormModal
                isOpen={isModalOpen}
                editingInstitution={editingInstitution}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveInstitution}
            />
        </AppLayout>
    );
}
