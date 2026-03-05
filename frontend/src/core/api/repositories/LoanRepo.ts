import { supabase } from '../supabase';
import { getAuthUser, toNumber } from '../helpers';
import type { LoanOptions, LoanPayment } from '../types';

// ============================================================
// LoanRepo — Préstamos y pagos de préstamos
// ============================================================

export class LoanRepo {
    static async getData(assetId: string): Promise<LoanOptions | null> {
        const { data, error } = await supabase
            .from('loans')
            .select('*')
            .eq('asset_id', assetId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // No rows found
            console.error('Error fetching loan data:', error);
            return null;
        }

        return {
            ...data,
            principal_amount: toNumber(data.principal_amount),
            term_months: toNumber(data.term_months),
            interest_rate_annual: toNumber(data.interest_rate_annual),
            grace_period_months: toNumber(data.grace_period_months),
        } as LoanOptions;
    }

    static async create(loanData: Omit<LoanOptions, 'id' | 'user_id' | 'created_at'>): Promise<LoanOptions> {
        const user = await getAuthUser();

        const { data, error } = await supabase
            .from('loans')
            .insert({ user_id: user.id, ...loanData })
            .select()
            .single();

        if (error) throw error;
        return data as LoanOptions;
    }

    static async update(asset_id: string, updates: Partial<LoanOptions>): Promise<LoanOptions> {
        const { data: existing } = await supabase
            .from('loans')
            .select('id')
            .eq('asset_id', asset_id)
            .maybeSingle();

        if (existing) {
            const { data, error } = await supabase
                .from('loans')
                .update(updates)
                .eq('asset_id', asset_id)
                .select()
                .single();
            if (error) throw error;
            return data as LoanOptions;
        } else {
            const user = await getAuthUser();
            const { data, error } = await supabase
                .from('loans')
                .insert({ user_id: user.id, asset_id, ...updates })
                .select()
                .single();
            if (error) throw error;
            return data as LoanOptions;
        }
    }

    static async getPayments(assetId: string): Promise<LoanPayment[]> {
        const { data, error } = await supabase
            .from('loan_payments')
            .select('*')
            .eq('asset_id', assetId)
            .order('date', { ascending: true });

        if (error) {
            console.error('Error fetching loan payments:', error);
            return [];
        }

        return (data || []).map(p => ({
            ...p,
            payment_amount: toNumber(p.payment_amount),
            principal_amount: toNumber(p.principal_amount),
            interest_amount: toNumber(p.interest_amount),
            extra_principal_amount: toNumber(p.extra_principal_amount),
        })) as LoanPayment[];
    }

    static async registerPayment(paymentData: Omit<LoanPayment, 'id' | 'user_id' | 'created_at'>): Promise<LoanPayment> {
        const user = await getAuthUser();

        const { data, error } = await supabase
            .from('loan_payments')
            .insert({ user_id: user.id, ...paymentData })
            .select()
            .single();

        if (error) throw error;

        try {
            const { AssetRepo } = await import('./AssetRepo');
            const { TransactionRepo } = await import('./TransactionRepo');

            const principalAndExtra = toNumber(paymentData.principal_amount) + toNumber(paymentData.extra_principal_amount);

            const { data: assetData } = await supabase.from('assets').select('current_value').eq('id', paymentData.asset_id).single();
            if (assetData) {
                const newCurrentValue = toNumber(assetData.current_value) - principalAndExtra;
                await AssetRepo.update(paymentData.asset_id, { current_value: Math.max(0, newCurrentValue) });
            }

            await TransactionRepo.createTransaction({
                amount: toNumber(paymentData.payment_amount),
                type: 'income',
                category: 'Otros',
                asset_id: paymentData.asset_id,
                payment_type: 'debit',
                date: paymentData.date,
                description: `Pago o Abono de Préstamo (Capital: ${principalAndExtra}, Interés: ${paymentData.interest_amount})`
            });
        } catch (err) {
            console.error("Error applying loan payment to system balances:", err);
        }

        return data as LoanPayment;
    }
}
