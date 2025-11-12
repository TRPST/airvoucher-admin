import { createClient } from '@/utils/supabase/client';
import { SalesReport, EarningsSummary, InventoryReport, ResponseType } from '../types/adminTypes';

/**
 * Fetch sales report with optional date filtering
 * Uses grouped sales RPC function to combine bulk sales
 */
export async function fetchSalesReport({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
}): Promise<ResponseType<SalesReport[]>> {
  const supabase = createClient();

  // Call the grouped sales RPC function
  const { data, error } = await supabase.rpc('get_grouped_sales_report', {
    start_date: startDate || null,
    end_date: endDate || null,
  });

  if (error) {
    return { data: null, error };
  }

  // Map the RPC response to SalesReport format
  const salesReport: SalesReport[] = (data || []).map((sale: any) => ({
    id: sale.first_sale_id || sale.group_id,
    created_at: sale.created_at,
    terminal_name: sale.terminal_name || '',
    terminal_short_code: sale.terminal_short_code || '',
    retailer_name: sale.retailer_name || '',
    retailer_short_code: sale.retailer_short_code || '',
    agent_name: sale.agent_name || '',
    commission_group_name: sale.commission_group_name || '',
    commission_group_id: sale.commission_group_id || '',
    voucher_type: sale.voucher_type || '',
    supplier_commission_pct: sale.supplier_commission_pct || 0,
    supplier_commission: sale.total_supplier_commission || 0,
    amount: sale.total_amount || 0,
    retailer_commission: sale.total_retailer_commission || 0,
    agent_commission: sale.total_agent_commission || 0,
    profit: sale.total_profit || 0,
    quantity: sale.quantity || 1,
    sale_ids: sale.sale_ids || [],
  }));

  return { data: salesReport, error: null };
}

/**
 * Fetch earnings summary with optional date filtering
 */
export async function fetchEarningsSummary({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
}): Promise<ResponseType<EarningsSummary[]>> {
  const supabase = createClient();

  // This is a complex query, so we'll use a custom SQL function or client-side aggregation
  let query = supabase.from('sales').select(`
      sale_amount,
      retailer_commission,
      agent_commission,
      profit,
      voucher_inventory!inner (
        voucher_types!inner (name)
      )
    `);

  if (startDate) {
    query = query.gte('created_at', startDate);
  }

  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error };
  }

  // Client-side aggregation to calculate summaries by voucher type
  const summaryMap = new Map<string, EarningsSummary>();

  for (const sale of data as any[]) {
    const voucherType = sale.voucher_inventory?.voucher_types?.name || 'Unknown';
    const amount = sale.sale_amount || 0;
    const retailerCommission = sale.retailer_commission || 0;
    const agentCommission = sale.agent_commission || 0;
    const profit = sale.profit || 0;

    // Use the actual profit from database instead of calculating platform commission
    const platformCommission = profit;

    if (!summaryMap.has(voucherType)) {
      summaryMap.set(voucherType, {
        voucher_type: voucherType,
        total_sales: 0,
        total_amount: 0,
        retailer_commission: 0,
        agent_commission: 0,
        platform_commission: 0,
      });
    }

    const summary = summaryMap.get(voucherType)!;
    summary.total_sales += 1;
    summary.total_amount += amount;
    summary.retailer_commission += retailerCommission;
    summary.agent_commission += agentCommission;
    summary.platform_commission += platformCommission;
  }

  return { data: Array.from(summaryMap.values()), error: null };
}

/**
 * Fetch inventory report with counts by status and voucher type
 */
export async function fetchInventoryReport(): Promise<ResponseType<InventoryReport[]>> {
  const supabase = createClient();

  const { data, error } = await supabase.from('voucher_inventory').select(`
      status,
      voucher_types!inner (name)
    `);

  if (error) {
    return { data: null, error };
  }

  // Client-side aggregation to count vouchers by type and status
  const reportMap = new Map<string, InventoryReport>();

  for (const voucher of data as any[]) {
    const voucherType = voucher.voucher_types?.name || 'Unknown';

    if (!reportMap.has(voucherType)) {
      reportMap.set(voucherType, {
        voucher_type: voucherType,
        available: 0,
        sold: 0,
        disabled: 0,
      });
    }

    const report = reportMap.get(voucherType)!;

    if (voucher.status === 'available') {
      report.available += 1;
    } else if (voucher.status === 'sold') {
      report.sold += 1;
    } else if (voucher.status === 'disabled') {
      report.disabled += 1;
    }
  }

  return { data: Array.from(reportMap.values()), error: null };
}
