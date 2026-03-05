import React from 'react';

export type PhysicalAssetType = 'real_estate' | 'vehicle' | 'business' | 'tech' | 'jewelry' | 'other';

interface PhysicalFormFieldsProps {
    physicalType: PhysicalAssetType;
    setPhysicalType: (val: PhysicalAssetType) => void;
    hasCredit: boolean;
    setHasCredit: (val: boolean) => void;
    creditAmount: string;
    setCreditAmount: (val: string) => void;
    creditPaid: string;
    setCreditPaid: (val: string) => void;
    saving: boolean;
}

export function PhysicalFormFields({
    physicalType, setPhysicalType, hasCredit, setHasCredit, creditAmount, setCreditAmount, creditPaid, setCreditPaid, saving
}: PhysicalFormFieldsProps) {
    return (
        <>
            <div>
                <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Tipología de Bien Físico</label>
                <select
                    value={physicalType}
                    onChange={e => setPhysicalType(e.target.value as PhysicalAssetType)}
                    className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-base appearance-none"
                    disabled={saving}
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
                    <div className="relative cursor-pointer" onClick={() => !saving && setHasCredit(!hasCredit)}>
                        <div className={`block w-14 h-8 rounded-full transition-colors ${hasCredit ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${hasCredit ? 'translate-x-6' : ''}`}></div>
                    </div>
                </div>

                {hasCredit && (
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1.5 ml-1">Monto Deuda Inicial</label>
                            <input
                                type="number"
                                required={hasCredit}
                                min="0"
                                step="0.01"
                                value={creditAmount}
                                onChange={e => setCreditAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full h-11 bg-card border border-border/50 rounded-xl px-3 text-foreground font-bold outline-none focus:border-primary/50 transition-all text-sm"
                                disabled={saving}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-emerald-500 mb-1.5 ml-1">Total Pagado Aportado</label>
                            <input
                                type="number"
                                required={hasCredit}
                                min="0"
                                step="0.01"
                                value={creditPaid}
                                onChange={e => setCreditPaid(e.target.value)}
                                placeholder="0.00"
                                className="w-full h-11 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 text-emerald-600 dark:text-emerald-400 font-bold outline-none focus:border-emerald-500 transition-all text-sm"
                                disabled={saving}
                            />
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
