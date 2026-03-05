import { useMemo } from 'react';
import { eaToMonthlyRate } from '@/core/finance/interestCalculator';
import type { LoanOptions, LoanPayment } from '@/core/api';

// ============================================================
// useLoanAmortization — Calcula tabla de amortización y métricas del préstamo
// Extraído de LoanAssetDashboard ~110 LOC de lógica financiera pura
// ============================================================

export interface AmortizationRow {
    month: number;
    installment: number;
    principal: number;
    interest: number;
    balance: number;
}

export interface LoanAmortizationResult {
    schedule: AmortizationRow[];
    currentPrincipal: number;
    totalPaidValue: number;
    totalInterestPaid: number;
    nextExpected: AmortizationRow | null;
}

const DEFAULT_RESULT: LoanAmortizationResult = {
    schedule: [],
    currentPrincipal: 0,
    totalPaidValue: 0,
    totalInterestPaid: 0,
    nextExpected: null,
};

export function useLoanAmortization(
    loanData: LoanOptions | null,
    payments: LoanPayment[]
): LoanAmortizationResult {
    return useMemo(() => {
        if (!loanData) return DEFAULT_RESULT;
        return generateAmortizationSchedule(loanData, payments);
    }, [loanData, payments]);
}

/**
 * Genera la tabla de amortización futura y calcula métricas
 * acumuladas a partir de los pagos registrados.
 */
function generateAmortizationSchedule(
    loanData: LoanOptions,
    payments: LoanPayment[]
): LoanAmortizationResult {
    const schedule: AmortizationRow[] = [];
    let currentPrincipal = Number(loanData.principal_amount);

    let monthlyRate = 0;
    if (Number(loanData.interest_rate_annual) > 0) {
        monthlyRate = eaToMonthlyRate(Number(loanData.interest_rate_annual));
    }

    const totalTerm = loanData.term_months;
    const graceTotal = loanData.grace_period_months;
    const amortizingTermOriginal = Math.max(1, totalTerm - graceTotal);

    // Cuota fija original (sistema francés)
    let originalPmt = 0;
    if (monthlyRate > 0) {
        originalPmt = (Number(loanData.principal_amount) * monthlyRate)
            / (1 - Math.pow(1 + monthlyRate, -amortizingTermOriginal));
    } else {
        originalPmt = Number(loanData.principal_amount) / amortizingTermOriginal;
    }

    // Capital fijo por cuota (sistema alemán)
    let originalFixedPrincipal = Number(loanData.principal_amount) / amortizingTermOriginal;

    let totalPaidValue = 0;
    let totalInterestPaid = 0;
    let monthsElapsed = 0;
    let graceElapsed = 0;
    let currentPmt = originalPmt;
    let currentFixedPrincipal = originalFixedPrincipal;

    // Procesar pagos registrados
    for (const p of payments) {
        monthsElapsed++;
        if (graceElapsed < graceTotal) {
            graceElapsed++;
        }

        currentPrincipal -= (Number(p.principal_amount) + (Number(p.extra_principal_amount) || 0));
        totalPaidValue += Number(p.payment_amount);
        totalInterestPaid += Number(p.interest_amount);

        // Recalcular cuota si el usuario eligió reducir cuota
        if (Number(p.extra_principal_amount) > 0 && p.extra_action === 'reduce_installment') {
            const remainingAmortizing = amortizingTermOriginal - Math.max(0, monthsElapsed - graceTotal);
            if (remainingAmortizing > 0 && currentPrincipal > 0) {
                if (monthlyRate > 0) {
                    currentPmt = (currentPrincipal * monthlyRate)
                        / (1 - Math.pow(1 + monthlyRate, -remainingAmortizing));
                } else {
                    currentPmt = currentPrincipal / remainingAmortizing;
                }
                currentFixedPrincipal = currentPrincipal / remainingAmortizing;
            }
        }
    }

    const snapshotPrincipalPostPayments = Math.max(0, currentPrincipal);

    // Generar tabla de amortización futura
    let month = monthsElapsed + 1;
    let graceRemaining = graceTotal - graceElapsed;
    let iterPrincipal = snapshotPrincipalPostPayments;

    while (iterPrincipal > 0.01) {
        const interest = iterPrincipal * monthlyRate;
        let principal = 0;
        let installment = 0;

        if (graceRemaining > 0) {
            installment = interest;
            principal = 0;
            graceRemaining--;
        } else {
            if (loanData.amortization_type === 'french') {
                installment = currentPmt;
                principal = installment - interest;
            } else {
                principal = currentFixedPrincipal;
                installment = principal + interest;
            }

            // Corrección último mes
            if (principal > iterPrincipal) {
                principal = iterPrincipal;
                installment = principal + interest;
            }
        }

        iterPrincipal -= principal;

        schedule.push({
            month,
            installment,
            principal,
            interest,
            balance: Math.max(0, iterPrincipal),
        });

        month++;
        if (month > 480) break; // Límite de seguridad (40 años)
    }

    return {
        schedule,
        currentPrincipal: snapshotPrincipalPostPayments,
        totalPaidValue,
        totalInterestPaid,
        nextExpected: schedule.length > 0 ? schedule[0] : null,
    };
}
