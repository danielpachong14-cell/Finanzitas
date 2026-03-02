"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { formatCurrency } from "@/lib/utils";
import { ApiClient, Balance, Transaction } from "@/core/api/ApiClient";
import { useTransactions, useBalance } from "@/core/hooks/useQueries";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownLeft, ArrowUpRight, Bell, Wallet } from "lucide-react";
import { useUserOptions } from "@/core/context/UserContext";

export default function DashboardPage() {
  const { currency } = useUserOptions();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const { data: rawTransactions, isLoading: isLoadingTx } = useTransactions();
  const { data: rawBalance, isLoading: isLoadingBal } = useBalance();
  const loading = isLoadingTx || isLoadingBal;

  useEffect(() => {
    if (!rawTransactions) return;

    // Filter transactions by selected month/year
    const filteredTx = rawTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate.getMonth() === selectedMonth && txDate.getFullYear() === selectedYear;
    });

    setTransactions(filteredTx);

    // Recalculate balance for the specific period
    const income = filteredTx.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = filteredTx.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

    setBalance({
      total: rawBalance?.total || (income - expense), // Fallback to calculated if raw is missing
      income,
      expense
    });
  }, [selectedMonth, selectedYear, rawTransactions, rawBalance]);

  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  return (
    <AppLayout>
      <div className="p-6">
        <header className="flex justify-between items-center mb-8">
          <div>
            <p className="text-muted-foreground text-sm">Bienvenido de vuelta,</p>
            <h1 className="text-xl font-bold text-foreground">Daniel Pachón</h1>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => window.location.href = '/transactions/new'}
              className="relative p-2 bg-primary/10 rounded-full text-primary transition-all hover:bg-primary/20"
              title="Nueva Transacción"
            >
              <ArrowUpRight size={20} className="transform rotate-45" />
            </button>
            <button className="relative p-2 bg-card border border-border/50 text-foreground rounded-full">
              <Bell size={20} />
              <span className="absolute top-1 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background"></span>
            </button>
          </div>
        </header>

        {/* Date Filter */}
        <div className="flex space-x-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
          {months.map((m, i) => (
            <button
              key={m}
              onClick={() => setSelectedMonth(i)}
              className={`px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all ${selectedMonth === i ? 'bg-foreground text-background transform scale-105' : 'bg-card text-muted-foreground border border-border/50 hover:bg-muted'}`}
            >
              {m} {selectedYear}
            </button>
          ))}
        </div>

        {/* Main Balance Card (Hero) */}
        <div className="bg-primary rounded-[32px] p-8 text-primary-foreground mb-8 relative overflow-hidden transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-[0.15] rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black opacity-20 rounded-full blur-xl -ml-10 -mb-10 pointer-events-none"></div>

          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-primary-foreground/80 text-sm font-medium mb-1">Flujo Neto del Período</p>
              <h2 className="text-4xl font-bold tracking-tight">
                {loading ? "..." : formatCurrency(balance?.total || 0, currency)}
              </h2>
            </div>
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <Wallet size={24} className="text-white" />
            </div>
          </div>
        </div>

        {/* Income / Expense Mini Cards */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <Card className="rounded-[24px] border border-border/50 bg-card">
            <CardContent className="p-5 flex flex-col">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <ArrowDownLeft size={20} strokeWidth={2.5} className="text-emerald-500" />
              </div>
              <p className="text-xs text-muted-foreground font-bold mb-1 uppercase tracking-wider">Ingresos</p>
              <p className="text-lg font-bold text-foreground tracking-tight">
                {loading ? "..." : formatCurrency(balance?.income || 0, currency)}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border border-border/50 bg-card">
            <CardContent className="p-5 flex flex-col">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <ArrowUpRight size={20} strokeWidth={2.5} className="text-destructive" />
              </div>
              <p className="text-xs text-muted-foreground font-bold mb-1 uppercase tracking-wider">Egresos</p>
              <p className="text-lg font-bold text-foreground tracking-tight">
                {loading ? "..." : formatCurrency(balance?.expense || 0, currency)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions Section */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-foreground">Actividad Reciente</h3>
            <button
              onClick={() => window.location.href = '/transactions'}
              className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
            >
              Ver Todo
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <p className="text-muted-foreground text-center py-4">Cargando...</p>
            ) : transactions.length > 0 ? (
              transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex justify-between items-center p-4 bg-card rounded-[24px] border border-border/50 hover: transition-all">
                  <div className="flex space-x-4 items-center">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                      {tx.category.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-base leading-tight">{tx.merchant || tx.category}</p>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <p className="text-xs text-muted-foreground">{tx.category}</p>
                        {tx.subcategory && (
                          <><span className="text-border">•</span><p className="text-xs text-muted-foreground">{tx.subcategory}</p></>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="font-bold tracking-tight">
                    <span className={tx.type === 'income' ? 'text-emerald-500' : 'text-foreground'}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency).replace('$', ' $').replace('€', ' €')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-card rounded-[24px] border border-dashed border-border/50">
                <p className="text-muted-foreground font-medium">No hay movimientos en este mes.</p>
                <button
                  onClick={() => window.location.href = '/transactions/new'}
                  className="mt-4 text-primary font-bold text-sm hover:underline"
                >
                  Registrar uno nuevo
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
