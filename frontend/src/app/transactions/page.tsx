"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { formatCurrency } from "@/lib/utils";
import { ApiClient, Transaction } from "@/core/api/ApiClient";
import { useTransactions } from "@/core/hooks/useQueries";
import { ArrowLeft, Download, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useUserOptions } from "@/core/context/UserContext";

export default function TransactionsHistoryPage() {
  const router = useRouter();
  const { currency } = useUserOptions();
  const { data: transactionsData, isLoading: loading } = useTransactions();
  const transactions = transactionsData || [];
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredTransactions = transactions.filter(t =>
    t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.merchant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subcategory?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          {/* Search & Filter Bar */}
          <div className="flex space-x-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={20} />
              <Input
                type="text"
                placeholder="Buscar comercio o categoría..."
                className="pl-12 h-14 rounded-2xl border-none bg-card text-foreground focus-visible:ring-primary text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="h-14 w-14 bg-card rounded-2xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
              <Filter size={18} />
            </button>
          </div>

          {/* Transactions List */}
          {loading ? (
            <p className="text-center text-muted-foreground/50 mt-10 font-bold">Cargando movimientos...</p>
          ) : filteredTransactions.length === 0 ? (
            <p className="text-center text-muted-foreground/50 mt-10 font-bold">No se encontraron movimientos.</p>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map(tx => (
                <div key={tx.id} className="bg-card p-4 rounded-[24px] border border-border/50 flex flex-col md:flex-row items-start md:items-center justify-between hover: transition-all">
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
                      </div>
                      <p className="text-xs font-bold text-muted-foreground/50 mt-1 uppercase tracking-wider">{formatDate(tx.date)} {tx.paymentMethod && `• ${tx.paymentMethod}`}</p>
                    </div>
                  </div>
                  <p className={`font-bold text-xl self-end md:self-center shrink-0 ${tx.type === 'income' ? 'text-emerald-500' : 'text-foreground'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency).replace('$', ' $').replace('€', ' €')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
