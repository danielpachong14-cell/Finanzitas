import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiClient, Transaction, Category, Asset } from "@/core/api/ApiClient";
import { ReceiptUploader, ParsedReceiptData } from "@/components/ui/ReceiptUploader";
import { Trash2, AlertTriangle, ExternalLink } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface TransactionEditModalProps {
    transaction: Transaction;
    isOpen: boolean;
    onClose: () => void;
}

export function TransactionEditModal({ transaction, isOpen, onClose }: TransactionEditModalProps) {
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Parse existing data
    const [amount, setAmount] = useState(transaction.amount.toString());
    const [type, setType] = useState<'income' | 'expense'>(transaction.type);
    const [date, setDate] = useState(transaction.date.split('T')[0]);
    const [time, setTime] = useState(() => {
        try {
            const txDate = new Date(transaction.date);
            return `${txDate.getHours().toString().padStart(2, '0')}:${txDate.getMinutes().toString().padStart(2, '0')}`;
        } catch (e) {
            return "12:00";
        }
    });

    // Extract Title, Currency and Notes from Description if formatted
    const rawDescription = transaction.description || "";
    let initialMerchant = transaction.merchant || "";
    let initialNotes = rawDescription;
    let receiptLink = "";

    if (rawDescription.includes("Archivo Adjunto: ")) {
        const parts = rawDescription.split("Archivo Adjunto: ");
        initialNotes = parts[0].trim();
        receiptLink = parts[1].trim();
    }

    // Simplified extraction since we only need simple strings for the edit modal
    const extractTitleFromNotes = (notesText: string) => {
        const lines = notesText.split('\n');
        const firstLine = lines[0];
        if (firstLine.startsWith('[')) {
            const closingBracketIndex = firstLine.indexOf(']');
            if (closingBracketIndex > 0) {
                return {
                    currency: firstLine.substring(1, closingBracketIndex),
                    title: firstLine.substring(closingBracketIndex + 1).trim()
                }
            }
        }
        return { currency: "COP", title: firstLine.replace('Notas: ', '').trim() };
    };

    const { currency, title } = extractTitleFromNotes(initialNotes);

    const [description, setDescription] = useState(title);
    const [txCurrency, setTxCurrency] = useState(currency);
    const [categoryName, setCategoryName] = useState(transaction.category);
    const [notes, setNotes] = useState(initialNotes.includes("Notas: ") ? initialNotes.split("Notas: ")[1].trim() : "");
    const [merchant, setMerchant] = useState(initialMerchant);
    const [receiptUrl, setReceiptUrl] = useState<string | null>(receiptLink || null);

    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [fetchingCats, setFetchingCats] = useState(true);

    useEffect(() => {
        if (isOpen) {
            ApiClient.getCategories().then(cats => {
                setAllCategories(cats);
                setFetchingCats(false);
            });

            // Reset states to prop values if it opens with a new tx
            setAmount(transaction.amount.toString());
            setType(transaction.type);
            setCategoryName(transaction.category);
            setMerchant(transaction.merchant || "");
        }
    }, [isOpen, transaction]);

    const mainCategories = allCategories.filter(c => c.type === type && !c.parent_id);

    const handleReceiptUploadSuccess = (url: string, parsedData?: ParsedReceiptData) => {
        setReceiptUrl(url);
        if (!parsedData) return;

        if (parsedData.amount) setAmount(parsedData.amount.toString());
        if (parsedData.merchant) {
            setMerchant(parsedData.merchant);
            setDescription(`Compra en ${parsedData.merchant}`);
        }
        if (parsedData.date) setDate(parsedData.date);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !description) return;
        setLoading(true);

        try {
            let dateString = new Date().toISOString();
            if (date && time) {
                dateString = new Date(`${date}T${time}:00`).toISOString();
            }

            let finalDescription = description.trim();
            if (txCurrency) {
                finalDescription = `[${txCurrency}] ${finalDescription}`;
            }

            let finalNotes = notes.trim();
            if (receiptUrl) {
                finalNotes += finalNotes ? `\\n\\nArchivo Adjunto: ${receiptUrl}` : `Archivo Adjunto: ${receiptUrl}`;
            }

            if (finalNotes) {
                finalDescription += `\\n\\nNotas: ${finalNotes}`;
            }

            await ApiClient.updateTransaction(transaction.id, {
                amount: parseFloat(amount),
                type,
                category: categoryName,
                merchant: merchant || undefined,
                date: dateString,
                description: finalDescription
            });

            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['balance'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            onClose();
        } catch (error) {
            console.error(error);
            alert("Error actualizando la transacción.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        const confirmDialog = window.confirm("¿Estás seguro de que quieres eliminar esta transacción? Se revertirán los saldos en tus cuentas afectadas.");
        if (!confirmDialog) return;

        setDeleting(true);
        try {
            await ApiClient.deleteTransaction(transaction.id);
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['balance'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            onClose();
        } catch (e) {
            console.error(e);
            alert("Error eliminando la transacción.");
        } finally {
            setDeleting(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-xl bg-card border-border/50 max-h-[90vh] overflow-y-auto custom-scrollbar rounded-[32px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex justify-between items-center">
                        Editar Transacción
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="mr-6 p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors flex items-center"
                            title="Eliminar Transacción"
                        >
                            <Trash2 size={20} />
                        </button>
                    </DialogTitle>
                    <DialogDescription>
                        Actualiza los datos, reasigna su categoría o adjunta un nuevo comprobante.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleUpdate} className="space-y-6 pt-4">

                    {/* TYPE */}
                    <div className="flex bg-muted/50 p-1.5 rounded-full border border-border/50 w-full mb-4">
                        <button
                            type="button"
                            onClick={() => setType('expense')}
                            className={`flex-1 flex justify-center items-center py-2 rounded-full transition-all text-sm ${type === 'expense' ? 'bg-destructive text-destructive-foreground font-bold shadow-sm scale-100' : 'text-muted-foreground font-semibold hover:bg-muted'}`}
                        >
                            Egreso
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('income')}
                            className={`flex-1 flex justify-center items-center py-2 rounded-full transition-all text-sm ${type === 'income' ? 'bg-emerald-500 text-white font-bold shadow-sm scale-100' : 'text-muted-foreground font-semibold hover:bg-muted'}`}
                        >
                            Ingreso
                        </button>
                    </div>

                    {/* RECEIPT / AI */}
                    {receiptUrl ? (
                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
                            <p className="font-medium text-sm">Ya existe un comprobante adjunto.</p>
                            <a href={receiptUrl} target="_blank" rel="noreferrer" className="flex items-center text-primary font-bold text-sm hover:underline">
                                Ver Documento <ExternalLink size={16} className="ml-1" />
                            </a>
                        </div>
                    ) : (
                        <ReceiptUploader onUploadSuccess={handleReceiptUploadSuccess} />
                    )}

                    {/* BASIC ROW 1: AMOUNT & CURRENCY */}
                    <div className="flex items-center space-x-3">
                        <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">$</span>
                            <Input
                                type="number"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="pl-10 h-14 rounded-2xl text-2xl tracking-tight font-bold text-foreground bg-muted/50 border-transparent focus-visible:bg-card focus-visible:border-border/50"
                                step="0.01"
                            />
                        </div>
                        <select
                            value={txCurrency}
                            onChange={(e) => setTxCurrency(e.target.value)}
                            className="h-14 rounded-2xl px-4 font-bold text-foreground text-lg bg-muted/50 border-transparent focus-visible:bg-card focus-visible:outline-none focus-visible:ring-2 w-28 appearance-none text-center"
                        >
                            <option value="COP">COP</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="MXN">MXN</option>
                        </select>
                    </div>

                    {/* TITLE & MERCHANT */}
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label className="text-muted-foreground font-bold text-xs uppercase">Descripción</Label>
                            <Input
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                required
                                className="h-12 bg-muted/50 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-muted-foreground font-bold text-xs uppercase">Comercio (Opcional)</Label>
                            <Input
                                value={merchant}
                                onChange={e => setMerchant(e.target.value)}
                                className="h-12 bg-muted/50 rounded-xl"
                            />
                        </div>
                    </div>

                    {/* DATE & TIME */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-muted-foreground font-bold text-xs uppercase">Fecha</Label>
                            <Input type="date" value={date} onChange={e => setDate(e.target.value)} required className="h-12 bg-muted/50 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-muted-foreground font-bold text-xs uppercase">Hora</Label>
                            <Input type="time" value={time} onChange={e => setTime(e.target.value)} required className="h-12 bg-muted/50 rounded-xl" />
                        </div>
                    </div>

                    {/* CATEGORY & NOTES */}
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label className="text-muted-foreground font-bold text-xs uppercase">Categoría</Label>
                            <select
                                required
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                className="w-full h-12 rounded-xl px-4 font-bold text-foreground text-sm bg-muted/50 border-transparent outline-none appearance-none"
                            >
                                {mainCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-muted-foreground font-bold text-xs uppercase">Notas</Label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full p-4 rounded-xl text-sm font-medium bg-muted/50 border-transparent focus-visible:outline-none text-foreground resize-none h-20 custom-scrollbar"
                            />
                        </div>
                    </div>

                    {/* CAUTION ASSET WARNING */}
                    {transaction.asset_id && (
                        <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-start space-x-3">
                            <AlertTriangle className="text-amber-500 mt-0.5" size={18} />
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
                                Esta transacción afectó una de tus cuentas bancarias/activos. Si alteras el monto o eliminas el registro, se ajustará automáticamente el saldo de dicha cuenta.
                            </p>
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={loading || deleting}
                        className="w-full rounded-2xl h-14 font-bold text-base mt-6 text-white bg-primary hover:bg-primary/90"
                    >
                        {loading ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
