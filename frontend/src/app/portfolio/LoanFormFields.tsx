import React from 'react';
import { Info, Loader2 } from "lucide-react";

interface LoanFormFieldsProps {
    loadingDetails: boolean;
    hasPayments: boolean;
    saving: boolean;
    required: boolean;
    debtor: string;
    setDebtor: (val: string) => void;
    term: string;
    setTerm: (val: string) => void;
    grace: string;
    setGrace: (val: string) => void;
    amortization: 'french' | 'german' | 'none';
    setAmortization: (val: 'french' | 'german' | 'none') => void;
}

export function LoanFormFields({
    loadingDetails, hasPayments, saving, required,
    debtor, setDebtor, term, setTerm, grace, setGrace, amortization, setAmortization
}: LoanFormFieldsProps) {
    return (
        <div className="bg-brand-blue/10 border border-brand-blue/30 rounded-2xl p-5 space-y-5 animate-in fade-in slide-in-from-top-2">
            <h3 className="font-bold text-brand-blue text-sm mb-2 flex items-center">
                Detalles del Préstamo Otorgado
            </h3>

            {loadingDetails ? (
                <div className="flex justify-center items-center py-6 text-brand-blue/70">
                    <Loader2 className="animate-spin w-6 h-6 mr-2" /> Cargando detalles...
                </div>
            ) : (
                <>
                    {hasPayments && (
                        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-500 text-xs font-bold p-3 rounded-xl flex items-start gap-2">
                            <Info size={16} className="shrink-0 mt-0.5" />
                            <span>
                                Este préstamo ya tiene pagos registrados, por lo que sus plazos, tasas y meses de gracia están <strong>bloqueados</strong>.
                            </span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-muted-foreground mb-1.5 ml-1">Deudor / Entidad receptora</label>
                        <input
                            type="text"
                            required={required}
                            value={debtor}
                            onChange={e => setDebtor(e.target.value)}
                            placeholder="Nombre de la persona o empresa"
                            className="w-full h-12 bg-card border border-border/50 rounded-xl px-4 text-foreground font-bold outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/30 transition-all text-sm"
                            disabled={saving || hasPayments}
                        />
                    </div>

                    <div className={`grid grid-cols-2 gap-4 ${amortization === 'none' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1.5 ml-1">Plazo (Meses)</label>
                            <input
                                type="number"
                                required={required && amortization !== 'none'}
                                min="1"
                                value={term}
                                onChange={e => setTerm(e.target.value)}
                                className="w-full h-12 bg-card border border-border/50 rounded-xl px-4 text-foreground font-bold outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/30 transition-all text-sm"
                                disabled={saving || hasPayments}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1.5 ml-1">Meses de Gracia</label>
                            <input
                                type="number"
                                min="0"
                                value={grace}
                                onChange={e => setGrace(e.target.value)}
                                className="w-full h-12 bg-card border border-border/50 rounded-xl px-4 text-foreground font-bold outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/30 transition-all text-sm"
                                disabled={saving || hasPayments}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-muted-foreground mb-1.5 ml-1">Sistema de Amortización</label>
                        <select
                            value={amortization}
                            onChange={e => setAmortization(e.target.value as any)}
                            className="w-full h-12 bg-card border border-border/50 rounded-xl px-4 text-foreground font-bold outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/30 transition-all text-sm appearance-none"
                            disabled={saving || hasPayments}
                        >
                            <option value="french">Cuota Fija (Francesa)</option>
                            <option value="german">Abono a Capital Fijo (Alemana)</option>
                            <option value="none">Sin plan (Préstamo Abierto)</option>
                        </select>
                    </div>

                    <p className="text-[11px] text-muted-foreground/80 leading-tight">
                        Nota: El <strong className="text-muted-foreground">Monto</strong> prestado corresponde al "Valor Actual" y la <strong className="text-muted-foreground">Tasa</strong> equivale al "Rendimiento" que pusiste arriba.
                    </p>
                </>
            )}
        </div>
    );
}
