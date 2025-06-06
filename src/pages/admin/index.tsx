import { useEffect, useState, useMemo } from 'react';
import {
  Activity,
  DollarSign,
  Store,
  Users,
  AlertCircle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { StatsTile } from '@/components/ui/stats-tile';
import { StickyStatsHeader } from '@/components/admin/StickyStatsHeader';
import {
  SalesOverTimeChart,
  type SalesDataPoint,
} from '@/components/admin/charts/SalesOverTimeChart';
import {
  SalesByVoucherTypeChart,
  type VoucherTypeSales,
} from '@/components/admin/charts/SalesByVoucherTypeChart';
import useRequireRole from '@/hooks/useRequireRole';
import { cn } from '@/utils/cn';
import {
  fetchRetailers,
  fetchSalesReport,
  fetchEarningsSummary,
  type Retailer,
  type SalesReport,
} from '@/actions/adminActions';

// Process sales data for time series chart
function processTimeSeriesData(salesData: SalesReport[]): SalesDataPoint[] {
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
function processVoucherTypeData(salesData: SalesReport[]): VoucherTypeSales[] {
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

// Define sorting options (removed terminal_name)
type SortField = 'date' | 'voucher_type' | 'amount' | 'retailer_name';
type SortDirection = 'asc' | 'desc';

export default function AdminDashboard() {
  // State for dashboard data
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [todaySales, setTodaySales] = useState<SalesReport[]>([]);
  const [platformCommission, setPlatformCommission] = useState(0);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesData30Days, setSalesData30Days] = useState<SalesReport[]>([]);

  // Table state
  const [searchTerm, setSearchTerm] = useState('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState<string>('all');
  const [retailerNameFilter, setRetailerNameFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Protect this route - only allow admin role
  const { isLoading: isAuthLoading } = useRequireRole('admin');

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

  // Filter and sort sales data
  const filteredAndSortedSales = useMemo(() => {
    let filtered = [...salesData30Days];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        sale =>
          sale.voucher_type?.toLowerCase().includes(term) ||
          sale.retailer_name?.toLowerCase().includes(term) ||
          sale.id.toLowerCase().includes(term)
      );
    }

    // Apply voucher type filter
    if (voucherTypeFilter !== 'all') {
      filtered = filtered.filter(sale => sale.voucher_type === voucherTypeFilter);
    }

    // Apply retailer name filter
    if (retailerNameFilter !== 'all') {
      filtered = filtered.filter(sale => sale.retailer_name === retailerNameFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortField) {
        case 'date':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'voucher_type':
          aValue = a.voucher_type || '';
          bValue = b.voucher_type || '';
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'retailer_name':
          aValue = a.retailer_name || '';
          bValue = b.retailer_name || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [
    salesData30Days,
    searchTerm,
    voucherTypeFilter,
    retailerNameFilter,
    sortField,
    sortDirection,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSales = filteredAndSortedSales.slice(startIndex, startIndex + itemsPerPage);

  // Table data formatting - Now using profit directly from database
  const tableData = useMemo(() => {
    return paginatedSales.map(sale => {
      // Use the profit field directly from the database (calculated by RPC function)
      const airVoucherProfit = sale.profit || 0;

      // Calculate supplier commission amount
      const supplierCommissionAmount = sale.amount * (sale.supplier_commission_pct / 100);

      return {
        Date: new Date(sale.created_at).toLocaleString('en-ZA', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        Type: (
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                sale.voucher_type === 'Mobile'
                  ? 'bg-primary'
                  : sale.voucher_type === 'OTT'
                    ? 'bg-purple-500'
                    : sale.voucher_type === 'Hollywoodbets'
                      ? 'bg-green-500'
                      : sale.voucher_type === 'Ringa'
                        ? 'bg-amber-500'
                        : 'bg-pink-500'
              )}
            />
            <span>{sale.voucher_type || 'Unknown'}</span>
          </div>
        ),
        Amount: `R ${sale.amount.toFixed(2)}`,
        Retailer: sale.retailer_name || 'Unknown',
        'Supp. Com.': `R ${supplierCommissionAmount.toFixed(2)}`,
        'Ret. Com.': `R ${sale.retailer_commission.toFixed(2)}`,
        'Agent Com.': `R ${sale.agent_commission.toFixed(2)}`,
        'AV Profit': (
          <span
            className={cn('font-medium', airVoucherProfit >= 0 ? 'text-green-600' : 'text-red-600')}
          >
            R {airVoucherProfit.toFixed(2)}
          </span>
        ),
      };
    });
  }, [paginatedSales]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, voucherTypeFilter, retailerNameFilter]);

  // Calculate dashboard metrics
  const todaySalesTotal = todaySales.reduce((sum, sale) => sum + sale.amount, 0);

  // Calculate today's AirVoucher profit using the profit field from database
  const todaysProfit = todaySales.reduce((sum, sale) => {
    return sum + (sale.profit || 0);
  }, 0);

  const activeRetailers = retailers.filter(retailer => retailer.status === 'active').length;

  // We don't have agents data yet, let's estimate based on the retailers
  const agentsCount = new Set(retailers.map(r => r.agent_profile_id).filter(Boolean)).size;

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
        <p className="text-muted-foreground">Welcome to your AirVoucher admin dashboard.</p>
      </div>

      {/* Mobile Sticky Stats Header */}
      <StickyStatsHeader
        todaySalesTotal={todaySalesTotal}
        todaysProfit={todaysProfit}
        activeRetailers={activeRetailers}
        agentsCount={agentsCount}
        todaySalesCount={todaySales.length}
      />

      {/* Desktop Stats Grid */}
      <div className="hidden grid-cols-1 gap-4 sm:grid-cols-2 md:grid lg:grid-cols-4">
        <StatsTile
          label="Today's Sales"
          value={`R ${todaySalesTotal.toFixed(2)}`}
          icon={Activity}
          intent="primary"
          subtitle={`${todaySales.length} transactions`}
        />
        <StatsTile
          label="Airvoucher Profit"
          value={`R ${todaysProfit.toFixed(2)}`}
          icon={DollarSign}
          intent="success"
          subtitle="From today's sales"
        />
        <StatsTile
          label="Active Retailers"
          value={activeRetailers}
          icon={Store}
          intent="info"
          subtitle={`${retailers.length} total retailers`}
        />
        <StatsTile
          label="Agents"
          value={agentsCount}
          icon={Users}
          intent="warning"
          subtitle="Total agents assigned"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SalesOverTimeChart
          data={processTimeSeriesData(salesData30Days)}
          isLoading={isDataLoading}
        />
        <SalesByVoucherTypeChart
          data={processVoucherTypeData(salesData30Days)}
          isLoading={isDataLoading}
        />
      </div>

      {/* Sales Table Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Sales</h2>
          <p className="text-sm text-muted-foreground">
            {filteredAndSortedSales.length} total sales
          </p>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search sales..."
                className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium shadow-sm',
                showFilters
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background hover:bg-muted'
              )}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-border bg-card p-4 shadow-sm"
          >
            <h3 className="mb-3 font-medium">Filter Options</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="voucherTypeFilter" className="mb-1 block text-sm font-medium">
                  Voucher Type
                </label>
                <select
                  id="voucherTypeFilter"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={voucherTypeFilter}
                  onChange={e => setVoucherTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  {voucherTypes.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="retailerNameFilter" className="mb-1 block text-sm font-medium">
                  Retailer
                </label>
                <select
                  id="retailerNameFilter"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={retailerNameFilter}
                  onChange={e => setRetailerNameFilter(e.target.value)}
                >
                  <option value="all">All Retailers</option>
                  {retailerNames.map(name => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {/* Sortable Table */}
        {salesData30Days.length > 0 ? (
          <div className="rounded-lg border border-border shadow-sm">
            <div className="overflow-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-card text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="whitespace-nowrap px-4 py-3">
                      <button
                        onClick={() => handleSort('date')}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        Date
                        {sortField === 'date' &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          ))}
                      </button>
                    </th>
                    <th className="whitespace-nowrap px-4 py-3">
                      <button
                        onClick={() => handleSort('voucher_type')}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        Type
                        {sortField === 'voucher_type' &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          ))}
                      </button>
                    </th>
                    <th className="whitespace-nowrap px-4 py-3">
                      <button
                        onClick={() => handleSort('amount')}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        Amount
                        {sortField === 'amount' &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          ))}
                      </button>
                    </th>
                    <th className="whitespace-nowrap px-4 py-3">
                      <button
                        onClick={() => handleSort('retailer_name')}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        Retailer
                        {sortField === 'retailer_name' &&
                          (sortDirection === 'asc' ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          ))}
                      </button>
                    </th>
                    <th className="whitespace-nowrap px-3 py-3">Supp. Com.</th>
                    <th className="whitespace-nowrap px-3 py-3">Ret. Com.</th>
                    <th className="whitespace-nowrap px-3 py-3">Agent Com.</th>
                    <th className="whitespace-nowrap px-3 py-3">AV Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tableData.map((row, index) => (
                    <tr
                      key={`row-${startIndex + index}`}
                      className="border-b border-border transition-colors hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm">{row.Date}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">{row.Type}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                        {row.Amount}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">{row.Retailer}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-orange-600">
                        {row['Supp. Com.']}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-green-600">
                        {row['Ret. Com.']}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-blue-600">
                        {row['Agent Com.']}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm">{row['AV Profit']}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                {/* Results text - condensed on mobile */}
                <div className="text-sm text-muted-foreground">
                  <span className="hidden sm:inline">Showing </span>
                  {startIndex + 1} to{' '}
                  {Math.min(startIndex + itemsPerPage, filteredAndSortedSales.length)} of{' '}
                  {filteredAndSortedSales.length}
                  <span className="hidden sm:inline"> results</span>
                </div>

                {/* Navigation controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">Previous</span>
                  </button>

                  <span className="whitespace-nowrap text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="mr-1 hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-60 flex-col items-center justify-center rounded-lg border border-border bg-card p-8 text-center">
            <div className="mb-3 rounded-full bg-muted p-3">
              <Activity className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-medium">No sales data</h3>
            <p className="mb-4 text-muted-foreground">
              No sales have been recorded in the last 30 days.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
