import { useState } from 'react';
import { ChevronUp, ChevronDown, Activity, Maximize2, Download } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { SalesReport } from '@/actions';

type SortField =
  | 'date'
  | 'voucher_type'
  | 'amount'
  | 'retailer_name'
  | 'retailer_short_code'
  | 'agent_name';
type SortDirection = 'asc' | 'desc';

interface SalesTableProps {
  sales: SalesReport[];
  isLoading: boolean;
  error: string | null;
  onOpenModal?: () => void;
  onExport?: () => void;
}

export function SalesTable({ sales, isLoading, error, onOpenModal, onExport }: SalesTableProps) {
  // Table state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Sort sales data
  const sortedSales = (() => {
    const sorted = [...sales];

    sorted.sort((a, b) => {
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

    return sorted;
  })();

  // Calculate totals
  const totals = (() => {
    return sortedSales.reduce(
      (acc, sale) => {
        const supplierCommissionAmount = sale.supplier_commission;
        const airVoucherProfit = sale.profit || 0;

        return {
          totalAmount: acc.totalAmount + sale.amount,
          supplierCommission: acc.supplierCommission + (supplierCommissionAmount ?? 0),
          retailerCommission: acc.retailerCommission + (sale.retailer_commission ?? 0),
          agentCommission: acc.agentCommission + (sale.agent_commission ?? 0),
          profit: acc.profit + airVoucherProfit,
        };
      },
      {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Sales</h2>
        <div className="flex items-center gap-2">
          {onOpenModal && (
            <button
              onClick={onOpenModal}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              <Maximize2 className="h-4 w-4" />
              Open Modal
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          )}
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

      {/* Sortable Table */}
      {!isLoading && !error && sales.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border shadow-sm">
          <div className="max-h-[600px] overflow-x-auto overflow-y-auto">
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
                {sortedSales.map((sale, index) => {
                  const airVoucherProfit = sale.profit || 0;
                  const supplierCommissionAmount = sale.supplier_commission;
                  const isReprint = sale.ref_number?.endsWith('-REPRINT');
                  const isReverse = sale.ref_number?.endsWith('-REVERSE');

                  return (
                    <tr key={`row-${index}`} className="transition-colors hover:bg-muted/30">
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
                        {sale.retailer_short_code || '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {sale.retailer_name || 'Unknown'}
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
                          {isReprint && (
                            <span className="inline-flex items-center rounded-full bg-gray-500/10 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                              REPRINT
                            </span>
                          )}
                          {isReverse && (
                            <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                              REVERSE
                            </span>
                          )}
                          {sale.quantity && sale.quantity > 1 && (
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              x{sale.quantity}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                        {sale.quantity && sale.quantity > 1 ? (
                          <div className="flex flex-col">
                            <span className={cn(isReverse && 'text-red-600')}>
                              R {(sale.amount / sale.quantity).toFixed(2)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              R {sale.amount.toFixed(2)} total
                            </span>
                          </div>
                        ) : (
                          <span className={cn(isReverse && 'text-red-600')}>
                            R {sale.amount.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td
                        className={cn(
                          'whitespace-nowrap px-3 py-3 text-sm font-medium',
                          isReverse ? 'text-red-600' : 'text-pink-600'
                        )}
                      >
                        {supplierCommissionAmount !== null
                          ? `R ${supplierCommissionAmount.toFixed(3)}`
                          : '-'}
                      </td>
                      <td
                        className={cn(
                          'whitespace-nowrap px-3 py-3 text-sm font-medium',
                          isReverse ? 'text-red-600' : 'text-purple-600'
                        )}
                      >
                        {sale.retailer_commission !== null
                          ? `R ${sale.retailer_commission.toFixed(3)}`
                          : '-'}
                      </td>
                      <td
                        className={cn(
                          'whitespace-nowrap px-3 py-3 text-sm font-medium',
                          isReverse ? 'text-red-600' : 'text-blue-600'
                        )}
                      >
                        {sale.agent_commission !== null
                          ? `R ${sale.agent_commission.toFixed(3)}`
                          : '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm">
                        {sale.profit !== null ? (
                          <span
                            className={cn(
                              'font-medium',
                              airVoucherProfit >= 0 ? 'text-green-600' : 'text-red-600'
                            )}
                          >
                            R {airVoucherProfit.toFixed(3)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="sticky bottom-0 z-10 border-t-2 border-border bg-muted/80 backdrop-blur-sm">
                <tr className="font-semibold">
                  <td className="whitespace-nowrap px-4 py-3 text-sm" colSpan={7}>
                    TOTAL
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-bold">
                    R {totals.totalAmount.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm font-bold text-pink-600">
                    R {totals.supplierCommission.toFixed(3)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm font-bold text-purple-600">
                    R {totals.retailerCommission.toFixed(3)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm font-bold text-blue-600">
                    R {totals.agentCommission.toFixed(3)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm">
                    <span
                      className={cn(
                        'font-bold',
                        totals.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      R {totals.profit.toFixed(3)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : !isLoading && !error ? (
        <div className="flex h-60 flex-col items-center justify-center rounded-lg border border-border bg-card p-8 text-center">
          <div className="mb-3 rounded-full bg-muted p-3">
            <Activity className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-lg font-medium">No sales data</h3>
          <p className="mb-4 text-muted-foreground">No sales match the selected filters.</p>
        </div>
      ) : null}
    </div>
  );
}
