"use client";

import { useState, useEffect } from "react";
import { Asset } from "@/core/api";
import { Button } from "@/components/ui/button";
import { PhysicalFormFields, PhysicalAssetType } from "./PhysicalFormFields";

interface PhysicalAssetFormModalProps {
    isOpen: boolean;
    editingAsset: Asset | null;
    onClose: () => void;
    onSave: (payload: Partial<Asset>) => Promise<void>;
    onDelete?: () => Promise<void>;
}

export function PhysicalAssetFormModal({ isOpen, editingAsset, onClose, onSave, onDelete }: PhysicalAssetFormModalProps) {
    const [saving, setSaving] = useState(false);

    // Form State
    const [newName, setNewName] = useState("");
    const [newVal, setNewVal] = useState("");
    const [newCurrency, setNewCurrency] = useState("COP");

    // Physical Specific
    const [newPhysicalType, setNewPhysicalType] = useState<PhysicalAssetType>('real_estate');
    const [newHasCredit, setNewHasCredit] = useState(false);
    const [newCreditAmount, setNewCreditAmount] = useState("");
    const [newCreditPaid, setNewCreditPaid] = useState("");

    useEffect(() => {
        if (isOpen) {
            if (editingAsset && editingAsset.type === 'physical') {
                setNewName(editingAsset.name);
                setNewVal(editingAsset.current_value.toString());
                setNewCurrency(editingAsset.currency || "COP");
                setNewPhysicalType(editingAsset.physical_type || 'real_estate');
                setNewHasCredit(editingAsset.has_credit || false);
                setNewCreditAmount(editingAsset.credit_amount?.toString() || "");
                setNewCreditPaid(editingAsset.credit_paid?.toString() || "");
            } else {
                setNewName("");
                setNewVal("");
                setNewCurrency("COP");
                setNewPhysicalType('real_estate');
                setNewHasCredit(false);
                setNewCreditAmount("");
                setNewCreditPaid("");
            }
        }
    }, [isOpen, editingAsset]);

    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || !newVal) return;

        setSaving(true);
        try {
            const payload: Partial<Asset> = {
                name: newName,
                type: 'physical',
                liquidity_layer: 'L3_low', // Físicos siempre son ilíquidos
                currency: newCurrency,
                current_value: parseFloat(newVal) || 0,
                physical_type: newPhysicalType,
                has_credit: newHasCredit,
                credit_amount: newHasCredit ? (parseFloat(newCreditAmount) || 0) : 0,
                credit_paid: newHasCredit ? (parseFloat(newCreditPaid) || 0) : 0,
            };

            await onSave(payload);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="bg-card w-full sm:w-[500px] h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-[32px] sm:rounded-[36px] p-6 sm:p-8 relative z-10 flex flex-col animate-in slide-in-from-bottom-5 border border-border/20">
                <div className="w-16 h-1.5 bg-muted rounded-full mx-auto mb-8 sm:hidden"></div>

                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h2 className="text-2xl font-bold text-foreground">{editingAsset ? 'Editar Patrimonio' : 'Añadir Patrimonio'}</h2>
                    {editingAsset && onDelete && (
                        <Button type="button" variant="ghost" onClick={onDelete} className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl" disabled={saving}>
                            Eliminar
                        </Button>
                    )}
                </div>

                <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar pb-6 relative">
                    <div>
                        <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Tipología de Patrimonio Físico</label>
                        <select
                            value={newPhysicalType}
                            onChange={e => setNewPhysicalType(e.target.value as any)}
                            className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-base appearance-none"
                            disabled={saving || editingAsset !== null}
                        >
                            <option value="real_estate">Inmueble / Bien Raíz</option>
                            <option value="vehicle">Vehículo (Auto/Moto)</option>
                            <option value="metals">Metales / Oro / Joyería</option>
                            <option value="other">Otro Bien Material</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Identificador</label>
                        <input
                            type="text"
                            required
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="Ej. Casa Bosque, BMW M3..."
                            className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-lg"
                            disabled={saving}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Valuación Estimada de Mercado</label>
                            <input
                                type="number"
                                required
                                step="any"
                                value={newVal}
                                onChange={e => setNewVal(e.target.value)}
                                placeholder="0.00"
                                className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-lg"
                                disabled={saving}
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Moneda</label>
                            <select
                                value={newCurrency}
                                onChange={e => setNewCurrency(e.target.value)}
                                className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-lg appearance-none"
                                disabled={saving}
                            >
                                <option value="COP">COP ($)</option>
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="MXN">MXN ($)</option>
                            </select>
                        </div>
                    </div>

                    <PhysicalFormFields
                        physicalType={newPhysicalType}
                        setPhysicalType={setNewPhysicalType}
                        hasCredit={newHasCredit}
                        setHasCredit={setNewHasCredit}
                        creditAmount={newCreditAmount}
                        setCreditAmount={setNewCreditAmount}
                        creditPaid={newCreditPaid}
                        setCreditPaid={setNewCreditPaid}
                        saving={saving}
                    />

                    <div className="pt-6 mt-4 border-t border-border/50 bg-card sticky bottom-0 pb-2">
                        <Button type="submit" disabled={saving} className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg hover:-translate-y-0.5 transition-all">
                            {saving ? 'Guardando...' : editingAsset ? 'Actualizar Patrimonio' : 'Guardar Patrimonio'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
