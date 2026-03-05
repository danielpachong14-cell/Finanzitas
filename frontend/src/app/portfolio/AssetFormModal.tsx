"use client";

import { useState, useEffect } from "react";
import { Asset, Institution, LoanOptions, ApiClient } from "@/core/api";
import { Button } from "@/components/ui/button";
import { Info, Loader2 } from "lucide-react";
import { CdtFormFields } from "./CdtFormFields";
import { LoanFormFields } from "./LoanFormFields";
import { PhysicalFormFields, PhysicalAssetType } from "./PhysicalFormFields";

interface AssetFormModalProps {
    isOpen: boolean;
    editingAsset: Asset | null;
    institutions: Institution[];
    activeTab: 'financial' | 'digital' | 'physical';
    onClose: () => void;
    onSave: (payload: Partial<Asset>, instId: string, instName: string, loanPayload?: Partial<LoanOptions>, cdtPayload?: Partial<any>) => Promise<void>;
    onDelete?: () => Promise<void>;
}

export function AssetFormModal({ isOpen, editingAsset, institutions, activeTab, onClose, onSave, onDelete }: AssetFormModalProps) {
    const [saving, setSaving] = useState(false);

    // Form State
    const [newName, setNewName] = useState("");
    const [newType, setNewType] = useState<'financial' | 'digital' | 'physical'>('financial');
    const [newLiquidity, setNewLiquidity] = useState<'L1_immediate' | 'L2_medium' | 'L3_low'>('L1_immediate');
    const [newVal, setNewVal] = useState("");
    const [newRate, setNewRate] = useState("");
    const [newInstitutionId, setNewInstitutionId] = useState("NONE");
    const [creatingInstitution, setCreatingInstitution] = useState(false);
    const [newInstName, setNewInstName] = useState("");
    const [newOpeningDate, setNewOpeningDate] = useState("");
    const [newIsPaymentAccount, setNewIsPaymentAccount] = useState(false);

    // Physical Asset State
    const [newPhysicalType, setNewPhysicalType] = useState<PhysicalAssetType>('other');
    const [newHasCredit, setNewHasCredit] = useState(false);
    const [newCreditAmount, setNewCreditAmount] = useState("");
    const [newCreditPaid, setNewCreditPaid] = useState("");

    // Digital Asset State
    const [newDigitalType, setNewDigitalType] = useState<'investment' | 'loan' | 'cdt'>('investment');
    const [loanDebtor, setLoanDebtor] = useState("");
    const [loanTerm, setLoanTerm] = useState("12");
    const [loanGrace, setLoanGrace] = useState("0");
    const [loanAmortization, setLoanAmortization] = useState<'french' | 'german' | 'none'>('french');
    const [loanHasPayments, setLoanHasPayments] = useState(false);
    const [loadingLoanDetails, setLoadingLoanDetails] = useState(false);

    // CDT State
    const [cdtTermType, setCdtTermType] = useState<'months' | 'days'>('months');
    const [cdtTermValue, setCdtTermValue] = useState("12");

    useEffect(() => {
        if (isOpen) {
            if (editingAsset) {
                setNewName(editingAsset.name);
                setNewVal(editingAsset.current_value.toString());
                setNewRate(editingAsset.interest_rate_nominal.toString());
                setNewType(editingAsset.type);
                setNewLiquidity(editingAsset.liquidity_layer);
                setNewInstitutionId(editingAsset.institution_id || "NONE");
                setCreatingInstitution(false);
                setNewIsPaymentAccount(editingAsset.is_payment_account || false);
                setNewPhysicalType(editingAsset.physical_type || 'other');
                setNewDigitalType(editingAsset.digital_type || 'investment');
                setNewHasCredit(editingAsset.has_credit || false);
                setNewCreditAmount(editingAsset.credit_amount?.toString() || "");
                setNewCreditPaid(editingAsset.credit_paid?.toString() || "");
                setNewOpeningDate("");

                if (editingAsset.type === 'digital' && editingAsset.digital_type === 'loan') {
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
                } else if (editingAsset.type === 'digital' && (editingAsset.digital_type === 'cdt' || (editingAsset.digital_type === 'investment' && editingAsset.cdt_details))) {
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
                } else if (editingAsset.type === 'digital' && editingAsset.digital_type === 'investment') {
                    setNewDigitalType('investment');
                }
            } else {
                setNewName("");
                setNewVal("");
                setNewRate("");
                setNewType(activeTab);
                setNewLiquidity('L1_immediate');
                setNewInstitutionId("NONE");
                setCreatingInstitution(false);
                setNewInstName("");
                setNewOpeningDate(new Date().toISOString().split('T')[0]);
                setNewIsPaymentAccount(false);
                setNewPhysicalType('other');
                setNewDigitalType('investment');
                setNewHasCredit(false);
                setNewCreditAmount("");
                setNewCreditPaid("");
                setLoanDebtor("");
                setLoanTerm("12");
                setLoanGrace("0");
                setLoanAmortization('french');
                setLoanAmortization('french');
                setCdtTermType('months');
                setCdtTermValue("12");
            }
        }
    }, [isOpen, editingAsset, activeTab]);

    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || !newVal) return;

        setSaving(true);
        try {
            const payload: Partial<Asset> = {
                name: newName,
                type: newType,
                liquidity_layer: newLiquidity,
                current_value: parseFloat(newVal) || 0,
                interest_rate_nominal: parseFloat(newRate) || 0,
                is_payment_account: newIsPaymentAccount,
                opening_date: (newType === 'financial' || (newType === 'digital' && newDigitalType === 'cdt')) && newOpeningDate && !editingAsset ? newOpeningDate : undefined,
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
            } else if (newType === 'digital') {
                payload.digital_type = newDigitalType;
            }

            let loanPayload: Partial<LoanOptions> | undefined = undefined;
            if (newType === 'digital' && newDigitalType === 'loan' && (!editingAsset || !loanHasPayments)) {
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
            if (newType === 'digital' && newDigitalType === 'cdt') {
                cdtPayload = {
                    principal_amount: parseFloat(newVal) || 0,
                    term_months: cdtTermType === 'months' ? parseInt(cdtTermValue) || null : null,
                    term_days: cdtTermType === 'days' ? parseInt(cdtTermValue) || null : null,
                };
            }

            await onSave(payload, newInstitutionId, newInstName, loanPayload, cdtPayload);
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
                    <h2 className="text-2xl font-bold text-foreground">{editingAsset ? 'Editar Activo' : 'Añadir Activo'}</h2>
                    {editingAsset && onDelete && (
                        <Button type="button" variant="ghost" onClick={onDelete} className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl" disabled={saving}>
                            Eliminar
                        </Button>
                    )}
                </div>

                <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar pb-6 relative">
                    <div>
                        <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Nombre del Activo</label>
                        <input
                            type="text"
                            required
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="Ej. Cuenta Ahorros Bancolombia"
                            className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-lg"
                            disabled={saving}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className={((newType === 'financial' || (newType === 'digital' && newDigitalType === 'cdt')) && !editingAsset) ? 'col-span-1' : 'col-span-2'}>
                            <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Valor Actual / Balance Inicial</label>
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
                        {((newType === 'financial' || (newType === 'digital' && newDigitalType === 'cdt')) && !editingAsset) && (
                            <div className="col-span-1">
                                <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Fecha de Apertura</label>
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
                                    if (e.target.value === 'physical' && newPhysicalType === 'other') {
                                        setNewPhysicalType('real_estate');
                                    }
                                }}
                                className="w-full h-14 bg-muted border border-transparent rounded-2xl px-4 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none"
                                disabled={saving}
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
                                disabled={saving}
                            >
                                <option value="L1_immediate">L1 Inmediata (24hr)</option>
                                <option value="L2_medium">L2 Media (2-7 días)</option>
                                <option value="L3_low">L3 Baja (Meses)</option>
                            </select>
                        </div>
                    </div>

                    {newType === 'digital' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Tipología Digital</label>
                            <select
                                value={newDigitalType}
                                onChange={e => setNewDigitalType(e.target.value as any)}
                                className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-base appearance-none"
                                disabled={saving}
                            >
                                <option value="investment">Inversión (Crypto, Acciones, ETF)</option>
                                <option value="cdt">Certificado de Depósito a Término (CDT)</option>
                                <option value="loan">Préstamo Otorgado (Personal / Empresarial)</option>
                            </select>
                        </div>
                    )}

                    {newType === 'digital' && newDigitalType === 'cdt' && (
                        <CdtFormFields
                            cdtTermType={cdtTermType}
                            setCdtTermType={setCdtTermType}
                            cdtTermValue={cdtTermValue}
                            setCdtTermValue={setCdtTermValue}
                            saving={saving}
                            required={newDigitalType === 'cdt'}
                        />
                    )}

                    {newType === 'digital' && newDigitalType === 'loan' && (
                        <LoanFormFields
                            loadingDetails={loadingLoanDetails}
                            hasPayments={loanHasPayments}
                            saving={saving}
                            required={newType === 'digital' && newDigitalType === 'loan'}
                            debtor={loanDebtor}
                            setDebtor={setLoanDebtor}
                            term={loanTerm}
                            setTerm={setLoanTerm}
                            grace={loanGrace}
                            setGrace={setLoanGrace}
                            amortization={loanAmortization}
                            setAmortization={setLoanAmortization}
                        />
                    )}

                    {newType === 'physical' && (
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
                            disabled={saving}
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
                                disabled={saving}
                            />
                        </div>
                    )}

                    <div className="pt-6 border-t border-border/50 flex gap-3 shrink-0 mt-8">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
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
    );
}
