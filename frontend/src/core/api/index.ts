// ============================================================
// Barrel export + ApiClient retrocompatible
// Punto de entrada único para la capa de datos
// ============================================================

// Re-exportar tipos
export type {
    Category,
    UserSettings,
    Transaction,
    Balance,
    Institution,
    Asset,
    AssetSnapshot,
    AssetMovement,
    LoanOptions,
    LoanPayment,
    CdtDetails,
} from './types';

// Re-exportar repositorios
export { TransactionRepo } from './repositories/TransactionRepo';
export { CategoryRepo } from './repositories/CategoryRepo';
export { SettingsRepo } from './repositories/SettingsRepo';
export { InstitutionRepo } from './repositories/InstitutionRepo';
export { AssetRepo } from './repositories/AssetRepo';
export { LoanRepo } from './repositories/LoanRepo';
export { CdtRepo } from './repositories/CdtRepo';

// Re-exportar helpers útiles
export { toNumber } from './helpers';

// ============================================================
// ApiClient — Wrapper retrocompatible
// Delega todas las llamadas a los repositorios correspondientes.
// Permite migración gradual: los componentes que aún importan
// ApiClient seguirán funcionando sin cambios.
// ============================================================

import { TransactionRepo } from './repositories/TransactionRepo';
import { CategoryRepo } from './repositories/CategoryRepo';
import { SettingsRepo } from './repositories/SettingsRepo';
import { InstitutionRepo } from './repositories/InstitutionRepo';
import { AssetRepo } from './repositories/AssetRepo';
import { LoanRepo } from './repositories/LoanRepo';
import { CdtRepo } from './repositories/CdtRepo';

import type {
    Transaction,
    Balance,
    Category,
    UserSettings,
    Institution,
    Asset,
    AssetSnapshot,
    AssetMovement,
    LoanOptions,
    LoanPayment,
    CdtDetails,
} from './types';

export class ApiClient {
    // --- Transactions ---
    static getBalance = TransactionRepo.getBalance.bind(TransactionRepo) as () => Promise<Balance>;
    static getTransactions = TransactionRepo.getTransactions.bind(TransactionRepo) as () => Promise<Transaction[]>;
    static getTransactionById = TransactionRepo.getTransactionById.bind(TransactionRepo) as (id: string) => Promise<Transaction | null>;
    static createTransaction = TransactionRepo.createTransaction.bind(TransactionRepo) as (tx: Omit<Transaction, 'id'>) => Promise<Transaction | null>;
    static createInternalTransfer = TransactionRepo.createInternalTransfer.bind(TransactionRepo) as (sourceAssetId: string, destinationAssetId: string, amount: number, date: string, note?: string, expenseCategory?: string, expenseSubcategory?: string) => Promise<void>;
    static updateTransaction = TransactionRepo.updateTransaction.bind(TransactionRepo) as (id: string, updates: Partial<Transaction>) => Promise<Transaction>;
    static deleteTransaction = TransactionRepo.deleteTransaction.bind(TransactionRepo) as (id: string) => Promise<void>;
    static uploadReceipt = TransactionRepo.uploadReceipt.bind(TransactionRepo) as (file: File) => Promise<string>;

    // --- Categories ---
    static getCategories = CategoryRepo.getAll.bind(CategoryRepo) as () => Promise<Category[]>;
    static createCategory = CategoryRepo.create.bind(CategoryRepo) as (name: string, type: 'income' | 'expense', monthly_limit?: number, parent_id?: string | null, color?: string, icon?: string, icon_color?: string) => Promise<Category>;
    static updateCategory = CategoryRepo.update.bind(CategoryRepo) as (id: string, updates: Partial<Category>) => Promise<Category>;
    static deleteCategory = CategoryRepo.delete.bind(CategoryRepo) as (id: string) => Promise<void>;

    // --- User Settings ---
    static getUserSettings = SettingsRepo.get.bind(SettingsRepo) as () => Promise<UserSettings | null>;
    static updateUserSettings = SettingsRepo.update.bind(SettingsRepo) as (settings: Partial<UserSettings>) => Promise<UserSettings>;

    // --- Institutions ---
    static getInstitutions = InstitutionRepo.getAll.bind(InstitutionRepo) as () => Promise<Institution[]>;
    static createInstitution = InstitutionRepo.create.bind(InstitutionRepo) as (name: string, type: 'bank' | 'broker' | 'crypto_exchange' | 'real_estate' | 'other', icon?: string, color?: string) => Promise<Institution>;
    static updateInstitution = InstitutionRepo.update.bind(InstitutionRepo) as (id: string, updates: Partial<Institution>) => Promise<Institution>;
    static deleteInstitution = InstitutionRepo.delete.bind(InstitutionRepo) as (id: string) => Promise<void>;

    // --- Assets ---
    static getAssets = AssetRepo.getAll.bind(AssetRepo) as () => Promise<Asset[]>;
    static createAsset = AssetRepo.create.bind(AssetRepo) as (assetData: Omit<Asset, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Asset>;
    static updateAsset = AssetRepo.update.bind(AssetRepo) as (id: string, updates: Partial<Asset>) => Promise<Asset>;
    static deleteAsset = AssetRepo.delete.bind(AssetRepo) as (id: string) => Promise<void>;
    static getAssetSnapshots = AssetRepo.getSnapshots.bind(AssetRepo) as (assetId: string) => Promise<AssetSnapshot[]>;
    static getAssetMovements = AssetRepo.getMovements.bind(AssetRepo) as (assetId: string) => Promise<AssetMovement[]>;
    static createAssetMovement = AssetRepo.createMovement.bind(AssetRepo) as (assetId: string, type: 'deposit' | 'withdrawal' | 'adjustment', amount: number, date: string, description?: string) => Promise<AssetMovement>;
    static deleteAssetMovement = AssetRepo.deleteMovement.bind(AssetRepo) as (id: string) => Promise<void>;

    // --- Loans ---
    static getLoanData = LoanRepo.getData.bind(LoanRepo) as (assetId: string) => Promise<LoanOptions | null>;
    static createLoanDetails = LoanRepo.create.bind(LoanRepo) as (loanData: Omit<LoanOptions, 'id' | 'user_id' | 'created_at'>) => Promise<LoanOptions>;
    static updateLoanDetails = LoanRepo.update.bind(LoanRepo) as (asset_id: string, updates: Partial<LoanOptions>) => Promise<LoanOptions>;
    static getLoanPayments = LoanRepo.getPayments.bind(LoanRepo) as (assetId: string) => Promise<LoanPayment[]>;
    static registerLoanPayment = LoanRepo.registerPayment.bind(LoanRepo) as (paymentData: Omit<LoanPayment, 'id' | 'user_id' | 'created_at'>) => Promise<LoanPayment>;

    // --- CDTs ---
    static getCdtDetails = CdtRepo.get.bind(CdtRepo) as (assetId: string) => Promise<CdtDetails | null>;
    static createCdtDetails = CdtRepo.create.bind(CdtRepo) as (cdtData: Omit<CdtDetails, 'id' | 'user_id' | 'created_at'>) => Promise<CdtDetails>;
    static updateCdtDetails = CdtRepo.update.bind(CdtRepo) as (asset_id: string, updates: Partial<CdtDetails>) => Promise<CdtDetails>;
}
