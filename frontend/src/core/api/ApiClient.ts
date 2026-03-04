import { supabase } from './supabase';

export interface Category {
    id: string;
    user_id?: string;
    name: string;
    type: 'income' | 'expense';
    color: string;
    icon: string;
    icon_color: string;
    monthly_limit: number;
    parent_id?: string | null;
}

export interface UserSettings {
    user_id: string;
    main_currency: string;
    theme: string;
}

export interface Transaction {
    id: string;
    amount: number;
    date: string;
    category: string;
    subcategory?: string;
    merchant?: string;
    paymentMethod?: string;
    asset_id?: string;
    payment_type?: 'debit' | 'credit';
    type: 'income' | 'expense';
    description?: string;
    linked_asset_debt_id?: string;
}

export interface Balance {
    total: number;
    income: number;
    expense: number;
}

export interface Institution {
    id: string;
    user_id?: string;
    name: string;
    type: 'bank' | 'broker' | 'crypto_exchange' | 'real_estate' | 'other';
    icon: string;
    color: string;
}

export interface Asset {
    id: string;
    user_id?: string;
    institution_id?: string | null;
    name: string;
    type: 'financial' | 'digital' | 'physical';
    physical_type?: 'real_estate' | 'vehicle' | 'business' | 'tech' | 'jewelry' | 'other' | null;
    digital_type?: 'investment' | 'loan' | 'cdt' | null;
    liquidity_layer: 'L1_immediate' | 'L2_medium' | 'L3_low';
    currency: string;
    current_value: number;
    interest_rate_nominal: number;
    opening_date?: string;
    is_manual: boolean;
    is_payment_account?: boolean;
    has_credit?: boolean;
    credit_amount?: number;
    credit_paid?: number;
    created_at?: string;
    updated_at?: string;
    loan_options?: LoanOptions; // Added conceptually for typing if nested
    cdt_details?: CdtDetails;
}

export interface AssetSnapshot {
    id: string;
    asset_id: string;
    value: number;
    recorded_at: string;
}

export interface AssetMovement {
    id: string;
    asset_id: string;
    user_id?: string;
    type: 'deposit' | 'withdrawal' | 'adjustment';
    amount: number;
    date: string;
    description?: string;
    created_at?: string;
}

export interface LoanOptions {
    id?: string;
    asset_id: string;
    user_id?: string;
    debtor: string;
    principal_amount: number;
    term_months: number;
    interest_rate_annual: number;
    grace_period_months: number;
    amortization_type: 'french' | 'german' | 'none';
    created_at?: string;
}

export interface LoanPayment {
    id?: string;
    asset_id: string;
    user_id?: string;
    date: string;
    payment_amount: number;
    principal_amount: number;
    interest_amount: number;
    extra_principal_amount: number;
    extra_action?: 'reduce_term' | 'reduce_installment' | 'advance';
    created_at?: string;
}

export interface CdtDetails {
    id?: string;
    asset_id: string;
    user_id?: string;
    principal_amount: number;
    term_months: number | null;
    term_days: number | null;
    created_at?: string;
}

export class ApiClient {
    // --- Transactions & Balance ---

    static async getBalance(): Promise<Balance> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { total: 0, income: 0, expense: 0 };

        const { data, error } = await supabase
            .from('transactions')
            .select('amount, type')
            .eq('user_id', user.id);

        if (error) {
            console.error('Error fetching balance:', error);
            return { total: 0, income: 0, expense: 0 };
        }

