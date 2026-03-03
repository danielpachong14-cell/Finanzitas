"use client";

import { useState } from "react";
import { X, ArrowRightLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiClient } from "@/core/api/ApiClient";
import { Asset } from "@/core/api/ApiClient";
import { formatCurrency, formatPrivacyCurrency } from "@/lib/utils";
import { useUserOptions } from "@/core/context/UserContext";

interface TransferModalProps {
    isOpen: boolean;
    onClose: (updated: boolean) => void;
    assets: Asset[];
    defaultSourceId?: string;
}

export function TransferModal({ isOpen, onClose, assets, defaultSourceId }: TransferModalProps) {
    const { currency, hideBalances } = useUserOptions();

    const [sourceId, setSourceId] = useState<string>(defaultSourceId || "");
    const [destinationId, setDestinationId] = useState<string>("");
    const [amount, setAmount] = useState<string>("");
    const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
    const [note, setNote] = useState<string>("");
    const [loading, setLoading] = useState(false);

    // Filter only liquid assets (e.g., bank accounts, cash) - excluding physical/real estate which aren't easily transferable
    const liquidAssets = assets.filter(a => a.type === 'financial' || a.type === 'digital');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sourceId || !destinationId || !amount || !date) return;
        if (sourceId === destinationId) {
            alert("La cuenta de origen y destino no pueden ser la misma.");
            return;
        }

        setLoading(true);
        try {
            const transferAmount = parseFloat(amount);
            if (transferAmount <= 0) throw new Error("El monto debe ser mayor a 0");

            await ApiClient.createInternalTransfer(
                sourceId,
                destinationId,
                transferAmount,
                new Date(date).toISOString(),
                note
            );

            onClose(true); // Return updated=true so the parent knows to refresh
        } catch (error) {
            console.error(error);
            alert("Ocurrió un error al realizar la transferencia.");
        } finally {
            setLoading(false);
        }
    };

    const getSourceMax = () => {
        const asset = liquidAssets.find(a => a.id === sourceId);
        return asset ? Number(asset.current_value) : 0;
    };

    const maxAmount = getSourceMax();
    const showWarning = parseFloat(amount) > maxAmount;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-md">
            <div className="bg-card rounded-[32px] p-6 sm:p-8 w-full max-w-md animate-in zoom-in-95 duration-200 border border-border/50 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
                            <ArrowRightLeft size={20} />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold text-foreground">Transferir Fondos</h3>
                    </div>
                    <button
                        type="button"
                        onClick={() => onClose(false)}
                        className="p-2 text-muted-foreground bg-muted rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-foreground font-bold text-sm ml-1">Origen</Label>
                        <select
                            value={sourceId}
                            onChange={e => setSourceId(e.target.value)}
                            required
                            className="w-full h-14 rounded-2xl px-4 font-bold bg-muted text-foreground border-none focus-visible:ring-primary outline-none appearance-none cursor-pointer"
                        >
                            <option value="" disabled>Seleccionar cuenta origen...</option>
                            {liquidAssets.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.name} ({formatPrivacyCurrency(Number(a.current_value), currency, hideBalances)})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-center -my-2 relative z-10">
                        <div className="bg-card p-1 rounded-full border border-border/50">
                            <div className="bg-muted w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground rotate-90 sm:rotate-0">
                                <ArrowRightLeft size={14} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-foreground font-bold text-sm ml-1">Destino</Label>
                        <select
                            value={destinationId}
                            onChange={e => setDestinationId(e.target.value)}
                            required
                            className="w-full h-14 rounded-2xl px-4 font-bold bg-muted text-foreground border-none focus-visible:ring-primary outline-none appearance-none cursor-pointer"
                        >
                            <option value="" disabled>Seleccionar cuenta destino...</option>
                            {liquidAssets.filter(a => a.id !== sourceId).map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.name} ({formatPrivacyCurrency(Number(a.current_value), currency, hideBalances)})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2 pt-2">
                        <div className="flex justify-between items-center ml-1">
                            <Label className="text-foreground font-bold text-sm">Monto a Transferir</Label>
                            {sourceId && (
                                <span className="text-xs text-muted-foreground font-bold">
                                    Disponible: {formatPrivacyCurrency(maxAmount, currency, hideBalances)}
                                </span>
                            )}
                        </div>
                        <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="Ej. 150.00"
                            className="h-16 rounded-2xl bg-muted border-none px-4 focus-visible:ring-primary font-bold text-2xl"
                        />
                        {showWarning && (
                            <div className="flex items-center text-orange-500 text-xs font-bold mt-2 ml-1">
                                <AlertCircle size={12} className="mr-1" /> El monto excede el saldo actual de la cuenta origen.
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-foreground font-bold text-sm ml-1">Fecha</Label>
                        <Input
                            type="date"
                            required
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="h-14 rounded-2xl bg-muted border-none px-4 text-foreground focus-visible:ring-primary font-bold"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-foreground font-bold text-sm ml-1">Nota (Opcional)</Label>
                        <Input
                            type="text"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="Ej. Ahorro quincenal"
                            className="h-14 rounded-2xl bg-muted border-none px-4 text-foreground focus-visible:ring-primary font-medium"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading || !sourceId || !destinationId || !amount || sourceId === destinationId}
                        className="w-full h-16 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg mt-6 shadow-lg shadow-primary/20 transition-transform active:scale-[0.98]"
                    >
                        {loading ? "Procesando..." : "Confirmar Transferencia"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
