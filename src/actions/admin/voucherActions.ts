import { createClient } from '@/utils/supabase/client';
import { VoucherInventory, ResponseType } from '../types/adminTypes';

/**
 * Fetch a single voucher type by ID
 */
export async function fetchVoucherType(
  id: string
): Promise<ResponseType<{ id: string; name: string; supplier_commission_pct: number }>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('voucher_types')
    .select('id, name, supplier_commission_pct')
    .eq('id', id)
    .single();

  return { data, error };
}

/**
 * Update the supplier commission percentage for a voucher type
 */
export async function updateSupplierCommission(
  id: string,
  supplierCommissionPct: number
): Promise<ResponseType<{ id: string }>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('voucher_types')
    .update({ supplier_commission_pct: supplierCommissionPct })
    .eq('id', id)
    .select('id')
    .single();

  return { data, error };
}

export type VoucherTypeSummary = {
  id: string;
  name: string;
  totalVouchers: number;
  availableVouchers: number;
  soldVouchers: number;
  disabledVouchers: number;
  uniqueAmounts: number[];
  totalValue: number;
  icon?: string;
  supplierCommissionPct?: number;
};

/**
 * Fetch voucher inventory with voucher type names
 * @param typeId Optional parameter to filter vouchers by type ID
 */
export async function fetchVoucherInventory(
  typeId?: string
): Promise<ResponseType<VoucherInventory[]>> {
  const supabase = createClient();

  // First, get all voucher types to use as a lookup table
  const { data: voucherTypes, error: typesError } = await supabase
    .from('voucher_types')
    .select('id, name');

  if (typesError) {
    return { data: null, error: typesError };
  }

  // Create a lookup map for voucher type names by ID
  const typeNameMap = new Map<string, string>();
  voucherTypes.forEach((type: { id: string; name: string }) => {
    typeNameMap.set(type.id, type.name);
  });

  // Now get all voucher inventory using pagination to overcome Supabase's default 1000 row limit
  let allData: any[] = [];
  let hasMore = true;
  let page = 0;
  const pageSize = 1000;

  while (hasMore) {
    // Build query with optional type filter
    let query = supabase.from('voucher_inventory').select('*');

    // Apply type filter if provided
    if (typeId) {
      query = query.eq('voucher_type_id', typeId);
    }

    // Apply pagination
    const { data: pageData, error: pageError } = await query.range(
      page * pageSize,
      (page + 1) * pageSize - 1
    );

    if (pageError) {
      return { data: null, error: pageError };
    }

    if (pageData.length > 0) {
      allData = [...allData, ...pageData];
      page++;
    } else {
      hasMore = false;
    }

    // Safety check to prevent infinite loops
    if (page > 20) {
      hasMore = false;
    }
  }

  const data = allData;

  if (data.length === 0) {
    return {
      data: null,
      error: new Error('No voucher inventory data found'),
    };
  }

  // Transform the data to match the VoucherInventory type, using the lookup table
  const inventory = data.map(voucher => ({
    id: voucher.id,
    amount: voucher.amount,
    pin: voucher.pin,
    serial_number: voucher.serial_number,
    expiry_date: voucher.expiry_date,
    status: voucher.status as 'available' | 'sold' | 'disabled',
    voucher_type_name: typeNameMap.get(voucher.voucher_type_id) || '',
  }));

  return { data: inventory, error: null };
}

/**
 * Upload multiple vouchers to the inventory
 */
export async function uploadVouchers(
  vouchers: Array<{
    voucher_type_id: string;
    amount: number;
    pin: string;
    serial_number?: string;
    expiry_date?: string;
  }>
): Promise<ResponseType<{ count: number }>> {
  const supabase = createClient();

  const { data, error } = await supabase.from('voucher_inventory').insert(
    vouchers.map(v => ({
      ...v,
      status: 'available',
    }))
  );

  if (error) {
    return { data: null, error };
  }

  return { data: { count: vouchers.length }, error: null };
}

