import { createClient } from "@/utils/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";

export type DepositMethod = 'EFT' | 'ATM' | 'Counter' | 'Branch';
export type FeeType = 'fixed' | 'percentage';

export type DepositFeeConfiguration = {
  id: string;
  deposit_method: DepositMethod;
  fee_type: FeeType;
  fee_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DepositAdjustmentType = 'deposit' | 'removal';

export type RetailerDeposit = {
  id: string;
  retailer_id: string;
  amount_deposited: number;
  deposit_method: DepositMethod;
  fee_type: FeeType;
  fee_value: number;
  fee_amount: number;
  net_amount: number;
  balance_before: number;
  balance_after: number;
  adjustment_type: DepositAdjustmentType;
  processed_by: string | null;
  processed_by_name?: string;
  processed_by_email?: string;
  notes: string | null;
  created_at: string;
};

export type ProcessDepositParams = {
  retailer_id: string;
  amount_deposited: number;
  deposit_method: DepositMethod;
  adjustment_type: DepositAdjustmentType;
  notes?: string;
};

/**
 * Fetch all deposit fee configurations
 */
export async function fetchDepositFeeConfigurations(): Promise<{
  data: DepositFeeConfiguration[] | null;
  error: PostgrestError | Error | null;
}> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("deposit_fee_configurations")
      .select("*")
      .order("deposit_method");

    if (error) {
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Update deposit fee configuration for a specific method
 */
export async function updateDepositFeeConfiguration(
  deposit_method: DepositMethod,
  fee_type: FeeType,
  fee_value: number
): Promise<{
  data: DepositFeeConfiguration | null;
  error: PostgrestError | Error | null;
}> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("deposit_fee_configurations")
      .update({
        fee_type,
        fee_value,
        updated_at: new Date().toISOString(),
      })
      .eq("deposit_method", deposit_method)
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Process a retailer deposit
 * This function:
 * 1. Gets the current fee configuration for the deposit method
 * 2. Calculates the fee amount
 * 3. Calculates the net amount to add to balance
 * 4. Updates the retailer's balance
 * 5. Records the deposit in the audit trail
 */
export async function processRetailerDeposit({
  retailer_id,
  amount_deposited,
  deposit_method,
  adjustment_type,
  notes,
}: ProcessDepositParams): Promise<{
  data: RetailerDeposit | null;
  error: PostgrestError | Error | null;
}> {
  const supabase = createClient();

  try {
    // Step 1: Get current user (admin processing the deposit)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        data: null,
        error: new Error("No authenticated user found"),
      };
    }

    // Step 2: Get the fee configuration for this deposit method
    const { data: feeConfig, error: feeError } = await supabase
      .from("deposit_fee_configurations")
      .select("*")
      .eq("deposit_method", deposit_method)
      .single();

    if (feeError) {
      return { data: null, error: feeError };
    }

    // Step 3: Calculate fee amount
    let fee_amount: number;
    if (feeConfig.fee_type === "fixed") {
      fee_amount = feeConfig.fee_value;
    } else {
      // percentage
      fee_amount = (amount_deposited * feeConfig.fee_value) / 100;
    }

    // Step 4: Calculate net amount
    const net_amount = amount_deposited - fee_amount;

    if (net_amount <= 0) {
      return {
        data: null,
        error: new Error(
          "Amount must be greater than the fee amount"
        ),
      };
    }

    // Step 5: Get current retailer balance and credit limit
    const { data: retailer, error: retailerError } = await supabase
      .from("retailers")
      .select("balance, credit_limit")
      .eq("id", retailer_id)
      .single();

    if (retailerError) {
      return { data: null, error: retailerError };
    }

    const balance_before = retailer.balance;
    const credit_limit = retailer.credit_limit || 0;
    
    // Calculate balance_after based on adjustment type
    let balance_after: number;
    if (adjustment_type === 'deposit') {
      balance_after = balance_before + net_amount;
    } else {
      // removal
      balance_after = balance_before - net_amount;
      
      // Validate that removal won't exceed credit limit (balance can be negative up to -credit_limit)
      const min_allowed_balance = -credit_limit;
      if (balance_after < min_allowed_balance) {
        return {
          data: null,
          error: new Error(
            `Cannot remove R ${net_amount.toFixed(2)}. Would exceed credit limit. Minimum allowed balance: -R ${credit_limit.toFixed(2)} (Current: R ${balance_before.toFixed(2)})`
          ),
        };
      }
    }

    // Step 6: Update retailer balance
    const { error: updateError } = await supabase
      .from("retailers")
      .update({ balance: balance_after })
      .eq("id", retailer_id);

    if (updateError) {
      return { data: null, error: updateError };
    }

    // Step 7: Record the transaction in audit trail
    const { data: deposit, error: depositError } = await supabase
      .from("retailer_deposits")
      .insert({
        retailer_id,
        amount_deposited,
        deposit_method,
        fee_type: feeConfig.fee_type,
        fee_value: feeConfig.fee_value,
        fee_amount,
        net_amount,
        balance_before,
        balance_after,
        adjustment_type,
        processed_by: user.id,
        notes: notes || null,
      })
      .select()
      .single();

    if (depositError) {
      // Try to rollback the balance update
      await supabase
        .from("retailers")
        .update({ balance: balance_before })
        .eq("id", retailer_id);

      return { data: null, error: depositError };
    }

    return { data: deposit, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Fetch deposit history for a retailer
 */
export async function fetchRetailerDepositHistory(
  retailer_id: string
): Promise<{
  data: RetailerDeposit[] | null;
  error: PostgrestError | Error | null;
}> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("retailer_deposits")
      .select(
        `
        *,
        profiles:processed_by(full_name, email)
      `
      )
      .eq("retailer_id", retailer_id)
      .order("created_at", { ascending: false });

    if (error) {
      return { data: null, error };
    }

    // Transform the data to include processed_by name and email
    const deposits = data.map((deposit: any) => ({
      id: deposit.id,
      retailer_id: deposit.retailer_id,
      amount_deposited: deposit.amount_deposited,
      deposit_method: deposit.deposit_method,
      fee_type: deposit.fee_type,
      fee_value: deposit.fee_value,
      fee_amount: deposit.fee_amount,
      net_amount: deposit.net_amount,
      balance_before: deposit.balance_before,
      balance_after: deposit.balance_after,
      adjustment_type: deposit.adjustment_type || 'deposit', // Default to 'deposit' for backwards compatibility
      processed_by: deposit.processed_by,
      processed_by_name: deposit.profiles?.full_name,
      processed_by_email: deposit.profiles?.email,
      notes: deposit.notes,
      created_at: deposit.created_at,
    }));

    return { data: deposits, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
