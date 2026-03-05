import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TransactionRepo } from '../api/repositories/TransactionRepo';
import { AssetRepo } from '../api/repositories/AssetRepo';
import { LoanRepo } from '../api/repositories/LoanRepo';
import { CdtRepo } from '../api/repositories/CdtRepo';
import { CategoryRepo } from '../api/repositories/CategoryRepo';
import { InstitutionRepo } from '../api/repositories/InstitutionRepo';
import { TRANSACTION_KEYS, PORTFOLIO_KEYS } from './useQueries';
import type { Transaction, Asset, LoanPayment, Category, Institution, LoanOptions, CdtDetails } from '../api/types';

// ============================================================
// useMutations — React Query Mutations con invalidación automática
// Elimina boilerplate de try/catch/finally/invalidateQueries
// ============================================================

// --- Transactions ---

export function useCreateTransaction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (tx: Omit<Transaction, 'id'>) => TransactionRepo.createTransaction(tx),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TRANSACTION_KEYS.all });
            queryClient.invalidateQueries({ queryKey: TRANSACTION_KEYS.balance });
            queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEYS.assets });
        },
    });
}

export function useUpdateTransaction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Transaction> }) =>
            TransactionRepo.updateTransaction(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TRANSACTION_KEYS.all });
            queryClient.invalidateQueries({ queryKey: TRANSACTION_KEYS.balance });
            queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEYS.assets });
        },
    });
}

export function useDeleteTransaction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => TransactionRepo.deleteTransaction(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TRANSACTION_KEYS.all });
            queryClient.invalidateQueries({ queryKey: TRANSACTION_KEYS.balance });
            queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEYS.assets });
        },
    });
}

// --- Assets ---

export function useCreateAsset() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Omit<Asset, 'id' | 'user_id' | 'created_at' | 'updated_at'>) =>
            AssetRepo.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEYS.assets });
        },
    });
}

export function useUpdateAsset() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Asset> }) =>
            AssetRepo.update(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEYS.assets });
        },
    });
}

export function useDeleteAsset() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => AssetRepo.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEYS.assets });
            queryClient.invalidateQueries({ queryKey: TRANSACTION_KEYS.all });
            queryClient.invalidateQueries({ queryKey: TRANSACTION_KEYS.balance });
        },
    });
}

// --- Loans ---

export function useRegisterLoanPayment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Omit<LoanPayment, 'id' | 'user_id' | 'created_at'>) =>
            LoanRepo.registerPayment(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEYS.assets });
            queryClient.invalidateQueries({ queryKey: TRANSACTION_KEYS.all });
            queryClient.invalidateQueries({ queryKey: TRANSACTION_KEYS.balance });
        },
    });
}

export function useCreateLoanDetails() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Omit<LoanOptions, 'id' | 'user_id' | 'created_at'>) =>
            LoanRepo.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEYS.assets });
        },
    });
}

// --- CDTs ---

export function useCreateCdtDetails() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Omit<CdtDetails, 'id' | 'user_id' | 'created_at'>) =>
            CdtRepo.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEYS.assets });
        },
    });
}

// --- Categories ---

export function useCreateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { name: string; type: 'income' | 'expense'; monthly_limit?: number; parent_id?: string | null; color?: string; icon?: string; icon_color?: string }) =>
            CategoryRepo.create(data.name, data.type, data.monthly_limit, data.parent_id, data.color, data.icon, data.icon_color),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
    });
}

export function useUpdateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Category> }) =>
            CategoryRepo.update(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
    });
}

export function useDeleteCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => CategoryRepo.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
    });
}

// --- Institutions ---

export function useCreateInstitution() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { name: string; type: 'bank' | 'broker' | 'crypto_exchange' | 'real_estate' | 'other'; icon?: string; color?: string }) =>
            InstitutionRepo.create(data.name, data.type, data.icon, data.color),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEYS.institutions });
        },
    });
}

export function useUpdateInstitution() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Institution> }) =>
            InstitutionRepo.update(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEYS.institutions });
        },
    });
}

export function useDeleteInstitution() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => InstitutionRepo.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEYS.institutions });
            queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEYS.assets });
        },
    });
}
