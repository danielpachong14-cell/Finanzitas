import React from 'react';

interface CdtFormFieldsProps {
    cdtTermType: 'months' | 'days';
    setCdtTermType: (value: 'months' | 'days') => void;
    cdtTermValue: string;
    setCdtTermValue: (value: string) => void;
    saving: boolean;
    required: boolean;
}

export function CdtFormFields({ cdtTermType, setCdtTermType, cdtTermValue, setCdtTermValue, saving, required }: CdtFormFieldsProps) {
    return (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2">
            <h3 className="font-bold text-primary text-sm flex items-center mb-1">
                Detalles del CDT
            </h3>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/20">
                <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1.5 ml-1">Plazo expresado en:</label>
                    <select
                        value={cdtTermType}
                        onChange={e => setCdtTermType(e.target.value as 'months' | 'days')}
                        className="w-full h-11 bg-card border border-border/50 rounded-xl px-3 text-foreground font-bold outline-none focus:border-primary/50 transition-all text-sm appearance-none"
                        disabled={saving}
                    >
                        <option value="months">Meses</option>
                        <option value="days">Días</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1.5 ml-1">Nº {cdtTermType === 'months' ? 'Meses' : 'Días'}</label>
                    <input
                        type="number"
                        required={required}
                        min="1"
                        value={cdtTermValue}
                        onChange={e => setCdtTermValue(e.target.value)}
                        className="w-full h-11 bg-card border border-border/50 rounded-xl px-3 text-foreground font-bold outline-none focus:border-primary/50 transition-all text-sm"
                        disabled={saving}
                    />
                </div>
                <div className="col-span-2">
                    <p className="text-[11px] text-muted-foreground/80 leading-tight">
                        Asegúrate de colocar tu <strong>Rendimiento (EA %)</strong> arriba para calcular correctamente lo ganado al día de hoy.
                    </p>
                </div>
            </div>
        </div>
    );
}
