"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLayout } from "@/components/layout/AppLayout";
import { ApiClient, Category, Asset } from "@/core/api/ApiClient";

export default function NewTransactionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingCats, setFetchingCats] = useState(true);
  const [type, setType] = useState<'expense' | 'income'>('expense');

  const [amount, setAmount] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [allCategories, setAllCategories] = useState<Category[]>([]);

  const [fetchingAssets, setFetchingAssets] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetId, setAssetId] = useState("");
  const [paymentType, setPaymentType] = useState<'debit' | 'credit'>('debit');

  const [financedPhysicalAssets, setFinancedPhysicalAssets] = useState<Asset[]>([]);
  const [isPayingPhysicalDebt, setIsPayingPhysicalDebt] = useState(false);
  const [linkedAssetDebtId, setLinkedAssetDebtId] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cats, userAssets] = await Promise.all([
          ApiClient.getCategories(),
          ApiClient.getAssets()
        ]);
        setAllCategories(cats);

        const paymentAccounts = userAssets.filter(a => a.is_payment_account);
        setAssets(paymentAccounts);
        if (paymentAccounts.length > 0) {
          setAssetId(paymentAccounts[0].id);
        }

        const financedPhysical = userAssets.filter(a => a.type === 'physical' && a.has_credit);
        setFinancedPhysicalAssets(financedPhysical);
        if (financedPhysical.length > 0) {
          setLinkedAssetDebtId(financedPhysical[0].id);
        }
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setFetchingCats(false);
        setFetchingAssets(false);
      }
    };
    loadData();
  }, []);

  // Filter main categories by the currently selected Type
  const mainCategories = allCategories.filter(c => c.type === type && !c.parent_id);

  // Find the currently selected Main Category object
  const selectedMainCategory = mainCategories.find(c => c.name === categoryName);

  // Find subcategories for the selected main category
  const availableSubcategories = selectedMainCategory
    ? allCategories.filter(c => c.parent_id === selectedMainCategory.id)
    : [];

  // Auto-select first main category when type changes (if available)
  useEffect(() => {
    if (mainCategories.length > 0) {
      setCategoryName(mainCategories[0].name);
    } else {
      setCategoryName("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, allCategories]);

  // Reset subcategory when main category changes
  useEffect(() => {
    setSubcategory("");
  }, [categoryName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await ApiClient.createTransaction({
        type,
        amount: parseFloat(amount),
        category: categoryName || "Otros", // Fallback if none selected
        subcategory: subcategory || undefined,
        merchant: merchant || undefined,
        asset_id: assetId || undefined,
        payment_type: assetId ? paymentType : undefined,
        linked_asset_debt_id: type === 'expense' && isPayingPhysicalDebt && linkedAssetDebtId ? linkedAssetDebtId : undefined,
        date: new Date(date).toISOString(),
      });
      router.push("/dashboard");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout hideNav>
      <div className="bg-background flex flex-col relative h-full transition-colors">
        <header className="px-6 py-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-3 bg-card rounded-full hover:bg-muted transition-colors border border-border/50"
            disabled={loading}
          >
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Nueva Transacción</h1>
          <div className="w-10"></div>
        </header>

        <div className="px-6 pt-2 pb-6 flex-1 overflow-y-auto">
          <div className="bg-card p-2 rounded-full flex mb-8 border border-border/50">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3.5 rounded-full transition-all ${type === 'expense' ? 'bg-destructive text-destructive-foreground font-bold transform scale-[1.02]' : 'text-muted-foreground font-semibold hover:bg-muted'}`}
              disabled={loading}
            >
              <ArrowUpRight size={20} strokeWidth={2.5} />
              <span>Egreso</span>
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3.5 rounded-full transition-all ${type === 'income' ? 'bg-emerald-500 text-white font-bold transform scale-[1.02]' : 'text-muted-foreground font-semibold hover:bg-muted'}`}
              disabled={loading}
            >
              <ArrowDownLeft size={20} strokeWidth={2.5} />
              <span>Ingreso</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 pb-12">
            <div className="space-y-3">
              <Label className="text-foreground font-bold ml-2">Monto *</Label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">$</span>
                <Input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-12 h-20 rounded-[24px] text-4xl tracking-tight font-bold text-foreground bg-card border border-border/50 focus-visible:ring-primary placeholder:text-muted-foreground/30"
                  placeholder="0.00"
                  step="0.01"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-foreground font-bold ml-2">Fecha *</Label>
              <Input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-14 rounded-2xl text-base bg-card border border-border/50 focus-visible:ring-primary text-foreground font-semibold"
                disabled={loading}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-foreground font-bold ml-2">Categoría Principal *</Label>
              {fetchingCats ? (
                <div className="h-14 rounded-2xl bg-muted animate-pulse w-full"></div>
              ) : (
                <select
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full h-14 rounded-2xl px-4 font-bold text-foreground text-base bg-card border border-border/50 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-2"
                  disabled={loading || mainCategories.length === 0}
                >
                  {mainCategories.length > 0 ? (
                    mainCategories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))
                  ) : (
                    <option value="">No hay categorías (Se asignará a Otros)</option>
                  )}
                </select>
              )}
            </div>

            {/* Subcategory Logic */}
            {availableSubcategories.length > 0 ? (
              <div className="space-y-3">
                <Label className="text-foreground font-bold ml-2">Subcategoría (Opcional)</Label>
                <select
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="w-full h-14 rounded-2xl px-4 font-bold text-foreground text-base bg-card border border-border/50 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-2"
                  disabled={loading}
                >
                  <option value="">(Ninguna)</option>
                  {availableSubcategories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-3">
                <Label className="text-foreground font-bold ml-2">Subcategoría / Etiqueta (Opcional)</Label>
                <Input
                  type="text"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="h-14 rounded-2xl text-base bg-card border border-border/50 focus-visible:ring-primary text-foreground font-semibold"
                  placeholder={type === 'expense' ? 'Ej. Supermercado' : 'Ej. Quincena 1'}
                  disabled={loading}
                />
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-foreground font-bold ml-2">Comercio / Entidad (Opcional)</Label>
              <Input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="h-14 rounded-2xl text-base bg-card border border-border/50 focus-visible:ring-primary text-foreground font-semibold"
                placeholder={type === 'expense' ? 'Ej. Walmart' : 'Ej. Empresa SA'}
                disabled={loading}
              />
            </div>

            {/* Link to Physical Debt */}
            {type === 'expense' && financedPhysicalAssets.length > 0 && (
              <div className="space-y-4 p-4 border border-border/50 rounded-[24px] bg-card/50">
                <div className="flex items-center justify-between">
                  <Label className="text-foreground font-bold ml-1 cursor-pointer" onClick={() => setIsPayingPhysicalDebt(!isPayingPhysicalDebt)}>
                    ¿Es un pago de deuda de un activo físico?
                  </Label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isPayingPhysicalDebt}
                    onClick={() => setIsPayingPhysicalDebt(!isPayingPhysicalDebt)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${isPayingPhysicalDebt ? 'bg-primary' : 'bg-muted border border-border/50'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPayingPhysicalDebt ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {isPayingPhysicalDebt && (
                  <div className="space-y-3 pt-2">
                    <Label className="text-muted-foreground font-bold text-sm ml-1">Selecciona el Activo Físico</Label>
                    <select
                      value={linkedAssetDebtId}
                      onChange={(e) => setLinkedAssetDebtId(e.target.value)}
                      className="w-full h-14 rounded-2xl px-4 font-bold text-foreground text-sm bg-muted border border-border/50 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-2"
                      disabled={loading || financedPhysicalAssets.length === 0}
                    >
                      {financedPhysicalAssets.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-foreground font-bold ml-2">Cuenta de Pago (Opcional)</Label>
              {fetchingAssets ? (
                <div className="h-14 rounded-2xl bg-muted animate-pulse w-full"></div>
              ) : (
                <select
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="w-full h-14 rounded-2xl px-4 font-bold text-foreground text-base bg-card border border-border/50 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-2"
                  disabled={loading || assets.length === 0}
                >
                  <option value="">(Ninguno / Efectivo suelto)</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              )}
            </div>

            {assetId && (
              <div className="space-y-3">
                <Label className="text-foreground font-bold ml-2">Tipo de Cargo</Label>
                <div className="flex bg-muted p-1 rounded-2xl border border-border/50">
                  <button
                    type="button"
                    onClick={() => setPaymentType('debit')}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${paymentType === 'debit' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-card/50'}`}
                  >
                    Débito (- Saldo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('credit')}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${paymentType === 'credit' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-card/50'}`}
                  >
                    Crédito (A Días)
                  </button>
                </div>
              </div>
            )}

            <div className="pt-6">
              <Button
                type="submit"
                disabled={loading}
                className={`w-full rounded-full text-white py-8 h-16 font-bold text-xl hover:-translate-y-1 transition-all ${type === 'expense' ? 'bg-destructive hover:bg-destructive/90' : 'bg-emerald-500 hover:bg-emerald-600'}`}
              >
                {loading ? 'Guardando...' : `Guardar ${type === 'expense' ? 'Egreso' : 'Ingreso'}`}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
