import { useEffect, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';

import useRequireRole from '@/hooks/useRequireRole';
import { useDashboardData } from '@/hooks/useDashboardData';
import { processTimeSeriesData, processVoucherTypeData } from '@/utils/salesDataUtils';
import { DashboardStats } from '@/components/admin/dashboard/DashboardStats';
import { DashboardCharts } from '@/components/admin/dashboard/DashboardCharts';
import { SalesTable } from '@/components/admin/dashboard/SalesTable';

export default function AdminDashboard() {
  // Protect this route - only allow admin role
  const { isLoading: isAuthLoading } = useRequireRole('admin');

  // Fetch dashboard data
  const { retailers, todaySales, salesData30Days, isDataLoading, error } =
    useDashboardData(isAuthLoading);

  // Get unique voucher types for filter dropdown
  const voucherTypes = useMemo(() => {
    const types = new Set(salesData30Days.map(sale => sale.voucher_type));
    return Array.from(types).filter(Boolean).sort();
  }, [salesData30Days]);

  // Get unique retailer names for filter dropdown
  const retailerNames = useMemo(() => {
    const names = new Set(salesData30Days.map(sale => sale.retailer_name));
    return Array.from(names).filter(Boolean).sort();
  }, [salesData30Days]);

  // Calculate dashboard metrics
  const todaySalesTotal = todaySales.reduce((sum, sale) => sum + sale.amount, 0);

  // Calculate today's AirVoucher profit using the profit field from database
  const todaysProfit = todaySales.reduce((sum, sale) => {
    return sum + (sale.profit || 0);
  }, 0);

  const activeRetailers = retailers.filter(retailer => retailer.status === 'active').length;

  // We don't have agents data yet, let's estimate based on the retailers
  const agentsCount = new Set(retailers.map(r => r.agent_profile_id).filter(Boolean)).size;

  // Show loading state while checking authentication
  if (isAuthLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="ml-2">Loading authentication...</span>
      </div>
    );
  }

  // Show loading state while fetching data
  if (isDataLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="ml-2">Loading dashboard data...</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center text-red-500">
        <AlertCircle className="mb-4 h-12 w-12" />
        <h2 className="text-xl font-bold">Error Loading Dashboard</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to the Airvoucher admin dashboard.</p>
      </div>

      {/* Dashboard Stats */}
      <DashboardStats
        todaySalesTotal={todaySalesTotal}
        todaysProfit={todaysProfit}
        activeRetailers={activeRetailers}
        retailersTotal={retailers.length}
        agentsCount={agentsCount}
        todaySalesCount={todaySales.length}
      />

      {/* Charts Section */}
      <DashboardCharts
        timeSeriesData={processTimeSeriesData(salesData30Days)}
        voucherTypeData={processVoucherTypeData(salesData30Days)}
        isLoading={isDataLoading}
      />

      {/* Sales Table Section */}
      <SalesTable
        salesData={salesData30Days}
        voucherTypes={voucherTypes}
        retailerNames={retailerNames}
      />
    </div>
  );
}
