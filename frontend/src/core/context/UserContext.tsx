"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiClient } from '@/core/api/ApiClient';
import { supabase } from '@/core/api/supabase';
import { useTheme } from 'next-themes';

interface UserContextProps {
    currency: string;
    setCurrency: (newCurrency: string) => Promise<void>;
    theme: string;
    setTheme: (newTheme: string) => Promise<void>;
    hideBalances: boolean;
    toggleHideBalances: () => void;
    loading: boolean;
}

const UserContext = createContext<UserContextProps>({
    currency: 'USD',
    setCurrency: async () => { },
    theme: 'system',
    setTheme: async () => { },
    hideBalances: false,
    toggleHideBalances: () => { },
    loading: true,
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [currency, setCurrencyState] = useState('USD');
    const [loading, setLoading] = useState(true);
    const [hideBalances, setHideBalances] = useState(false);
    const { theme: nextTheme, setTheme: setNextTheme } = useTheme();

    useEffect(() => {
        // Load privacy mode from local storage
        try {
            const savedPrivacy = localStorage.getItem("finanzitas-privacy-mode");
            if (savedPrivacy === "true") setHideBalances(true);
        } catch (e) { }
        // 1. Initial Load
        const loadSettings = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const settings = await ApiClient.getUserSettings();
                    if (settings) {
                        setCurrencyState(settings.main_currency);
                        if (settings.theme) {
                            setNextTheme(settings.theme);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to load user settings", error);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();

        // 2. Auth State listener (reload if user signs in)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                loadSettings();
            } else if (event === 'SIGNED_OUT') {
                setCurrencyState('USD');
                setNextTheme('system');
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const setCurrency = async (newCurrency: string) => {
        setCurrencyState(newCurrency); // Optimistic UI
        try {
            await ApiClient.updateUserSettings({ main_currency: newCurrency });
        } catch (e) {
            console.error(e);
            // rollback could be implemented here
        }
    };

    const setTheme = async (newTheme: string) => {
        setNextTheme(newTheme);
        try {
            await ApiClient.updateUserSettings({ theme: newTheme });
        } catch (e) {
            console.error(e);
        }
    };

    const toggleHideBalances = () => {
        setHideBalances(prev => {
            const newVal = !prev;
            try {
                localStorage.setItem("finanzitas-privacy-mode", newVal.toString());
            } catch (e) { }
            return newVal;
        });
    };

    return (
        <UserContext.Provider value={{ currency, setCurrency, theme: nextTheme || 'system', setTheme, hideBalances, toggleHideBalances, loading }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUserOptions = () => useContext(UserContext);
