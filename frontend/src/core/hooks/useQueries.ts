import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '../api';

export const TRANSACTION_KEYS = {
    all: ['transactions'] as const,
    balance: ['balance'] as const,
};

export const PORTFOLIO_KEYS = {
    assets: ['assets'] as const,
    institutions: ['institutions'] as const,
};

export function useTransactions() {
    return useQuery({
        queryKey: TRANSACTION_KEYS.all,
        queryFn: async () => {
            const data = await ApiClient.getTransactions();
            return data;
        },
        staleTime: 1000 * 60 * 2, // 2 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
        refetchOnWindowFocus: true,
    });
}

export function useBalance() {
    return useQuery({
        queryKey: TRANSACTION_KEYS.balance,
        queryFn: async () => {
            const data = await ApiClient.getBalance();
            return data;
        },
        staleTime: 1000 * 60 * 2,
        gcTime: 1000 * 60 * 30,
        refetchOnWindowFocus: true,
    });
}

export function useCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const data = await ApiClient.getCategories();
            return data;
        },
        staleTime: 1000 * 60 * 60, // Categories don't change very often
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
        refetchOnWindowFocus: false,
    });
}

export function useAssets() {
    return useQuery({
        queryKey: PORTFOLIO_KEYS.assets,
        queryFn: async () => {
            const data = await ApiClient.getAssets();
            return data;
        },
        staleTime: 1000 * 60 * 2,
        gcTime: 1000 * 60 * 30,
        refetchOnWindowFocus: true,
    });
}

export function useInstitutions() {
    return useQuery({
        queryKey: PORTFOLIO_KEYS.institutions,
        queryFn: async () => {
            const data = await ApiClient.getInstitutions();
            return data;
        },
        staleTime: 1000 * 60 * 60, // 1 hour for institutions (rarely change)
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
        refetchOnWindowFocus: false,
    });
}
