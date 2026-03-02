import { supabase } from '../api/supabase';

export interface User {
    id: string;
    email: string;
    name: string;
}

export class AuthService {
    static async getCurrentUser(): Promise<User | null> {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) return null;

        return {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || 'User'
        };
    }

    static async signIn(email: string, password?: string): Promise<boolean> {
        // Fallback for demo MVP if password is not provided
        if (!password) password = "password123";

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error("Sign in error:", error);
            return false;
        }

        return true;
    }

    static async signUp(email: string, password: string, name: string): Promise<boolean> {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name }
            }
        });

        if (error) {
            console.error("Sign up error:", error);
            return false;
        }
        return true;
    }

    static async resetPassword(email: string): Promise<boolean> {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/login?view=update_password`,
        });

        if (error) {
            console.error("Reset password error:", error);
            return false;
        }

        return true;
    }

    static async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) {
            console.error("Update password error:", error);
            return { success: false, error: error.message };
        }

        return { success: true };
    }

    static async exchangeCode(code: string): Promise<boolean> {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            console.error("Exchange code error:", error);
            return false;
        }
        return true;
    }

    static async signOut(): Promise<void> {
        await supabase.auth.signOut();
    }
}
