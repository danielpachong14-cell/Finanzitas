import { DataProvider } from './DataProvider';
import { TransactionRepo } from '../repositories/TransactionRepo';
import { CategoryRepo } from '../repositories/CategoryRepo';
import { SettingsRepo } from '../repositories/SettingsRepo';
import { InstitutionRepo } from '../repositories/InstitutionRepo';
import { AssetRepo } from '../repositories/AssetRepo';
import { LoanRepo } from '../repositories/LoanRepo';
import { CdtRepo } from '../repositories/CdtRepo';

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

export class SupabaseProvider implements DataProvider {
    // --- Transactions ---
    getBalance = TransactionRepo.getBalance.bind(TransactionRepo);
    getTransactions = TransactionRepo.getTransactions.bind(TransactionRepo);
    getTransactionById = TransactionRepo.getTransactionById.bind(TransactionRepo);
    createTransaction = TransactionRepo.createTransaction.bind(TransactionRepo);
    createInternalTransfer = TransactionRepo.createInternalTransfer.bind(TransactionRepo);
    updateTransaction = TransactionRepo.updateTransaction.bind(TransactionRepo);
    deleteTransaction = TransactionRepo.deleteTransaction.bind(TransactionRepo);
    uploadReceipt = TransactionRepo.uploadReceipt.bind(TransactionRepo);

    // --- Categories ---
    getCategories = CategoryRepo.getAll.bind(CategoryRepo);
    createCategory = CategoryRepo.create.bind(CategoryRepo);
    updateCategory = CategoryRepo.update.bind(CategoryRepo);
    deleteCategory = CategoryRepo.delete.bind(CategoryRepo);

    // --- User Settings ---
    getUserSettings = SettingsRepo.get.bind(SettingsRepo);
    updateUserSettings = SettingsRepo.update.bind(SettingsRepo);

    // --- Institutions ---
    getInstitutions = InstitutionRepo.getAll.bind(InstitutionRepo);
    createInstitution = InstitutionRepo.create.bind(InstitutionRepo);
    updateInstitution = InstitutionRepo.update.bind(InstitutionRepo);
    deleteInstitution = InstitutionRepo.delete.bind(InstitutionRepo);

    // --- Assets ---
    getAssets = AssetRepo.getAll.bind(AssetRepo);
    createAsset = AssetRepo.create.bind(AssetRepo);
    updateAsset = AssetRepo.update.bind(AssetRepo);
    deleteAsset = AssetRepo.delete.bind(AssetRepo);
    getAssetSnapshots = AssetRepo.getSnapshots.bind(AssetRepo);
    getAssetMovements = AssetRepo.getMovements.bind(AssetRepo);
    createAssetMovement = AssetRepo.createMovement.bind(AssetRepo);
    deleteAssetMovement = AssetRepo.deleteMovement.bind(AssetRepo);

    // --- Loans ---
    getLoanData = LoanRepo.getData.bind(LoanRepo);
    createLoanDetails = LoanRepo.create.bind(LoanRepo);
    updateLoanDetails = LoanRepo.update.bind(LoanRepo);
    getLoanPayments = LoanRepo.getPayments.bind(LoanRepo);
    registerLoanPayment = LoanRepo.registerPayment.bind(LoanRepo);

    // --- CDTs ---
    getCdtDetails = CdtRepo.get.bind(CdtRepo);
    createCdtDetails = CdtRepo.create.bind(CdtRepo);
    updateCdtDetails = CdtRepo.update.bind(CdtRepo);
}
