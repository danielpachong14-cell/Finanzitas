import { useState, useEffect } from "react";
import { X, TrendingUp, TrendingDown, Clock, Activity, Plus } from "lucide-react";
import { formatCurrency, formatPrivacyCurrency } from "@/lib/utils";
import { Asset, ApiClient } from "@/core/api";
import { AssetTransaction } from "@/core/api/types";
import { FmpService, FmpQuote, FmpHistoricalPrice } from "@/core/api/providers/FmpService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface VariableIncomeAssetDashboardProps {
    asset: Asset;
    currency: string;
    onClose: () => void;
    onUpdate: () => Promise<void>;
    onEdit: () => void;
    onTransfer: () => void;
}

export function VariableIncomeAssetDashboard({ asset, currency, onClose, onUpdate, onEdit, onTransfer }: VariableIncomeAssetDashboardProps) {
    const [quote, setQuote] = useState<FmpQuote | null>(null);
    const [historical, setHistorical] = useState<FmpHistoricalPrice[]>([]);
    const [transactions, setTransactions] = useState<AssetTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form states
    const [showForm, setShowForm] = useState(false);
    const [txType, setTxType] = useState<'buy' | 'sell'>('buy');
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [txCurrency, setTxCurrency] = useState(currency || 'USD');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        loadData();
    }, [asset.id, asset.ticker_symbol]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [txs, qData, hData] = await Promise.all([
                ApiClient.getAssetTransactions(asset.id),
                asset.ticker_symbol ? FmpService.getQuote(asset.ticker_symbol) : Promise.resolve(null),
                asset.ticker_symbol ? FmpService.getHistorical(asset.ticker_symbol) : Promise.resolve([])
            ]);
            setTransactions(txs);
            setQuote(qData);

            // Format historical data for Recharts (reverse to chronological)
            setHistorical([...hData].reverse().map(d => ({
                ...d,
                shortDate: d.date.substring(5) // MM-DD
            })));
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveTransaction = async () => {
        if (!quantity || !price || !date) return;

        try {
            await ApiClient.createAssetTransaction(
                asset.id,
                txType,
                Number(quantity),
                Number(price),
                txCurrency,
                date
            );

            // Here we theoretically should update the `current_value` of the asset in DB
            // calculating total shares remaining * current price.
            // For now, let's just refresh the view and trigger parent update softly.
            await loadData();
            await onUpdate();
            setShowForm(false);
            setQuantity('');
            setPrice('');
            setDate(new Date().toISOString().split('T')[0]);
        } catch (error) {
            console.error("Failed to save transaction", error);
            alert("Error al guardar la transacción.");
        }
    };

    const handleDeleteTransaction = async (id: string) => {
        if (!confirm("¿Eliminar transacción?")) return;
        try {
            await ApiClient.deleteAssetTransaction(id);
            await loadData();
            await onUpdate();
        } catch (error) {
            console.error("Failed to delete transaction", error);
        }
    };

    const totalShares = transactions.reduce((sum, tx) => {
        return tx.type === 'buy' ? sum + Number(tx.quantity) : sum - Number(tx.quantity);
    }, 0);

    const totalInvested = transactions.reduce((sum, tx) => {
        const value = Number(tx.quantity) * Number(tx.price_per_share);
        return tx.type === 'buy' ? sum + value : sum - value;
    }, 0);

    const currentMarketValue = quote ? totalShares * quote.price : asset.current_value;
    const profitLoss = currentMarketValue - totalInvested;
    const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 fade-in duration-200">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-card border border-border/50 rounded-[32px] sm:rounded-[40px] shadow-2xl overflow-hidden slide-in-from-bottom-8 duration-300">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border/50 px-6 sm:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 sm:p-3 bg-brand-orange/10 rounded-2xl flex items-center justify-center shadow-inner relative overflow-hidden group">
                            <Activity className="text-brand-orange relative z-10" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-none flex items-center gap-2">
                                {asset.name}
                                {asset.ticker_symbol && (
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
                                        {asset.ticker_symbol}
                                    </span>
                                )}
                            </h2>
                            <p className="text-sm font-bold text-muted-foreground mt-1 flex items-center gap-1.5">
                                Renta Variable
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onEdit} className="p-2.5 text-muted-foreground hover:text-primary hover:bg-muted rounded-full transition-colors font-bold text-sm bg-card shadow-sm border border-border/50 hover:border-border">
                            Editar
                        </button>
                        <button onClick={onClose} className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors bg-card shadow-sm border border-border/50 hover:border-border">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 sm:p-8 space-y-8 scrollbar-hide bg-zinc-50 dark:bg-zinc-900/20">

                    {/* Resumen Card */}
                    <div className="bg-card border border-border/50 rounded-[28px] p-6 shadow-sm">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs uppercase font-bold text-muted-foreground mb-1">Valor de Mercado</p>
                                <p className="text-2xl font-black text-foreground">{formatCurrency(currentMarketValue, currency)}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase font-bold text-muted-foreground mb-1">Inversión Neta</p>
                                <p className="text-xl font-bold text-foreground">{formatCurrency(totalInvested, currency)}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase font-bold text-muted-foreground mb-1">Rendimiento</p>
                                <div className={`flex items-center gap-1 text-lg font-bold ${profitLoss >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {profitLoss >= 0 ? '+' : ''}{formatCurrency(profitLoss, currency)}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs uppercase font-bold text-muted-foreground mb-1">Rentabilidad</p>
                                <div className={`flex items-center w-fit gap-1 px-2 py-1 rounded-md text-sm font-bold ${profitLossPercentage >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {profitLossPercentage >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                    {profitLossPercentage.toFixed(2)}%
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-border/50 text-sm font-bold text-muted-foreground flex items-center justify-between">
                            <span>Cotización Actual (FMP): {quote ? `$${quote.price.toFixed(2)}` : 'N/A'}</span>
                            <span>Acciones/Monedas (Holding): {totalShares.toFixed(4)}</span>
                        </div>
                    </div>

                    {/* FMP Chart */}
                    <div className="bg-card border border-border/50 rounded-[28px] p-6 shadow-sm">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Activity size={18} className="text-brand-blue" />
                            Historial 30 Días
                        </h3>
                        {isLoading ? (
                            <div className="h-[250px] flex items-center justify-center animate-pulse bg-muted rounded-xl">Cargando gráfico...</div>
                        ) : historical.length > 0 ? (
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={historical}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                                        <XAxis dataKey="shortDate" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis domain={['auto', 'auto']} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))', fontWeight: 'bold' }}
                                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                                        />
                                        <Line type="monotone" dataKey="close" stroke="hsl(var(--brand-blue))" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: 'hsl(var(--brand-blue))' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[250px] flex justify-center items-center text-muted-foreground">
                                No hay datos históricos disponibles.
                            </div>
                        )}
                    </div>

                    {/* Libro Mayor / Transacciones */}
                    <div className="bg-card border border-border/50 rounded-[28px] p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Clock size={18} className="text-primary" />
                                Historial de Órdenes
                            </h3>
                            <Button onClick={() => setShowForm(!showForm)} variant="outline" className="h-8 text-xs font-bold rounded-full">
                                {showForm ? 'Cancelar' : <><Plus size={14} className="mr-1" /> Registrar Orden</>}
                            </Button>
                        </div>

                        {showForm && (
                            <div className="bg-muted/50 p-4 rounded-2xl mb-6 space-y-4 border border-border/50 animate-in fade-in slide-in-from-top-4">
                                <div className="flex gap-2 p-1 bg-background rounded-lg pointer-events-auto">
                                    <button
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${txType === 'buy' ? 'bg-emerald-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                                        onClick={() => setTxType('buy')}
                                    >Compras (Buy)</button>
                                    <button
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${txType === 'sell' ? 'bg-red-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                                        onClick={() => setTxType('sell')}
                                    >Venta (Sell)</button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1 col-span-2 sm:col-span-1">
                                        <label className="text-xs font-bold text-muted-foreground">Cantidad (Acciones)</label>
                                        <Input type="number" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0.00" className="h-9 bg-background" />
                                    </div>
                                    <div className="space-y-1 col-span-2 sm:col-span-1">
                                        <label className="text-xs font-bold text-muted-foreground">Precio Unitario</label>
                                        <Input type="number" step="any" value={price} onChange={e => setPrice(e.target.value)} placeholder="150.00" className="h-9 bg-background" />
                                    </div>
                                    <div className="space-y-1 col-span-1">
                                        <label className="text-xs font-bold text-muted-foreground">Moneda</label>
                                        <select
                                            value={txCurrency}
                                            onChange={e => setTxCurrency(e.target.value)}
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <option value="USD">USD ($)</option>
                                            <option value="EUR">EUR (€)</option>
                                            <option value="COP">COP ($)</option>
                                            <option value="MXN">MXN ($)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1 col-span-1">
                                        <label className="text-xs font-bold text-muted-foreground">Fecha Ejecución</label>
                                        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 bg-background" />
                                    </div>
                                </div>
                                <Button onClick={handleSaveTransaction} className="w-full text-xs font-bold h-9 bg-primary text-primary-foreground">
                                    Guardar Orden en Libro Mayor
                                </Button>
                            </div>
                        )}

                        <div className="space-y-3">
                            {transactions.length === 0 ? (
                                <p className="text-center text-sm text-muted-foreground py-4">Aún no has registrado transacciones.</p>
                            ) : (
                                transactions.map(tx => (
                                    <div key={tx.id} className="flex justify-between items-center p-3 sm:px-4 bg-background border border-border/40 rounded-xl hover:border-border/80 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${tx.type === 'buy' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {tx.type === 'buy' ? 'B' : 'S'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-foreground">{tx.type === 'buy' ? 'Compra' : 'Venta'}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-4">
                                            <div>
                                                <p className="font-bold text-sm text-foreground">{tx.quantity} a ${Number(tx.price_per_share).toFixed(2)}</p>
                                                <p className="text-xs font-bold text-muted-foreground">Total: ${formatCurrency(Number(tx.quantity) * Number(tx.price_per_share), '')}</p>
                                            </div>
                                            <button onClick={() => handleDeleteTransaction(tx.id)} className="text-muted-foreground hover:text-red-500 transition-colors" title="Eliminar orden">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
