import { useState } from "react";
import { X, Loader2, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/utils/cn";
import { useToast } from "@/components/ToastProvider";
import {
  processCreditLimitAdjustment,
  type AdjustmentType,
} from "@/actions";
import type { AdminRetailer } from "@/actions";

type CreditLimitModalProps = {
  isOpen: boolean;
  onClose: () => void;
  retailer: AdminRetailer;
  onUpdate: (newCreditLimit: number) => void;
};

export function CreditLimitModal({
  isOpen,
  onClose,
  retailer,
  onUpdate,
}: CreditLimitModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>("increase");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success, error: showError } = useToast();

  const amount = parseFloat(adjustmentAmount) || 0;
  const currentCreditLimit = retailer.credit_limit;
  const newCreditLimit =
    adjustmentType === "increase"
      ? currentCreditLimit + amount
      : currentCreditLimit - amount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid adjustment amount");
      return;
    }

    if (newCreditLimit < 0) {
      setError("Credit limit cannot be negative");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: apiError } = await processCreditLimitAdjustment({
        retailer_id: retailer.id,
        adjustment_type: adjustmentType,
        amount: amount,
        notes: notes.trim() || undefined,
      });

      if (apiError) {
        showError(`Failed to adjust credit limit: ${apiError.message}`);
        return;
      }

      if (data) {
        success(
          `Credit limit ${adjustmentType === "increase" ? "increased" : "decreased"} successfully`
        );

        // Notify parent component of the new credit limit
        onUpdate(data.credit_limit_after);

        // Reset form and close
        handleClose();
      }
    } catch (err) {
      showError(
        `Error adjusting credit limit: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setAdjustmentType("increase");
    setAdjustmentAmount("");
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
              Adjust Credit Limit
            </Dialog.Title>
            <Dialog.Close className="rounded-full p-2 hover:bg-muted">
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

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
                {/* Current Credit Limit */}
                <div className="rounded-md bg-muted/50 p-4">
                  <div className="text-sm text-muted-foreground mb-1">
                    Current Credit Limit
                  </div>
                  <div className="text-2xl font-bold">
                    R {currentCreditLimit.toFixed(2)}
                  </div>
                </div>

                {/* Adjustment Type Toggle */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Adjustment Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustmentType("increase")}
                      className={cn(
                        "flex-1 rounded-md px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                        adjustmentType === "increase"
                          ? "bg-green-600 text-white"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      <TrendingUp className="h-4 w-4" />
                      Add to Credit
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustmentType("decrease")}
                      className={cn(
                        "flex-1 rounded-md px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                        adjustmentType === "decrease"
                          ? "bg-red-600 text-white"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      <TrendingDown className="h-4 w-4" />
                      Remove from Credit
                    </button>
                  </div>
                </div>

                {/* Adjustment Amount */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Adjustment Amount
                  </label>
                  <input
                    type="number"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                {/* Preview */}
                {amount > 0 && (
                  <div className="rounded-md bg-muted/50 p-4 space-y-2">
                    <div className="text-sm font-medium mb-2">Preview</div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Current Credit Limit:
                      </span>
                      <span>R {currentCreditLimit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {adjustmentType === "increase" ? "Adding:" : "Removing:"}
                      </span>
                      <span
                        className={
                          adjustmentType === "increase"
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {adjustmentType === "increase" ? "+" : "-"}R{" "}
                        {amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between text-sm">
                      <span className="font-medium">New Credit Limit:</span>
                      <span className="font-bold text-primary">
                        R {newCreditLimit.toFixed(2)}
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
                    placeholder="Add any notes about this adjustment..."
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
                  disabled={isProcessing || amount <= 0 || newCreditLimit < 0}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                      Processing...
                    </>
                  ) : (
                    `${
                      adjustmentType === "increase" ? "Increase" : "Decrease"
                    } Credit Limit`
                  )}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
