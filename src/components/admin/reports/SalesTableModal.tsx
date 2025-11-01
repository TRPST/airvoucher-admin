import { useState } from "react";
import { X, Calendar, ChevronUp, ChevronDown, Activity } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/utils/cn";
import type { SalesReport } from "@/actions";

interface SalesTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: SalesReport[];
  initialSortField?: 'date' | 'voucher_type' | 'amount' | 'retailer_name' | 'agent_name';
  initialSortDirection?: 'asc' | 'desc';
}

type SortField = 'date' | 'voucher_type' | 'amount' | 'retailer_name' | 'agent_name';
type SortDirection = 'asc' | 'desc';

export function SalesTableModal({
  isOpen,
  onClose,
  sales,
  initialSortField = 'date',
  initialSortDirection = 'desc',
}: SalesTableModalProps) {
  // Table state
  const [sortField, setSortField] = useState<SortField>(initialSortField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);

  // Sort sales data
  const sortedSales = (() => {
    let sorted = [...sales];

    // Apply sorting
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
        const supplierCommissionAmount =
          sale.supplier_commission || sale.amount * (sale.supplier_commission_pct / 100);
        const airVoucherProfit = sale.profit || 0;

        return {
          amount: acc.amount + sale.amount,
          supplierCommission: acc.supplierCommission + supplierCommissionAmount,
          retailerCommission: acc.retailerCommission + sale.retailer_commission,
          agentCommission: acc.agentCommission + sale.agent_commission,
          profit: acc.profit + airVoucherProfit,
        };
      },
      {
        amount: 0,
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
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-0 z-50 w-full h-screen gap-4 border border-border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <Dialog.Title className="text-lg font-semibold">
                Sales Report - Detailed View
              </Dialog.Title>
            </div>
            <Dialog.Close className="rounded-full p-2 hover:bg-muted">
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-2">
            <div className="flex items-center justify-between flex-shrink-0">
              <p className="text-sm text-muted-foreground">{sortedSales.length} total sales</p>
            </div>

            {/* Sales Table */}
            {sales.length > 0 ? (
              <div className="rounded-lg border border-border shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto overflow-y-auto flex-1">
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
                              {sale.retailer_name || 'Unknown'}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                              {sale.agent_name || '-'}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                              {sale.commission_group_name || '-'}
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
                              R {supplierCommissionAmount.toFixed(4)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-green-600">
                              R {sale.retailer_commission.toFixed(4)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-blue-600">
                              R {sale.agent_commission.toFixed(4)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-sm">
                              <span
                                className={cn(
                                  'font-medium',
                                  airVoucherProfit >= 0 ? 'text-green-600' : 'text-red-600'
                                )}
                              >
                                R {airVoucherProfit.toFixed(4)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="sticky bottom-0 bg-muted/80 backdrop-blur-sm border-t-2 border-border">
                      <tr className="font-semibold">
                        <td className="whitespace-nowrap px-4 py-3 text-sm" colSpan={5}>
                          TOTAL
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-bold">
                          R {totals.amount.toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm font-bold text-orange-600">
                          R {totals.supplierCommission.toFixed(4)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm font-bold text-green-600">
                          R {totals.retailerCommission.toFixed(4)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm font-bold text-blue-600">
                          R {totals.agentCommission.toFixed(4)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm">
                          <span
                            className={cn(
                              'font-bold',
                              totals.profit >= 0 ? 'text-green-600' : 'text-red-600'
                            )}
                          >
                            R {totals.profit.toFixed(4)}
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
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
