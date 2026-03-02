"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useUserOptions } from "@/core/context/UserContext";

export default function CardsPage() {
  const { currency } = useUserOptions();
  return (
    <AppLayout>
      <div className="p-6">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cuentas</h1>
            <p className="text-muted-foreground">Activos y Pasivos</p>
          </div>
          <button className="p-2 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors">
            <Plus size={24} />
          </button>
        </header>

        <div className="space-y-4">
          <Card className="rounded-[24px] border-none bg-primary text-primary-foreground overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-8">
                <CreditCard size={32} className="text-primary-foreground/80" />
                <span className="text-sm font-medium tracking-widest text-primary-foreground/70">Main Account</span>
              </div>
              <div>
                <p className="text-sm text-white/70 mb-1">Saldo Disponible</p>
                <p className="text-3xl font-bold tracking-tight">{formatCurrency(3330, currency)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
