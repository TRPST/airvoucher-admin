import { useState, useEffect } from 'react';
import {
  fetchRetailers,
  fetchSalesReport,
  fetchEarningsSummary,
  type Retailer,
  type SalesReport,
} from '@/actions/adminActions';

interface UseDashboardDataReturn {
  retailers: Retailer[];
  todaySales: SalesReport[];
  salesData30Days: SalesReport[];
  platformCommission: number;
  isDataLoading: boolean;
  error: string | null;
}

export function useDashboardData(isAuthLoading: boolean): UseDashboardDataReturn {
  // State for dashboard data
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [todaySales, setTodaySales] = useState<SalesReport[]>([]);
  const [platformCommission, setPlatformCommission] = useState(0);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesData30Days, setSalesData30Days] = useState<SalesReport[]>([]);

  // Fetch dashboard data
  useEffect(() => {
    async function loadDashboardData() {
      setIsDataLoading(true);
      try {
        console.log('Loading admin dashboard data...');

        // Get retailers
        const { data: retailersData, error: retailersError } = await fetchRetailers();
        if (retailersError) {
          throw new Error(`Error fetching retailers: ${retailersError.message}`);
        }

        // Get today's sales
        const today = new Date().toISOString().split('T')[0];
        const { data: salesData, error: salesError } = await fetchSalesReport({
          startDate: today,
          endDate: new Date().toISOString(),
        });
        if (salesError) {
          throw new Error(`Error fetching sales: ${salesError.message}`);
        }

        // Get sales for past 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        const { data: salesData30Days, error: salesError30Days } = await fetchSalesReport({
          startDate: thirtyDaysAgoStr,
          endDate: new Date().toISOString(),
        });
        if (salesError30Days) {
          throw new Error(`Error fetching 30-day sales: ${salesError30Days.message}`);
        }

        // Get earnings summary
        const { data: earningsData, error: earningsError } = await fetchEarningsSummary({
          startDate: today,
          endDate: new Date().toISOString(),
        });
        if (earningsError) {
          throw new Error(`Error fetching earnings: ${earningsError.message}`);
        }

        console.log('salesData30Days: ', salesData30Days);

        // Debug: Display profit values from database
        if (salesData30Days && salesData30Days.length > 0) {
          console.log('DEBUG: Profit values from database by voucher type:');

          // Group by voucher type to see the pattern
          const voucherTypeMap = new Map();
          salesData30Days.forEach(sale => {
            const key = sale.voucher_type;
            if (!voucherTypeMap.has(key)) {
              const retailerPct = ((sale.retailer_commission / sale.amount) * 100).toFixed(2);
              const agentPct = ((sale.agent_commission / sale.amount) * 100).toFixed(2);

              voucherTypeMap.set(key, {
                voucher_type: sale.voucher_type,
                amount: sale.amount,
                supplier_commission_pct: sale.supplier_commission_pct,
                retailer_commission: sale.retailer_commission,
                agent_commission: sale.agent_commission,
                profit_from_db: sale.profit || 0,
                retailer_pct_calculated: retailerPct + '%',
                agent_pct_calculated: agentPct + '%',
              });
            }
          });

          console.table(Array.from(voucherTypeMap.values()));
        }

        // Update state with fetched data
        setRetailers(retailersData || []);
        setTodaySales(salesData || []);
        setSalesData30Days(salesData30Days || []);

        // Calculate platform commission
        const commission =
          earningsData?.reduce((sum, item) => sum + item.platform_commission, 0) || 0;
        setPlatformCommission(commission);

        console.log('Dashboard data loaded successfully');
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsDataLoading(false);
      }
    }

    if (!isAuthLoading) {
      loadDashboardData();
    }
  }, [isAuthLoading]);

  return {
    retailers,
    todaySales,
    salesData30Days,
    platformCommission,
    isDataLoading,
    error,
  };
}
