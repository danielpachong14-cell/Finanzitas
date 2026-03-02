"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { PieChart, TrendingUp } from "lucide-react";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Lazy loaded mock component structure for when charts are fully implemented
const LazyChartContainer = dynamic(
  () => Promise.resolve(({ children }: { children: React.ReactNode }) => <div className="w-full flex flex-col items-center justify-center">{children}</div>),
  { ssr: false, loading: () => <div className="h-48 w-full animate-pulse bg-muted rounded-xl flex items-center justify-center text-sm font-bold text-muted-foreground mt-4">Cargando gráficos...</div> }
);

export default function StatisticsPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Estadísticas</h1>
          <p className="text-muted-foreground">Analítica de tus hábitos financieros</p>
        </header>

        <div className="grid gap-6">
          <Card className="rounded-[24px] border-none min-h-64 flex flex-col items-center justify-center bg-white p-6">
            {/* Gráfico Mock o Placeholder con lazy loading preparado */}
            <Suspense fallback={<div className="h-48 w-full animate-pulse bg-muted rounded-xl"></div>}>
              <LazyChartContainer>
                <PieChart size={48} className="text-gray-300 mb-4" />
                <p className="font-medium text-muted-foreground">Distribución de Gastos</p>
                <p className="text-sm text-gray-400 mt-2">Los gráficos se implementarán pronto</p>
              </LazyChartContainer>
            </Suspense>
          </Card>

          <Card className="rounded-[24px] border-none flex items-center p-6 bg-white space-x-4">
            <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center text-destructive">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Mayor Gasto</p>
              <p className="font-bold text-foreground text-lg">Vivienda (45%)</p>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
