import { supabase } from '../supabase';
import { getAuthUser, getAuthUserOrNull, toNumber } from '../helpers';
import type { Asset, AssetSnapshot, AssetMovement } from '../types';

// ============================================================
// AssetRepo — Activos, snapshots y movimientos
// ============================================================

export class AssetRepo {
    static async getAll(): Promise<Asset[]> {
        const user = await getAuthUserOrNull();
        if (!user) return [];

        const { data, error } = await supabase
            .from('assets')
            .select(`*, cdt_details:cdts(*), loan_options:loans(*)`)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching assets:', error);
            return [];
        }

        return data.map((item: any) => ({
            ...item,
            current_value: toNumber(item.current_value),
            interest_rate_nominal: toNumber(item.interest_rate_nominal),
            credit_amount: item.credit_amount ? toNumber(item.credit_amount) : undefined,
            credit_paid: item.credit_paid ? toNumber(item.credit_paid) : undefined,
            loan_options: item.loan_options
                ? (Array.isArray(item.loan_options) ? item.loan_options[0] : item.loan_options)
                : undefined,
            cdt_details: item.cdt_details
                ? (Array.isArray(item.cdt_details) ? item.cdt_details[0] : item.cdt_details)
                : undefined
        })) as Asset[];
    }

    static async create(assetData: Omit<Asset, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Asset> {
        const user = await getAuthUser();

        const { data, error } = await supabase
            .from('assets')
            .insert({ user_id: user.id, ...assetData })
            .select()
            .single();

        if (error) throw error;

        // Record initial snapshot
        await supabase.from('asset_snapshots').insert({
            asset_id: data.id,
            value: data.current_value
        });

        // Initialize with a deposit if it's a financial asset with an opening date
        if (data.type === 'financial' && data.opening_date) {
            await this.createMovement(
                data.id, 'deposit', data.current_value, data.opening_date, 'Fondeo Inicial'
            );
        }

        return data as Asset;
    }

    static async update(id: string, updates: Partial<Asset>): Promise<Asset> {
        await getAuthUser();

        const { data, error } = await supabase
            .from('assets')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        if (updates.current_value !== undefined) {
            await supabase.from('asset_snapshots').insert({
                asset_id: data.id,
                value: data.current_value
            });
        }

        return data as Asset;
    }

    static async delete(id: string): Promise<void> {
        await supabase.from('asset_snapshots').delete().eq('asset_id', id);
        await supabase.from('asset_movements').delete().eq('asset_id', id);

        const { error } = await supabase.from('assets').delete().eq('id', id);
        if (error) throw error;
    }

    // --- Snapshots ---

    static async getSnapshots(assetId: string): Promise<AssetSnapshot[]> {
        const { data, error } = await supabase
            .from('asset_snapshots')
            .select('*')
            .eq('asset_id', assetId)
            .order('recorded_at', { ascending: true });

        if (error) {
            console.error('Error fetching snapshots:', error);
            return [];
        }
        return data as AssetSnapshot[];
    }

    // --- Movements ---

    static async getMovements(assetId: string): Promise<AssetMovement[]> {
        const { data, error } = await supabase
            .from('asset_movements')
            .select('*')
            .eq('asset_id', assetId)
            .order('date', { ascending: true });

        if (error) {
            console.error('Error fetching asset movements:', error);
            return [];
        }
        return data as AssetMovement[];
    }

    static async createMovement(
        assetId: string,
        type: 'deposit' | 'withdrawal' | 'adjustment',
        amount: number,
        date: string,
        description?: string
    ): Promise<AssetMovement> {
        const user = await getAuthUser();

        const { data, error } = await supabase
            .from('asset_movements')
            .insert({ user_id: user.id, asset_id: assetId, type, amount, date, description })
            .select()
            .single();

        if (error) throw error;
        return data as AssetMovement;
    }

    static async deleteMovement(id: string): Promise<void> {
        const { error } = await supabase
            .from('asset_movements')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
}
