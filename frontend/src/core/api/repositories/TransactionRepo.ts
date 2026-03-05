import { supabase } from '../supabase';
import { getAuthUser, getAuthUserOrNull, toNumber, mapTransactionRow } from '../helpers';
import type { Transaction, Balance } from '../types';

// ============================================================
// TransactionRepo — Operaciones CRUD de transacciones
// ============================================================

export class TransactionRepo {
    static async getBalance(): Promise<Balance> {
        const user = await getAuthUserOrNull();
        if (!user) return { total: 0, income: 0, expense: 0 };

        const { data, error } = await supabase
            .from('transactions')
            .select('amount, type')
            .eq('user_id', user.id);

        if (error) {
            console.error('Error fetching balance:', error);
            return { total: 0, income: 0, expense: 0 };
        }

        const income = data.filter(t => t.type === 'income').reduce((acc, t) => acc + toNumber(t.amount), 0);
        const expense = data.filter(t => t.type === 'expense').reduce((acc, t) => acc + toNumber(t.amount), 0);

        return { total: income - expense, income, expense };
    }

    static async getTransactions(): Promise<Transaction[]> {
        const user = await getAuthUserOrNull();
        if (!user) return [];

        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false });

        if (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }

        return data.map(mapTransactionRow);
    }

    static async getTransactionById(id: string): Promise<Transaction | null> {
        const user = await getAuthUserOrNull();
        if (!user) return null;

        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (error || !data) return null;
        return mapTransactionRow(data);
    }

    static async createTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction | null> {
        const user = await getAuthUser();

        // Importación dinámica para evitar dependencia circular
        const { CategoryRepo } = await import('./CategoryRepo');
        const { AssetRepo } = await import('./AssetRepo');

        let finalCategory = tx.category;
        const categories = await CategoryRepo.getAll();
        const categoryExists = categories.some(c => c.name.toLowerCase() === tx.category.toLowerCase() && c.type === tx.type);
        if (!categoryExists) {
            finalCategory = "Otros";
        }

        const newTxData = {
            user_id: user.id,
            amount: tx.amount,
            date: tx.date,
            category: finalCategory,
            subcategory: tx.subcategory || null,
            merchant: tx.merchant || null,
            payment_method: tx.paymentMethod || null,
            asset_id: tx.asset_id || null,
            payment_type: tx.payment_type || null,
            type: tx.type,
            description: tx.description || null,
            linked_asset_debt_id: tx.linked_asset_debt_id || null
        };

        const { data, error } = await supabase
            .from('transactions')
            .insert(newTxData)
            .select()
            .single();

        if (error) {
            console.error('Error creating transaction:', error);
            throw error;
        }

        // --- Lógica de débito en activo ---
        if (tx.asset_id && tx.payment_type === 'debit') {
            try {
                const { data: assetData } = await supabase.from('assets').select('current_value').eq('id', tx.asset_id).single();
                if (assetData) {
                    const movementType = tx.type === 'expense' ? 'withdrawal' : 'deposit';
                    const newCurrentValue = tx.type === 'expense'
                        ? toNumber(assetData.current_value) - tx.amount
                        : toNumber(assetData.current_value) + tx.amount;

                    await AssetRepo.createMovement(
                        tx.asset_id,
                        movementType,
                        tx.amount,
                        tx.date,
                        tx.description || `Transacción: ${tx.merchant || tx.category}`
                    );
                    await AssetRepo.update(tx.asset_id, { current_value: newCurrentValue });
                }
            } catch (err) {
                console.error("Error updating asset balance:", err);
            }
        }

        // --- Lógica de deuda física ---
        if (tx.linked_asset_debt_id && tx.type === 'expense') {
            try {
                const { data: debtAsset } = await supabase.from('assets').select('credit_paid, has_credit').eq('id', tx.linked_asset_debt_id).single();
                if (debtAsset && debtAsset.has_credit) {
                    const currentPaid = toNumber(debtAsset.credit_paid);
                    await AssetRepo.update(tx.linked_asset_debt_id, {
                        credit_paid: currentPaid + tx.amount
                    });
                }
            } catch (err) {
                console.error("Error updating linked physical asset debt:", err);
            }
        }

        return mapTransactionRow(data);
    }

    static async createInternalTransfer(
        sourceAssetId: string,
        destinationAssetId: string,
        amount: number,
        date: string,
        note?: string,
        expenseCategory?: string,
        expenseSubcategory?: string
    ): Promise<void> {
        await getAuthUser();

        const descriptionPrefix = "Transferencia Interna";
        const finalNote = note ? `${descriptionPrefix}: ${note}` : descriptionPrefix;

        await this.createTransaction({
            amount,
            date,
            type: 'expense',
            category: expenseCategory || 'Otros',
            subcategory: expenseSubcategory || undefined,
            merchant: 'Transferencia Saliente',
            asset_id: sourceAssetId,
            payment_type: 'debit',
            description: finalNote
        });

        await this.createTransaction({
            amount,
            date,
            type: 'income',
            category: 'Otros',
            merchant: 'Transferencia Entrante',
            asset_id: destinationAssetId,
            payment_type: 'debit',
            description: finalNote
        });
    }

    static async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
        const user = await getAuthUser();
        const { AssetRepo } = await import('./AssetRepo');

        // 1. Fetch OLD transaction to revert balances
        const oldTx = await this.getTransactionById(id);
        if (!oldTx) throw new Error("Transaction not found");

        // 2. Revert old asset balance
        if (oldTx.asset_id && oldTx.payment_type === 'debit') {
            try {
                const { data: assetData } = await supabase.from('assets').select('current_value').eq('id', oldTx.asset_id).single();
                if (assetData) {
                    const newCurrentValue = oldTx.type === 'expense'
                        ? toNumber(assetData.current_value) + oldTx.amount
                        : toNumber(assetData.current_value) - oldTx.amount;
                    await AssetRepo.update(oldTx.asset_id, { current_value: newCurrentValue });
                    await AssetRepo.createMovement(oldTx.asset_id, 'adjustment', oldTx.amount, new Date().toISOString().split('T')[0], 'Reversión por edición de transacción');
                }
            } catch (err) {
                console.error("Error reverting old asset balance:", err);
            }
        }

        // Revert old physical debt balance
        if (oldTx.linked_asset_debt_id && oldTx.type === 'expense') {
            try {
                const { data: debtAsset } = await supabase.from('assets').select('credit_paid, has_credit').eq('id', oldTx.linked_asset_debt_id).single();
                if (debtAsset && debtAsset.has_credit) {
                    const currentPaid = toNumber(debtAsset.credit_paid);
                    await AssetRepo.update(oldTx.linked_asset_debt_id, { credit_paid: Math.max(0, currentPaid - oldTx.amount) });
                }
            } catch (err) {
                console.error("Error reverting old linked physical asset debt:", err);
            }
        }

        // 3. Apply updates to DB
        const mappedUpdates: any = {};
        if (updates.amount !== undefined) mappedUpdates.amount = updates.amount;
        if (updates.date !== undefined) mappedUpdates.date = updates.date;
        if (updates.category !== undefined) mappedUpdates.category = updates.category;
        if (updates.subcategory !== undefined) mappedUpdates.subcategory = updates.subcategory;
        if (updates.merchant !== undefined) mappedUpdates.merchant = updates.merchant;
        if (updates.paymentMethod !== undefined) mappedUpdates.payment_method = updates.paymentMethod;
        if (updates.asset_id !== undefined) mappedUpdates.asset_id = updates.asset_id;
        if (updates.payment_type !== undefined) mappedUpdates.payment_type = updates.payment_type;
        if (updates.type !== undefined) mappedUpdates.type = updates.type;
        if (updates.description !== undefined) mappedUpdates.description = updates.description;
        if (updates.linked_asset_debt_id !== undefined) mappedUpdates.linked_asset_debt_id = updates.linked_asset_debt_id;

        const { data, error } = await supabase
            .from('transactions')
            .update(mappedUpdates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating transaction:', error);
            throw error;
        }

        const updatedTx = mapTransactionRow(data);

        // 4. Apply new asset balance
        if (updatedTx.asset_id && updatedTx.payment_type === 'debit') {
            try {
                const { data: assetData } = await supabase.from('assets').select('current_value').eq('id', updatedTx.asset_id).single();
                if (assetData) {
                    const movementType = updatedTx.type === 'expense' ? 'withdrawal' : 'deposit';
                    const newCurrentValue = updatedTx.type === 'expense'
                        ? toNumber(assetData.current_value) - updatedTx.amount
                        : toNumber(assetData.current_value) + updatedTx.amount;
                    await AssetRepo.createMovement(updatedTx.asset_id, movementType, updatedTx.amount, updatedTx.date, updatedTx.description || `Transacción Editada: ${updatedTx.merchant || updatedTx.category}`);
                    await AssetRepo.update(updatedTx.asset_id, { current_value: newCurrentValue });
                }
            } catch (err) {
                console.error("Error applying new asset balance:", err);
            }
        }

        // Apply new physical debt balance
        if (updatedTx.linked_asset_debt_id && updatedTx.type === 'expense') {
            try {
                const { data: debtAsset } = await supabase.from('assets').select('credit_paid, has_credit').eq('id', updatedTx.linked_asset_debt_id).single();
                if (debtAsset && debtAsset.has_credit) {
                    const currentPaid = toNumber(debtAsset.credit_paid);
                    await AssetRepo.update(updatedTx.linked_asset_debt_id, { credit_paid: currentPaid + updatedTx.amount });
                }
            } catch (err) {
                console.error("Error applying new linked physical asset debt:", err);
            }
        }

        return updatedTx;
    }

    static async deleteTransaction(id: string): Promise<void> {
        const user = await getAuthUser();
        const { AssetRepo } = await import('./AssetRepo');

        const oldTx = await this.getTransactionById(id);
        if (!oldTx) throw new Error("Transaction not found");

        // Revert old asset balance
        if (oldTx.asset_id && oldTx.payment_type === 'debit') {
            try {
                const { data: assetData } = await supabase.from('assets').select('current_value').eq('id', oldTx.asset_id).single();
                if (assetData) {
                    const newCurrentValue = oldTx.type === 'expense'
                        ? toNumber(assetData.current_value) + oldTx.amount
                        : toNumber(assetData.current_value) - oldTx.amount;
                    await AssetRepo.update(oldTx.asset_id, { current_value: newCurrentValue });
                    await AssetRepo.createMovement(oldTx.asset_id, 'adjustment', oldTx.amount, new Date().toISOString().split('T')[0], 'Reversión por eliminación de transacción');
                }
            } catch (err) {
                console.error("Error reverting old asset balance:", err);
            }
        }

        // Revert old physical debt balance
        if (oldTx.linked_asset_debt_id && oldTx.type === 'expense') {
            try {
                const { data: debtAsset } = await supabase.from('assets').select('credit_paid, has_credit').eq('id', oldTx.linked_asset_debt_id).single();
                if (debtAsset && debtAsset.has_credit) {
                    const currentPaid = toNumber(debtAsset.credit_paid);
                    await AssetRepo.update(oldTx.linked_asset_debt_id, { credit_paid: Math.max(0, currentPaid - oldTx.amount) });
                }
            } catch (err) {
                console.error("Error reverting old linked physical asset debt:", err);
            }
        }

        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error deleting transaction:', error);
            throw error;
        }
    }

    static async uploadReceipt(file: File): Promise<string> {
        const user = await getAuthUser();

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `private/${fileName}`;

        const { error } = await supabase.storage
            .from('receipts')
            .upload(filePath, file);

        if (error) {
            console.error('Error uploading receipt:', error);
            throw error;
        }

        const { data } = supabase.storage
            .from('receipts')
            .getPublicUrl(filePath);

        return data.publicUrl;
    }
}
