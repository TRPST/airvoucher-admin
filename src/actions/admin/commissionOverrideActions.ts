import { createClient } from '@/utils/supabase/client';
import type { ResponseType } from '../types/adminTypes';

export type VoucherCommissionOverride = {
  voucher_type_id: string;
  amount: number;
  supplier_pct: number;
  retailer_pct: number;
  agent_pct: number;
};

export async function getVoucherCommissionOverride(
  voucher_type_id: string,
  amount: number
): Promise<ResponseType<VoucherCommissionOverride | null>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('voucher_commission_overrides')
    .select('*')
    .eq('voucher_type_id', voucher_type_id)
    .eq('amount', amount)
    .single();
  return { data, error };
}

export async function upsertVoucherCommissionOverride(
  override: VoucherCommissionOverride
): Promise<ResponseType<VoucherCommissionOverride>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('voucher_commission_overrides')
    .upsert([override], { onConflict: 'voucher_type_id,amount' })
    .select('*')
    .single();
  return { data, error };
}

export async function getVoucherCommissionOverridesForType(
  voucher_type_id: string
): Promise<ResponseType<VoucherCommissionOverride[]>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('voucher_commission_overrides')
    .select('*')
    .eq('voucher_type_id', voucher_type_id);
  return { data, error };
}
