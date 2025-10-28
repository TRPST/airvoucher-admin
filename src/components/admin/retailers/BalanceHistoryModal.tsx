import { useState, useEffect } from "react";
import { X, Loader2, History, HandCoins, TrendingUp } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/utils/cn";
import {
  fetchRetailerDepositHistory,
  fetchRetailerCreditHistory,
  type RetailerDeposit,
  type CreditLimitAdjustment,
} from "@/actions";
import type { AdminRetailer } from "@/actions";

type BalanceHistoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  retailer: AdminRetailer;
};

export function BalanceHistoryModal({
  isOpen,
  onClose,
  retailer,
}: BalanceHistoryModalProps) {
  const [activeTab, setActiveTab] = useState("deposits");
  const [deposits, setDeposits] = useState<RetailerDeposit[]>([]);
  const [creditHistory, setCreditHistory] = useState<CreditLimitAdjustment[]>([]);
  const [isLoadingDeposits, setIsLoadingDeposits] = useState(true);
  const [isLoadingCredit, setIsLoadingCredit] = useState(true);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [creditError, setCreditError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!isOpen) return;

      // Load deposits
      setIsLoadingDeposits(true);
      const { data: depositsData, error: depositsError } =
        await fetchRetailerDepositHistory(retailer.id);

      if (depositsError) {
        setDepositError(`Failed to load deposit history: ${depositsError.message}`);
      } else if (depositsData) {
        setDeposits(depositsData);
      }
      setIsLoadingDeposits(false);

      // Load credit history
      setIsLoadingCredit(true);
      const { data: creditData, error: creditErr } =
        await fetchRetailerCreditHistory(retailer.id);

      if (creditErr) {
        setCreditError(`Failed to load credit history: ${creditErr.message}`);
      } else if (creditData) {
        setCreditHistory(creditData);
      }
      setIsLoadingCredit(false);
    }

    loadData();
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
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-[90vw] translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg h-[80vh] max-h-[85vh] overflow-hidden flex flex-col min-h-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <Dialog.Title className="text-lg font-semibold">
                Balance History - {retailer.name}
              </Dialog.Title>
            </div>
            <Dialog.Close className="rounded-full p-2 hover:bg-muted">
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <Tabs.Root
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden min-h-0"
          >
            <Tabs.List className="flex flex-shrink-0">
              <Tabs.Trigger
                value="deposits"
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                  "data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary",
                  "data-[state=inactive]:text-muted-foreground hover:text-foreground"
                )}
              >
                <HandCoins className="h-4 w-4" />
                Deposit History
              </Tabs.Trigger>
              <Tabs.Trigger
                value="credit"
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                  "data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary",
                  "data-[state=inactive]:text-muted-foreground hover:text-foreground"
                )}
              >
                <TrendingUp className="h-4 w-4" />
                Credit History
              </Tabs.Trigger>
            </Tabs.List>

            {/* Deposit History Tab */}
            <Tabs.Content
              value="deposits"
              className="flex overflow-y-auto min-h-0 mt-2"
            >
              {isLoadingDeposits ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : depositError ? (
                <div className="rounded-md bg-destructive/10 p-4 text-destructive text-sm text-center">
                  {depositError}
                </div>
              ) : deposits.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <HandCoins className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No deposit history</p>
                  <p className="text-sm">Deposits will appear here once processed</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 rounded-md border border-border overflow-hidden flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted border-b border-border z-10">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">Date</th>
                            <th className="px-4 py-3 text-left font-medium">Type</th>
                            <th className="px-4 py-3 text-left font-medium">Method</th>
                            <th className="px-4 py-3 text-right font-medium">Amount</th>
                            <th className="px-4 py-3 text-right font-medium">Fee</th>
                            <th className="px-4 py-3 text-right font-medium">Net Amount</th>
                            <th className="px-4 py-3 text-right font-medium">Balance Before</th>
                            <th className="px-4 py-3 text-right font-medium">Balance After</th>
                            <th className="px-4 py-3 text-left font-medium">Processed By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {deposits.map((deposit) => {
                            const isRemoval = deposit.adjustment_type === 'removal';
                            return (
                              <tr
                                key={deposit.id}
                                className="hover:bg-muted/30 transition-colors"
                              >
                                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                  {formatDate(deposit.created_at)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                      isRemoval
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                        : "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                    )}
                                  >
                                    {isRemoval ? "Removal" : "Deposit"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                    {deposit.deposit_method}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                                  <span className={isRemoval ? "text-red-600" : ""}>
                                    {isRemoval ? "-" : ""}R {deposit.amount_deposited.toFixed(2)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right text-destructive">
                                  {formatFeeDisplay(deposit)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-primary">
                                  {isRemoval ? "-" : ""}R {deposit.net_amount.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                                  R {deposit.balance_before.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                                  <span className={isRemoval ? "text-orange-600" : "text-green-600"}>
                                    R {deposit.balance_after.toFixed(2)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {deposit.processed_by_name ? (
                                    <div className="text-xs">
                                      <div className="font-medium">
                                        {deposit.processed_by_name}
                                      </div>
                                      <div className="text-muted-foreground">
                                        {deposit.processed_by_email || ""}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      Unknown
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex-shrink-0">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {deposits.length} deposit{deposits.length !== 1 ? "s" : ""}{" "}
                        found
                      </span>
                      <span>
                        Total deposited: R{" "}
                        {deposits
                          .reduce((sum, d) => sum + d.amount_deposited, 0)
                          .toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4 flex-shrink-0">
                    <Dialog.Close asChild>
                      <button className="rounded-md px-4 py-2 text-sm font-medium border border-input hover:bg-muted">
                        Close
                      </button>
                    </Dialog.Close>
                  </div>
                </div>
              )}
            </Tabs.Content>

            {/* Credit History Tab */}
            <Tabs.Content value="credit" className="flex overflow-y-auto min-h-0">
              {isLoadingCredit ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : creditError ? (
                <div className="rounded-md bg-destructive/10 p-4 text-destructive text-sm text-center">
                  {creditError}
                </div>
              ) : creditHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No credit history</p>
                  <p className="text-sm">
                    Credit limit adjustments will appear here once made
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 rounded-md border border-border overflow-hidden flex flex-col min-h-0">
                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted border-b border-border z-10">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">Date</th>
                            <th className="px-4 py-3 text-left font-medium">Type</th>
                            <th className="px-4 py-3 text-right font-medium">Amount</th>
                            <th className="px-4 py-3 text-right font-medium">
                              Credit Before
                            </th>
                            <th className="px-4 py-3 text-right font-medium">
                              Credit After
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                              Processed By
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {creditHistory.map((adjustment) => (
                            <tr
                              key={adjustment.id}
                              className="hover:bg-muted/30 transition-colors"
                            >
                              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                {formatDate(adjustment.created_at)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                    adjustment.adjustment_type === "increase"
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                  )}
                                >
                                  {adjustment.adjustment_type === "increase"
                                    ? "Increase"
                                    : "Decrease"}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right font-semibold">
                                <span
                                  className={
                                    adjustment.adjustment_type === "increase"
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }
                                >
                                  {adjustment.adjustment_type === "increase"
                                    ? "+"
                                    : "-"}
                                  R {adjustment.amount.toFixed(2)}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                                R {adjustment.credit_limit_before.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right font-medium text-primary">
                                R {adjustment.credit_limit_after.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {adjustment.processed_by_name ? (
                                  <div className="text-xs">
                                    <div className="font-medium">
                                      {adjustment.processed_by_name}
                                    </div>
                                    <div className="text-muted-foreground">
                                      {adjustment.processed_by_email || ""}
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
                  <div className="mt-4 pt-4 border-t border-border flex-shrink-0">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {creditHistory.length} adjustment
                        {creditHistory.length !== 1 ? "s" : ""} found
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4 flex-shrink-0">
                    <Dialog.Close asChild>
                      <button className="rounded-md px-4 py-2 text-sm font-medium border border-input hover:bg-muted">
                        Close
                      </button>
                    </Dialog.Close>
                  </div>
                </div>
              )}
            </Tabs.Content>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
