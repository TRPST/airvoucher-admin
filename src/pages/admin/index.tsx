import { useState, useEffect, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';

import useRequireRole from '@/hooks/useRequireRole';
import { useDashboardData } from '@/hooks/useDashboardData';
import { processTimeSeriesData, processVoucherTypeData } from '@/utils/salesDataUtils';
import { fetchSalesReport } from '@/actions/admin/reportActions';
import type { SalesReport } from '@/actions';
import { DashboardStats } from '@/components/admin/dashboard/DashboardStats';
import { DashboardCharts } from '@/components/admin/dashboard/DashboardCharts';
import { SalesTable } from '@/components/admin/dashboard/SalesTable';
import { FilterControls } from '@/components/admin/dashboard/FilterControls';
import { SalesTableModal } from '@/components/admin/reports/SalesTableModal';
import { ExportModal } from '@/components/admin/reports/ExportModal';

type QuickFilter = 'all' | 'today' | 'week' | 'month' | 'lastMonth' | 'year' | 'custom';

export default function AdminDashboard() {
  // Protect this route - only allow admin role
  const { isLoading: isAuthLoading } = useRequireRole('admin');

  // Fetch dashboard data for stats
  const { retailers: retailersList, todaySales, isPrimed, error: dashboardError } =
    useDashboardData(isAuthLoading);

  // Sales data state
  const [sales, setSales] = useState<SalesReport[]>([]);
  const [isSalesLoading, setIsSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState<string | null>(null);

  // Filter state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState<string>('all');
  const [retailerFilter, setRetailerFilter] = useState<string>('all');
  const [retailerShortCodeFilter, setRetailerShortCodeFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [commissionGroupFilter, setCommissionGroupFilter] = useState<string>('all');
  const [terminalFilter, setTerminalFilter] = useState<string>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');

  // Modal state
  const [showTableModal, setShowTableModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Load sales data
  useEffect(() => {
    async function loadSales() {
      setIsSalesLoading(true);
      setSalesError(null);

      try {
        const { data, error: fetchError } = await fetchSalesReport({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        setSales(data || []);
      } catch (err) {
        console.error('Error loading sales:', err);
        setSalesError(err instanceof Error ? err.message : 'Failed to load sales data');
      } finally {
        setIsSalesLoading(false);
      }
    }

    if (isPrimed) {
      loadSales();
    }
  }, [startDate, endDate, isPrimed]);

  // Get unique values for filters
  const voucherTypes = useMemo(() => 
    Array.from(new Set(sales.map(sale => sale.voucher_type).filter(Boolean))) as string[],
    [sales]
  );
  const retailers = useMemo(() => 
    Array.from(new Set(sales.map(sale => sale.retailer_name).filter(Boolean))) as string[],
    [sales]
  );
  const retailerShortCodes = useMemo(() =>
    Array.from(new Set(sales.map(sale => sale.retailer_short_code).filter(Boolean))) as string[],
    [sales]
  );
  const agents = useMemo(() => 
    Array.from(new Set(sales.map(sale => sale.agent_name).filter(Boolean))) as string[],
    [sales]
  );
  const commissionGroups = useMemo(() => 
    Array.from(new Set(sales.map(sale => sale.commission_group_name).filter(Boolean))) as string[],
    [sales]
  );
  const terminals = useMemo(() => 
    Array.from(new Set(sales.map(sale => sale.terminal_short_code).filter(Boolean))) as string[],
    [sales]
  );

  // Quick filter handler
  const handleQuickFilter = (filter: QuickFilter) => {
    setQuickFilter(filter);
    const now = new Date();
    
    switch (filter) {
      case 'today':
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        setStartDate(todayStart.toISOString().split('T')[0]);
        setEndDate(now.toISOString().split('T')[0]);
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        setStartDate(weekStart.toISOString().split('T')[0]);
        setEndDate(now.toISOString().split('T')[0]);
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        setStartDate(monthStart.toISOString().split('T')[0]);
        setEndDate(now.toISOString().split('T')[0]);
        break;
      case 'lastMonth':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        setStartDate(lastMonthStart.toISOString().split('T')[0]);
        setEndDate(lastMonthEnd.toISOString().split('T')[0]);
        break;
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        setStartDate(yearStart.toISOString().split('T')[0]);
        setEndDate(now.toISOString().split('T')[0]);
        break;
      case 'all':
      default:
        setStartDate('');
        setEndDate('');
        break;
    }
  };

  // Filter and sort sales data
  const filteredSales = useMemo(() => {
    let filtered = [...sales];

    // Apply voucher type filter
    if (voucherTypeFilter !== 'all') {
      filtered = filtered.filter(sale => sale.voucher_type === voucherTypeFilter);
    }

    // Apply retailer filter
    if (retailerFilter !== 'all') {
      filtered = filtered.filter(sale => sale.retailer_name === retailerFilter);
    }

    if (retailerShortCodeFilter !== 'all') {
      filtered = filtered.filter(sale => sale.retailer_short_code === retailerShortCodeFilter);
    }

    // Apply agent filter
    if (agentFilter !== 'all') {
      filtered = filtered.filter(sale => sale.agent_name === agentFilter);
    }

    // Apply commission group filter
    if (commissionGroupFilter !== 'all') {
      filtered = filtered.filter(sale => sale.commission_group_name === commissionGroupFilter);
    }

    // Apply terminal filter
    if (terminalFilter !== 'all') {
      filtered = filtered.filter(sale => sale.terminal_short_code === terminalFilter);
    }

    return filtered;
  }, [
    sales,
    voucherTypeFilter,
    retailerFilter,
    retailerShortCodeFilter,
    agentFilter,
    commissionGroupFilter,
    terminalFilter,
  ]);

  // Calculate dashboard metrics
  const todaySalesTotal = todaySales.reduce((sum, sale) => sum + sale.amount, 0);
  const todaysProfit = todaySales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
  const activeRetailers = retailersList.filter(retailer => retailer.status === 'active').length;
  const agentsCount = new Set(retailersList.map(r => r.agent_profile_id).filter(Boolean)).size;

  // Process data for charts
  const timeSeriesData = useMemo(() => processTimeSeriesData(filteredSales), [filteredSales]);
  const voucherTypeData = useMemo(() => processVoucherTypeData(filteredSales), [filteredSales]);

  // Initial load only: show while cache is not primed yet
  if (!isPrimed) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="ml-2">Loading dashboard data...</span>
      </div>
    );
  }

  // Show error state
  if (dashboardError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center text-red-500">
        <AlertCircle className="mb-4 h-12 w-12" />
        <h2 className="text-xl font-bold">Error Loading Dashboard</h2>
        <p>{dashboardError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sticky header section */}
      <div className="sticky top-0 z-10 -mx-6 border-b border-border bg-background px-6 pb-4 pt-6 md:-mx-8 md:px-8" style={{marginTop: -40}}>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to the Airvoucher admin dashboard.</p>
      </div>

      {/* Dashboard Stats */}
      <DashboardStats
        todaySalesTotal={todaySalesTotal}
        todaysProfit={todaysProfit}
        activeRetailers={activeRetailers}
        retailersTotal={retailersList.length}
        agentsCount={agentsCount}
        todaySalesCount={todaySales.length}
      />

      {/* Filter Controls */}
      <FilterControls
        startDate={startDate}
        endDate={endDate}
        quickFilter={quickFilter}
        onStartDateChange={(date) => {
          setStartDate(date);
          if (date) setQuickFilter('custom');
        }}
        onEndDateChange={(date) => {
          setEndDate(date);
          if (date) setQuickFilter('custom');
        }}
        onQuickFilterChange={handleQuickFilter}
        voucherTypeFilter={voucherTypeFilter}
        retailerFilter={retailerFilter}
        retailerShortCodeFilter={retailerShortCodeFilter}
        agentFilter={agentFilter}
        commissionGroupFilter={commissionGroupFilter}
        terminalFilter={terminalFilter}
        onVoucherTypeFilterChange={setVoucherTypeFilter}
        onRetailerFilterChange={setRetailerFilter}
        onRetailerShortCodeFilterChange={setRetailerShortCodeFilter}
        onAgentFilterChange={setAgentFilter}
        onCommissionGroupFilterChange={setCommissionGroupFilter}
        onTerminalFilterChange={setTerminalFilter}
        voucherTypes={voucherTypes}
        retailers={retailers}
        retailerShortCodes={retailerShortCodes}
        agents={agents}
        commissionGroups={commissionGroups}
        terminals={terminals}
        totalSales={filteredSales.length}
      />

      {/* Charts Section */}
      <DashboardCharts
        timeSeriesData={timeSeriesData}
        voucherTypeData={voucherTypeData}
        isLoading={isSalesLoading}
      />

      {/* Sales Table Section */}
      <SalesTable
        sales={filteredSales}
        isLoading={isSalesLoading}
        error={salesError}
        onOpenModal={() => setShowTableModal(true)}
        onExport={() => setShowExportModal(true)}
      />

      {/* Modals */}
      <SalesTableModal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        sales={filteredSales}
        initialSortField="date"
        initialSortDirection="desc"
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        sales={filteredSales}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}
