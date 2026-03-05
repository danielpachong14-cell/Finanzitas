// ============================================================
// Helpers compartidos para la capa de datos
// Centralizan autenticación y coerción de tipos numéricos
// ============================================================

import { supabase } from './supabase';

/**
 * Obtiene el usuario autenticado actual.
 * Lanza error si no hay sesión activa.
 */
export async function getAuthUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    return user;
}

/**
 * Obtiene el usuario autenticado o retorna null (sin lanzar error).
 * Útil para lecturas donde la falta de sesión simplemente retorna datos vacíos.
 */
export async function getAuthUserOrNull() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

/**
 * Convierte valores que Supabase puede devolver como string (columnas `numeric`)
 * a un número seguro de JavaScript.
 */
export function toNumber(value: unknown): number {
    if (value === null || value === undefined) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
}

/**
 * Mapea un row de la tabla `transactions` a la interfaz Transaction del frontend.
 * Centraliza la lógica de renombrado de campos (payment_method → paymentMethod).
 */
export function mapTransactionRow(row: any) {
    return {
        id: row.id,
        amount: toNumber(row.amount),
        date: row.date,
        category: row.category,
        subcategory: row.subcategory,
        merchant: row.merchant,
        paymentMethod: row.payment_method,
        asset_id: row.asset_id,
        payment_type: row.payment_type,
        type: row.type,
        description: row.description,
        linked_asset_debt_id: row.linked_asset_debt_id,
    };
}
