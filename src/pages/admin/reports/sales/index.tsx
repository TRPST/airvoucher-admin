import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Calendar, ChevronUp, ChevronDown, Activity, TrendingUp, DollarSign, ShoppingCart, Maximize2, Download, HandCoins } from "lucide-react";
import { cn } from "@/utils/cn";
import { fetchSalesReport, type SalesReport } from "@/actions";
import { Layout } from "@/components/Layout";
import { SalesTableModal } from "@/components/admin/reports/SalesTableModal";
import { ExportModal } from "@/components/admin/reports/ExportModal";

type SortField =
  | 'date'
  | 'voucher_type'
  | 'amount'
  | 'retailer_name'
  | 'retailer_short_code'
  | 'agent_name';
type SortDirection = 'asc' | 'desc';
type QuickFilter = 'all' | 'today' | 'week' | 'month' | 'lastMonth' | 'year';

function SalesReportContent() {
  // Data state
  const [sales, setSales] = useState<SalesReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Table state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Modal state
  const [showTableModal, setShowTableModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Load sales data
  useEffect(() => {
    async function loadSales() {
      setIsLoading(true);
      setError(null);

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
        setError(err instanceof Error ? err.message : 'Failed to load sales data');
      } finally {
        setIsLoading(false);
      }
    }

    loadSales();
  }, [startDate, endDate]);

  // Get unique voucher types, retailers, agents, commission groups, and terminals
  const voucherTypes = Array.from(new Set(sales.map(sale => sale.voucher_type).filter(Boolean))) as string[];
  const retailers = Array.from(new Set(sales.map(sale => sale.retailer_name).filter(Boolean))) as string[];
  const retailerShortCodes = Array.from(new Set(sales.map(sale => sale.retailer_short_code).filter(Boolean))) as string[];
  const agents = Array.from(new Set(sales.map(sale => sale.agent_name).filter(Boolean))) as string[];
  const commissionGroups = Array.from(new Set(sales.map(sale => sale.commission_group_name).filter(Boolean))) as string[];
  const terminals = Array.from(new Set(sales.map(sale => sale.terminal_short_code).filter(Boolean))) as string[];

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
  const filteredAndSortedSales = (() => {
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
        case 'retailer_name':
          aValue = a.retailer_name || '';
          bValue = b.retailer_name || '';
          break;
        case 'retailer_short_code':
          aValue = a.retailer_short_code || '';
          bValue = b.retailer_short_code || '';
          break;
        case 'agent_name':
          aValue = a.agent_name || '';
          bValue = b.agent_name || '';
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  })();

  // Calculate totals and statistics
  const stats = (() => {
    return filteredAndSortedSales.reduce(
      (acc, sale) => {
        const supplierCommissionAmount =
          sale.supplier_commission || sale.amount * (sale.supplier_commission_pct / 100);
        const airVoucherProfit = sale.profit || 0;

        return {
          totalSales: acc.totalSales + 1,
          totalAmount: acc.totalAmount + sale.amount,
          supplierCommission: acc.supplierCommission + supplierCommissionAmount,
          retailerCommission: acc.retailerCommission + sale.retailer_commission,
          agentCommission: acc.agentCommission + sale.agent_commission,
          profit: acc.profit + airVoucherProfit,
        };
      },
      {
        totalSales: 0,
        totalAmount: 0,
        supplierCommission: 0,
        retailerCommission: 0,
        agentCommission: 0,
        profit: 0,
      }
    );
  })();

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sticky header section */}
      <div className="-mx-6 border-b border-border bg-background px-6 pb-4 pt-6 md:-mx-8 md:px-8" style={{marginTop: -40}}>
        {/* Back button */}
        <Link href="/admin/reports">
          <button className="inline-flex items-center text-sm font-medium hover:text-primary transition-colors group">
            <ChevronLeft className="mr-2 h-5 w-5 transition-transform duration-200 transform group-hover:-translate-x-1" />
            Back to reports
          </button>
        </Link>

        {/* Header */}
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Sales Report
            </h1>
          </div>
          <p className="text-muted-foreground">
            Comprehensive view of all sales transactions with detailed breakdowns.
          </p>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleQuickFilter('all')}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            quickFilter === 'all'
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          All Time
        </button>
        <button
          onClick={() => handleQuickFilter('today')}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            quickFilter === 'today'
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          Today
        </button>
        <button
          onClick={() => handleQuickFilter('week')}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            quickFilter === 'week'
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          This Week
        </button>
        <button
          onClick={() => handleQuickFilter('month')}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            quickFilter === 'month'
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          This Month
        </button>
        <button
          onClick={() => handleQuickFilter('lastMonth')}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            quickFilter === 'lastMonth'
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          Last Month
        </button>
        <button
          onClick={() => handleQuickFilter('year')}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            quickFilter === 'year'
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          This Year
        </button>
      </div>

      {/* Custom Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium mb-2">
            Start Date
          </label>
          <input
            type="date"
            id="startDate"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setQuickFilter('all');
            }}
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium mb-2">
            End Date
          </label>
          <input
            type="date"
            id="endDate"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setQuickFilter('all');
            }}
          />
        </div>
      </div>

      {/* Statistics Cards */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">{stats.totalSales}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">R {stats.totalAmount.toFixed(2)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <HandCoins className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">AirVoucher Profit</p>
                <p className={cn(
                  "text-2xl font-bold",
                  stats.profit >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  R {stats.profit.toFixed(2)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium text-muted-foreground mb-1">Supplier Commission</p>
            <p className="text-lg font-bold text-pink-600">R {stats.supplierCommission.toFixed(2)}</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium text-muted-foreground mb-1">Retailer Commission</p>
            <p className="text-lg font-bold text-purple-600">R {stats.retailerCommission.toFixed(2)}</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium text-muted-foreground mb-1">Agent Commission</p>
            <p className="text-lg font-bold text-blue-600">R {stats.agentCommission.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label htmlFor="voucherTypeFilter" className="block text-sm font-medium mb-2">
            Filter by Voucher Type
          </label>
          <select
            id="voucherTypeFilter"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={voucherTypeFilter}
            onChange={(e) => setVoucherTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            {voucherTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="retailerFilter" className="block text-sm font-medium mb-2">
            Filter by Retailer
          </label>
          <select
            id="retailerFilter"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={retailerFilter}
            onChange={(e) => setRetailerFilter(e.target.value)}
          >
            <option value="all">All Retailers</option>
            {retailers.map((retailer) => (
              <option key={retailer} value={retailer}>
                {retailer}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="retailerShortCodeFilter" className="block text-sm font-medium mb-2">
            Filter by Retailer ID
          </label>
          <select
            id="retailerShortCodeFilter"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={retailerShortCodeFilter}
            onChange={(e) => setRetailerShortCodeFilter(e.target.value)}
          >
            <option value="all">All Retailer IDs</option>
            {retailerShortCodes.map((shortCode) => (
              <option key={shortCode} value={shortCode}>
                {shortCode}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="agentFilter" className="block text-sm font-medium mb-2">
            Filter by Agent
          </label>
          <select
            id="agentFilter"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
          >
            <option value="all">All Agents</option>
            {agents.map((agent) => (
              <option key={agent} value={agent}>
                {agent}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="commissionGroupFilter" className="block text-sm font-medium mb-2">
            Filter by Commission Group
          </label>
          <select
            id="commissionGroupFilter"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={commissionGroupFilter}
            onChange={(e) => setCommissionGroupFilter(e.target.value)}
          >
            <option value="all">All Groups</option>
            {commissionGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="terminalFilter" className="block text-sm font-medium mb-2">
            Filter by Terminal ID
          </label>
          <select
            id="terminalFilter"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={terminalFilter}
            onChange={(e) => setTerminalFilter(e.target.value)}
          >
            <option value="all">All Terminals</option>
            {terminals.map((terminal) => (
              <option key={terminal} value={terminal}>
                {terminal}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex h-60 items-center justify-center rounded-lg border border-border bg-card">
          <div className="text-center">
            <div className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="text-sm text-muted-foreground">Loading sales data...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex h-60 items-center justify-center rounded-lg border border-border bg-card">
          <div className="text-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        </div>
      )}

      {/* Sales Table */}
      {!isLoading && !error && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredAndSortedSales.length} total sales
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTableModal(true)}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
              >
                <Maximize2 className="h-4 w-4" />
                Open Modal
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted transition-colors"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>

          {filteredAndSortedSales.length > 0 ? (
            <div className="rounded-lg border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto max-h-[95vh] overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10 bg-muted text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="whitespace-nowrap px-4 py-3">
                        <button
                          onClick={() => handleSort('date')}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          DATE
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
                          onClick={() => handleSort('retailer_name')}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          RETAILER
                          {sortField === 'retailer_name' &&
                            (sortDirection === 'asc' ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            ))}
                        </button>
                      </th>
                      <th className="whitespace-nowrap px-4 py-3">
                        <button
                          onClick={() => handleSort('retailer_short_code')}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          RETAILER ID
                          {sortField === 'retailer_short_code' &&
                            (sortDirection === 'asc' ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            ))}
                        </button>
                      </th>
                      <th className="whitespace-nowrap px-4 py-3">
                        <button
                          onClick={() => handleSort('agent_name')}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          AGENT
                          {sortField === 'agent_name' &&
                            (sortDirection === 'asc' ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            ))}
                        </button>
                      </th>
                      <th className="whitespace-nowrap px-4 py-3">COM. GROUP</th>
                      <th className="whitespace-nowrap px-4 py-3">TERMINAL ID</th>
                      <th className="whitespace-nowrap px-4 py-3">
                        <button
                          onClick={() => handleSort('voucher_type')}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          TYPE
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
                          AMOUNT
                          {sortField === 'amount' &&
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
                    {filteredAndSortedSales.map((sale, index) => {
                      const airVoucherProfit = sale.profit || 0;
                      const supplierCommissionAmount =
                        sale.supplier_commission || sale.amount * (sale.supplier_commission_pct / 100);

                      return (
                        <tr
                          key={`row-${index}`}
                          className="transition-colors hover:bg-muted/30"
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            {new Date(sale.created_at).toLocaleString('en-ZA', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            {sale.retailer_name || 'Unknown'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            {sale.retailer_short_code || '-'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            {sale.agent_name || '-'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            {sale.commission_group_name || '-'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                            {sale.terminal_short_code || '-'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
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
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                            R {sale.amount.toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-pink-600">
                            R {supplierCommissionAmount.toFixed(3)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-purple-600">
                            R {sale.retailer_commission.toFixed(3)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-blue-600">
                            R {sale.agent_commission.toFixed(3)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-sm">
                            <span
                              className={cn(
                                'font-medium',
                                airVoucherProfit >= 0 ? 'text-green-600' : 'text-red-600'
                              )}
                            >
                              R {airVoucherProfit.toFixed(3)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="sticky bottom-0 z-10 bg-muted/80 backdrop-blur-sm border-t-2 border-border">
                    <tr className="font-semibold">
                      <td className="whitespace-nowrap px-4 py-3 text-sm" colSpan={7}>
                        TOTAL
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-bold">
                        R {stats.totalAmount.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm font-bold text-pink-600">
                        R {stats.supplierCommission.toFixed(3)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm font-bold text-purple-600">
                        R {stats.retailerCommission.toFixed(3)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm font-bold text-blue-600">
                        R {stats.agentCommission.toFixed(3)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm">
                        <span
                          className={cn(
                            'font-bold',
                            stats.profit >= 0 ? 'text-green-600' : 'text-red-600'
                          )}
                        >
                          R {stats.profit.toFixed(3)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex h-60 flex-col items-center justify-center rounded-lg border border-border bg-card p-8 text-center">
              <div className="mb-3 rounded-full bg-muted p-3">
                <Activity className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mb-1 text-lg font-medium">No sales data</h3>
              <p className="mb-4 text-muted-foreground">
                No sales match the selected filters.
              </p>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <SalesTableModal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        sales={filteredAndSortedSales}
        initialSortField={sortField === 'retailer_short_code' ? 'retailer_name' : sortField}
        initialSortDirection={sortDirection}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        sales={filteredAndSortedSales}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}

export default function SalesReportPage() {
  return (
    <Layout role="admin" fullscreen={true}>
      <SalesReportContent />
    </Layout>
  );
}
