import { useState } from "react";
import { X, Calendar, Search, Filter, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Activity } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/utils/cn";
import type { SalesReport } from "@/actions";

interface SalesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: SalesReport[];
  retailerName?: string;
}

type SortField = 'date' | 'voucher_type' | 'amount';
type SortDirection = 'asc' | 'desc';

export function SalesHistoryModal({
  isOpen,
  onClose,
  sales,
  retailerName,
}: SalesHistoryModalProps) {
  // Table state
  const [searchTerm, setSearchTerm] = useState('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Get unique voucher types from sales data
  const voucherTypes = Array.from(new Set(sales.map(sale => sale.voucher_type).filter(Boolean))) as string[];

  // Filter and sort sales data
  const filteredAndSortedSales = (() => {
    let filtered = [...sales];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        sale =>
          sale.voucher_type?.toLowerCase().includes(term) ||
          sale.id.toLowerCase().includes(term)
      );
    }

    // Apply voucher type filter
    if (voucherTypeFilter !== 'all') {
      filtered = filtered.filter(sale => sale.voucher_type === voucherTypeFilter);
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
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
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

  // Reset filters when modal closes
  const handleClose = () => {
    setSearchTerm('');
    setVoucherTypeFilter('all');
    setShowFilters(false);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-[95vw] translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <Dialog.Title className="text-lg font-semibold">
                Sales History{retailerName ? ` - ${retailerName}` : ''}
              </Dialog.Title>
            </div>
            <Dialog.Close className="rounded-full p-2 hover:bg-muted">
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pb-10">
            <div className="flex items-center justify-between">
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
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
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
                </div>
              </div>
            )}

            {/* Sales Table */}
            {sales.length > 0 ? (
              <div className="rounded-lg border border-border shadow-sm mb-2.5">
                <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-card text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
                            className="border-b border-border transition-colors hover:bg-muted/30"
                          >
                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                              {new Date(sale.created_at).toLocaleString('en-ZA', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
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
                            <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-orange-600">
                              R {supplierCommissionAmount.toFixed(2)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-green-600">
                              R {sale.retailer_commission.toFixed(2)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-blue-600">
                              R {sale.agent_commission.toFixed(2)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-sm">
                              <span
                                className={cn(
                                  'font-medium',
                                  airVoucherProfit >= 0 ? 'text-green-600' : 'text-red-600'
                                )}
                              >
                                R {airVoucherProfit.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
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
                  No sales have been recorded for this retailer.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <Dialog.Close asChild>
              <button className="rounded-md px-4 py-2 text-sm font-medium border border-input hover:bg-muted">
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
