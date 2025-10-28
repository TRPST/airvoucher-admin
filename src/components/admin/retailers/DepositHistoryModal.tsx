import { useState, useEffect } from "react";
import { X, Loader2, History, HandCoins, User } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { fetchRetailerDepositHistory, type RetailerDeposit } from "@/actions";
import type { AdminRetailer } from "@/actions";

type DepositHistoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  retailer: AdminRetailer;
};

export function DepositHistoryModal({
  isOpen,
  onClose,
  retailer,
}: DepositHistoryModalProps) {
  const [deposits, setDeposits] = useState<RetailerDeposit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDepositHistory() {
      if (!isOpen) return;

      setIsLoading(true);
      setError(null);

      const { data, error } = await fetchRetailerDepositHistory(retailer.id);

      if (error) {
        setError(`Failed to load deposit history: ${error.message}`);
      } else if (data) {
        setDeposits(data);
      }

      setIsLoading(false);
    }

    loadDepositHistory();
  }, [isOpen, retailer.id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatFeeDisplay = (deposit: RetailerDeposit) => {
    if (deposit.fee_type === "fixed") {
      return `R ${deposit.fee_value.toFixed(2)} (Fixed)`;
    } else {
      return `${deposit.fee_value}% (R ${deposit.fee_amount.toFixed(2)})`;
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-[90vw] translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg max-h-[85vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <Dialog.Title className="text-lg font-semibold">
                Deposit History - {retailer.name}
              </Dialog.Title>
            </div>
            <Dialog.Close className="rounded-full p-2 hover:bg-muted">
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <div className="mt-4 flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="rounded-md bg-destructive/10 p-4 text-destructive text-sm text-center">
                {error}
              </div>
            ) : deposits.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <HandCoins className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No deposit history</p>
                <p className="text-sm">Deposits will appear here once processed</p>
              </div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Date</th>
                        <th className="px-4 py-3 text-left font-medium">Method</th>
                        <th className="px-4 py-3 text-right font-medium">Deposited</th>
                        <th className="px-4 py-3 text-right font-medium">Fee</th>
                        <th className="px-4 py-3 text-right font-medium">Net Amount</th>
                        <th className="px-4 py-3 text-right font-medium">Balance Before</th>
                        <th className="px-4 py-3 text-right font-medium">Balance After</th>
                        <th className="px-4 py-3 text-left font-medium">Processed By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {deposits.map((deposit) => (
                        <tr key={deposit.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                            {formatDate(deposit.created_at)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                              {deposit.deposit_method}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                            R {deposit.amount_deposited.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-destructive">
                            {formatFeeDisplay(deposit)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-primary">
                            R {deposit.net_amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                            R {(deposit.balance_after - deposit.net_amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right font-medium text-green-600">
                            R {deposit.balance_after.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {deposit.processed_by_name ? (
                              <div className="text-xs">
                                <div className="font-medium">
                                  {deposit.processed_by_name}
                                </div>
                                <div className="text-muted-foreground">
                                  {deposit.processed_by_email || ''}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                Unknown
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {!isLoading && deposits.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{deposits.length} deposit{deposits.length !== 1 ? 's' : ''} found</span>
                <span>Total deposited: R {deposits.reduce((sum, d) => sum + d.amount_deposited, 0).toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-4">
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
