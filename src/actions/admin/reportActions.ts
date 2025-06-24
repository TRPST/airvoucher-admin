import { createClient } from '@/utils/supabase/client';
import { SalesReport, EarningsSummary, InventoryReport, ResponseType } from '../types/adminTypes';

/**
 * Fetch sales report with optional date filtering
 */
export async function fetchSalesReport({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
}): Promise<ResponseType<SalesReport[]>> {
  const supabase = createClient();

  let query = supabase.from('sales').select(`
    id,
    created_at,
    sale_amount,
    supplier_commission,
    retailer_commission,
    agent_commission,
    profit,
    terminal:terminals (
      name,
      retailer:retailers (
        name
      )
    ),
    voucher:voucher_inventory (
      voucher_type:voucher_types (
        name,
        supplier_commission_pct
      )
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

  const salesReport = data.map((sale: any) => ({
    id: sale.id,
    created_at: sale.created_at,
    terminal_name: sale.terminal?.name || '',
    retailer_name: sale.terminal?.retailer?.name || '',
    voucher_type: sale.voucher?.voucher_type?.name || '',
    supplier_commission_pct: sale.voucher?.voucher_type?.supplier_commission_pct || 0,
    supplier_commission: sale.supplier_commission || 0,
    amount: sale.sale_amount,
    retailer_commission: sale.retailer_commission,
    agent_commission: sale.agent_commission,
    profit: sale.profit || 0,
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
