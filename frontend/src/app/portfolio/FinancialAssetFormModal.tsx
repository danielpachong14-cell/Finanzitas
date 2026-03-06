"use client";

import { useState, useEffect } from "react";
import { Asset, Institution } from "@/core/api";
import { Button } from "@/components/ui/button";

interface FinancialAssetFormModalProps {
    isOpen: boolean;
    editingAsset: Asset | null;
    institutions: Institution[];
    onClose: () => void;
    onSave: (payload: Partial<Asset>, instId: string, instName: string) => Promise<void>;
    onDelete?: () => Promise<void>;
}

export function FinancialAssetFormModal({ isOpen, editingAsset, institutions, onClose, onSave, onDelete }: FinancialAssetFormModalProps) {
    const [saving, setSaving] = useState(false);

    const financialInstitutions = institutions.filter(inst =>
        inst.type === 'bank' || inst.type === 'other'
    );

    // Form State
    const [newName, setNewName] = useState("");
    const [newLiquidity, setNewLiquidity] = useState<'L1_immediate' | 'L2_medium' | 'L3_low'>('L1_immediate');
    const [newVal, setNewVal] = useState("");
    const [newRate, setNewRate] = useState("");
    const [newInstitutionId, setNewInstitutionId] = useState("NONE");
    const [creatingInstitution, setCreatingInstitution] = useState(false);
    const [newInstName, setNewInstName] = useState("");
    const [newOpeningDate, setNewOpeningDate] = useState("");
    const [newIsPaymentAccount, setNewIsPaymentAccount] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (editingAsset && editingAsset.type === 'financial') {
                setNewName(editingAsset.name);
                setNewVal(editingAsset.current_value.toString());
                setNewRate(editingAsset.interest_rate_nominal.toString());
                setNewLiquidity(editingAsset.liquidity_layer);
                setNewInstitutionId(editingAsset.institution_id || "NONE");
                setCreatingInstitution(false);
                setNewIsPaymentAccount(editingAsset.is_payment_account || false);
                setNewOpeningDate("");
            } else {
                setNewName("");
                setNewVal("");
                setNewRate("");
                setNewLiquidity('L1_immediate');
                setNewInstitutionId("NONE");
                setCreatingInstitution(false);
                setNewInstName("");
                setNewOpeningDate(new Date().toISOString().split('T')[0]);
                setNewIsPaymentAccount(false);
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
                type: 'financial',
                liquidity_layer: newLiquidity,
                current_value: parseFloat(newVal) || 0,
                interest_rate_nominal: parseFloat(newRate) || 0,
                is_payment_account: newIsPaymentAccount,
                opening_date: newOpeningDate && !editingAsset ? newOpeningDate : undefined,
            };

            await onSave(payload, newInstitutionId, newInstName);
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
                    <h2 className="text-2xl font-bold text-foreground">{editingAsset ? 'Editar Financiero' : 'Añadir Financiero'}</h2>
                    {editingAsset && onDelete && (
                        <Button type="button" variant="ghost" onClick={onDelete} className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl" disabled={saving}>
                            Eliminar
                        </Button>
                    )}
                </div>

                <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar pb-6 relative">
                    <div>
                        <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Nombre de la Cuenta</label>
                        <input
                            type="text"
                            required
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="Ej. Cuenta Ahorros NuBank"
                            className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-lg"
                            disabled={saving}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className={!editingAsset ? 'col-span-1' : 'col-span-2'}>
                            <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Saldo Actual</label>
                            <input
                                type="number"
                                required
                                step="0.01"
                                value={newVal}
                                onChange={e => setNewVal(e.target.value)}
                                placeholder="0.00"
                                className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-lg"
                                disabled={saving}
                            />
                        </div>
                        {!editingAsset && (
                            <div className="col-span-1">
                                <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Fecha Apertura</label>
                                <input
                                    type="date"
                                    required
                                    value={newOpeningDate}
                                    onChange={e => setNewOpeningDate(e.target.value)}
                                    className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none"
                                    disabled={saving}
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Tasa Anual (EA %)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={newRate}
                                onChange={e => setNewRate(e.target.value)}
                                placeholder="0.0"
                                className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-lg"
                                disabled={saving}
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
                                        disabled={saving}
                                    />
                                    <div className={`block w-14 h-8 rounded-full transition-colors ${newIsPaymentAccount ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${newIsPaymentAccount ? 'translate-x-6' : ''}`}></div>
                                </div>
                                <div>
                                    <p className="font-bold text-foreground text-sm">Usar para Pagos</p>
                                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Permite vincular</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Nivel de Liquidez</label>
                        <select
                            value={newLiquidity}
                            onChange={e => setNewLiquidity(e.target.value as any)}
                            className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-base appearance-none"
                            disabled={saving}
                        >
                            <option value="L1_immediate">L1 Inmediata (24hr)</option>
                            <option value="L2_medium">L2 Media (2-7 días)</option>
                            <option value="L3_low">L3 Baja (Meses/Años)</option>
                        </select>
                    </div>

                    {!creatingInstitution ? (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Entidad Bancaria / Custodio</label>
                            <select
                                value={newInstitutionId}
                                onChange={e => {
                                    if (e.target.value === 'NEW') {
                                        setCreatingInstitution(true);
                                        setNewInstitutionId("NEW");
                                    } else {
                                        setNewInstitutionId(e.target.value);
                                    }
                                }}
                                className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-base appearance-none"
                                disabled={saving}
                            >
                                <option value="NONE">Sin Entidad (Efectivo / Caja Fuerte)</option>
                                {financialInstitutions.map(inst => (
                                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                                ))}
                                <option value="NEW" className="font-bold text-primary">+ Añadir Nueva Entidad</option>
                            </select>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-top-2 bg-primary/5 p-4 rounded-2xl border border-primary/20">
                            <label className="block text-sm font-bold text-primary mb-2">Nombre de Nueva Entidad</label>
                            <input
                                type="text"
                                required={creatingInstitution}
                                value={newInstName}
                                onChange={e => setNewInstName(e.target.value)}
                                placeholder="Ej. NuBank"
                                className="w-full h-12 bg-card border border-primary/30 rounded-xl px-4 text-foreground font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-base mb-3"
                                disabled={saving}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setCreatingInstitution(false);
                                    setNewInstitutionId("NONE");
                                    setNewInstName("");
                                }}
                                className="w-full text-muted-foreground hover:text-foreground h-10 rounded-xl"
                                disabled={saving}
                            >
                                Cancelar
                            </Button>
                        </div>
                    )}

                    <div className="pt-6 mt-4 border-t border-border/50 bg-card sticky bottom-0 pb-2">
                        <Button type="submit" disabled={saving || (creatingInstitution && !newInstName.trim())} className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg hover:-translate-y-0.5 transition-all">
                            {saving ? 'Guardando...' : editingAsset ? 'Actualizar Cuenta' : 'Guardar Cuenta'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
