"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Target, AlertCircle, Plus, X, ChevronLeft, ChevronRight, Edit2, Trash2, ArrowUpDown } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { ApiClient, Category, Transaction } from "@/core/api/ApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatPrivacyCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useUserOptions } from "@/core/context/UserContext";
import { TransactionEditModal } from "@/components/ui/TransactionEditModal";

export default function BudgetsPage() {
  const { currency, hideBalances } = useUserOptions();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Data State
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Time State
  const [currentDate, setCurrentDate] = useState(new Date());

  const router = useRouter();

  // Modal State
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [selectedBudgetForDetails, setSelectedBudgetForDetails] = useState<Category | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form State (for Budget Create/Edit)
  const [editingCategoryId, setEditingCategoryId] = useState<string>("");
  const [catLimit, setCatLimit] = useState("");

  // Sorting State
  const [sortBy, setSortBy] = useState<'name' | 'highest_spent' | 'lowest_spent' | 'highest_pct' | 'lowest_pct'>('highest_pct');

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [cats, txs] = await Promise.all([
        ApiClient.getCategories(),
        ApiClient.getTransactions()
      ]);

      setCategories(cats);
      setTransactions(txs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const openCreateBudgetModal = () => {
    setEditingCategoryId("");
    setCatLimit("");
    setShowLimitModal(true);
  };

  const openEditLimitModal = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setCatLimit(cat.monthly_limit > 0 ? cat.monthly_limit.toString() : "");
    setShowLimitModal(true);
  };

  const handleDeleteBudget = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este presupuesto? La categoría seguirá existiendo pero no tendrá un límite asignado.")) return;
    try {
      await ApiClient.updateCategory(id, { monthly_limit: 0 });
      fetchAllData();
    } catch (error) {
      console.error(error);
      alert("Error al eliminar el presupuesto.");
    }
  };

  const handleSaveLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategoryId) return;
    setActionLoading(true);
    try {
      const limitVal = parseFloat(catLimit) || 0;
      await ApiClient.updateCategory(editingCategoryId, {
        monthly_limit: limitVal
      });
      setShowLimitModal(false);
      fetchAllData();
    } catch (error) {
      console.error(error);
      alert("Error al guardar el límite.");
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate spend per category for the current month
  const getSpentForCategory = (categoryName: string, type: 'expense' | 'income') => {
    const targetCat = categoryName.trim().toLowerCase();

    return transactions
      .filter(t => {
        const d = new Date(t.date);
        const matchesDate = d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth();

        const txCat = (t.category || '').trim().toLowerCase();
        const txSub = (t.subcategory || '').trim().toLowerCase();

        return matchesDate && t.type === type && (txCat === targetCat || txSub === targetCat);
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  };

  const getTransactionsForCategory = (categoryName: string, type: 'expense' | 'income') => {
    const targetCat = categoryName.trim().toLowerCase();

    return transactions
      .filter(t => {
        const d = new Date(t.date);
        const matchesDate = d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth();

        const txCat = (t.category || '').trim().toLowerCase();
        const txSub = (t.subcategory || '').trim().toLowerCase();

        return matchesDate && t.type === type && (txCat === targetCat || txSub === targetCat);
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Derived Data
  const expenseCategories = categories.filter(c => c.type === 'expense' && !c.parent_id);
  const subCategories = categories.filter(c => c.parent_id);

  // Budgets are expense categories that have a limit > 0
  const activeBudgets = expenseCategories.filter(c => c.monthly_limit > 0);
  // Unbudgeted are expense categories that have NO limit
  const availableForBudget = expenseCategories.filter(c => c.monthly_limit === 0 || !c.monthly_limit);

  const totalBudget = activeBudgets.reduce((sum, c) => sum + Number(c.monthly_limit), 0);

  // The global summary should show ALL expenses of the month to give a true overview of money spent
  const totalSpent = transactions
    .filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth() && t.type === 'expense';
    })
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const overallProgress = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  // Sorting Logic for Budgets
  const sortedBudgets = [...activeBudgets].sort((a, b) => {
    const spentA = Math.abs(getSpentForCategory(a.name, 'expense'));
    const spentB = Math.abs(getSpentForCategory(b.name, 'expense'));
    const limitA = Number(a.monthly_limit);
    const limitB = Number(b.monthly_limit);
    const pctA = limitA > 0 ? (spentA / limitA) * 100 : 0;
    const pctB = limitB > 0 ? (spentB / limitB) * 100 : 0;

    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'highest_spent':
        return spentB - spentA;
      case 'lowest_spent':
        return spentA - spentB;
      case 'highest_pct':
        return pctB - pctA;
      case 'lowest_pct':
        return pctA - pctB;
      default:
        return 0;
    }
  });

  const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <AppLayout>
      <div className="bg-background min-h-full pb-24 relative transition-colors">
        {/* Header */}
        <header className="px-6 py-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Presupuestos</h1>
          <p className="text-muted-foreground text-sm">Asigna límites de gasto a tus categorías.</p>

          <div className="flex items-center justify-between bg-card rounded-full px-4 py-2 border border-border/50 max-w-sm mt-6">
            <button onClick={handlePrevMonth} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="font-bold text-foreground capitalize">{monthName}</span>
            <button onClick={handleNextMonth} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </header>

        <div className="px-6 space-y-6">
          {/* Expense Overview Card */}
          <Card className="rounded-[32px] border flex-col bg-gradient-to-br from-card to-muted border-border/50">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Target size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Presupuesto Total</p>
                    <p className="text-3xl font-bold text-foreground">{formatPrivacyCurrency(totalBudget, currency, hideBalances)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end text-sm font-bold">
                  <div>
                    <span className="text-foreground text-base">{formatPrivacyCurrency(totalSpent, currency, hideBalances)} gastados</span>
                    <p className="text-muted-foreground text-xs mt-0.5">de {formatPrivacyCurrency(totalBudget, currency, hideBalances)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-primary text-base">{formatPrivacyCurrency(Math.max(0, totalBudget - totalSpent), currency, hideBalances)}</span>
                    <p className="text-muted-foreground text-xs mt-0.5">restantes</p>
                  </div>
                </div>
                <div className="h-4 w-full bg-secondary/20 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${overallProgress > 90 ? 'bg-destructive' : 'bg-primary'} rounded-full transition-all duration-500`}
                    style={{ width: `${overallProgress}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={openCreateBudgetModal}
              className="flex-1 rounded-full h-16 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg hover:-translate-y-1 transition-all"
            >
              <Plus size={24} className="mr-2" /> Agregar Presupuesto
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/categories')}
              className="flex-1 rounded-full h-16 border-border/50 text-foreground bg-card hover:bg-muted font-bold text-lg hover:-translate-y-1 transition-all"
            >
              Administrar Categorías
            </Button>
          </div>

          {/* Active Budgets List */}
          <div className="pt-4 space-y-6">
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-28 bg-muted rounded-[32px] w-full"></div>
                <div className="h-28 bg-muted rounded-[32px] w-full"></div>
              </div>
            ) : activeBudgets.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-[32px] bg-card border border-border/50">
                <div className="mx-auto w-20 h-20 bg-muted flex items-center justify-center rounded-full mb-4">
                  <AlertCircle className="text-muted-foreground/50" size={40} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Sin presupuestos activos</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">Asigna un límite de gastos a tus categorías para controlar tus finanzas.</p>
                <Button
                  onClick={openCreateBudgetModal}
                  className="rounded-full px-8 h-12 bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold"
                >
                  Comenzar ahora
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4 mb-2">
                  <h2 className="text-xl font-bold text-foreground flex items-center">Presupuestos Activos</h2>

                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="appearance-none bg-card border border-border/50 text-foreground text-sm font-bold rounded-xl pl-4 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-auto"
                    >
                      <option value="highest_pct">Mayor % Consumido</option>
                      <option value="lowest_pct">Menor % Consumido</option>
                      <option value="highest_spent">Mayor Monto Gastado</option>
                      <option value="lowest_spent">Menor Monto Gastado</option>
                      <option value="name">Alfabético (A-Z)</option>
                    </select>
                    <ArrowUpDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedBudgets.map(c => {
                    const spent = Math.abs(getSpentForCategory(c.name, 'expense'));
                    const limit = Number(c.monthly_limit);
                    const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
                    const isWarning = pct > 80;
                    const isDanger = pct >= 100;
                    const subs = subCategories.filter(sub => sub.parent_id === c.id);
                    const IconComponent = (LucideIcons as any)[c.icon] || LucideIcons.Tag;

                    return (
                      <div key={c.id} className="bg-card p-6 rounded-[32px] border border-border/50 flex flex-col space-y-5 relative hover: transition-all">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div
                              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                              style={{ backgroundColor: c.color || 'var(--color-muted)' }}
                            >
                              <IconComponent size={24} style={{ color: c.icon_color || 'var(--color-primary)' }} />
                            </div>
                            <div className="min-w-0 flex-1 pr-1">
                              <h3 className="font-bold text-foreground text-lg sm:text-xl truncate">{c.name}</h3>
                              {subs.length > 0 && (
                                <p className="text-xs font-bold text-muted-foreground truncate">{subs.length} subcategorías</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center shrink-0">
                            <button onClick={() => openEditLimitModal(c)} className="p-2.5 sm:p-3 text-muted-foreground hover:text-blue-500 transition-colors bg-muted rounded-full hover:bg-blue-500/10 mr-1" title="Editar Límite">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDeleteBudget(c.id)} className="p-2.5 sm:p-3 text-muted-foreground hover:text-destructive transition-colors bg-muted rounded-full hover:bg-destructive/10" title="Eliminar Presupuesto">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-foreground text-3xl tracking-tight">{formatPrivacyCurrency(spent, currency, hideBalances)}</p>
                          <p className="text-sm text-primary font-bold mt-1">Quedan {formatPrivacyCurrency(Math.max(0, limit - spent), currency, hideBalances)}</p>
                          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1">Límite de {formatPrivacyCurrency(limit, currency, hideBalances)}</p>
                        </div>

                        <div className="h-3 w-full bg-muted rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full ${isDanger ? 'bg-destructive' : isWarning ? 'bg-orange-400' : 'bg-primary'} transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>

                        <Button
                          variant="ghost"
                          className="w-full mt-2 text-primary hover:text-primary hover:bg-primary/10 font-bold justify-between"
                          onClick={() => setSelectedBudgetForDetails(c)}
                        >
                          Ver Detalles <ChevronRight size={16} />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {showLimitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-md">
            <div className="bg-card rounded-[32px] p-8 w-full max-w-sm animate-in zoom-in-95 duration-200 border border-border/50">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-foreground">{editingCategoryId ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}</h3>
                <button onClick={() => setShowLimitModal(false)} className="p-2 text-muted-foreground bg-muted rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveLimit} className="space-y-5">
                {!editingCategoryId && (
                  <div className="space-y-2">
                    <Label className="text-foreground font-bold">Categoría</Label>
                    <select
                      value={editingCategoryId}
                      onChange={e => setEditingCategoryId(e.target.value)}
                      required
                      className="w-full h-14 rounded-2xl px-4 font-bold bg-muted text-foreground border-none focus-visible:ring-primary outline-none"
                    >
                      <option value="" disabled>Selecciona una categoría...</option>
                      {availableForBudget.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                      {availableForBudget.length === 0 && (
                        <option value="" disabled>No hay categorías disponibles</option>
                      )}
                    </select>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <Label className="text-foreground font-bold">Límite Mensual</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={catLimit}
                    onChange={e => setCatLimit(e.target.value)}
                    placeholder="Ej. 500.00"
                    className="h-16 rounded-2xl bg-muted border-none px-4 focus-visible:ring-primary font-bold text-2xl"
                  />
                </div>

                <Button type="submit" disabled={actionLoading || !editingCategoryId} className="w-full h-16 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg mt-8 transition-transform hover:-translate-y-1">
                  {actionLoading ? "Guardando..." : "Guardar Presupuesto"}
                </Button>
              </form>
            </div>
          </div>
        )}

        {selectedBudgetForDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-md">
            <div className="bg-card rounded-[32px] p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 border border-border/50">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-foreground flex items-center">
                    {selectedBudgetForDetails.name}
                  </h3>
                  <p className="text-muted-foreground text-sm mt-1">Detalle de movimientos</p>
                </div>
                <button onClick={() => setSelectedBudgetForDetails(null)} className="p-2 text-muted-foreground bg-muted rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0">
                  <X size={20} />
                </button>
              </div>

              <div className="flex items-center justify-between bg-muted rounded-full px-4 py-2 border border-border/50 mb-6 shrink-0">
                <button onClick={handlePrevMonth} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <span className="font-bold text-foreground capitalize">{monthName}</span>
                <button onClick={handleNextMonth} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3 mt-2">
                {(() => {
                  const catTxs = getTransactionsForCategory(selectedBudgetForDetails.name, 'expense');

                  if (catTxs.length === 0) {
                    return (
                      <div className="text-center py-10">
                        <div className="mx-auto w-16 h-16 bg-muted flex items-center justify-center rounded-full mb-4">
                          <AlertCircle className="text-muted-foreground/50" size={32} />
                        </div>
                        <p className="text-muted-foreground font-medium">No hay movimientos en este mes.</p>
                      </div>
                    );
                  }

                  return catTxs.map(tx => (
                    <div
                      key={tx.id}
                      onClick={() => setEditingTransaction(tx)}
                      className="flex justify-between items-center p-4 bg-background rounded-2xl border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer active:scale-[0.98]"
                    >
                      <div className="min-w-0 pr-4">
                        <p className="font-bold text-foreground truncate">{tx.merchant || tx.category}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(tx.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-foreground">{formatPrivacyCurrency(Math.abs(tx.amount), currency, hideBalances)}</p>
                        {tx.subcategory && (
                          <p className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full inline-block mt-1">
                            {tx.subcategory}
                          </p>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              <div className="mt-6 pt-6 border-t border-border/50 flex justify-between items-center shrink-0">
                <span className="font-bold text-muted-foreground">Total Gastado</span>
                <span className="text-2xl font-black text-foreground">
                  {formatPrivacyCurrency(Math.abs(getSpentForCategory(selectedBudgetForDetails.name, 'expense')), currency, hideBalances)}
                </span>
              </div>
            </div>
          </div>
        )}

        {editingTransaction && (
          <TransactionEditModal
            transaction={editingTransaction}
            isOpen={!!editingTransaction}
            onClose={() => {
              setEditingTransaction(null);
              fetchAllData();
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
