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
} from '../types';

export interface DataProvider {
    // --- Transactions ---
    getBalance(): Promise<Balance>;
    getTransactions(): Promise<Transaction[]>;
    getTransactionById(id: string): Promise<Transaction | null>;
    createTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction | null>;
    createInternalTransfer(sourceAssetId: string, destinationAssetId: string, amount: number, date: string, note?: string, expenseCategory?: string, expenseSubcategory?: string): Promise<void>;
    updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction>;
    deleteTransaction(id: string): Promise<void>;
    uploadReceipt(file: File): Promise<string>;

    // --- Categories ---
    getCategories(): Promise<Category[]>;
    createCategory(name: string, type: 'income' | 'expense', monthly_limit?: number, parent_id?: string | null, color?: string, icon?: string, icon_color?: string): Promise<Category>;
    updateCategory(id: string, updates: Partial<Category>): Promise<Category>;
    deleteCategory(id: string): Promise<void>;

    // --- User Settings ---
    getUserSettings(): Promise<UserSettings | null>;
    updateUserSettings(settings: Partial<UserSettings>): Promise<UserSettings>;

    // --- Institutions ---
    getInstitutions(): Promise<Institution[]>;
    createInstitution(name: string, type: 'bank' | 'broker' | 'crypto_exchange' | 'real_estate' | 'other', icon?: string, color?: string): Promise<Institution>;
    updateInstitution(id: string, updates: Partial<Institution>): Promise<Institution>;
    deleteInstitution(id: string): Promise<void>;

    // --- Assets ---
    getAssets(): Promise<Asset[]>;
    createAsset(assetData: Omit<Asset, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Asset>;
    updateAsset(id: string, updates: Partial<Asset>): Promise<Asset>;
    deleteAsset(id: string): Promise<void>;
    getAssetSnapshots(assetId: string): Promise<AssetSnapshot[]>;
    getAssetMovements(assetId: string): Promise<AssetMovement[]>;
    createAssetMovement(assetId: string, type: 'deposit' | 'withdrawal' | 'adjustment', amount: number, date: string, description?: string): Promise<AssetMovement>;
    deleteAssetMovement(id: string): Promise<void>;

    // --- Loans ---
    getLoanData(assetId: string): Promise<LoanOptions | null>;
    createLoanDetails(loanData: Omit<LoanOptions, 'id' | 'user_id' | 'created_at'>): Promise<LoanOptions>;
    updateLoanDetails(asset_id: string, updates: Partial<LoanOptions>): Promise<LoanOptions>;
    getLoanPayments(assetId: string): Promise<LoanPayment[]>;
    registerLoanPayment(paymentData: Omit<LoanPayment, 'id' | 'user_id' | 'created_at'>): Promise<LoanPayment>;

    // --- CDTs ---
    getCdtDetails(assetId: string): Promise<CdtDetails | null>;
    createCdtDetails(cdtData: Omit<CdtDetails, 'id' | 'user_id' | 'created_at'>): Promise<CdtDetails>;
    updateCdtDetails(asset_id: string, updates: Partial<CdtDetails>): Promise<CdtDetails>;
}
