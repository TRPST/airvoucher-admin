import { useState } from 'react';
import {
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Activity,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { SalesFilterPanel } from './SalesFilterPanel';
import { SortDirection, SortField } from '@/utils/salesDataUtils';
import { SalesReport } from '@/actions/adminActions';

interface SalesTableProps {
  salesData: SalesReport[];
  voucherTypes: string[];
  retailerNames: string[];
}

export function SalesTable({ salesData, voucherTypes, retailerNames }: SalesTableProps) {
  // Table state
  const [searchTerm, setSearchTerm] = useState('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState<string>('all');
  const [retailerNameFilter, setRetailerNameFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter and sort sales data
  const filteredAndSortedSales = (() => {
    let filtered = [...salesData];

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
  })();

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSales = filteredAndSortedSales.slice(startIndex, startIndex + itemsPerPage);

  // Table data formatting
  const tableData = paginatedSales.map(sale => {
    // Use the profit field directly from the database
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recent Sales</h2>
        <p className="text-sm text-muted-foreground">{filteredAndSortedSales.length} total sales</p>
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
        <SalesFilterPanel
          voucherTypeFilter={voucherTypeFilter}
          setVoucherTypeFilter={setVoucherTypeFilter}
          retailerNameFilter={retailerNameFilter}
          setRetailerNameFilter={setRetailerNameFilter}
          voucherTypes={voucherTypes}
          retailerNames={retailerNames}
        />
      )}

      {/* Sortable Table */}
      {salesData.length > 0 ? (
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
  );
}
