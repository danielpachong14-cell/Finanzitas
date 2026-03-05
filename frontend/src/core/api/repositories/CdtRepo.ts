import { supabase } from '../supabase';
import { getAuthUser, toNumber } from '../helpers';
import type { CdtDetails } from '../types';

// ============================================================
// CdtRepo — CDTs (Certificados de Depósito a Término)
// ============================================================

export class CdtRepo {
    static async get(assetId: string): Promise<CdtDetails | null> {
        const { data, error } = await supabase
            .from('cdts')
            .select('*')
            .eq('asset_id', assetId)
            .single();

        if (error) {
            console.error('Error fetching cdt details:', error);
            return null;
        }

        return {
            ...data,
            principal_amount: toNumber(data.principal_amount),
            term_months: data.term_months ? toNumber(data.term_months) : null,
            term_days: data.term_days ? toNumber(data.term_days) : null,
        } as CdtDetails;
    }

    static async create(cdtData: Omit<CdtDetails, 'id' | 'user_id' | 'created_at'>): Promise<CdtDetails> {
        const user = await getAuthUser();

        const { data, error } = await supabase
            .from('cdts')
            .insert({ user_id: user.id, ...cdtData })
            .select()
            .single();

        if (error) throw error;
        return data as CdtDetails;
    }

    static async update(asset_id: string, updates: Partial<CdtDetails>): Promise<CdtDetails> {
        const { data: existing } = await supabase
            .from('cdts')
            .select('id')
            .eq('asset_id', asset_id)
            .maybeSingle();

        if (existing) {
            const { data, error } = await supabase
                .from('cdts')
                .update(updates)
                .eq('asset_id', asset_id)
                .select()
                .single();
            if (error) throw error;
            return data as CdtDetails;
        } else {
            const user = await getAuthUser();
            const { data, error } = await supabase
                .from('cdts')
                .insert({ user_id: user.id, asset_id, ...updates })
                .select()
                .single();
            if (error) throw error;
            return data as CdtDetails;
        }
    }
}
