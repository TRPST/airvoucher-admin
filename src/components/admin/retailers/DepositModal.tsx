import { useState, useEffect } from "react";
import { X, Loader2, AlertCircle, HandCoins } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  fetchDepositFeeConfigurations,
  processRetailerDeposit,
  type DepositMethod,
  type DepositFeeConfiguration,
} from "@/actions";
import type { AdminRetailer } from "@/actions";

type DepositModalProps = {
  isOpen: boolean;
  onClose: () => void;
  retailer: AdminRetailer;
  onUpdate: (newBalance: number) => void;
};

export function DepositModal({
  isOpen,
  onClose,
  retailer,
  onUpdate,
}: DepositModalProps) {
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState<DepositMethod>("EFT");
  const [notes, setNotes] = useState("");
  const [feeConfigs, setFeeConfigs] = useState<DepositFeeConfiguration[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFees, setIsLoadingFees] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load fee configurations
  useEffect(() => {
    async function loadFeeConfigs() {
      setIsLoadingFees(true);
      const { data, error } = await fetchDepositFeeConfigurations();

      if (error) {
        setError(`Failed to load fee configurations: ${error.message}`);
      } else if (data) {
        setFeeConfigs(data);
      }

      setIsLoadingFees(false);
    }

    if (isOpen) {
      loadFeeConfigs();
    }
  }, [isOpen]);

  // Helper to format fee display for dropdown
  const formatFeeForDropdown = (method: DepositMethod) => {
    const config = feeConfigs.find((c) => c.deposit_method === method);
    if (!config) return method;

    if (config.fee_type === "fixed") {
      return `${method} - Fixed fee (R ${config.fee_value.toFixed(2)})`;
    } else {
      return `${method} - Percentage fee (${config.fee_value}%)`;
    }
  };

  // Calculate fee and net amount
  const currentFeeConfig = feeConfigs.find(
    (config) => config.deposit_method === depositMethod
  );

  const amount = parseFloat(depositAmount) || 0;
  let feeAmount = 0;

  if (currentFeeConfig) {
    if (currentFeeConfig.fee_type === "fixed") {
      feeAmount = currentFeeConfig.fee_value;
    } else {
      // percentage
      feeAmount = (amount * currentFeeConfig.fee_value) / 100;
    }
  }

  const netAmount = amount - feeAmount;
  const projectedBalance = retailer.balance + netAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid deposit amount");
      return;
    }

    if (netAmount <= 0) {
      setError("Deposit amount must be greater than the fee");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { data, error } = await processRetailerDeposit({
        retailer_id: retailer.id,
        amount_deposited: amount,
        deposit_method: depositMethod,
        notes: notes.trim() || undefined,
      });

      if (error) {
        setError(`Failed to process deposit: ${error.message}`);
        return;
      }

      if (data) {
        // Notify parent component of the new balance
        onUpdate(data.balance_after);

        // Reset form and close
        setDepositAmount("");
        setDepositMethod("EFT");
        setNotes("");
        onClose();
      }
    } catch (err) {
      setError(
        `Error processing deposit: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setDepositAmount("");
    setDepositMethod("EFT");
    setNotes("");
    setError(null);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">
              Process Deposit
            </Dialog.Title>
            <Dialog.Close className="rounded-full p-2 hover:bg-muted">
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          {isLoadingFees ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="mt-2 space-y-4">
              {error && (
                <div className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {error}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="space-y-4 mb-4">
                  {/* Deposit Amount */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Deposit Amount
                    </label>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  {/* Deposit Method */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Deposit Method
                    </label>
                    <select
                      value={depositMethod}
                      onChange={(e) =>
                        setDepositMethod(e.target.value as DepositMethod)
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="EFT">{formatFeeForDropdown("EFT")}</option>
                      <option value="ATM">{formatFeeForDropdown("ATM")}</option>
                      <option value="Counter">{formatFeeForDropdown("Counter")}</option>
                      <option value="Branch">{formatFeeForDropdown("Branch")}</option>
                    </select>
                  </div>

                  {/* Fee Information */}
                  {currentFeeConfig && amount > 0 && (
                    <div className="rounded-md bg-muted/50 p-4 space-y-2">
                      <div className="text-sm font-medium mb-2">
                        Deposit Breakdown
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Deposit Amount:
                        </span>
                        <span className="font-medium">R {amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Fee ({currentFeeConfig.fee_type === "fixed" ? "Fixed" : `${currentFeeConfig.fee_value}%`}):
                        </span>
                        <span className="font-medium text-destructive">
                          - R {feeAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t border-border pt-2 flex justify-between text-sm">
                        <span className="font-medium">Net Amount:</span>
                        <span className="font-bold text-primary">
                          R {netAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Current Balance:
                        </span>
                        <span>R {retailer.balance.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-border pt-2">
                        <span className="font-medium">New Balance:</span>
                        <span className="font-bold text-green-600">
                          R {projectedBalance.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                      placeholder="Add any notes about this deposit..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="rounded-md px-4 py-2 text-sm font-medium border border-input hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={isProcessing || amount <= 0 || netAmount <= 0}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                        Processing...
                      </>
                  ) : (
                    <>
                      <HandCoins className="mr-2 h-4 w-4 inline" />
                      Process Deposit
                    </>
                  )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
