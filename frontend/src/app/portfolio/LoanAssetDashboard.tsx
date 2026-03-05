"use client";

import { useState, useEffect } from "react";
import { ApiClient, Asset, LoanOptions, LoanPayment } from "@/core/api";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, HandCoins, Info, History, FileText, ChevronRight, Pencil, Trash2, X, Calendar, Wallet } from "lucide-react";
import { handleApiError } from "@/core/errors/handleApiError";
import { Button } from "@/components/ui/button";
import { useLoanAmortization } from "@/core/hooks/useLoanAmortization";

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

    useEffect(() => {
        if (loanData?.amortization_type === 'none') {
            setActiveTab('history');
        }
    }, [loanData]);

    // Register Payment Modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isAdvanceMode, setIsAdvanceMode] = useState(false);
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
            handleApiError(error, "Error loading loan details");
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

        let pTotal = Number(payTotal);
        let pPrin = Number(payPrincipal);
        let pInt = Number(payInterest);
        let pExtra = Number(payExtra) || 0;
        let eAction: 'reduce_term' | 'reduce_installment' | 'advance' | undefined = pExtra > 0 ? extraAction : undefined;

        if (isAdvanceMode) {
            // An advance is effectively negative payment (more money lent out)
            pTotal = -Math.abs(pTotal);
            pPrin = pTotal;
            pInt = 0;
            pExtra = 0;
            eAction = 'advance';
        } else {
            // Safety check for normal payments
            if (Math.abs(pTotal - (pPrin + pInt + pExtra)) > 0.05) {
                alert("Los valores de Principal, Interés y Extra no suman el Total Pagado. Por favor revisa los montos.");
                setSaving(false);
                return;
            }
        }

        try {
            await ApiClient.registerLoanPayment({
                asset_id: asset.id,
                date: payDate,
                payment_amount: pTotal,
                principal_amount: pPrin,
                interest_amount: pInt,
                extra_principal_amount: pExtra,
                extra_action: eAction as any
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
            handleApiError(err, "Error registrando pago");
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
            handleApiError(error, "Error al eliminar");
        } finally {
            setSaving(false);
        }
    };

    // Auto-fill logic when user types the total paid amount
    const handlePayTotalChange = (valStr: string) => {
        setPayTotal(valStr);
        const val = Number(valStr);
        if (schedule && schedule.length > 0) {
            const next = schedule[0];
            const expInt = next.interest;
            const expPrin = next.principal;

            if (val >= expInt) {
                setPayInterest(expInt.toFixed(2));
                const rem = val - expInt;
                if (rem >= expPrin) {
                    setPayPrincipal(expPrin.toFixed(2));
                    setPayExtra((rem - expPrin).toFixed(2));
                } else {
                    setPayPrincipal(rem.toFixed(2));
                    setPayExtra("0");
                }
            } else {
                setPayInterest(val.toFixed(2));
                const shortfall = expInt - val;
                // Capitalize unpaid interest by having negative principal
                setPayPrincipal((-shortfall).toFixed(2));
                setPayExtra("0");
            }
        }
    };

    // Amortization calculation via hook
    const { schedule, currentPrincipal, totalPaidValue, totalInterestPaid, nextExpected } = useLoanAmortization(loanData, payments);

    const handleOpenPaymentModal = () => {
        setPayDate(new Date().toISOString().split('T')[0]);
        if (nextExpected) {
            setPayTotal(nextExpected.installment.toFixed(2));
            setPayPrincipal(nextExpected.principal.toFixed(2));
            setPayInterest(nextExpected.interest.toFixed(2));
            setPayExtra("0");
        } else {
            setPayTotal("");
            setPayPrincipal("");
            setPayInterest("");
            setPayExtra("0");
        }
        setShowPaymentModal(true);
        setIsAdvanceMode(false);
    };

    const handleOpenAdvanceModal = () => {
        setPayDate(new Date().toISOString().split('T')[0]);
        setPayTotal("");
        setPayPrincipal("");
        setPayInterest("0");
        setPayExtra("0");
        setIsAdvanceMode(true);
        setShowPaymentModal(true);
    };

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
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
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
                            <div className="bg-card border border-emerald-500/30 rounded-3xl p-5 flex flex-col justify-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500"></div>
                                <p className="text-sm font-bold text-muted-foreground mb-1">Rendimientos</p>
                                <h3 className="text-xl font-black text-emerald-500 truncate">
                                    +{formatCurrency(totalInterestPaid, currency)}
                                </h3>
                            </div>
                        </div>

                        {/* Tabs */}
                        {loanData.amortization_type !== 'none' ? (
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
                        ) : (
                            <div className="mb-6 border-b border-border/50 pb-3">
                                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                    <History size={20} className="text-brand-blue" />
                                    Libro Mayor de Movimientos
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Este préstamo es de tipo abierto. Aquí se reflejan todos los pagos recibidos y los desembolsos extra realizados.
                                </p>
                            </div>
                        )}

                        {activeTab === 'schedule' && loanData.amortization_type !== 'none' && (
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
                                                    <td className="px-5 py-3 text-right font-medium text-emerald-500">{formatCurrency(row.interest, currency)}</td>
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
                                                    <span className="text-emerald-500 font-medium">INT: {formatCurrency(p.interest_amount, currency)}</span>
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
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-4">
                {loanData?.amortization_type === 'none' && (
                    <Button
                        onClick={handleOpenAdvanceModal}
                        variant="secondary"
                        className="h-14 px-6 rounded-full font-bold shadow-lg flex gap-2 transition-all hover:-translate-y-1"
                    >
                        + Prestar Más (Avance)
                    </Button>
                )}
                <Button
                    onClick={handleOpenPaymentModal}
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
                        <h2 className="text-2xl font-bold text-foreground mb-1 shrink-0">
                            {isAdvanceMode ? "Prestar Más (Avance)" : "Registrar Pago"}
                        </h2>

                        {!isAdvanceMode && nextExpected && (
                            <p className="text-sm font-medium text-muted-foreground mb-6">
                                Cuota Esperada (Mes {nextExpected.month}): <strong className="text-foreground">{formatCurrency(nextExpected.installment, currency)}</strong>
                            </p>
                        )}
                        {(!nextExpected || isAdvanceMode) && <div className="mb-6"></div>}

                        <div className="flex-1 overflow-y-auto space-y-5 custom-scrollbar pb-6 pr-2">
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-2 ml-2">
                                    {isAdvanceMode ? "Monto Prestado Adicionalmente" : "Total Efectivamente Recibido"}
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={payTotal}
                                    onChange={e => handlePayTotalChange(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-brand-blue/20 transition-all text-xl"
                                    disabled={saving}
                                />
                                {!isAdvanceMode ? (
                                    <p className="text-[11px] text-muted-foreground ml-2 mt-1.5 leading-tight">
                                        Introduce cuánto recibiste. El sistema distribuirá automáticamente a intereses, capital y abonos extras o re-financiará el saldo según corresponda.
                                    </p>
                                ) : (
                                    <p className="text-[11px] text-muted-foreground ml-2 mt-1.5 leading-tight">
                                        Registrar un avance sumará directamente al saldo del préstamo que te deben.
                                    </p>
                                )}
                            </div>

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

                            {!isAdvanceMode && (
                                <>
                                    <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 space-y-4">
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Distribución Automática</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-emerald-500 mb-1.5 ml-1">Interés Cubierto</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    required
                                                    value={payInterest}
                                                    onChange={e => setPayInterest(e.target.value)}
                                                    className="w-full h-11 bg-emerald-500/10 border border-transparent rounded-xl px-4 text-emerald-500 font-bold outline-none focus:border-emerald-500/50 transition-all text-sm"
                                                    disabled={saving}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-blue-500 mb-1.5 ml-1">Capital Abonado</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    required
                                                    value={payPrincipal}
                                                    onChange={e => setPayPrincipal(e.target.value)}
                                                    className="w-full h-11 bg-blue-500/10 border border-transparent rounded-xl px-4 text-blue-500 font-bold outline-none focus:border-blue-500/50 transition-all text-sm"
                                                    disabled={saving}
                                                />
                                            </div>
                                        </div>
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
                                </>
                            )}
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
