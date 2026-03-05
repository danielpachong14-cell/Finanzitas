import { supabase } from '../supabase';
import { getAuthUser, getAuthUserOrNull } from '../helpers';
import type { Category } from '../types';

// ============================================================
// CategoryRepo — CRUD de categorías
// ============================================================

export class CategoryRepo {
    static async getAll(): Promise<Category[]> {
        const user = await getAuthUserOrNull();
        if (!user) return [];

        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('user_id', user.id)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
        return data as Category[];
    }

    static async create(
        name: string,
        type: 'income' | 'expense',
        monthly_limit: number = 0,
        parent_id: string | null = null,
        color: string = '#718096',
        icon: string = 'tag',
        icon_color: string = '#ffffff'
    ): Promise<Category> {
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError || !session) throw new Error("No user session found");

        const { data, error } = await supabase
            .from('categories')
            .insert({
                user_id: session.user.id,
                name, type, color, icon, icon_color, monthly_limit, parent_id
            })
            .select()
            .single();

        if (error) throw error;
        return data as Category;
    }

    static async update(id: string, updates: Partial<Category>): Promise<Category> {
        const { data, error } = await supabase
            .from('categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Category;
    }

    static async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
}
