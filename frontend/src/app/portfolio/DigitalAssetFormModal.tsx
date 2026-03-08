"use client";

import { useState, useEffect } from "react";
import { Asset, Institution, LoanOptions } from "@/core/api";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import { CdtFormFields } from "./CdtFormFields";
import { LoanFormFields } from "./LoanFormFields";
import { FmpService, FmpSearchResult } from "@/core/api/providers/FmpService";
import { ApiClient } from "@/core/api";

interface DigitalAssetFormModalProps {
    isOpen: boolean;
    editingAsset: Asset | null;
    institutions: Institution[];
    onClose: () => void;
    onSave: (payload: Partial<Asset>, instId: string, instName: string, loanPayload?: Partial<LoanOptions>, cdtPayload?: Partial<any>, investmentPayload?: { quantity: number; purchasePrice: number; currency: string }) => Promise<void>;
    onDelete?: () => Promise<void>;
}

export function DigitalAssetFormModal({ isOpen, editingAsset, institutions, onClose, onSave, onDelete }: DigitalAssetFormModalProps) {
    const [saving, setSaving] = useState(false);

    // Filter to show specific digital/broker institutions
    const digitalInstitutions = institutions.filter(inst =>
        inst.type === 'crypto_exchange' || inst.type === 'broker' || inst.type === 'other' || inst.type === 'bank'
    );

    // Basic State
    const [newName, setNewName] = useState("");
    const [newLiquidity, setNewLiquidity] = useState<'L1_immediate' | 'L2_medium' | 'L3_low'>('L2_medium');
    const [newVal, setNewVal] = useState("");
    const [newRate, setNewRate] = useState("");
    const [newInstitutionId, setNewInstitutionId] = useState("NONE");
    const [creatingInstitution, setCreatingInstitution] = useState(false);
    const [newInstName, setNewInstName] = useState("");
    const [newOpeningDate, setNewOpeningDate] = useState("");
    const [newDigitalType, setNewDigitalType] = useState<'investment' | 'loan' | 'cdt'>('investment');

    // Variable Income State (FMP)
    const [newTickerSymbol, setNewTickerSymbol] = useState("");
    const [tickerSearchResults, setTickerSearchResults] = useState<FmpSearchResult[]>([]);
    const [isSearchingTicker, setIsSearchingTicker] = useState(false);
    const [showTickerDropdown, setShowTickerDropdown] = useState(false);
    const [selectedTickerName, setSelectedTickerName] = useState("");

    // Investment State
    const [investmentQuantity, setInvestmentQuantity] = useState("1");
    const [investmentPrice, setInvestmentPrice] = useState("");
    // Currency State (used for all now)
    const [newCurrency, setNewCurrency] = useState("USD");

    // CDT State
    const [cdtTermType, setCdtTermType] = useState<'months' | 'days'>('months');
    const [cdtTermValue, setCdtTermValue] = useState("12");

    // Loan State
    const [loanDebtor, setLoanDebtor] = useState("");
    const [loanTerm, setLoanTerm] = useState("12");
    const [loanGrace, setLoanGrace] = useState("0");
    const [loanAmortization, setLoanAmortization] = useState<'french' | 'german' | 'none'>('french');
    const [loanHasPayments, setLoanHasPayments] = useState(false);
    const [loadingLoanDetails, setLoadingLoanDetails] = useState(false);

    // Ticker Search Effect
    useEffect(() => {
        if (!newTickerSymbol.trim() || newDigitalType !== 'investment') {
            setTickerSearchResults([]);
            setShowTickerDropdown(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingTicker(true);
            try {
                const results = await FmpService.searchTickers(newTickerSymbol);
                setTickerSearchResults(results);
                setShowTickerDropdown(true);
            } catch (error) {
                console.error("Search error", error);
            } finally {
                setIsSearchingTicker(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [newTickerSymbol, newDigitalType]);

    useEffect(() => {
        if (isOpen) {
            if (editingAsset && editingAsset.type === 'digital') {
                setNewName(editingAsset.name);
                setNewVal(editingAsset.current_value.toString());
                setNewRate(editingAsset.interest_rate_nominal.toString());
                setNewLiquidity(editingAsset.liquidity_layer);
                setNewInstitutionId(editingAsset.institution_id || "NONE");
                setCreatingInstitution(false);
                setNewOpeningDate("");
                setNewTickerSymbol(editingAsset.ticker_symbol || "");
                setNewDigitalType(editingAsset.digital_type || 'investment');

                if (editingAsset.digital_type === 'loan') {
                    setLoadingLoanDetails(true);
                    Promise.all([
                        ApiClient.getLoanData(editingAsset.id),
                        ApiClient.getLoanPayments(editingAsset.id)
                    ]).then(([data, pays]) => {
                        if (data) {
                            setLoanDebtor(data.debtor);
                            setLoanTerm(data.term_months.toString());
                            setLoanGrace(data.grace_period_months.toString());
                            setLoanAmortization(data.amortization_type);
                        }
                        setLoanHasPayments(pays.length > 0);
                        setLoadingLoanDetails(false);
                    }).catch(err => {
                        console.error("Error loading loan", err);
                        setLoadingLoanDetails(false);
                    });
                } else if (editingAsset.digital_type === 'cdt' || (editingAsset.digital_type === 'investment' && editingAsset.cdt_details)) {
                    setNewDigitalType('cdt');
                    setNewOpeningDate(editingAsset.opening_date || new Date().toISOString().split('T')[0]);
                    const details = editingAsset.cdt_details;
                    if (details) {
                        if (details.term_days) {
                            setCdtTermType('days');
                            setCdtTermValue(details.term_days.toString());
                        } else if (details.term_months) {
                            setCdtTermType('months');
                            setCdtTermValue(details.term_months.toString());
                        }
                    }
                }
            } else {
                setNewName("");
                setNewVal("");
                setNewRate("");
                setNewLiquidity('L2_medium');
                setNewInstitutionId("NONE");
                setCreatingInstitution(false);
                setNewInstName("");
                setNewOpeningDate(new Date().toISOString().split('T')[0]);
                setNewDigitalType('investment');

                // Reseteo específico
                setNewTickerSymbol("");
                setSelectedTickerName("");
                setInvestmentQuantity("1");
                setInvestmentPrice("");
                setNewCurrency("USD");
                setLoanDebtor("");
                setLoanTerm("12");
                setLoanGrace("0");
                setLoanAmortization('french');
                setCdtTermType('months');
                setCdtTermValue("12");
            }
        }
    }, [isOpen, editingAsset]);

    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        if (newDigitalType !== 'investment' && !newVal) return;
        if (newDigitalType === 'investment' && !editingAsset && (!investmentQuantity || !investmentPrice)) return;

        setSaving(true);
        try {
            const payload: Partial<Asset> = {
                name: newName,
                type: 'digital',
                digital_type: newDigitalType,
                liquidity_layer: newLiquidity,
                currency: newCurrency,
                current_value: newDigitalType === 'investment' && !editingAsset
                    ? (parseFloat(investmentQuantity) || 0) * (parseFloat(investmentPrice) || 0)
                    : (parseFloat(newVal) || 0),
                interest_rate_nominal: parseFloat(newRate) || 0,
                is_payment_account: false, // Digitales usualmente no son de pagos directos
                opening_date: newDigitalType === 'cdt' && newOpeningDate && !editingAsset ? newOpeningDate : undefined,
                ticker_symbol: newDigitalType === 'investment' && newTickerSymbol ? newTickerSymbol.trim().toUpperCase() : null,
            };

            let loanPayload: Partial<LoanOptions> | undefined = undefined;
            if (newDigitalType === 'loan' && (!editingAsset || !loanHasPayments)) {
                loanPayload = {
                    debtor: loanDebtor || "Deudor Desconocido",
                    principal_amount: parseFloat(newVal) || 0,
                    term_months: parseInt(loanTerm) || 12,
                    interest_rate_annual: parseFloat(newRate) || 0,
                    grace_period_months: parseInt(loanGrace) || 0,
                    amortization_type: loanAmortization,
                };
            }

            let cdtPayload: any | undefined = undefined;
            if (newDigitalType === 'cdt') {
                cdtPayload = {
                    principal_amount: parseFloat(newVal) || 0,
                    term_months: cdtTermType === 'months' ? parseInt(cdtTermValue) || null : null,
                    term_days: cdtTermType === 'days' ? parseInt(cdtTermValue) || null : null,
                };
            }

            let investmentPayload: { quantity: number; purchasePrice: number; currency: string } | undefined = undefined;
            if (newDigitalType === 'investment' && !editingAsset) {
                investmentPayload = {
                    quantity: parseFloat(investmentQuantity) || 0,
                    purchasePrice: parseFloat(investmentPrice) || 0,
                    currency: newCurrency
                };
            }

            await onSave(payload, newInstitutionId, newInstName, loanPayload, cdtPayload, investmentPayload);
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
                    <h2 className="text-2xl font-bold text-foreground">{editingAsset ? 'Editar Inversión' : 'Añadir Inversión'}</h2>
                    {editingAsset && onDelete && (
                        <Button type="button" variant="ghost" onClick={onDelete} className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl" disabled={saving}>
                            Eliminar
                        </Button>
                    )}
                </div>

                <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar pb-6 relative">

                    <div>
                        <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Tipología de Inversión</label>
                        <select
                            value={newDigitalType}
                            onChange={e => setNewDigitalType(e.target.value as any)}
                            className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-base appearance-none"
                            disabled={saving || (editingAsset !== null)}
                        >
                            <option value="investment">Renta Variable (Crypto, Acciones, ETF)</option>
                            <option value="cdt">Certificado de Depósito (CDT)</option>
                            <option value="loan">Préstamo Otorgado (Hacia Terceros)</option>
                        </select>
                    </div>

                    {/* BROKER SELECTION MOVED TO TOP */}
                    <div className="bg-muted/30 p-4 rounded-2xl border border-border/30">
                        {!creatingInstitution ? (
                            <div className="animate-in fade-in">
                                <label className="block text-sm font-bold text-foreground mb-2 ml-1">Institución / Custodio</label>
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
                                    className="w-full h-12 bg-card border border-border/50 rounded-xl px-4 text-foreground font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-base appearance-none shadow-sm"
                                    disabled={saving}
                                >
                                    <option value="NONE">Independiente / Self-Custodial</option>
                                    {digitalInstitutions.map(inst => (
                                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                                    ))}
                                    <option value="NEW" className="font-bold text-primary">+ Añadir Nuevo Broker</option>
                                </select>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-top-2 bg-primary/5 p-4 rounded-xl border border-primary/20">
                                <label className="block text-sm font-bold text-primary mb-2">Nombre del Broker Nuevo</label>
                                <input
                                    type="text"
                                    required={creatingInstitution}
                                    value={newInstName}
                                    onChange={e => setNewInstName(e.target.value)}
                                    placeholder="Ej. XTB Onboarding"
                                    className="w-full h-12 bg-card border border-primary/30 rounded-xl px-4 text-foreground font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-base mb-3 shadow-sm"
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
                                    className="w-full text-muted-foreground hover:text-foreground h-10 rounded-lg"
                                    disabled={saving}
                                >
                                    Cancelar Creación
                                </Button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Nombre Personalizado</label>
                        <input
                            type="text"
                            required
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="Ej. Apple, Bitcoin ETF, CDT Bancolombia"
                            className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-lg"
                            disabled={saving}
                        />
                    </div>

                    {newDigitalType === 'investment' && (
                        <div className="animate-in fade-in slide-in-from-top-2 relative bg-primary/5 p-4 rounded-2xl border border-primary/10">
                            <label className="block text-sm font-bold text-primary mb-2 ml-1">Instrumento Financiero (FMP API)</label>

                            {selectedTickerName ? (
                                <div className="flex items-center justify-between bg-card border border-primary/20 p-3 rounded-xl shadow-sm">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-foreground text-lg">{newTickerSymbol}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">{selectedTickerName}</p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setNewTickerSymbol("");
                                            setSelectedTickerName("");
                                        }}
                                        className="text-primary hover:bg-primary/20"
                                    >
                                        Cambiar
                                    </Button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                                    <input
                                        type="text"
                                        value={newTickerSymbol}
                                        onChange={e => setNewTickerSymbol(e.target.value.toUpperCase())}
                                        placeholder="Busca por empresa o Ticker. Ej. AAPL, BTC..."
                                        className="w-full h-12 bg-card border border-border/50 rounded-xl pl-11 pr-4 text-foreground font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-base uppercase shadow-sm"
                                        disabled={saving}
                                        onFocus={() => {
                                            if (tickerSearchResults.length > 0) setShowTickerDropdown(true);
                                        }}
                                        onBlur={() => {
                                            setTimeout(() => setShowTickerDropdown(false), 200);
                                        }}
                                    />
                                    {isSearchingTicker && (
                                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" size={20} />
                                    )}

                                    {showTickerDropdown && tickerSearchResults.length > 0 && (
                                        <div className="absolute z-20 top-[calc(100%+8px)] left-0 right-0 bg-card border border-border/50 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                                            {tickerSearchResults.map(result => (
                                                <div
                                                    key={`${result.symbol}-${result.exchangeShortName}`}
                                                    className="px-4 py-3 hover:bg-muted cursor-pointer transition-colors border-b border-border/20 last:border-0"
                                                    onClick={() => {
                                                        setNewTickerSymbol(result.symbol);
                                                        setSelectedTickerName(result.name);
                                                        if (!newName) setNewName(result.name);
                                                        setShowTickerDropdown(false);
                                                    }}
                                                >
                                                    <div className="flex justify-between items-center mb-0.5">
                                                        <span className="font-bold text-foreground">{result.symbol}</span>
                                                        <span className="text-[10px] font-bold text-muted-foreground bg-muted-foreground/10 px-2 py-0.5 rounded-md uppercase tracking-wider">{result.exchangeShortName || 'Crypto'}</span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground truncate">{result.name}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-2 ml-1 leading-tight">Sincroniza la cotización oficial de bolsa. Al seleccionar, el sistema rastreará el precio automáticamente.</p>
                        </div>
                    )}

                    {newDigitalType === 'investment' && !editingAsset ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Cantidad (Acciones/Tokens)</label>
                                <input
                                    type="number"
                                    required
                                    step="any"
                                    value={investmentQuantity}
                                    onChange={e => setInvestmentQuantity(e.target.value)}
                                    placeholder="0"
                                    className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-lg"
                                    disabled={saving}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Precio de Compra</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                                    <input
                                        type="number"
                                        required
                                        step="any"
                                        value={investmentPrice}
                                        onChange={e => setInvestmentPrice(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full h-14 bg-muted border border-transparent rounded-2xl pl-8 pr-4 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-lg"
                                        disabled={saving}
                                    />
                                </div>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Moneda</label>
                                <select
                                    value={newCurrency}
                                    onChange={e => setNewCurrency(e.target.value)}
                                    className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-lg appearance-none"
                                    disabled={saving}
                                >
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="COP">COP ($)</option>
                                    <option value="MXN">MXN ($)</option>
                                </select>
                            </div>
                            <div className="col-span-2 mt-[-8px]">
                                <p className="text-xs text-muted-foreground ml-2">El total de tu inversión inicial será de: <strong className="text-foreground">{newCurrency} {((parseFloat(investmentQuantity) || 0) * (parseFloat(investmentPrice) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div className={(newDigitalType === 'cdt' && !editingAsset) ? 'col-span-1' : 'col-span-2'}>
                                <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Valor Actual / Inversión Inicial</label>
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
                                {newDigitalType === 'investment' && editingAsset && (
                                    <p className="text-[10px] text-muted-foreground ml-2 mt-1 -mb-2">Calculado vía FMP/Libro Mayor. Puedes ajustar este valor manualmente como respaldo si es necesario.</p>
                                )}
                            </div>
                            {(newDigitalType === 'cdt' && !editingAsset) && (
                                <div className="col-span-1">
                                    <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Fecha Constitución</label>
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
                            <div className={(newDigitalType === 'cdt' && !editingAsset) ? 'col-span-2 mt-2' : 'col-span-1 mt-2'}>
                                <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Moneda</label>
                                <select
                                    value={newCurrency}
                                    onChange={e => setNewCurrency(e.target.value)}
                                    className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-lg appearance-none"
                                    disabled={saving}
                                >
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="COP">COP ($)</option>
                                    <option value="MXN">MXN ($)</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        {newDigitalType !== 'investment' && (
                            <div>
                                <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Rendimiento (EA %)</label>
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
                        )}
                        <div className={newDigitalType === 'investment' ? 'col-span-2' : ''}>
                            <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Liquidez Teórica</label>
                            <select
                                value={newLiquidity}
                                onChange={e => setNewLiquidity(e.target.value as any)}
                                className="w-full h-14 bg-muted border border-transparent rounded-2xl px-4 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none"
                                disabled={saving}
                            >
                                <option value="L1_immediate">L1 Inmediata (Bolsa Día)</option>
                                <option value="L2_medium">L2 Media (Semanas/CDT)</option>
                                <option value="L3_low">L3 Baja (Iliquidez/Préstamo Mayor)</option>
                            </select>
                        </div>
                    </div>

                    {newDigitalType === 'cdt' && (
                        <CdtFormFields
                            cdtTermType={cdtTermType}
                            setCdtTermType={setCdtTermType}
                            cdtTermValue={cdtTermValue}
                            setCdtTermValue={setCdtTermValue}
                            saving={saving}
                            required={newDigitalType === 'cdt'}
                        />
                    )}

                    {newDigitalType === 'loan' && (
                        <LoanFormFields
                            loadingDetails={loadingLoanDetails}
                            hasPayments={loanHasPayments}
                            saving={saving}
                            debtor={loanDebtor}
                            setDebtor={setLoanDebtor}
                            term={loanTerm}
                            setTerm={setLoanTerm}
                            grace={loanGrace}
                            setGrace={setLoanGrace}
                            amortization={loanAmortization}
                            setAmortization={setLoanAmortization}
                            required={newDigitalType === 'loan'}
                        />
                    )}

                    <div className="pt-6 mt-4 border-t border-border/50 bg-card sticky bottom-0 pb-2">
                        <Button type="submit" disabled={saving || (creatingInstitution && !newInstName.trim())} className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg hover:-translate-y-0.5 transition-all">
                            {saving ? 'Guardando...' : editingAsset ? 'Actualizar Inversión' : 'Guardar Inversión'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
