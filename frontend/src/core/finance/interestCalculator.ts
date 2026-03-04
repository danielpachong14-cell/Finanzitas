/**
 * interestCalculator.ts
 * 
 * Módulo centralizado de cálculos financieros para el sistema financiero colombiano.
 * 
 * Convenciones:
 * - Las tasas se reciben como porcentaje (ej: 10 = 10% EA).
 * - Las conversiones de EA a tasas periódicas usan la fórmula estándar de equivalencia:
 *     Tasa periódica = (1 + EA)^(1/N) - 1
 *     donde N = número de períodos por año (365 para diaria, 12 para mensual).
 * - La Retención en la Fuente (Retefuente) se aplica según el Estatuto Tributario colombiano:
 *     - 4% sobre rendimientos financieros (CDTs, cuentas de ahorro).
 *     - Se aplica sobre el rendimiento bruto, no sobre el capital.
 *     - Para simplificación, se aplica proporcionalmente al rendimiento calculado.
 *       (En la práctica, los bancos retienen mensualmente si supera el umbral de UVT).
 * 
 * Referencia UVT 2025: $49,799 COP
 * Umbral Retefuente rendimientos financieros: Rendimientos diarios que acumulados
 * mensualmente superen 4 UVT (~$199,196 COP/mes). Para efectos prácticos en la app,
 * siempre se aplica la retención ya que los montos típicos de CDT/ahorro la superan.
 */

// --- Constantes Fiscales Colombia ---

/** Valor UVT vigente 2025 */
const UVT_VALOR = 49_799;

/** Umbral mensual para retención en la fuente sobre rendimientos financieros (4 UVT) */
const RETEFUENTE_UMBRAL_MENSUAL = 4 * UVT_VALOR; // ~$199,196 COP

/** Tasa de retención en la fuente para rendimientos financieros */
const RETEFUENTE_TASA = 0.04; // 4%


// --- Conversiones de Tasas ---

/**
 * Convierte una Tasa Efectiva Anual (EA) a su equivalente diaria.
 * Fórmula: dailyRate = (1 + EA)^(1/365) - 1
 * 
 * @param eaPercent - Tasa EA en porcentaje (ej: 10 para 10%)
 * @returns Tasa diaria como decimal (ej: 0.000261 para 10% EA)
 */
export function eaToDailyRate(eaPercent: number): number {
    const eaDecimal = eaPercent / 100;
    return Math.pow(1 + eaDecimal, 1 / 365) - 1;
}

/**
 * Convierte una Tasa Efectiva Anual (EA) a su equivalente mensual.
 * Fórmula: monthlyRate = (1 + EA)^(1/12) - 1
 * 
 * @param eaPercent - Tasa EA en porcentaje
 * @returns Tasa mensual como decimal
 */
export function eaToMonthlyRate(eaPercent: number): number {
    const eaDecimal = eaPercent / 100;
    return Math.pow(1 + eaDecimal, 1 / 12) - 1;
}


/**
 * Calcula los rendimientos brutos por INTERÉS SIMPLE.
 * Usado para CDTs en el sistema financiero colombiano.
 * 
 * Fórmula: Rendimiento = P × EA × (días / 365)
 * 
 * Los CDTs colombianos usan interés simple sobre la tasa EA
 * para calcular rendimientos al vencimiento.
 * 
 * @param principal - Capital inicial
 * @param eaPercent - Tasa Efectiva Anual en porcentaje
 * @param days - Número de días
 * @returns Rendimiento bruto (sin retención)
 */
export function calculateSimpleYield(principal: number, eaPercent: number, days: number): number {
    if (principal <= 0 || eaPercent <= 0 || days <= 0) return 0;
    return principal * (eaPercent / 100) * (days / 365);
}

