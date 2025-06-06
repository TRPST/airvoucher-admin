import { SalesReport } from '@/actions/adminActions';
import { SalesDataPoint } from '@/components/admin/charts/SalesOverTimeChart';
import { VoucherTypeSales } from '@/components/admin/charts/SalesByVoucherTypeChart';

// Process sales data for time series chart
export function processTimeSeriesData(salesData: SalesReport[]): SalesDataPoint[] {
  if (!salesData || salesData.length === 0) return [];

  // Group sales by date
  const salesByDate = salesData.reduce<Record<string, number>>((acc, sale) => {
    // Extract the date part from the ISO string
    const date = sale.created_at.split('T')[0];
    acc[date] = (acc[date] || 0) + sale.amount;
    return acc;
  }, {});

  // Create sorted array of dates
  const dates = Object.keys(salesByDate).sort();

  // Fill in missing dates in the range
  if (dates.length >= 2) {
    const startDate = new Date(dates[0]);
    const endDate = new Date(dates[dates.length - 1]);
    const result: SalesDataPoint[] = [];

    // Iterate through each day in the range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      // Format date for display (e.g., "May 24")
      const formattedDate = new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      result.push({
        date: dateStr,
        formattedDate,
        amount: salesByDate[dateStr] || 0,
      });
    }
    return result;
  }

  // If only one date or no dates, just return what we have
  return dates.map(date => ({
    date,
    formattedDate: new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    amount: salesByDate[date],
  }));
}

// Process sales data for voucher type chart
export function processVoucherTypeData(salesData: SalesReport[]): VoucherTypeSales[] {
  if (!salesData || salesData.length === 0) return [];

  // Group sales by voucher type
  const salesByType = salesData.reduce<Record<string, number>>((acc, sale) => {
    const voucherType = sale.voucher_type || 'Unknown';
    acc[voucherType] = (acc[voucherType] || 0) + sale.amount;
    return acc;
  }, {});

  // Convert to array format needed by the chart
  return Object.entries(salesByType)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value); // Sort by value descending
}

// Define sorting and filtering types
export type SortField = 'date' | 'voucher_type' | 'amount' | 'retailer_name';
export type SortDirection = 'asc' | 'desc';
