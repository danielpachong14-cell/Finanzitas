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

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            // Auto sign up if it doesn't exist to make it seamless for the demo MVP
            if (error.message.includes('Invalid login credentials')) {
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { name: email.split('@')[0] }
                    }
                });
                if (signUpError) {
                    console.error("Sign up error:", signUpError);
                    return false;
                }
                return true;
            }
            console.error("Sign in error:", error);
            return false;
        }

        return true;
    }

    static async signOut(): Promise<void> {
        await supabase.auth.signOut();
    }
}
