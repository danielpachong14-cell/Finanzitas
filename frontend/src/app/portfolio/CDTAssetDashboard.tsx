"use client";

import { useState, useEffect } from "react";
import { Asset } from "@/core/api/ApiClient";
import { X, Calendar, TrendingUp, Clock, AlertCircle, ShieldCheck } from "lucide-react";
import { calculateNetYield, monthsToDays, COLOMBIAN_TAX } from "@/core/finance/interestCalculator";

interface CDTAssetDashboardProps {
    asset: Asset;
    currency: string;
    onClose: () => void;
    onUpdate: () => void;
    onEdit: () => void;
}

export function CDTAssetDashboard({ asset, currency, onClose, onEdit }: CDTAssetDashboardProps) {
    const [daysPassed, setDaysPassed] = useState(0);
    const [totalDays, setTotalDays] = useState(0);
    const [progressPct, setProgressPct] = useState(0);
    const [maturityDateStr, setMaturityDateStr] = useState("");

    // Rendimientos actuales (a hoy)
    const [currentGrossYield, setCurrentGrossYield] = useState(0);
    const [currentRetefuente, setCurrentRetefuente] = useState(0);
    const [currentNetYield, setCurrentNetYield] = useState(0);

    // Rendimientos proyectados (al vencimiento)
    const [projectedGrossYield, setProjectedGrossYield] = useState(0);
    const [projectedRetefuente, setProjectedRetefuente] = useState(0);
    const [projectedNetYield, setProjectedNetYield] = useState(0);

    const cdtDetails = asset.cdt_details;
    const principal = Number(cdtDetails?.principal_amount || asset.current_value || 0);
    const openingDateStr = asset.opening_date || new Date().toISOString().split('T')[0];
    const rateEA = asset.interest_rate_nominal || 0;

    useEffect(() => {
        if (!cdtDetails) return;

        const openingDate = new Date(`${openingDateStr}T00:00:00`);
        const today = new Date();
        const diffTime = today.getTime() - openingDate.getTime();
        const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

        let tDays = 0;
        if (cdtDetails.term_days) {
            tDays = cdtDetails.term_days;
        } else if (cdtDetails.term_months) {
            tDays = monthsToDays(cdtDetails.term_months);
        }

        setDaysPassed(diffDays);
        setTotalDays(tDays);

        const pct = tDays > 0 ? Math.min(100, (diffDays / tDays) * 100) : 0;
        setProgressPct(pct);

        // Rendimientos a hoy usando fórmula centralizada con Retefuente
        const currentCalc = calculateNetYield(principal, rateEA, diffDays);
        setCurrentGrossYield(currentCalc.grossYield);
        setCurrentRetefuente(currentCalc.retefuente);
        setCurrentNetYield(currentCalc.netYield);

        // Proyección al vencimiento
        const projectedCalc = calculateNetYield(principal, rateEA, tDays);
        setProjectedGrossYield(projectedCalc.grossYield);
        setProjectedRetefuente(projectedCalc.retefuente);
        setProjectedNetYield(projectedCalc.netYield);

        // Fecha de vencimiento
        const mDate = new Date(openingDate.getTime() + tDays * 24 * 60 * 60 * 1000);
        setMaturityDateStr(mDate.toISOString().split('T')[0]);

    }, [asset, cdtDetails, openingDateStr, rateEA, principal]);

    const formatCurrencyValue = (val: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: 0 }).format(val);
    };

    if (!cdtDetails) return null;

    const daysRemaining = Math.max(0, totalDays - daysPassed);
    const isMatured = daysPassed >= totalDays;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in" onClick={onClose} />

            <div className="w-full sm:w-[500px] h-full bg-card shadow-2xl relative flex flex-col pt-safe animate-in slide-in-from-right duration-300">
                {/* HEADER */}
                <div className="flex items-center justify-between p-6 border-b border-border/10 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors text-muted-foreground group">
                            <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-foreground leading-tight tracking-tight">{asset.name}</h2>
                            <p className="text-sm font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md inline-flex items-center mt-1">
                                Certificado de Depósito a Término
                            </p>
                        </div>
                    </div>
                    <button onClick={onEdit} className="text-sm font-bold text-brand-blue hover:text-brand-blue/80 hover:bg-brand-blue/10 px-4 py-2 rounded-xl transition-colors">
                        Editar
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

                    {/* HERO BALANCE - Neto después de Retefuente */}
                    <div className="text-center bg-muted/30 border border-border/50 rounded-[32px] p-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                        <p className="text-sm font-bold text-muted-foreground mb-1 uppercase tracking-wider">Valor Actual Neto</p>
                        <h1 className="text-4xl sm:text-5xl font-black text-foreground tracking-tighter">
                            {formatCurrencyValue(principal + currentNetYield)}
                        </h1>
                        <div className="flex flex-col items-center gap-1 mt-3">
                            <p className="text-sm font-bold text-emerald-500 bg-emerald-500/10 inline-block px-3 py-1 rounded-full">
                                +{formatCurrencyValue(currentNetYield)} neto ganado
                            </p>
                            {currentRetefuente > 0 && (
                                <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                                    <ShieldCheck size={12} />
                                    Bruto: +{formatCurrencyValue(currentGrossYield)} | ReteFte: -{formatCurrencyValue(currentRetefuente)}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* PROGRESS BAR */}
                    <div className="bg-card border border-border/50 shadow-sm rounded-3xl p-6">
                        <div className="flex justify-between items-end mb-4">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                                <Clock className="w-4 h-4 text-primary" /> Progreso del Plazo
                            </h3>
                            <div className="text-right">
                                <p className="text-3xl font-black text-foreground leading-none">{progressPct.toFixed(1)}%</p>
                            </div>
                        </div>

                        <div className="h-4 bg-muted overflow-hidden rounded-full mb-3 flex w-full">
                            <div
                                className="h-full bg-primary transition-all duration-1000 ease-out"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>

                        <div className="flex justify-between text-xs font-bold text-muted-foreground">
                            <span>Día {daysPassed}</span>
                            <span>{isMatured ? '¡Vencido!' : `Faltan ${daysRemaining} días`}</span>
                            <span>Día {totalDays}</span>
                        </div>
                    </div>

                    {/* SUMMARY CARDS */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-muted/50 rounded-2xl p-3 flex flex-col justify-center">
                            <TrendingUp className="w-5 h-5 text-emerald-500 mb-1.5" />
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Tasa (EA)</p>
                            <p className="text-lg font-black text-foreground">{rateEA}%</p>
                        </div>
                        <div className="bg-muted/50 rounded-2xl p-3 flex flex-col justify-center">
                            <Calendar className="w-5 h-5 text-brand-blue mb-1.5" />
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Apertura</p>
                            <p className="text-[13px] sm:text-sm font-black text-foreground leading-tight">{openingDateStr}</p>
                        </div>
                        <div className="bg-muted/50 rounded-2xl p-3 flex flex-col justify-center">
                            <AlertCircle className="w-5 h-5 text-orange-400 mb-1.5" />
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Vencimiento</p>
                            <p className="text-[13px] sm:text-sm font-black text-foreground leading-tight">{maturityDateStr}</p>
                        </div>
                    </div>

                    {/* PROYECCIÓN AL VENCIMIENTO */}
                    <div className="bg-gradient-to-br from-card to-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6">
                        <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-500" /> Proyección al Vencimiento
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-border/30">
                                <span className="text-sm font-bold text-muted-foreground">Capital Inicial</span>
                                <span className="text-sm font-black text-foreground">{formatCurrencyValue(principal)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border/30">
                                <span className="text-sm font-bold text-muted-foreground">Intereses Brutos</span>
                                <span className="text-sm font-black text-emerald-500">+{formatCurrencyValue(projectedGrossYield)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border/30">
                                <span className="text-sm font-bold text-muted-foreground flex items-center gap-1">
                                    <ShieldCheck size={14} className="text-orange-400" />
                                    Retención en la Fuente ({COLOMBIAN_TAX.RETEFUENTE_TASA_PERCENT}%)
                                </span>
                                <span className="text-sm font-black text-orange-500">-{formatCurrencyValue(projectedRetefuente)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border/30">
                                <span className="text-sm font-bold text-emerald-600">Intereses Netos</span>
                                <span className="text-sm font-black text-emerald-500">+{formatCurrencyValue(projectedNetYield)}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 bg-emerald-500/5 rounded-xl px-3 -mx-1">
                                <span className="text-sm font-bold text-foreground">Retorno Total Neto</span>
                                <span className="text-lg font-black text-foreground">{formatCurrencyValue(principal + projectedNetYield)}</span>
                            </div>
                        </div>
                    </div>

                    {/* INFO NOTA FISCAL */}
                    <div className="bg-muted/30 border border-border/30 rounded-2xl p-4">
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            <strong>Nota fiscal:</strong> Se aplica retención en la fuente del {COLOMBIAN_TAX.RETEFUENTE_TASA_PERCENT}% sobre rendimientos financieros
                            que superen {formatCurrencyValue(COLOMBIAN_TAX.RETEFUENTE_UMBRAL_MENSUAL)} mensuales (4 UVT).
                            Los cálculos usan interés compuesto diario derivado de la tasa EA ingresada.
                            Valores de referencia UVT {COLOMBIAN_TAX.UVT_VALOR.toLocaleString('es-CO')} COP (2025).
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}
