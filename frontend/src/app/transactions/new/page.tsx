"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLayout } from "@/components/layout/AppLayout";
import { ApiClient, Category, Asset } from "@/core/api/ApiClient";
import { useUserOptions } from "@/core/context/UserContext";
import { ReceiptUploader, ParsedReceiptData } from "@/components/ui/ReceiptUploader";

export default function NewTransactionPage() {
  const router = useRouter();
  const { currency: defaultCurrency } = useUserOptions();

  const [loading, setLoading] = useState(false);
  const [fetchingCats, setFetchingCats] = useState(true);
  const [type, setType] = useState<'expense' | 'income'>('expense');

  // Basic Info State
  const [amount, setAmount] = useState("");
  const [txCurrency, setTxCurrency] = useState("COP");
  const [categoryName, setCategoryName] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });

  const [description, setDescription] = useState(""); // Nombre de la transacción

  const [allCategories, setAllCategories] = useState<Category[]>([]);

  // Asset/Payment State
  const [fetchingAssets, setFetchingAssets] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetId, setAssetId] = useState("");
  const [paymentType, setPaymentType] = useState<'debit' | 'credit'>('debit');

  // Advanced Mode State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [merchant, setMerchant] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const [financedPhysicalAssets, setFinancedPhysicalAssets] = useState<Asset[]>([]);
  const [isPayingPhysicalDebt, setIsPayingPhysicalDebt] = useState(false);
  const [linkedAssetDebtId, setLinkedAssetDebtId] = useState("");

  useEffect(() => {
    if (defaultCurrency) {
      setTxCurrency(defaultCurrency);
    }
  }, [defaultCurrency]);

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
      if (!mainCategories.find(c => c.name === categoryName)) {
        setCategoryName(mainCategories[0].name);
      }
    } else {
      setCategoryName("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, allCategories]);

  // Reset subcategory when main category changes
  useEffect(() => {
    setSubcategory("");
  }, [categoryName]);

  const handleReceiptUploadSuccess = (url: string, parsedData?: ParsedReceiptData) => {
    setReceiptUrl(url);
    if (!parsedData) return;

    // "Magic" auto-fill based on AI response mock
    if (parsedData.amount) {
      setAmount(parsedData.amount.toString());
    }
    if (parsedData.merchant) {
      setMerchant(parsedData.merchant);
      setDescription(`Compra en ${parsedData.merchant}`);
    }
    if (parsedData.date) {
      setDate(parsedData.date);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    setLoading(true);
    try {
      // Combine Date and Time safely
      let dateString = new Date().toISOString();
      if (date && time) {
        dateString = new Date(`${date}T${time}:00`).toISOString();
      }

      // Concatenate Notes, Currency, and Receipt into description/notes
      let finalDescription = description.trim();
      if (txCurrency !== defaultCurrency) {
        finalDescription = `[${txCurrency}] ${finalDescription}`;
      }

      let finalNotes = notes.trim();
      if (receiptUrl) {
        finalNotes += finalNotes ? `\n\nArchivo Adjunto: ${receiptUrl}` : `Archivo Adjunto: ${receiptUrl}`;
      }

      if (finalNotes) {
        finalDescription += `\n\nNotas: ${finalNotes}`;
      }

      await ApiClient.createTransaction({
        type,
        amount: parseFloat(amount),
        category: categoryName || "Otros", // Fallback if none selected
        subcategory: subcategory || undefined,
        merchant: merchant || undefined,
        asset_id: assetId || undefined,
        payment_type: assetId ? paymentType : undefined,
        linked_asset_debt_id: type === 'expense' && isPayingPhysicalDebt && linkedAssetDebtId ? linkedAssetDebtId : undefined,
        date: dateString,
        description: finalDescription || undefined,
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
      <div className="bg-background flex flex-col h-screen max-h-screen overflow-hidden transition-colors">
        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-3 bg-card rounded-full hover:bg-muted transition-colors border border-border/50"
            disabled={loading}
          >
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <div className="flex bg-card p-1.5 rounded-full border border-border/50">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex items-center px-4 py-2 rounded-full transition-all text-sm ${type === 'expense' ? 'bg-destructive text-destructive-foreground font-bold shadow-sm scale-105' : 'text-muted-foreground font-semibold hover:bg-muted'}`}
              disabled={loading}
            >
              <ArrowUpRight size={16} strokeWidth={2.5} className="mr-1.5" />
              Egreso
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex items-center px-4 py-2 rounded-full transition-all text-sm ${type === 'income' ? 'bg-emerald-500 text-white font-bold shadow-sm scale-105' : 'text-muted-foreground font-semibold hover:bg-muted'}`}
              disabled={loading}
            >
              <ArrowDownLeft size={16} strokeWidth={2.5} className="mr-1.5" />
              Ingreso
            </button>
          </div>
          <div className="w-10"></div>
        </header>

        {/* Form Container */}
        <div className="flex-1 overflow-y-auto px-4 pb-8 custom-scrollbar">
          <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-4 max-w-2xl mx-auto">

            <ReceiptUploader onUploadSuccess={handleReceiptUploadSuccess} />

            {/* AMOUNT AND TITLE GRID */}
            <div className="bg-card rounded-[32px] p-6 border border-border/50 shadow-sm space-y-5">

              <div className="flex flex-col space-y-2">
                <Label className="text-muted-foreground font-bold ml-2 text-xs uppercase tracking-wider">Monto & Divisa</Label>
                <div className="flex items-center space-x-3">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">$</span>
                    <Input
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-10 h-16 rounded-[20px] text-3xl tracking-tight font-bold text-foreground bg-muted/50 border-transparent focus-visible:bg-card focus-visible:border-border/50 focus-visible:ring-primary placeholder:text-muted-foreground/30"
                      placeholder="0.00"
                      step="0.01"
                      disabled={loading}
                    />
                  </div>
                  <select
                    value={txCurrency}
                    onChange={(e) => setTxCurrency(e.target.value)}
                    className="h-16 rounded-[20px] px-4 font-bold text-foreground text-lg bg-muted/50 border-transparent focus-visible:bg-card focus-visible:border-border/50 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-2 w-28 appearance-none text-center"
                    disabled={loading}
                  >
                    <option value="COP">COP</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="MXN">MXN</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <Label className="text-muted-foreground font-bold ml-2 text-xs uppercase tracking-wider">Nombre / Descripción</Label>
                <Input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-14 rounded-2xl text-lg font-bold bg-muted/50 border-transparent focus-visible:bg-card text-foreground placeholder:text-muted-foreground/40 placeholder:font-medium focus-visible:border-border/50"
                  placeholder={type === 'expense' ? 'Ej. Compra en Supermercado' : 'Ej. Salario Mensual'}
                  disabled={loading}
                />
              </div>

            </div>

            {/* CATEGORIES & DATES GRID */}
            <div className="bg-card rounded-[32px] p-6 border border-border/50 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-muted-foreground font-bold ml-2 text-xs uppercase tracking-wider">Categoría Principal *</Label>
                {fetchingCats ? (
                  <div className="h-12 rounded-2xl bg-muted animate-pulse w-full"></div>
                ) : (
                  <select
                    required
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full h-12 rounded-2xl px-4 font-bold text-foreground text-sm bg-muted/50 border-transparent focus-visible:bg-card focus-visible:border-border/50 focus-visible:outline-none focus-visible:ring-2 appearance-none"
                    disabled={loading || mainCategories.length === 0}
                  >
                    {mainCategories.length > 0 ? (
                      mainCategories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))
                    ) : (
                      <option value="">No hay categorías</option>
                    )}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground font-bold ml-2 text-xs uppercase tracking-wider">Subcategoría</Label>
                {availableSubcategories.length > 0 ? (
                  <select
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="w-full h-12 rounded-2xl px-4 font-bold text-foreground text-sm bg-muted/50 border-transparent focus-visible:bg-card focus-visible:border-border/50 focus-visible:outline-none focus-visible:ring-2 appearance-none"
                    disabled={loading}
                  >
                    <option value="">(Ninguna)</option>
                    {availableSubcategories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type="text"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="h-12 rounded-2xl text-sm font-bold bg-muted/50 border-transparent focus-visible:bg-card focus-visible:border-border/50 text-foreground"
                    placeholder="Etiqueta opcional"
                    disabled={loading}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground font-bold ml-2 text-xs uppercase tracking-wider">Fecha</Label>
                <Input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-12 rounded-2xl text-sm font-bold bg-muted/50 border-transparent focus-visible:bg-card focus-visible:border-border/50 text-foreground appearance-none"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground font-bold ml-2 text-xs uppercase tracking-wider">Hora</Label>
                <Input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-12 rounded-2xl text-sm font-bold bg-muted/50 border-transparent focus-visible:bg-card focus-visible:border-border/50 text-foreground appearance-none"
                  disabled={loading}
                />
              </div>
            </div>

            {/* FUNDING SOURCE */}
            <div className="bg-card rounded-[32px] p-6 border border-border/50 shadow-sm space-y-5">
              <div className="space-y-2">
                <Label className="text-muted-foreground font-bold ml-2 text-xs uppercase tracking-wider">
                  {type === 'expense' ? 'Cuenta de Origen' : 'Cuenta de Destino'}
                </Label>
                {fetchingAssets ? (
                  <div className="h-14 rounded-2xl bg-muted animate-pulse w-full"></div>
                ) : (
                  <select
                    value={assetId}
                    onChange={(e) => setAssetId(e.target.value)}
                    className="w-full h-14 rounded-2xl px-4 font-bold text-foreground text-base bg-muted/50 border-transparent focus-visible:bg-card focus-visible:border-border/50 focus-visible:outline-none focus-visible:ring-2 appearance-none"
                    disabled={loading || assets.length === 0}
                  >
                    <option value="">Efecivo / No Vinculado</option>
                    {assets.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {assetId && type === 'expense' && (
                <div className="pt-2">
                  <Label className="text-muted-foreground font-bold ml-2 text-xs uppercase tracking-wider mb-2 block">Método de Pago</Label>
                  <div className="flex bg-muted/50 p-1.5 rounded-2xl border border-transparent">
                    <button
                      type="button"
                      onClick={() => setPaymentType('debit')}
                      className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${paymentType === 'debit' ? 'bg-card text-foreground shadow-sm border border-border/50' : 'text-muted-foreground hover:bg-card/30'}`}
                    >
                      Contado (Débito)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentType('credit')}
                      className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${paymentType === 'credit' ? 'bg-card text-foreground shadow-sm border border-border/50' : 'text-muted-foreground hover:bg-card/30'}`}
                    >
                      A Crédito
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ADVANCED TOGGLE */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-center w-full py-4 text-muted-foreground hover:text-foreground transition-colors font-bold text-sm"
            >
              {showAdvanced ? (
                <><ChevronUp size={16} className="mr-2" /> Ocultar Opciones Avanzadas</>
              ) : (
                <><ChevronDown size={16} className="mr-2" /> Mostrar Opciones Avanzadas</>
              )}
            </button>

            {/* ADVANCED SECTION */}
            {showAdvanced && (
              <div className="bg-card rounded-[32px] p-6 border border-border/50 shadow-sm space-y-5 animate-in slide-in-from-top-2 fade-in duration-200">

                <div className="space-y-2">
                  <Label className="text-muted-foreground font-bold ml-2 text-xs uppercase tracking-wider">Comercio / Entidad</Label>
                  <Input
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className="h-12 rounded-2xl text-sm font-medium bg-muted/50 border-transparent focus-visible:bg-card focus-visible:border-border/50 text-foreground"
                    placeholder={type === 'expense' ? 'Ej. Amazon' : 'Ej. Empresa S.A.'}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground font-bold ml-2 text-xs uppercase tracking-wider">Notas Adicionales</Label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-4 rounded-2xl text-sm font-medium bg-muted/50 border-transparent focus-visible:bg-card focus-visible:border-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-foreground resize-none h-24 custom-scrollbar"
                    placeholder="Escribe detalles adicionales aquí..."
                    disabled={loading}
                  />
                </div>

                {type === 'expense' && financedPhysicalAssets.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-border/20">
                    <div className="flex items-center justify-between">
                      <Label className="text-foreground font-bold ml-1 cursor-pointer" onClick={() => setIsPayingPhysicalDebt(!isPayingPhysicalDebt)}>
                        ¿Pago de deuda de activo físico?
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
                      <div className="space-y-2 pt-2 animate-in fade-in">
                        <Label className="text-muted-foreground font-bold text-xs ml-1 uppercase tracking-wider">Activo Físico</Label>
                        <select
                          value={linkedAssetDebtId}
                          onChange={(e) => setLinkedAssetDebtId(e.target.value)}
                          className="w-full h-12 rounded-2xl px-4 font-bold text-foreground text-sm bg-muted/50 border-transparent focus-visible:bg-card focus-visible:border-border/50 focus-visible:outline-none focus-visible:ring-2 appearance-none"
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
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <div className="pt-4 mt-auto">
              <Button
                type="submit"
                disabled={loading || !amount || !description}
                className={`w-full rounded-full text-white py-8 h-16 font-bold text-lg hover:-translate-y-1 transition-all shadow-lg ${type === 'expense' ? 'bg-destructive hover:bg-destructive/90 shadow-destructive/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'}`}
              >
                {loading ? 'Guardando...' : `Registrar ${type === 'expense' ? 'Egreso' : 'Ingreso'}`}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