/**
 * Disable a voucher in the inventory
 */
export async function disableVoucher(id: string): Promise<ResponseType<{ id: string }>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('voucher_inventory')
    .update({ status: 'disabled' })
    .eq('id', id)
    .select('id')
    .single();

  return { data, error };
}

/**
 * Fetch voucher type summaries for the main page - OPTIMIZED VERSION
 */
export async function fetchVoucherTypeSummaries(): Promise<ResponseType<VoucherTypeSummary[]>> {
  const supabase = createClient();

  try {
    // Get all voucher types with supplier commission percentage
    const { data: voucherTypes, error: typesError } = await supabase
      .from('voucher_types')
      .select('id, name, supplier_commission_pct');

    if (typesError) {
      return { data: null, error: typesError };
    }

    // Return empty array if no voucher types found
    if (!voucherTypes || voucherTypes.length === 0) {
      return { data: [], error: null };
    }

    // Fetch aggregated stats for all voucher types in parallel
    const summariesPromises = voucherTypes.map(
      async (type: { id: string; name: string; supplier_commission_pct: number }) => {
        // Get aggregated stats for this voucher type
        const { data: statsData, error: statsError } = await supabase.rpc(
          'get_voucher_type_stats',
          { type_id: type.id }
        );

        let stats = {
          totalVouchers: 0,
          availableVouchers: 0,
          soldVouchers: 0,
          disabledVouchers: 0,
          totalValue: 0,
          uniqueAmounts: [] as number[],
        };

        // If RPC doesn't exist or fails, fall back to manual aggregation
        if (statsError || !statsData) {
          // Get counts by status
          const statusPromises = ['available', 'sold', 'disabled'].map(async status => {
            const { count } = await supabase
              .from('voucher_inventory')
              .select('*', { count: 'exact', head: true })
              .eq('voucher_type_id', type.id)
              .eq('status', status);
            return { status, count: count || 0 };
          });

          const statusCounts = await Promise.all(statusPromises);

          statusCounts.forEach(({ status, count }) => {
            stats.totalVouchers += count;
            if (status === 'available') stats.availableVouchers = count;
            else if (status === 'sold') stats.soldVouchers = count;
            else if (status === 'disabled') stats.disabledVouchers = count;
          });

          // Get total value and unique amounts for available vouchers only
          if (stats.availableVouchers > 0) {
            const { data: amountData } = await supabase
              .from('voucher_inventory')
              .select('amount')
              .eq('voucher_type_id', type.id)
              .eq('status', 'available')
              .limit(1000); // Limit to prevent huge queries

            if (amountData) {
              const amounts = new Set<number>();
              amountData.forEach((v: { amount: number }) => {
                amounts.add(v.amount);
                stats.totalValue += v.amount;
              });
              stats.uniqueAmounts = Array.from(amounts).sort((a, b) => a - b);
            }
          }
        } else {
          // Use RPC results if available
          stats = {
            totalVouchers: statsData.total_vouchers || 0,
            availableVouchers: statsData.available_vouchers || 0,
            soldVouchers: statsData.sold_vouchers || 0,
            disabledVouchers: statsData.disabled_vouchers || 0,
            totalValue: statsData.total_value || 0,
            uniqueAmounts: statsData.unique_amounts || [],
          };
        }

        // Determine icon based on name
        let icon = 'credit-card';
        if (type.name.toLowerCase().includes('ringa')) {
          icon = 'phone';
        } else if (type.name.toLowerCase().includes('hollywood')) {
          icon = 'film';
        } else if (type.name.toLowerCase().includes('easyload')) {
          icon = 'zap';
        }

        return {
          id: type.id,
          name: type.name,
          ...stats,
          icon,
          supplierCommissionPct: type.supplier_commission_pct,
        };
      }
    );

    const summaries = await Promise.all(summariesPromises);

    return { data: summaries, error: null };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Failed to fetch voucher type summaries'),
    };
  }
}
