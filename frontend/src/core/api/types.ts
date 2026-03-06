// ============================================================
// Tipos centralizados de la capa de datos
// Extraídos de ApiClient.ts para modularización
// ============================================================

export interface Category {
    id: string;
    user_id?: string;
    name: string;
    type: 'income' | 'expense';
    color: string;
    icon: string;
    icon_color: string;
    monthly_limit: number;
    parent_id?: string | null;
}

export interface UserSettings {
    user_id: string;
    main_currency: string;
    theme: string;
}

export interface Transaction {
    id: string;
    amount: number;
    date: string;
    category: string;
    subcategory?: string;
    merchant?: string;
    paymentMethod?: string;
    asset_id?: string;
    payment_type?: 'debit' | 'credit';
    type: 'income' | 'expense';
    description?: string;
    linked_asset_debt_id?: string;
}

export interface Balance {
    total: number;
    income: number;
    expense: number;
}

export interface Institution {
    id: string;
    user_id?: string;
    name: string;
    type: 'bank' | 'broker' | 'crypto_exchange' | 'real_estate' | 'other';
    icon: string;
    color: string;
}

export interface Asset {
    id: string;
    user_id?: string;
    institution_id?: string | null;
    name: string;
    type: 'financial' | 'digital' | 'physical';
    physical_type?: 'real_estate' | 'vehicle' | 'business' | 'tech' | 'jewelry' | 'other' | null;
    digital_type?: 'investment' | 'loan' | 'cdt' | null;
    liquidity_layer: 'L1_immediate' | 'L2_medium' | 'L3_low';
    currency: string;
    current_value: number;
    interest_rate_nominal: number;
    opening_date?: string;
    is_manual: boolean;
    is_payment_account?: boolean;
    has_credit?: boolean;
    credit_amount?: number;
    credit_paid?: number;
    created_at?: string;
    updated_at?: string;
    loan_options?: LoanOptions;
    cdt_details?: CdtDetails;
    ticker_symbol?: string | null;
}

export interface AssetTransaction {
    id: string;
    asset_id: string;
    user_id: string;
    type: 'buy' | 'sell';
    quantity: number;
    price_per_share: number;
    currency: string;
    date: string;
    created_at?: string;
}

export interface AssetSnapshot {
    id: string;
    asset_id: string;
    value: number;
    recorded_at: string;
}

export interface AssetMovement {
    id: string;
    asset_id: string;
    user_id?: string;
    type: 'deposit' | 'withdrawal' | 'adjustment';
    amount: number;
    date: string;
    description?: string;
    created_at?: string;
}

export interface LoanOptions {
    id?: string;
    asset_id: string;
    user_id?: string;
    debtor: string;
    principal_amount: number;
    term_months: number;
    interest_rate_annual: number;
    grace_period_months: number;
    amortization_type: 'french' | 'german' | 'none';
    created_at?: string;
}

export interface LoanPayment {
    id?: string;
    asset_id: string;
    user_id?: string;
    date: string;
    payment_amount: number;
    principal_amount: number;
    interest_amount: number;
    extra_principal_amount: number;
    extra_action?: 'reduce_term' | 'reduce_installment' | 'advance';
    created_at?: string;
}

export interface CdtDetails {
    id?: string;
    asset_id: string;
    user_id?: string;
    principal_amount: number;
    term_months: number | null;
    term_days: number | null;
    created_at?: string;
}
