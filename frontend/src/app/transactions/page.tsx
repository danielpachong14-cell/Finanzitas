"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { formatCurrency, formatPrivacyCurrency } from "@/lib/utils";
import { ApiClient, Transaction } from "@/core/api/ApiClient";
import { useTransactions } from "@/core/hooks/useQueries";
import { ArrowLeft, Download, Search, Filter, SlidersHorizontal, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useUserOptions } from "@/core/context/UserContext";
import { TransactionEditModal } from "@/components/ui/TransactionEditModal";

export default function TransactionsHistoryPage() {
  const router = useRouter();
  const { currency, hideBalances } = useUserOptions();
  const { data: transactionsData, isLoading: loading } = useTransactions();
  const transactions = transactionsData || [];

  // Filtering & Sorting State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<'' | 'income' | 'expense'>('');
  const [sortOrder, setSortOrder] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Edit State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return;

    // Headers
    const headers = ['Fecha', 'Tipo', 'Categoría', 'Subcategoría', 'Comercio', 'Método Pago', 'Monto'];

    // Rows
    const rows = transactions.map(t => [
      formatDate(t.date),
      t.type === 'income' ? 'Ingreso' : 'Egreso',
      t.category,
      t.subcategory || 'N/A',
      t.merchant || 'N/A',
      t.paymentMethod || 'N/A',
      t.amount.toString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `transacciones_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredAndSortedTransactions = transactions.filter(t => {
    const matchesSearch = t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.merchant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subcategory?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === '' || t.type === filterType;

    return matchesSearch && matchesType;
  }).sort((a, b) => {
    switch (sortOrder) {
      case 'date-desc': return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'date-asc': return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'amount-desc': return b.amount - a.amount;
      case 'amount-asc': return a.amount - b.amount;
      default: return 0;
    }
  });

  return (
    <AppLayout hideNav>
      <div className="bg-background flex flex-col relative min-h-screen transition-colors">
        <header className="px-6 py-6 flex items-center justify-between sticky top-0 bg-card z-10 border-b border-border/50">
          <button
            onClick={() => router.back()}
            className="p-3 bg-muted rounded-full hover:bg-muted-foreground/10 transition-colors"
          >
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Movimientos</h1>
          <button
            onClick={handleExportCSV}
            className="p-3 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
            title="Exportar CSV"
          >
            <Download size={20} />
          </button>
        </header>

        <div className="p-6 flex-1">
          {/* Search Bar */}
          <div className="flex space-x-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={20} />
              <Input
                type="text"
                placeholder="Buscar comercio o categoría..."
                className="pl-12 h-14 rounded-2xl border border-border/50 bg-card text-foreground focus-visible:ring-primary text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Filters & Sorting */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="flex bg-muted/50 p-1.5 rounded-2xl border border-border/50 md:w-auto overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setFilterType('')}
                className={`px-4 py-2 text-sm font-bold rounded-xl whitespace-nowrap transition-all ${filterType === '' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-card/50'}`}
              >Todos</button>
              <button
                onClick={() => setFilterType('income')}
                className={`flex items-center px-4 py-2 text-sm font-bold rounded-xl whitespace-nowrap transition-all ${filterType === 'income' ? 'bg-card text-emerald-500 shadow-sm' : 'text-muted-foreground hover:bg-card/50'}`}
              >
                <ArrowDownLeft size={16} className="mr-1" /> Ingresos
              </button>
              <button
                onClick={() => setFilterType('expense')}
                className={`flex items-center px-4 py-2 text-sm font-bold rounded-xl whitespace-nowrap transition-all ${filterType === 'expense' ? 'bg-card text-destructive shadow-sm' : 'text-muted-foreground hover:bg-card/50'}`}
              >
                <ArrowUpRight size={16} className="mr-1" /> Egresos
              </button>
            </div>

            <div className="relative bg-muted/50 rounded-2xl border border-border/50 flex-1 md:max-w-[200px]">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                <SlidersHorizontal size={16} />
              </div>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="w-full h-full min-h-[44px] pl-10 pr-4 bg-transparent text-sm font-bold text-foreground appearance-none focus:outline-none"
              >
                <option value="date-desc">Más Recientes</option>
                <option value="date-asc">Más Antiguos</option>
                <option value="amount-desc">Mayor Monto</option>
                <option value="amount-asc">Menor Monto</option>
              </select>
            </div>
          </div>

          {/* Transactions List */}
          {loading ? (
            <p className="text-center text-muted-foreground/50 mt-10 font-bold">Cargando movimientos...</p>
          ) : filteredAndSortedTransactions.length === 0 ? (
            <div className="text-center py-10 bg-card rounded-[32px] border border-dashed border-border/50">
              <p className="text-muted-foreground font-medium">No se encontraron movimientos.</p>
              {(searchTerm || filterType) && (
                <button onClick={() => { setSearchTerm(""); setFilterType(""); }} className="mt-4 text-primary font-bold text-sm hover:underline">Limpiar Filtros</button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedTransactions.map(tx => (
                <div
                  key={tx.id}
                  onClick={() => setEditingTransaction(tx)}
                  className="bg-card p-4 rounded-[24px] border border-border/50 flex flex-col md:flex-row items-start md:items-center justify-between hover:bg-muted/50 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center space-x-4 mb-2 md:mb-0 w-full md:w-auto">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0
            ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}
                    >
                      {tx.category.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground text-lg leading-tight truncate">
                        {tx.merchant || tx.category}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-sm font-medium text-muted-foreground truncate">{tx.category}</p>
                        {tx.subcategory && (
                          <>
                            <span className="text-border">•</span>
                            <p className="text-sm font-medium text-muted-foreground truncate">{tx.subcategory}</p>
                          </>
                        )}
                        {tx.description?.includes("Archivo Adjunto:") && (
                          <span className="text-xs font-bold text-primary ml-2 bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">Recibo</span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-muted-foreground/50 mt-1 uppercase tracking-wider">{formatDate(tx.date)} {tx.paymentMethod && `• ${tx.paymentMethod}`}</p>
                    </div>
                  </div>
                  <p className={`font-bold text-xl self-end md:self-center shrink-0 ${tx.type === 'income' ? 'text-emerald-500' : 'text-foreground'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatPrivacyCurrency(tx.amount, currency, hideBalances).replace('$', ' $').replace('€', ' €')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Embedded Modal */}
      {editingTransaction && (
        <TransactionEditModal
          transaction={editingTransaction}
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}

    </AppLayout>
  );
}
