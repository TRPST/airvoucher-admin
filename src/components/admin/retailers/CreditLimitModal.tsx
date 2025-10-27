import { useState, useEffect } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { updateRetailerBalance } from "@/actions";
import type { AdminRetailer } from "@/actions";

type CreditLimitModalProps = {
  isOpen: boolean;
  onClose: () => void;
  retailer: AdminRetailer;
  onUpdate: (creditLimit: number) => void;
};

export function CreditLimitModal({
  isOpen,
  onClose,
  retailer,
  onUpdate,
}: CreditLimitModalProps) {
  const [creditLimit, setCreditLimit] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Pre-populate form with current value
      setCreditLimit(retailer.credit_limit.toString());
    }
  }, [isOpen, retailer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newCreditLimit = parseFloat(creditLimit);

    if (isNaN(newCreditLimit) || newCreditLimit < 0) {
      setError("Credit limit must be a valid positive number");
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      // Update the retailer credit limit (keep balance the same)
      const { error } = await updateRetailerBalance(
        retailer.id,
        retailer.balance,
        newCreditLimit
      );

      if (error) {
        setError(`Failed to update credit limit: ${error.message}`);
        return;
      }

      // Notify parent component of the update
      onUpdate(newCreditLimit);

      // Close the modal and reset form
      onClose();
      setCreditLimit("");
    } catch (err) {
      setError(
        `Error updating credit limit: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    setCreditLimit("");
    setError(null);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">
              Update Credit Limit
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">Credit Limit</label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum credit amount allowed for this retailer
                  </p>
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
                  disabled={isUpdating}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                      Updating...
                    </>
                  ) : (
                    "Update Credit Limit"
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
