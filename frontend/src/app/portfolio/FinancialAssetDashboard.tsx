"use client";

import { useState, useEffect } from "react";
import { ApiClient, Asset, AssetMovement } from "@/core/api/ApiClient";
import { formatCurrency, formatPrivacyCurrency } from "@/lib/utils";
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, RefreshCcw, Landmark, Activity, Plus, Trash2, Pencil, ArrowRightLeft } from "lucide-react";
import { useUserOptions } from "@/core/context/UserContext";
import { Button } from "@/components/ui/button";
import { eaToDailyRate } from "@/core/finance/interestCalculator";

interface Props {
    asset: Asset;
    currency: string;
    onClose: () => void;
    onUpdate: () => void;
    onEdit: () => void;
    onTransfer: () => void;
}

export function FinancialAssetDashboard({ asset, currency, onClose, onUpdate, onEdit, onTransfer }: Props) {
    const { hideBalances } = useUserOptions();
    const [movements, setMovements] = useState<AssetMovement[]>([]);
    const [loading, setLoading] = useState(true);

    const [theoreticalBalance, setTheoreticalBalance] = useState(0);

    const [showMovementModal, setShowMovementModal] = useState(false);
    const [movementType, setMovementType] = useState<'deposit' | 'withdrawal' | 'adjustment'>('deposit');
    const [movementAmount, setMovementAmount] = useState("");
    const [movementDate, setMovementDate] = useState(new Date().toISOString().split('T')[0]);
    const [saving, setSaving] = useState(false);

    const [realBalanceForm, setRealBalanceForm] = useState(false);
    const [realBalanceInput, setRealBalanceInput] = useState("");

    const loadMovements = async () => {
        setLoading(true);
        try {
            const data = await ApiClient.getAssetMovements(asset.id);
            setMovements(data);
            calculateTheoretical(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMovements();
    }, [asset.id]);

    const calculateTheoretical = (movs: AssetMovement[]) => {
        if (movs.length === 0) {
            setTheoreticalBalance(0);
            return;
        }

        const sorted = [...movs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let balance = 0;
        let lastDate = new Date(sorted[0].date);
        // Tasa diaria equivalente derivada de la EA usando fórmula estándar
        const dailyRate = eaToDailyRate(asset.interest_rate_nominal);

        for (const mov of sorted) {
            const movDate = new Date(mov.date);
            const daysDiff = Math.max(0, Math.floor((movDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24)));

            // Apply interest for the periods between movements
            if (daysDiff > 0 && balance > 0) {
                balance = balance * Math.pow(1 + dailyRate, daysDiff);
            }

            if (mov.type === 'deposit') balance += Number(mov.amount);
            if (mov.type === 'withdrawal') balance -= Number(mov.amount);
            if (mov.type === 'adjustment') balance += Number(mov.amount); // Adjustment is a delta

            lastDate = movDate;
        }

        // Apply interest from last movement to today
        const today = new Date();
        const finalDaysDiff = Math.max(0, Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24)));
        if (finalDaysDiff > 0 && balance > 0) {
            balance = balance * Math.pow(1 + dailyRate, finalDaysDiff);
        }

        setTheoreticalBalance(balance);
    };

    const handleSaveMovement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!movementAmount || isNaN(Number(movementAmount))) return;
        setSaving(true);
        try {
            await ApiClient.createAssetMovement(
                asset.id,
                movementType,
                movementType === 'withdrawal' ? Math.abs(Number(movementAmount)) : Number(movementAmount),
                movementDate,
                movementType === 'deposit' ? 'Aporte Adicional' : 'Retiro de Capital'
            );

            // Depending on the transaction, update current_value in assets table theoretically?
            // Since we are tracking real balance matching theoretical, wait, the App needs to update `assets.current_value` 
            // to reflect reality. But for Deposits/Withdrawals, we assume Real Balance += Amount.
            // So we update the Asset's current_value as well.
            const delta = movementType === 'withdrawal' ? -Math.abs(Number(movementAmount)) : Number(movementAmount);
            await ApiClient.updateAsset(asset.id, {
                current_value: Number(asset.current_value) + delta
            });

            setShowMovementModal(false);
            setMovementAmount("");
            await loadMovements();
            onUpdate();
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleAjusteSaldo = async (e: React.FormEvent) => {
        e.preventDefault();
        const newReal = Number(realBalanceInput);
        if (isNaN(newReal)) return;

        setSaving(true);
        try {
            // Delta is the difference between What I tell it is, and what the theoretical balance is currently 
            // Or what the real balance currently is?
            // The prompt says: "Ajuste manual para cuadrar saldos". Delta between theoretical and real?
            // If the user says the new Real Balance is X.
            // The adjustment movement should be X - TheoreticalBalance so that the math lines up perfectly.
            const delta = newReal - theoreticalBalance;

            await ApiClient.createAssetMovement(
                asset.id,
                'adjustment',
                delta,
                new Date().toISOString().split('T')[0],
                'Ajuste de Saldo Teórico a Real'
            );

            await ApiClient.updateAsset(asset.id, {
                current_value: newReal
            });

            setRealBalanceForm(false);
            await loadMovements();
            onUpdate();
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAsset = async () => {
        if (!confirm(`¿Estás seguro de eliminar el activo "${asset.name}"? Esta acción eliminará todo su historial y es irreversible.`)) return;
        setSaving(true);
        try {
            await ApiClient.deleteAsset(asset.id);
            onUpdate();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Error al eliminar el activo");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="px-6 py-4 flex items-center border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
                <Button variant="ghost" className="p-2 -ml-2 hover:bg-muted rounded-full" onClick={onClose}>
                    <ArrowLeft size={24} className="text-foreground" />
                </Button>
                <div className="ml-4 flex-1">
                    <h2 className="font-bold text-xl text-foreground flex items-center gap-2">
                        {asset.name}
                        <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md">Financiero</span>
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium">{asset.interest_rate_nominal}% EA</p>
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
                {/* Balance Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-primary to-primary/80 rounded-[32px] p-6 text-primary-foreground shadow-lg shadow-primary/20 relative overflow-hidden">
                        <Landmark size={120} className="absolute -right-4 -bottom-4 opacity-10" />
                        <p className="font-bold text-primary-foreground/80 mb-1 tracking-wide uppercase text-sm">Saldo Real</p>
                        <h3 className="text-4xl font-black tracking-tighter mb-4">{formatPrivacyCurrency(asset.current_value, currency, hideBalances)}</h3>

                        {!realBalanceForm ? (
                            <Button
                                onClick={() => { setRealBalanceInput(asset.current_value.toString()); setRealBalanceForm(true); }}
                                className="bg-background/20 hover:bg-background/30 text-white border-none rounded-xl font-bold h-10 px-4"
                            >
                                <RefreshCcw size={16} className="mr-2" /> Cuadrar Saldo
                            </Button>
                        ) : (
                            <form onSubmit={handleAjusteSaldo} className="flex gap-2 relative z-10">
                                <input
                                    type="number"
                                    step="0.01"
                                    value={realBalanceInput}
                                    onChange={e => setRealBalanceInput(e.target.value)}
                                    className="h-10 rounded-xl px-3 w-32 bg-background/20 text-white font-bold placeholder:text-white/50 border border-white/30 focus:outline-none"
                                />
                                <Button type="submit" className="h-10 rounded-xl bg-white text-primary font-bold px-3 hover:bg-white/90 shrink-0">
                                    Guardar
                                </Button>
                                <Button type="button" onClick={() => setRealBalanceForm(false)} className="h-10 rounded-xl bg-background/20 hover:bg-background/30 text-white px-3 shrink-0">
                                    X
                                </Button>
                            </form>
                        )}
                    </div>

                    <div className="bg-card border border-border/50 rounded-[32px] p-6 shadow-sm">
                        <p className="font-bold text-muted-foreground mb-1 tracking-wide uppercase text-sm flex items-center gap-2">
                            <Activity size={16} /> Saldo Teórico Proyectado
                        </p>
                        {loading ? (
                            <div className="h-10 w-48 bg-muted animate-pulse rounded-lg mt-2"></div>
                        ) : (
                            <h3 className="text-4xl font-black text-foreground tracking-tighter mb-2">
                                {formatPrivacyCurrency(theoreticalBalance, currency, hideBalances)}
                            </h3>
                        )}
                        <p className="text-xs font-bold text-emerald-500 bg-emerald-500/10 inline-block px-2 py-1 rounded-md mt-2">
                            Actualizado al día de hoy
                        </p>
                    </div>
                </div>

                {/* Quick Actions */}
                <h3 className="font-bold text-lg mb-4">Acciones Rápidas</h3>
                <div className="flex gap-4 mb-8">
                    <Button
                        onClick={() => { setMovementType('deposit'); setShowMovementModal(true); }}
                        className="flex-1 h-14 rounded-2xl bg-card border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 font-bold justify-start px-3 sm:px-5"
                    >
                        <ArrowDownCircle size={20} className="mr-2 sm:mr-3 shrink-0" />
                        <span className="truncate">Ingreso</span>
                    </Button>
                    <Button
                        onClick={() => { setMovementType('withdrawal'); setShowMovementModal(true); }}
                        className="flex-1 h-14 rounded-2xl bg-card border border-destructive/30 text-destructive hover:bg-destructive/10 font-bold justify-start px-3 sm:px-5"
                    >
                        <ArrowUpCircle size={20} className="mr-2 sm:mr-3 shrink-0" />
                        <span className="truncate">Retiro</span>
                    </Button>
                    <Button
                        onClick={onTransfer}
                        className="flex-1 h-14 rounded-2xl bg-card border border-brand-blue/30 text-brand-blue hover:bg-brand-blue/10 font-bold justify-start px-3 sm:px-5"
                    >
                        <ArrowRightLeft size={20} className="mr-2 sm:mr-3 shrink-0" />
                        <span className="truncate">Transferir</span>
                    </Button>
                </div>

                {/* Ledger */}
                <h3 className="font-bold text-lg mb-4">Historial de Movimientos</h3>
                <div className="bg-card border border-border/50 rounded-[32px] overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground">Cargando movimientos...</div>
                    ) : movements.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">No hay movimientos registrados.</div>
                    ) : (
                        <div className="divide-y divide-border/50">
                            {movements.map(mov => (
                                <div key={mov.id} className="p-5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${mov.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-500' :
                                            mov.type === 'withdrawal' ? 'bg-destructive/10 text-destructive' :
                                                'bg-brand-blue/10 text-brand-blue'
                                            }`}>
                                            {mov.type === 'deposit' ? <ArrowDownCircle size={20} /> :
                                                mov.type === 'withdrawal' ? <ArrowUpCircle size={20} /> :
                                                    <RefreshCcw size={18} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground text-[15px]">{mov.description || mov.type}</p>
                                            <p className="text-xs text-muted-foreground font-medium">{mov.date}</p>
                                        </div>
                                    </div>
                                    <div className={`font-black tracking-tight text-lg ${mov.type === 'deposit' ? 'text-emerald-500' :
                                        mov.type === 'withdrawal' ? 'text-destructive' :
                                            mov.amount > 0 ? 'text-emerald-500' : 'text-destructive'
                                        }`}>
                                        {mov.type === 'withdrawal' ? '-' : mov.amount > 0 ? '+' : ''}
                                        {formatPrivacyCurrency(Math.abs(mov.amount), currency, hideBalances)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Movement Modal */}
            {showMovementModal && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowMovementModal(false)}></div>
                    <div className="bg-card w-full sm:w-[400px] h-auto rounded-t-[32px] sm:rounded-[36px] p-6 sm:p-8 relative z-10 flex flex-col animate-in slide-in-from-bottom-5 border border-border/20">
                        <div className="w-16 h-1.5 bg-muted rounded-full mx-auto mb-8 sm:hidden"></div>

                        <h2 className="text-2xl font-bold text-foreground mb-6">
                            {movementType === 'deposit' ? 'Añadir Aporte' : 'Registrar Retiro'}
                        </h2>

                        <form onSubmit={handleSaveMovement} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Monto</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={movementAmount}
                                    onChange={e => setMovementAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-xl"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-muted-foreground mb-2 ml-2">Fecha del Movimiento</label>
                                <input
                                    type="date"
                                    required
                                    value={movementDate}
                                    onChange={e => setMovementDate(e.target.value)}
                                    className="w-full h-14 bg-muted border border-transparent rounded-2xl px-5 text-foreground font-bold outline-none focus:border-border/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all text-base appearance-none"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button type="button" variant="outline" onClick={() => setShowMovementModal(false)} className="flex-1 h-14 rounded-2xl font-bold border-border/50">
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={saving || !movementAmount} className="flex-1 h-14 rounded-2xl font-bold bg-primary hover:bg-primary/90">
                                    {saving ? 'Guardando...' : 'Confirmar'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
