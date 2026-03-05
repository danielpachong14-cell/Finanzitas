import { useMemo } from 'react';
import { calculateNetYield, monthsToDays } from '@/core/finance/interestCalculator';
import type { Asset, CdtDetails } from '@/core/api';

// ============================================================
// useCdtYield — Calcula métricas de un CDT (rendimiento, progreso, fecha vencimiento)
// Reemplaza lógica duplicada entre CDTAssetDashboard y CDTAssetPreviewCard
// ============================================================

export interface CdtYieldMetrics {
    daysPassed: number;
    totalDays: number;
    progressPct: number;
    maturityDateStr: string;
    daysRemaining: number;
    isMatured: boolean;
    currentGrossYield: number;
    currentRetefuente: number;
    currentNetYield: number;
    projectedGrossYield: number;
    projectedRetefuente: number;
    projectedNetYield: number;
}

const DEFAULT_METRICS: CdtYieldMetrics = {
    daysPassed: 0, totalDays: 0, progressPct: 0,
    maturityDateStr: '', daysRemaining: 0, isMatured: false,
    currentGrossYield: 0, currentRetefuente: 0, currentNetYield: 0,
    projectedGrossYield: 0, projectedRetefuente: 0, projectedNetYield: 0,
};

export function useCdtYield(asset: Asset): CdtYieldMetrics {
    const cdtDetails = asset.cdt_details;
    const principal = Number(cdtDetails?.principal_amount || asset.current_value || 0);
    const openingDateStr = asset.opening_date || new Date().toISOString().split('T')[0];
    const rateEA = asset.interest_rate_nominal || 0;

    return useMemo(() => {
        if (!cdtDetails) return DEFAULT_METRICS;

        const openingDate = new Date(`${openingDateStr}T00:00:00`);
        const today = new Date();
        const diffTime = today.getTime() - openingDate.getTime();
        const daysPassed = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

        let totalDays = 0;
        if (cdtDetails.term_days) {
            totalDays = cdtDetails.term_days;
        } else if (cdtDetails.term_months) {
            totalDays = monthsToDays(cdtDetails.term_months);
        }

        const progressPct = totalDays > 0 ? Math.min(100, (daysPassed / totalDays) * 100) : 0;

        // Rendimientos actuales (a hoy)
        const currentCalc = calculateNetYield(principal, rateEA, daysPassed);

        // Rendimientos proyectados (al vencimiento)
        const projectedCalc = calculateNetYield(principal, rateEA, totalDays);

        // Fecha de vencimiento
        const mDate = new Date(openingDate.getTime() + totalDays * 24 * 60 * 60 * 1000);
        const maturityDateStr = mDate.toISOString().split('T')[0];

        const daysRemaining = Math.max(0, totalDays - daysPassed);

        return {
            daysPassed,
            totalDays,
            progressPct,
            maturityDateStr,
            daysRemaining,
            isMatured: daysPassed >= totalDays,
            currentGrossYield: currentCalc.grossYield,
            currentRetefuente: currentCalc.retefuente,
            currentNetYield: currentCalc.netYield,
            projectedGrossYield: projectedCalc.grossYield,
            projectedRetefuente: projectedCalc.retefuente,
            projectedNetYield: projectedCalc.netYield,
        };
    }, [cdtDetails, openingDateStr, rateEA, principal]);
}