        const income = data.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
        const expense = data.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);

        return {
            total: income - expense,
            income,
            expense
        };
    }

    static async getTransactions(): Promise<Transaction[]> {
        const { data: { user } } = await supabase.auth.getUser();
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

        return data.map(t => ({
            id: t.id,
            amount: Number(t.amount),
            date: t.date,
            category: t.category,
            subcategory: t.subcategory,
            merchant: t.merchant,
            paymentMethod: t.payment_method,
            asset_id: t.asset_id,
            payment_type: t.payment_type,
            type: t.type,
            description: t.description,
            linked_asset_debt_id: t.linked_asset_debt_id
        }));
    }

    static async createTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        let finalCategory = tx.category;

        // Verify if the category exists in the user's categories.
        // If it doesn't, we fallback to 'Otros'.
        const categories = await this.getCategories();
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

        // --- ASSET DEBIT LOGIC ---
        if (tx.asset_id && tx.payment_type === 'debit') {
            try {
                // Fetch current asset
                const { data: assetData } = await supabase.from('assets').select('current_value').eq('id', tx.asset_id).single();
                if (assetData) {
                    const movementType = tx.type === 'expense' ? 'withdrawal' : 'deposit';
                    const newCurrentValue = tx.type === 'expense'
                        ? Number(assetData.current_value) - tx.amount
                        : Number(assetData.current_value) + tx.amount;

                    // Create movement
                    await ApiClient.createAssetMovement(
                        tx.asset_id,
                        movementType,
                        tx.amount,
                        tx.date,
                        tx.description || `Transacción: ${tx.merchant || tx.category}`
                    );

                    // Update asset value
                    await ApiClient.updateAsset(tx.asset_id, {
                        current_value: newCurrentValue
                    });
                }
            } catch (err) {
                console.error("Error updating asset balance:", err);
            }
        }

        // --- ASSET DEBT (PHYSICAL) LOGIC ---
        if (tx.linked_asset_debt_id && tx.type === 'expense') {
            try {
                // Fetch the referenced physical asset
                const { data: debtAsset } = await supabase.from('assets').select('credit_paid, has_credit').eq('id', tx.linked_asset_debt_id).single();
                if (debtAsset && debtAsset.has_credit) {
                    const currentPaid = Number(debtAsset.credit_paid || 0);
                    await ApiClient.updateAsset(tx.linked_asset_debt_id, {
                        credit_paid: currentPaid + tx.amount
                    });
                }
            } catch (err) {
                console.error("Error updating linked physical asset debt:", err);
            }
        }

        return {
            id: data.id,
            amount: Number(data.amount),
            date: data.date,
            category: data.category,
            subcategory: data.subcategory,
            merchant: data.merchant,
            paymentMethod: data.payment_method,
            asset_id: data.asset_id,
            payment_type: data.payment_type,
            type: data.type,
            description: data.description,
            linked_asset_debt_id: data.linked_asset_debt_id
        };
    }

    static async createInternalTransfer(sourceAssetId: string, destinationAssetId: string, amount: number, date: string, note?: string, expenseCategory?: string, expenseSubcategory?: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const descriptionPrefix = "Transferencia Interna";
        const finalNote = note ? `${descriptionPrefix}: ${note}` : descriptionPrefix;

        // 1. Create the Expense on the Source Asset
        await this.createTransaction({
            amount: amount,
            date: date,
            type: 'expense',
            category: expenseCategory || 'Otros',
            subcategory: expenseSubcategory || undefined,
            merchant: 'Transferencia Saliente',
            asset_id: sourceAssetId,
            payment_type: 'debit',
            description: finalNote
        });

        // 2. Create the Income on the Destination Asset
        await this.createTransaction({
            amount: amount,
            date: date,
            type: 'income',
            category: 'Otros',
            merchant: 'Transferencia Entrante',
            asset_id: destinationAssetId,
            payment_type: 'debit',
            description: finalNote
        });
    }

    static async getTransactionById(id: string): Promise<Transaction | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (error || !data) return null;

        return {
            id: data.id,
            amount: Number(data.amount),
            date: data.date,
            category: data.category,
            subcategory: data.subcategory,
            merchant: data.merchant,
            paymentMethod: data.payment_method,
            asset_id: data.asset_id,
            payment_type: data.payment_type,
            type: data.type,
            description: data.description,
            linked_asset_debt_id: data.linked_asset_debt_id
        };
    }

    static async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // 1. Fetch the OLD transaction to revert any asset balances
        const oldTx = await this.getTransactionById(id);
        if (!oldTx) throw new Error("Transaction not found");

        // 2. REVERT OLD ASSET BALANCE
        if (oldTx.asset_id && oldTx.payment_type === 'debit') {
            try {
                const { data: assetData } = await supabase.from('assets').select('current_value').eq('id', oldTx.asset_id).single();
                if (assetData) {
                    // Reverse the operation: if it was an expense, we add it back. If it was income, we subtract it.
                    const newCurrentValue = oldTx.type === 'expense'
                        ? Number(assetData.current_value) + oldTx.amount
                        : Number(assetData.current_value) - oldTx.amount;

                    await ApiClient.updateAsset(oldTx.asset_id, { current_value: newCurrentValue });
                    // Provide a reversal movement
                    await ApiClient.createAssetMovement(
                        oldTx.asset_id,
                        'adjustment',
                        oldTx.amount,
                        new Date().toISOString().split('T')[0],
                        `Reversión por edición de transacción`
                    );
                }
            } catch (err) {
                console.error("Error reverting old asset balance:", err);
            }
        }

        // REVERT OLD PHYSICAL DEBT BALANCE
        if (oldTx.linked_asset_debt_id && oldTx.type === 'expense') {
            try {
                const { data: debtAsset } = await supabase.from('assets').select('credit_paid, has_credit').eq('id', oldTx.linked_asset_debt_id).single();
                if (debtAsset && debtAsset.has_credit) {
                    const currentPaid = Number(debtAsset.credit_paid || 0);
                    // Subtract what was previously paid
                    await ApiClient.updateAsset(oldTx.linked_asset_debt_id, {
                        credit_paid: Math.max(0, currentPaid - oldTx.amount)
                    });
                }
            } catch (err) {
                console.error("Error reverting old linked physical asset debt:", err);
            }
        }

        // 3. APPLY NEW UPDATES TO DB
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

        const updatedTx: Transaction = {
            id: data.id,
            amount: Number(data.amount),
            date: data.date,
            category: data.category,
            subcategory: data.subcategory,
            merchant: data.merchant,
            paymentMethod: data.payment_method,
            asset_id: data.asset_id,
            payment_type: data.payment_type,
            type: data.type,
            description: data.description,
            linked_asset_debt_id: data.linked_asset_debt_id
        };

        // 4. APPLY NEW ASSET BALANCE
        if (updatedTx.asset_id && updatedTx.payment_type === 'debit') {
            try {
                const { data: assetData } = await supabase.from('assets').select('current_value').eq('id', updatedTx.asset_id).single();
                if (assetData) {
                    const movementType = updatedTx.type === 'expense' ? 'withdrawal' : 'deposit';
                    const newCurrentValue = updatedTx.type === 'expense'
                        ? Number(assetData.current_value) - updatedTx.amount
                        : Number(assetData.current_value) + updatedTx.amount;

                    await ApiClient.createAssetMovement(
                        updatedTx.asset_id,
                        movementType,
                        updatedTx.amount,
                        updatedTx.date,
                        updatedTx.description || `Transacción Editada: ${updatedTx.merchant || updatedTx.category}`
                    );

                    await ApiClient.updateAsset(updatedTx.asset_id, {
                        current_value: newCurrentValue
                    });
                }
            } catch (err) {
                console.error("Error applying new asset balance:", err);
            }
        }

        // APPLY NEW PHYSICAL DEBT BALANCE
        if (updatedTx.linked_asset_debt_id && updatedTx.type === 'expense') {
            try {
                const { data: debtAsset } = await supabase.from('assets').select('credit_paid, has_credit').eq('id', updatedTx.linked_asset_debt_id).single();
                if (debtAsset && debtAsset.has_credit) {
                    const currentPaid = Number(debtAsset.credit_paid || 0);
                    await ApiClient.updateAsset(updatedTx.linked_asset_debt_id, {
                        credit_paid: currentPaid + updatedTx.amount
                    });
                }
            } catch (err) {
                console.error("Error applying new linked physical asset debt:", err);
            }
        }

        return updatedTx;
    }

    static async deleteTransaction(id: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // 1. Fetch the OLD transaction to revert any asset balances
        const oldTx = await this.getTransactionById(id);
        if (!oldTx) throw new Error("Transaction not found");

        // 2. REVERT OLD ASSET BALANCE
        if (oldTx.asset_id && oldTx.payment_type === 'debit') {
            try {
                const { data: assetData } = await supabase.from('assets').select('current_value').eq('id', oldTx.asset_id).single();
                if (assetData) {
                    const newCurrentValue = oldTx.type === 'expense'
                        ? Number(assetData.current_value) + oldTx.amount
                        : Number(assetData.current_value) - oldTx.amount;

                    await ApiClient.updateAsset(oldTx.asset_id, { current_value: newCurrentValue });
                    await ApiClient.createAssetMovement(
                        oldTx.asset_id,
                        'adjustment',
                        oldTx.amount,
                        new Date().toISOString().split('T')[0],
                        `Reversión por eliminación de transacción`
                    );
                }
            } catch (err) {
                console.error("Error reverting old asset balance:", err);
            }
        }

        // REVERT OLD PHYSICAL DEBT BALANCE
        if (oldTx.linked_asset_debt_id && oldTx.type === 'expense') {
            try {
                const { data: debtAsset } = await supabase.from('assets').select('credit_paid, has_credit').eq('id', oldTx.linked_asset_debt_id).single();
                if (debtAsset && debtAsset.has_credit) {
                    const currentPaid = Number(debtAsset.credit_paid || 0);
                    await ApiClient.updateAsset(oldTx.linked_asset_debt_id, {
                        credit_paid: Math.max(0, currentPaid - oldTx.amount)
                    });
                }
            } catch (err) {
                console.error("Error reverting old linked physical asset debt:", err);
            }
        }

        // 3. DELETE FROM DB
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

    // --- Receipt Upload (AI Ready) ---
    static async uploadReceipt(file: File): Promise<string> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // We assume the user creates a public bucket called 'receipts'
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        // MATCH POLICY: Save inside the "private/" folder 
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

    // --- Categories ---

    static async getCategories(): Promise<Category[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('user_id', user.id)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching categories:', error);
            return [];
        }

        return data as Category[];
    }

    static async createCategory(
        name: string,
        type: 'income' | 'expense',
        monthly_limit: number = 0,
        parent_id: string | null = null,
        color: string = '#718096',
        icon: string = 'tag',
        icon_color: string = '#ffffff'
    ): Promise<Category> {
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError || !session) throw new Error("No user session found");

        const { data, error } = await supabase
            .from('categories')
            .insert({
                user_id: session.user.id,
                name,
                type,
                color,
                icon,
                icon_color,
                monthly_limit,
                parent_id
            })
            .select()
            .single();

        if (error) throw error;
        return data as Category;
    }

    static async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
        const { data, error } = await supabase
            .from('categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Category;
    }

    static async deleteCategory(id: string): Promise<void> {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // --- User Settings ---

    static async getUserSettings(): Promise<UserSettings | null> {
        const { data: { user } } = await supabase.auth.getUser();
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

        // If no settings exist yet, we can return a default
        if (!data) {
            return {
                user_id: user.id,
                main_currency: 'USD',
                theme: 'system'
            };
        }

        return data as UserSettings;
    }

    static async updateUserSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Upsert to handle the case where the row doesn't exist yet
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

    // --- Wealth Command Center (Assets & Institutions) ---

    static async getInstitutions(): Promise<Institution[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('institutions')
            .select('*')
            .eq('user_id', user.id)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching institutions:', error);
            return [];
        }

        return data as Institution[];
    }

    static async createInstitution(
        name: string,
        type: 'bank' | 'broker' | 'crypto_exchange' | 'real_estate' | 'other',
        icon: string = 'building',
        color: string = '#888888'
    ): Promise<Institution> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase
            .from('institutions')
            .insert({
                user_id: user.id,
                name,
                type,
                icon,
                color
            })
            .select()
            .single();

        if (error) throw error;
        return data as Institution;
    }

    static async updateInstitution(id: string, updates: Partial<Institution>): Promise<Institution> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase
            .from('institutions')
            .update(updates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;
        return data as Institution;
    }

    static async deleteInstitution(id: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { error } = await supabase
            .from('institutions')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;
    }

    static async getAssets(): Promise<Asset[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('assets')
            .select(`
                *,
                cdt_details:cdts(*)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching assets:', error);
            return [];
        }

        console.log("RAW ASSETS FROM SUPABASE:", data.filter(d => d.type === 'digital'));

        return data.map((item: any) => ({
            ...item,
            cdt_details: item.cdt_details ? (Array.isArray(item.cdt_details) ? item.cdt_details[0] : item.cdt_details) : undefined
        })) as Asset[];
    }

    static async createAsset(assetData: Omit<Asset, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Asset> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase
            .from('assets')
            .insert({
                user_id: user.id,
                ...assetData
            })
            .select()
            .single();

        if (error) throw error;

        // Record initial snapshot
        await supabase.from('asset_snapshots').insert({
            asset_id: data.id,
            value: data.current_value
        });

        // Initialize with a deposit if it's a financial asset with an opening date
        if (data.type === 'financial' && data.opening_date) {
            await this.createAssetMovement(
                data.id,
                'deposit',
                data.current_value,
                data.opening_date,
                'Fondeo Inicial'
            );
        }

        return data as Asset;
    }

    static async updateAsset(id: string, updates: Partial<Asset>): Promise<Asset> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase
            .from('assets')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Automatically write a snapshot if value updated
        if (updates.current_value !== undefined) {
            await supabase.from('asset_snapshots').insert({
                asset_id: data.id,
                value: data.current_value
            });
        }

        return data as Asset;
    }

    static async deleteAsset(id: string): Promise<void> {
        // Delete dependent records first
        await supabase.from('asset_snapshots').delete().eq('asset_id', id);
        await supabase.from('asset_movements').delete().eq('asset_id', id);

        const { error } = await supabase
            .from('assets')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    static async getAssetSnapshots(assetId: string): Promise<AssetSnapshot[]> {
        const { data, error } = await supabase
            .from('asset_snapshots')
            .select('*')
            .eq('asset_id', assetId)
            .order('recorded_at', { ascending: true });

        if (error) {
            console.error('Error fetching snapshots:', error);
            return [];
        }

        return data as AssetSnapshot[];
    }

    // --- Asset Movements ---
    static async getAssetMovements(assetId: string): Promise<AssetMovement[]> {
        const { data, error } = await supabase
            .from('asset_movements')
            .select('*')
            .eq('asset_id', assetId)
            .order('date', { ascending: true });

        if (error) {
            console.error('Error fetching asset movements:', error);
            return [];
        }

        return data as AssetMovement[];
    }

    static async createAssetMovement(
        assetId: string,
        type: 'deposit' | 'withdrawal' | 'adjustment',
        amount: number,
        date: string,
        description?: string
    ): Promise<AssetMovement> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase
            .from('asset_movements')
            .insert({
                user_id: user.id,
                asset_id: assetId,
                type,
                amount,
                date,
                description
            })
            .select()
            .single();

        if (error) throw error;
        return data as AssetMovement;
    }

    static async deleteAssetMovement(id: string): Promise<void> {
        const { error } = await supabase
            .from('asset_movements')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // --- Loans ---

    static async getLoanData(assetId: string): Promise<LoanOptions | null> {
        const { data, error } = await supabase
            .from('loans')
            .select('*')
            .eq('asset_id', assetId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // No rows found
            console.error('Error fetching loan data:', error);
            return null;
        }

        return data as LoanOptions;
    }

    static async createLoanDetails(loanData: Omit<LoanOptions, 'id' | 'user_id' | 'created_at'>): Promise<LoanOptions> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase
            .from('loans')
            .insert({
                user_id: user.id,
                ...loanData
            })
            .select()
            .single();

        if (error) throw error;
        return data as LoanOptions;
    }

    static async updateLoanDetails(asset_id: string, updates: Partial<LoanOptions>): Promise<LoanOptions> {
        const { data: existing } = await supabase.from('loans').select('id').eq('asset_id', asset_id).maybeSingle();

        if (existing) {
            const { data, error } = await supabase
                .from('loans')
                .update(updates)
                .eq('asset_id', asset_id)
                .select()
                .single();
            if (error) throw error;
            return data as LoanOptions;
        } else {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase
                .from('loans')
                .insert({ user_id: user?.id, asset_id, ...updates })
                .select()
                .single();
            if (error) throw error;
            return data as LoanOptions;
        }
    }

    static async getLoanPayments(assetId: string): Promise<LoanPayment[]> {
        const { data, error } = await supabase
            .from('loan_payments')
            .select('*')
            .eq('asset_id', assetId)
            .order('date', { ascending: true });

        if (error) {
            console.error('Error fetching loan payments:', error);
            return [];
        }
        return data as LoanPayment[];
    }

    static async registerLoanPayment(paymentData: Omit<LoanPayment, 'id' | 'user_id' | 'created_at'>): Promise<LoanPayment> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase
            .from('loan_payments')
            .insert({
                user_id: user.id,
                ...paymentData
            })
            .select()
            .single();

        if (error) throw error;

        try {
            // Unify amounts
            const principalAndExtra = Number(paymentData.principal_amount) + Number(paymentData.extra_principal_amount || 0);

            // Fetch the asset to update its value
            const { data: assetData } = await supabase.from('assets').select('current_value').eq('id', paymentData.asset_id).single();
            if (assetData) {
                const newCurrentValue = Number(assetData.current_value) - principalAndExtra;
                await ApiClient.updateAsset(paymentData.asset_id, {
                    current_value: Math.max(0, newCurrentValue)
                });
            }

            // Record transaction representing the total payment cashflow
            await ApiClient.createTransaction({
                amount: Number(paymentData.payment_amount),
                type: 'income',
                category: 'Otros',
                asset_id: paymentData.asset_id,
                payment_type: 'debit',
                date: paymentData.date,
                description: `Pago o Abono de Préstamo (Capital: ${principalAndExtra}, Interés: ${paymentData.interest_amount})`
            });
        } catch (err) {
            console.error("Error applying loan payment to system balances:", err);
        }

        return data as LoanPayment;
    }

    // --- CDTs ---
    static async getCdtDetails(assetId: string): Promise<CdtDetails | null> {
        const { data, error } = await supabase
            .from('cdts')
            .select('*')
            .eq('asset_id', assetId)
            .single();

        if (error) {
            console.error('Error fetching cdt details:', error);
            return null;
        }
        return data as CdtDetails;
    }

    static async createCdtDetails(cdtData: Omit<CdtDetails, 'id' | 'user_id' | 'created_at'>): Promise<CdtDetails> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase
            .from('cdts')
            .insert({
                user_id: user.id,
                ...cdtData
            })
            .select()
            .single();

        if (error) throw error;
        return data as CdtDetails;
    }

    static async updateCdtDetails(asset_id: string, updates: Partial<CdtDetails>): Promise<CdtDetails> {
        const { data: existing } = await supabase.from('cdts').select('id').eq('asset_id', asset_id).maybeSingle();

        if (existing) {
            const { data, error } = await supabase
                .from('cdts')
                .update(updates)
                .eq('asset_id', asset_id)
                .select()
                .single();
            if (error) throw error;
            return data as CdtDetails;
        } else {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase
                .from('cdts')
                .insert({ user_id: user?.id, asset_id, ...updates })
                .select()
                .single();
            if (error) throw error;
            return data as CdtDetails;
        }
    }
}
