import { createClient } from '@/utils/supabase/client';
import type { ResponseType } from '../types/adminTypes';

export type CommissionType = 'fixed' | 'percentage';

export type VoucherCommissionOverride = {
  voucher_type_id: string;
  amount: number;
  supplier_pct: number; // Note: Despite name, stores either decimal (0-1) for percentage or fixed rand amount
  retailer_pct: number; // Note: Despite name, stores either decimal (0-1) for percentage or fixed rand amount
  agent_pct: number; // Note: Despite name, stores either decimal (0-1) for percentage or fixed rand amount
  commission_type: CommissionType; // Single unified type applies to all three roles
  commission_group_id?: string;
};

export async function getVoucherCommissionOverride(
  voucher_type_id: string,
  amount: number,
  commission_group_id?: string
): Promise<ResponseType<VoucherCommissionOverride | null>> {
  const supabase = createClient();

  let query = supabase
    .from('voucher_commission_overrides')
    .select('*')
    .eq('voucher_type_id', voucher_type_id)
    .eq('amount', amount);

  if (commission_group_id) {
    query = query.eq('commission_group_id', commission_group_id);
  } else {
    // For backward compatibility, look for global overrides (where commission_group_id is NULL)
    query = query.is('commission_group_id', null);
  }

  const { data, error } = await query.single();
  return { data, error };
}

export async function upsertVoucherCommissionOverride(
  override: VoucherCommissionOverride
): Promise<ResponseType<VoucherCommissionOverride>> {
  const supabase = createClient();

  // Always use the full unique constraint columns since the database constraint is
  // (commission_group_id, voucher_type_id, amount) which includes NULL values
  const { data, error } = await supabase
    .from('voucher_commission_overrides')
    .upsert([override], { onConflict: 'commission_group_id,voucher_type_id,amount' })
    .select('*')
    .single();
  return { data, error };
}

export async function getVoucherCommissionOverridesForType(
  voucher_type_id: string,
  commission_group_id?: string
): Promise<ResponseType<VoucherCommissionOverride[]>> {
  const supabase = createClient();

  let query = supabase
    .from('voucher_commission_overrides')
    .select('*')
    .eq('voucher_type_id', voucher_type_id);

  if (commission_group_id) {
    query = query.eq('commission_group_id', commission_group_id);
  } else {
    // For backward compatibility, look for global overrides (where commission_group_id is NULL)
    query = query.is('commission_group_id', null);
  }

  const { data, error } = await query.order('amount', { ascending: true });
  return { data, error };
}

/**
 * Get all voucher amounts for a specific voucher type
 */
export async function deleteVoucherCommissionOverride(
  voucher_type_id: string,
  amount: number,
  commission_group_id: string
): Promise<ResponseType<null>> {
  const supabase = createClient();

  const { error } = await supabase
    .from('voucher_commission_overrides')
    .delete()
    .eq('voucher_type_id', voucher_type_id)
    .eq('amount', amount)
    .eq('commission_group_id', commission_group_id);

  return { data: null, error };
}

export async function getVoucherAmountsForType(
  voucher_type_id: string
): Promise<ResponseType<{ amount: number }[]>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('voucher_inventory')
    .select('amount')
    .eq('voucher_type_id', voucher_type_id)
    .order('amount', { ascending: true });

  if (error) {
    return { data: null, error };
  }

  // Get unique amounts
  const uniqueAmounts = Array.from(new Set(data?.map(v => v.amount) || []));
  const result = uniqueAmounts.map(amount => ({ amount }));

  return { data: result, error: null };
}
