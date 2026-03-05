import { supabase } from '../supabase';
import { getAuthUser, getAuthUserOrNull } from '../helpers';
import type { Institution } from '../types';

// ============================================================
// InstitutionRepo — CRUD de instituciones financieras
// ============================================================

export class InstitutionRepo {
    static async getAll(): Promise<Institution[]> {
        const user = await getAuthUserOrNull();
        if (!user) return [];

        const { data, error } = await supabase
            .from('institutions')
            .select('*')
            .eq('user_id', user.id)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching institutions:', error);
            return [];
        }
        return data as Institution[];
    }

    static async create(
        name: string,
        type: 'bank' | 'broker' | 'crypto_exchange' | 'real_estate' | 'other',
        icon: string = 'building',
        color: string = '#888888'
    ): Promise<Institution> {
        const user = await getAuthUser();

        const { data, error } = await supabase
            .from('institutions')
            .insert({ user_id: user.id, name, type, icon, color })
            .select()
            .single();

        if (error) throw error;
        return data as Institution;
    }

    static async update(id: string, updates: Partial<Institution>): Promise<Institution> {
        const user = await getAuthUser();

        const { data, error } = await supabase
            .from('institutions')
            .update(updates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;
        return data as Institution;
    }

    static async delete(id: string): Promise<void> {
        const user = await getAuthUser();

        const { error } = await supabase
            .from('institutions')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;
    }
}
