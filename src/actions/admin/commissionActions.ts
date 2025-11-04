import { createClient } from "@/utils/supabase/client";
import { CommissionGroup, ResponseType } from "../types/adminTypes";

export type VoucherType = {
  id: string;
  name: string;
  supplier_commission_pct?: number;
};

/**
 * Fetch all commission groups with their rates
 */
export async function fetchCommissionGroups(): Promise<
  ResponseType<CommissionGroup[]>
> {
  const supabase = createClient();
  
  const { data: groups, error: groupsError } = await supabase
    .from("commission_groups")
    .select("id, name, description")
    .eq('is_active', true);

  if (groupsError) {
    return { data: null, error: groupsError };
  }

  // For each group, fetch its rates
  const result: CommissionGroup[] = [];

  for (const group of groups) {
    const { data: rates, error: ratesError } = await supabase
      .from("commission_group_rates")
      .select(
        `
        id,
        voucher_type_id,
        retailer_pct,
        agent_pct,
        supplier_pct,
        voucher_types:voucher_type_id (name)
      `
      )
      .eq("commission_group_id", group.id);

    if (ratesError) {
      return { data: null, error: ratesError };
    }

    // Transform the rates data
    const transformedRates = rates.map((rate: any) => {
      // Extract the voucher type name using a type-safe approach
      let voucherTypeName = "";
      
      // Use type assertions and optional chaining to safely extract the name
      const voucherTypesData = rate.voucher_types as any;
      
      if (voucherTypesData) {
        voucherTypeName = voucherTypesData.name || "";
      }
      
      return {
        id: rate.id,
        voucher_type_id: rate.voucher_type_id,
        retailer_pct: rate.retailer_pct,
        agent_pct: rate.agent_pct,
        supplier_pct: rate.supplier_pct,
        voucher_type_name: voucherTypeName,
      };
    });

    result.push({
      id: group.id,
      name: group.name,
      description: group.description,
      rates: transformedRates,
    });
  }

  return { data: result, error: null };
}

/**
 * Fetch all voucher types from the database
 * @param includeInactive - Whether to include inactive voucher types (default: false)
 */
export async function fetchVoucherTypes(includeInactive: boolean = false): Promise<ResponseType<VoucherType[]>> {
  const supabase = createClient();
  
  let query = supabase
    .from("voucher_types")
    .select("id, name, supplier_commission_pct, category, sub_category, network_provider");

  // Filter by active status unless explicitly including inactive types
  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.order("name");

  return { data, error };
}

/**
 * Create a new commission group
 */
export async function createCommissionGroup(
  name: string,
  description?: string
): Promise<ResponseType<{ id: string }>> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("commission_groups")
    .insert({ name, description })
    .select("id")
    .single();

  return { data, error };
}

/**
 * Create multiple commission rates for a group at once
 */
export async function createCommissionRates(
  rates: {
    commission_group_id: string;
    voucher_type_id: string;
    retailer_pct: number;
    agent_pct: number;
    supplier_pct: number;
  }[]
): Promise<ResponseType<{ count: number }>> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("commission_group_rates")
    .insert(rates);

  return { 
    data: { count: rates.length }, 
    error 
  };
}

export async function upsertCommissionRate(
  groupId: string,
  typeId: string,
  retailerPct: number,
  agentPct: number,
  supplierPct?: number
): Promise<ResponseType<{ id: string }>> {
  const supabase = createClient();
  
  const upsertData: {
    commission_group_id: string;
    voucher_type_id: string;
    retailer_pct: number;
    agent_pct: number;
    supplier_pct?: number;
  } = {
    commission_group_id: groupId,
    voucher_type_id: typeId,
    retailer_pct: retailerPct,
    agent_pct: agentPct,
  };

  // Only include supplier_pct if provided
  if (supplierPct !== undefined) {
    upsertData.supplier_pct = supplierPct;
  }

  const { data, error } = await supabase
    .from("commission_group_rates")
    .upsert(upsertData, {
      onConflict: "commission_group_id,voucher_type_id",
    })
    .select("id")
    .single();

  return { data, error };
}
