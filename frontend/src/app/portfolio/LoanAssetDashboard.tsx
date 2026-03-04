"use client";

import { useState, useEffect } from "react";
import { ApiClient, Asset, LoanOptions, LoanPayment } from "@/core/api/ApiClient";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, HandCoins, Info, History, FileText, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    asset: Asset;
    currency: string;
    onClose: () => void;
    onUpdate: () => void;
    onEdit: () => void;
}

export function LoanAssetDashboard({ asset, currency, onClose, onUpdate, onEdit }: Props) {
    const [loanData, setLoanData] = useState<LoanOptions | null>(null);
    const [payments, setPayments] = useState<LoanPayment[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');

    // Register Payment Modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
    const [payTotal, setPayTotal] = useState("");
    const [payPrincipal, setPayPrincipal] = useState("");
    const [payInterest, setPayInterest] = useState("");
    const [payExtra, setPayExtra] = useState("0");
    const [extraAction, setExtraAction] = useState<'reduce_term' | 'reduce_installment'>('reduce_term');
    const [saving, setSaving] = useState(false);

    const loadLoanDetails = async () => {
        setLoading(true);
        try {
            const data = await ApiClient.getLoanData(asset.id);
            setLoanData(data);
            if (data) {
                const pays = await ApiClient.getLoanPayments(asset.id);
                setPayments(pays);
            }
        } catch (error) {
            console.error("Error loading loan details", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLoanDetails();
    }, [asset.id]);

    const handleRegisterPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await ApiClient.registerLoanPayment({
                asset_id: asset.id,
                date: payDate,
                payment_amount: Number(payTotal),
                principal_amount: Number(payPrincipal),
                interest_amount: Number(payInterest),
                extra_principal_amount: Number(payExtra) || 0,
                extra_action: Number(payExtra) > 0 ? extraAction : undefined
            });

            setShowPaymentModal(false);
            setPayDate(new Date().toISOString().split('T')[0]);
            setPayTotal("");
            setPayPrincipal("");
            setPayInterest("");
            setPayExtra("0");

            await loadLoanDetails();
            onUpdate(); // tells portfolio to reload assets
        } catch (err) {
            console.error(err);
            alert("Error registrando pago");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAsset = async () => {
        if (!confirm(`¿Estás seguro de eliminar el préstamo "${asset.name}"? Esta acción eliminará todo su historial y es irreversible.`)) return;
        setSaving(true);
        try {
            await ApiClient.deleteAsset(asset.id);
            onUpdate();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Error al eliminar");
        } finally {
            setSaving(false);
        }
    };

    // Calculate Amortization logic
    const generateAmortizationSchedule = () => {
        if (!loanData) return [];

        const schedule = [];
        let currentPrincipal = loanData.principal_amount;
        // EA to monthly
        const monthlyRate = Math.pow(1 + (loanData.interest_rate_annual / 100), 1 / 12) - 1;

        let remainingTerm = loanData.term_months;
        let graceRemaining = loanData.grace_period_months;

        // Apply Historical Payments first
        let totalPaidValue = 0;
        let totalInterestPaid = 0;

        for (const p of payments) {
            currentPrincipal -= (p.principal_amount + (p.extra_principal_amount || 0));
            totalPaidValue += p.payment_amount;
            totalInterestPaid += p.interest_amount;

            if (graceRemaining > 0) graceRemaining--;
            else {
                if (p.extra_principal_amount > 0 && p.extra_action === 'reduce_term') {
                    // Approximate term reduction: very complex to do perfectly, simple heuristic:
                    // If they paid X extra, skip Y months of principal payment. 
                    // Actually, recalculate remaining term based on new principal and current installment.
                } else {
                    remainingTerm--;
                }
            }
        }

        // Generate Future Schedule loosely
        let month = payments.length + 1;
        let iterPrincipal = Math.max(0, currentPrincipal);

        while (iterPrincipal > 0.1 && remainingTerm > 0) {
            let interest = iterPrincipal * monthlyRate;
            let principal = 0;
            let installment = 0;

            if (graceRemaining > 0) {
                installment = interest; // Only pay interest
                principal = 0;
                graceRemaining--;
            } else {
                if (loanData.amortization_type === 'french') {
                    // PMT = P * r / (1 - (1+r)^-n)
                    const pmt = (iterPrincipal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -remainingTerm));
                    installment = pmt;
                    principal = pmt - interest;
                } else { // german
                    principal = iterPrincipal / remainingTerm;
                    installment = principal + interest;
                }

                // Last month correction
                if (principal > iterPrincipal) {
                    principal = iterPrincipal;
                    installment = principal + interest;
                }

                remainingTerm--;
            }

            iterPrincipal -= principal;

            schedule.push({
                month,
                installment,
                principal,
                interest,
                balance: Math.max(0, iterPrincipal)
            });

            month++;
            if (month > 360) break; // Safety net
        }

        return { schedule, currentPrincipal, totalPaidValue, totalInterestPaid };
    };

    const { schedule, currentPrincipal, totalPaidValue, totalInterestPaid } = generateAmortizationSchedule() as any || { schedule: [], currentPrincipal: 0 };

    if (loading) {
        return <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">Cargando detalles de préstamo...</div>;
    }

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="px-6 py-4 flex items-center border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
                <Button variant="ghost" className="p-2 -ml-2 hover:bg-muted rounded-full" onClick={onClose}>
                    <ArrowLeft size={24} className="text-foreground" />
                </Button>
                <div className="ml-4 flex-1 truncate">
                    <h2 className="font-bold text-xl text-foreground flex items-center gap-2 truncate">
                        {asset.name}
                        <span className="text-[10px] font-bold bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-md shrink-0">Préstamo</span>
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium truncate">Deudor: <span className="text-foreground">{loanData?.debtor}</span></p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl p-2" onClick={onEdit} disabled={saving}>
                        <Pencil size={20} />
                    </Button>
                    <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl p-2" onClick={handleDeleteAsset} disabled={saving}>
                        <Trash2 size={20} />
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 pb-24">
                {loanData && (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <div className="bg-card border border-border/50 rounded-3xl p-5 flex flex-col justify-center relative overflow-hidden">
                                <p className="text-sm font-bold text-muted-foreground mb-1">Saldo Pendiente</p>
                                <h3 className="text-2xl font-black text-brand-blue truncate">
                                    {formatCurrency(currentPrincipal, currency)}
                                </h3>
                            </div>
                            <div className="bg-card border border-border/50 rounded-3xl p-5 flex flex-col justify-center">
                                <p className="text-sm font-bold text-muted-foreground mb-1">Monto Inicial</p>
                                <h3 className="text-xl font-bold text-foreground truncate">
                                    {formatCurrency(loanData.principal_amount, currency)}
                                </h3>
                            </div>
                            <div className="bg-card border border-border/50 rounded-3xl p-5 flex flex-col justify-center">
                                <p className="text-sm font-bold text-muted-foreground mb-1">Tasa Interés</p>
                                <h3 className="text-xl font-bold text-foreground">
                                    {loanData.interest_rate_annual}% EA
                                </h3>
                            </div>
                            <div className="bg-card border border-border/50 rounded-3xl p-5 flex flex-col justify-center">
                                <p className="text-sm font-bold text-muted-foreground mb-1">Total Pagado</p>
                                <h3 className="text-xl font-bold text-emerald-500 truncate">
                                    {formatCurrency(totalPaidValue, currency)}
                                </h3>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 mb-6 border-b border-border/50 pb-px">
                            <button
                                onClick={() => setActiveTab('schedule')}
                                className={`px-4 py-3 font-bold text-sm border-b-2 transition-all ${activeTab === 'schedule' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <FileText size={16} /> Plan Proyectado
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-4 py-3 font-bold text-sm border-b-2 transition-all ${activeTab === 'history' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <History size={16} /> Historial Pagos
                                </div>
                            </button>
                        </div>

                        {activeTab === 'schedule' && (
                            <div className="bg-card border border-border/50 rounded-3xl overflow-hidden">
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-muted/50 text-muted-foreground">
                                            <tr>
                                                <th className="px-5 py-4 font-bold">Mes</th>
                                                <th className="px-5 py-4 font-bold text-right">Cuota</th>
                                                <th className="px-5 py-4 font-bold text-right">Capital</th>
                                                <th className="px-5 py-4 font-bold text-right">Interés</th>
                                                <th className="px-5 py-4 font-bold text-right">Saldo Restante</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/30">
                                            {schedule.map((row: any, i: number) => (
                                                <tr key={i} className="hover:bg-muted/30 transition-colors">
                                                    <td className="px-5 py-3 font-bold text-foreground">Mes {row.month}</td>
                                                    <td className="px-5 py-3 text-right font-medium text-foreground">{formatCurrency(row.installment, currency)}</td>
                                                    <td className="px-5 py-3 text-right font-medium text-blue-500">{formatCurrency(row.principal, currency)}</td>
                                                    <td className="px-5 py-3 text-right font-medium text-orange-500">{formatCurrency(row.interest, currency)}</td>
                                                    <td className="px-5 py-3 text-right font-bold text-foreground">{formatCurrency(row.balance, currency)}</td>
                                                </tr>
                                            ))}
                                            {schedule.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                                                        Saldo Cancelado o Error en Cálculo
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="space-y-4">
                                {payments.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground bg-card border border-border/50 rounded-3xl">
                                        <History size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="font-bold">Aún no se han registrado pagos</p>
                                    </div>
                                ) : (
                                    payments.map(p => (
                                        <div key={p.id} className="bg-card border border-border/50 rounded-3xl p-5 flex items-center justify-between gap-4">
                                            <div>
                                                <p className="font-bold text-foreground text-lg mb-1">{formatCurrency(p.payment_amount, currency)}</p>
                                                <p className="text-xs text-muted-foreground flex gap-2">
                                                    <span className="text-blue-500 font-medium">CAP: {formatCurrency(p.principal_amount, currency)}</span>
                                                    <span>•</span>
                                                    <span className="text-orange-500 font-medium">INT: {formatCurrency(p.interest_amount, currency)}</span>
                                                    {p.extra_principal_amount > 0 && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-emerald-500 font-bold">EXTRA: {formatCurrency(p.extra_principal_amount, currency)}</span>
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-sm text-muted-foreground">{new Date(p.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Fab for Add Payment */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20">
                <Button
                    onClick={() => setShowPaymentModal(true)}
                    className="h-14 px-8 rounded-full bg-brand-blue hover:bg-brand-blue/90 text-white font-bold shadow-lg shadow-brand-blue/20 flex gap-2 transition-all hover:-translate-y-1"
                >
                    <HandCoins size={20} />
                    Registrar Pago
                </Button>
            </div>

            {/* Register Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowPaymentModal(false)}></div>
                    <form onSubmit={handleRegisterPayment} className="bg-card w-full sm:w-[500px] h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-[32px] sm:rounded-[36px] p-6 sm:p-8 relative z-10 flex flex-col animate-in slide-in-from-bottom-5 border border-border/20">
                        <div className="w-16 h-1.5 bg-muted rounded-full mx-auto mb-6 sm:hidden"></div>
                        <h2 className="text-2xl font-bold text-foreground mb-6 shrink-0">Registrar Pago</h2>

                        <div className="flex-1 overflow-y-auto space-y-5 custom-scrollbar pb-6 pr-2">
                            <div>
                                <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Fecha del Pago</label>
                                <input
                                    type="date"
                                    required
                                    value={payDate}
                                    onChange={e => setPayDate(e.target.value)}
                                    className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-brand-blue/20 transition-all text-sm appearance-none"
                                    disabled={saving}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-blue-500 mb-2 ml-2">Abono Normal Capital</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={payPrincipal}
                                        onChange={e => setPayPrincipal(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full h-14 bg-blue-500/10 border border-transparent rounded-2xl px-5 text-blue-500 font-bold outline-none focus:border-blue-500/50 focus:bg-card focus:ring-2 focus:ring-blue-500/20 transition-all text-lg"
                                        disabled={saving}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-orange-500 mb-2 ml-2">Pago de Interés</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={payInterest}
                                        onChange={e => setPayInterest(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full h-14 bg-orange-500/10 border border-transparent rounded-2xl px-5 text-orange-500 font-bold outline-none focus:border-orange-500/50 focus:bg-card focus:ring-2 focus:ring-orange-500/20 transition-all text-lg"
                                        disabled={saving}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-foreground mb-2 ml-2">Total Pagado Cuota Normal (Suma)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={payTotal}
                                    onChange={e => setPayTotal(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-brand-blue/20 transition-all text-xl"
                                    disabled={saving}
                                />
                            </div>

                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
                                <h3 className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mb-2">¿Hubo Abono Extra a Capital?</h3>
                                <div>
                                    <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-500 mb-1.5 ml-1">Monto Extra</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={payExtra}
                                        onChange={e => setPayExtra(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full h-12 bg-card border border-emerald-500/30 rounded-xl px-4 text-emerald-600 dark:text-emerald-400 font-bold outline-none focus:border-emerald-500 transition-all text-sm"
                                        disabled={saving}
                                    />
                                </div>
                                {Number(payExtra) > 0 && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-500 mb-1.5 ml-1">Acción del Abono Extra</label>
                                        <select
                                            value={extraAction}
                                            onChange={e => setExtraAction(e.target.value as any)}
                                            className="w-full h-12 bg-card border border-emerald-500/30 rounded-xl px-4 text-emerald-600 dark:text-emerald-400 font-bold outline-none focus:border-emerald-500 transition-all text-sm appearance-none"
                                            disabled={saving}
                                        >
                                            <option value="reduce_term">Reducir Plazo (Conservar Cuota)</option>
                                            <option value="reduce_installment">Reducir Cuota (Conservar Plazo)</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-border/50 flex gap-3 shrink-0 mt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowPaymentModal(false)}
                                className="flex-1 h-14 rounded-2xl text-muted-foreground font-bold"
                                disabled={saving}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 h-14 rounded-2xl bg-brand-blue hover:bg-brand-blue/90 text-white font-bold"
                                disabled={saving || !payTotal}
                            >
                                {saving ? "Guardando..." : "Guardar Pago"}
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
