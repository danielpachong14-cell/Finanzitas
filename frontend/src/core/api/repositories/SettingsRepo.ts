import { supabase } from '../supabase';
import { getAuthUser, getAuthUserOrNull } from '../helpers';
import type { UserSettings } from '../types';

// ============================================================
// SettingsRepo — Configuraciones del usuario
// ============================================================

export class SettingsRepo {
    static async get(): Promise<UserSettings | null> {
        const user = await getAuthUserOrNull();
        if (!user) return null;

        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) {
            console.error('Error fetching user settings:', error);
            return null;
        }

        if (!data) {
            return { user_id: user.id, main_currency: 'USD', theme: 'system' };
        }
        return data as UserSettings;
    }

    static async update(settings: Partial<UserSettings>): Promise<UserSettings> {
        const user = await getAuthUser();

        const { data, error } = await supabase
            .from('user_settings')
            .upsert({
                user_id: user.id,
                ...settings,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return data as UserSettings;
    }
}
