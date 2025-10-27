import { createClient } from "@/utils/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";

export type AdjustmentType = "increase" | "decrease";

export type CreditLimitAdjustment = {
  id: string;
  retailer_id: string;
  adjustment_type: AdjustmentType;
  amount: number;
  credit_limit_before: number;
  credit_limit_after: number;
  notes?: string;
  processed_by: string;
  processed_by_name?: string;
  processed_by_email?: string;
  created_at: string;
};

export type ProcessCreditAdjustmentParams = {
  retailer_id: string;
  adjustment_type: AdjustmentType;
  amount: number;
  notes?: string;
};

/**
 * Process a credit limit adjustment (increase or decrease)
 */
export async function processCreditLimitAdjustment(
  params: ProcessCreditAdjustmentParams
): Promise<{ data: CreditLimitAdjustment | null; error: Error | null }> {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: new Error("Not authenticated") };
    }

    // Get current retailer to check credit limit
    const { data: retailer, error: retailerError } = await supabase
      .from("retailers")
      .select("credit_limit")
      .eq("id", params.retailer_id)
      .single();

    if (retailerError || !retailer) {
      return { data: null, error: new Error("Retailer not found") };
    }

    const currentCreditLimit = retailer.credit_limit;
    let newCreditLimit: number;

    // Calculate new credit limit
    if (params.adjustment_type === "increase") {
      newCreditLimit = currentCreditLimit + params.amount;
    } else {
      newCreditLimit = currentCreditLimit - params.amount;
      // Ensure credit limit doesn't go negative
      if (newCreditLimit < 0) {
        return {
          data: null,
          error: new Error("Credit limit cannot be negative"),
        };
      }
    }

    // Start a transaction-like operation
    // 1. Update retailer's credit limit
    const { error: updateError } = await supabase
      .from("retailers")
      .update({ credit_limit: newCreditLimit })
      .eq("id", params.retailer_id);

    if (updateError) {
      return { data: null, error: updateError };
    }

    // 2. Insert credit history record
    const { data: historyData, error: historyError } = await supabase
      .from("retailer_credit_history")
      .insert({
        retailer_id: params.retailer_id,
        adjustment_type: params.adjustment_type,
        amount: params.amount,
        credit_limit_before: currentCreditLimit,
        credit_limit_after: newCreditLimit,
        notes: params.notes,
        processed_by: user.id,
      })
      .select(
        `
        *,
        processed_by_profile:profiles!retailer_credit_history_processed_by_fkey(
          full_name,
          email
        )
      `
      )
      .single();

    if (historyError) {
      // Rollback credit limit update
      await supabase
        .from("retailers")
        .update({ credit_limit: currentCreditLimit })
        .eq("id", params.retailer_id);

      return { data: null, error: historyError };
    }

    // Format the response
    const adjustment: CreditLimitAdjustment = {
      ...historyData,
      processed_by_name: historyData.processed_by_profile?.full_name,
      processed_by_email: historyData.processed_by_profile?.email,
    };

    return { data: adjustment, error: null };
  } catch (error) {
    console.error("Error processing credit limit adjustment:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}

/**
 * Fetch credit limit history for a retailer
 */
export async function fetchRetailerCreditHistory(
  retailerId: string
): Promise<{ data: CreditLimitAdjustment[] | null; error: Error | null }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("retailer_credit_history")
      .select(
        `
        *,
        processed_by_profile:profiles!retailer_credit_history_processed_by_fkey(
          full_name,
          email
        )
      `
      )
      .eq("retailer_id", retailerId)
      .order("created_at", { ascending: false });

    if (error) {
      return { data: null, error };
    }

    // Format the response
    const adjustments: CreditLimitAdjustment[] = data.map((item) => ({
      ...item,
      processed_by_name: item.processed_by_profile?.full_name,
      processed_by_email: item.processed_by_profile?.email,
    }));

    return { data: adjustments, error: null };
  } catch (error) {
    console.error("Error fetching credit history:", error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}