/**
 * Calcula los rendimientos brutos por INTERÉS COMPUESTO diario.
 * Usado para cuentas de ahorro con capitalización diaria.
 * 
 * Fórmula: FV = P × (1 + dailyRate)^n
 * Rendimiento = FV - P
 * 
 * @param principal - Capital inicial
 * @param eaPercent - Tasa Efectiva Anual en porcentaje
 * @param days - Número de días
 * @returns Rendimiento bruto (sin retención)
 */
export function calculateCompoundYield(principal: number, eaPercent: number, days: number): number {
    if (principal <= 0 || eaPercent <= 0 || days <= 0) return 0;
    const dailyRate = eaToDailyRate(eaPercent);
    const futureValue = principal * Math.pow(1 + dailyRate, days);
    return futureValue - principal;
}

/**
 * Calcula la retención en la fuente sobre rendimientos financieros.
 * Según la ley colombiana, se retiene el 4% sobre rendimientos
 * que superen el umbral de 4 UVT mensuales.
 * 
 * Para CDTs y cuentas de ahorro con montos significativos,
 * prácticamente siempre aplica la retención. En la interfaz se
 * muestra tanto el rendimiento bruto como el neto.
 * 
 * @param grossYield - Rendimiento bruto total
 * @param days - Número de días del período (para calcular umbral proporcional)
 * @returns Monto de retención en la fuente
 */
export function calculateRetefuente(grossYield: number, days: number): number {
    if (grossYield <= 0 || days <= 0) return 0;

    // Calculamos el umbral proporcional al período:
    // Si el período es 30 días, usamos el umbral mensual completo.
    // Si es más o menos, ajustamos proporcionalmente.
    const monthsProportion = days / 30;
    const umbralProporcional = RETEFUENTE_UMBRAL_MENSUAL * monthsProportion;

    // Solo se retiene sobre el exceso del umbral
    const baseGravable = Math.max(0, grossYield - umbralProporcional);
    return baseGravable * RETEFUENTE_TASA;
}

/**
 * Calcula rendimientos netos después de Retefuente.
 * 
 * @param principal - Capital
 * @param eaPercent - Tasa EA %
 * @param days - Días del período
 * @param mode - 'simple' para CDTs, 'compound' para cuentas de ahorro
 * @returns Objeto con rendimiento bruto, retención y rendimiento neto
 */
export function calculateNetYield(
    principal: number,
    eaPercent: number,
    days: number,
    mode: 'simple' | 'compound' = 'simple'
): {
    grossYield: number;
    retefuente: number;
    netYield: number;
    futureValueGross: number;
    futureValueNet: number;
} {
    const grossYield = mode === 'simple'
        ? calculateSimpleYield(principal, eaPercent, days)
        : calculateCompoundYield(principal, eaPercent, days);
    const retefuente = calculateRetefuente(grossYield, days);
    const netYield = grossYield - retefuente;
    return {
        grossYield,
        retefuente,
        netYield,
        futureValueGross: principal + grossYield,
        futureValueNet: principal + netYield,
    };
}


// --- Cálculos de Amortización (Préstamos) ---

/**
 * Calcula la cuota fija mensual bajo el sistema francés.
 * PMT = P * r / (1 - (1+r)^(-n))
 * 
 * @param principal - Monto del préstamo
 * @param eaPercent - Tasa EA %
 * @param termMonths - Plazo en meses (solo período de amortización, sin gracia)
 * @returns Cuota fija mensual
 */
export function calculateFrenchPayment(principal: number, eaPercent: number, termMonths: number): number {
    const monthlyRate = eaToMonthlyRate(eaPercent);
    if (monthlyRate === 0) return principal / termMonths;
    return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));
}

/**
 * Convierte un plazo en meses a días (usando 30.4167 días/mes promedio).
 */
export function monthsToDays(months: number): number {
    return Math.round(months * 30.4167);
}

// --- Exportar constantes útiles ---
export const COLOMBIAN_TAX = {
    UVT_VALOR,
    RETEFUENTE_UMBRAL_MENSUAL,
    RETEFUENTE_TASA,
    RETEFUENTE_TASA_PERCENT: RETEFUENTE_TASA * 100,
};
