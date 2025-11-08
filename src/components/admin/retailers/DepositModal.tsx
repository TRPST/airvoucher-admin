import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, HandCoins, TrendingDown } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useToast } from '@/components/ToastProvider';
import {
  fetchDepositFeeConfigurations,
  processRetailerDeposit,
  type DepositMethod,
  type DepositFeeConfiguration,
  type DepositAdjustmentType,
} from '@/actions';
import type { AdminRetailer } from '@/actions';

type DepositModalProps = {
  isOpen: boolean;
  onClose: () => void;
  retailer: AdminRetailer;
  onUpdate: (newBalance: number) => void;
};

export function DepositModal({ isOpen, onClose, retailer, onUpdate }: DepositModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<DepositAdjustmentType>('deposit');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState<DepositMethod>('EFT');
  const [notes, setNotes] = useState('');
  const [feeConfigs, setFeeConfigs] = useState<DepositFeeConfiguration[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFees, setIsLoadingFees] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { success } = useToast();

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
    const config = feeConfigs.find(c => c.deposit_method === method);
    if (!config) return method;

    if (config.fee_type === 'fixed') {
      return `${method} - Fixed fee (R ${config.fee_value.toFixed(2)})`;
    } else {
      return `${method} - Percentage fee (${config.fee_value}%)`;
    }
  };

  // Calculate fee and net amount
  const currentFeeConfig = feeConfigs.find(config => config.deposit_method === depositMethod);

  const amount = parseFloat(depositAmount) || 0;
  let feeAmount = 0;

  if (currentFeeConfig) {
    if (currentFeeConfig.fee_type === 'fixed') {
      feeAmount = currentFeeConfig.fee_value;
    } else {
      // percentage
      feeAmount = (amount * currentFeeConfig.fee_value) / 100;
    }
  }

  const netAmount = amount - feeAmount;
  const projectedBalance =
    adjustmentType === 'deposit' ? retailer.balance + netAmount : retailer.balance - netAmount;

  const minAllowedBalance = -retailer.credit_limit;
  const wouldExceedCreditLimit =
    adjustmentType === 'removal' && projectedBalance < minAllowedBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid deposit amount');
      return;
    }

    if (netAmount <= 0) {
      setError('Amount must be greater than the fee');
      return;
    }

    // Validate removal won't exceed credit limit
    if (wouldExceedCreditLimit) {
      setError(
        `Cannot remove R ${netAmount.toFixed(2)}. Would exceed credit limit. Minimum allowed balance: -R ${retailer.credit_limit.toFixed(2)}`
      );
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { data, error } = await processRetailerDeposit({
        retailer_id: retailer.id,
        amount_deposited: amount,
        deposit_method: depositMethod,
        adjustment_type: adjustmentType,
        notes: notes.trim() || undefined,
      });

      if (error) {
        setError(`Failed to process deposit: ${error.message}`);
        return;
      }

      if (data) {
        // Notify parent component of the new balance
        onUpdate(data.balance_after);

        // Show success toast
        success('Balance Updated Successfully');

        // Reset form and close
        setDepositAmount('');
        setDepositMethod('EFT');
        setNotes('');
        onClose();
      }
    } catch (err) {
      setError(
        `Error processing ${adjustmentType}: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setAdjustmentType('deposit');
    setDepositAmount('');
    setDepositMethod('EFT');
    setNotes('');
    setError(null);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 flex max-h-[90vh] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] flex-col rounded-lg border border-border bg-card shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-center justify-between border-b border-border p-6 pb-4">
            <Dialog.Title className="text-lg font-semibold">
              {adjustmentType === 'deposit' ? 'Process Deposit' : 'Remove Balance'}
            </Dialog.Title>
            <Dialog.Close className="rounded-full p-2 hover:bg-muted">
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-6">
            {isLoadingFees ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {error && (
                  <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <div className="flex items-center">
                      <AlertCircle className="mr-2 h-4 w-4" />
                      {error}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-4 space-y-4">
                    {/* Add/Remove Toggle */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAdjustmentType('deposit')}
                        className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                          adjustmentType === 'deposit'
                            ? 'bg-green-600 text-white'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        <HandCoins className="mr-2 inline h-4 w-4" />
                        Add to Balance
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustmentType('removal')}
                        className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                          adjustmentType === 'removal'
                            ? 'bg-red-600 text-white'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        <TrendingDown className="mr-2 inline h-4 w-4" />
                        Remove from Balance
                      </button>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {adjustmentType === 'deposit' ? 'Deposit Amount' : 'Amount to Remove'}
                      </label>
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={e => setDepositAmount(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>

                    {/* Deposit Method */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Deposit Method</label>
                      <select
                        value={depositMethod}
                        onChange={e => setDepositMethod(e.target.value as DepositMethod)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="EFT">{formatFeeForDropdown('EFT')}</option>
                        <option value="ATM">{formatFeeForDropdown('ATM')}</option>
                        <option value="Counter">{formatFeeForDropdown('Counter')}</option>
                        <option value="Branch">{formatFeeForDropdown('Branch')}</option>
                      </select>
                    </div>

                    {/* Fee Information */}
                    {currentFeeConfig && amount > 0 && (
                      <div className="space-y-2 rounded-md bg-muted/50 p-4">
                        <div className="mb-2 text-sm font-medium">
                          {adjustmentType === 'deposit' ? 'Deposit Breakdown' : 'Removal Breakdown'}
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {adjustmentType === 'deposit' ? 'Deposit Amount:' : 'Amount to Remove:'}
                          </span>
                          <span className="font-medium">R {amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Fee (
                            {currentFeeConfig.fee_type === 'fixed'
                              ? 'Fixed'
                              : `${currentFeeConfig.fee_value}%`}
                            ):
                          </span>
                          <span className="font-medium text-destructive">
                            - R {feeAmount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2 text-sm">
                          <span className="font-medium">
                            Net {adjustmentType === 'deposit' ? 'Amount:' : 'Removal:'}
                          </span>
                          <span className="font-bold text-primary">R {netAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Current Balance:</span>
                          <span>R {retailer.balance.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2 text-sm">
                          <span className="font-medium">New Balance:</span>
                          <span
                            className={`font-bold ${adjustmentType === 'deposit' ? 'text-green-600' : projectedBalance < 0 ? 'text-red-600' : 'text-orange-600'}`}
                          >
                            R {projectedBalance.toFixed(2)}
                          </span>
                        </div>
                        {adjustmentType === 'removal' && (
                          <div className="mt-2 border-t border-border pt-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Credit Limit:</span>
                              <span>R {retailer.credit_limit.toFixed(2)}</span>
                            </div>
                            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                              <span>Min Allowed Balance:</span>
                              <span
                                className={wouldExceedCreditLimit ? 'font-medium text-red-600' : ''}
                              >
                                -R {retailer.credit_limit.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Notes (Optional)</label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Add any notes about this deposit..."
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-2">
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
                      >
                        Cancel
                      </button>
                    </Dialog.Close>
                    <button
                      type="submit"
                      disabled={
                        isProcessing || amount <= 0 || netAmount <= 0 || wouldExceedCreditLimit
                      }
                      className={`rounded-md px-4 py-2 text-sm font-medium shadow disabled:cursor-not-allowed disabled:opacity-50 ${
                        adjustmentType === 'deposit'
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          {adjustmentType === 'deposit' ? (
                            <>
                              <HandCoins className="mr-2 inline h-4 w-4" />
                              Process Deposit
                            </>
                          ) : (
                            <>
                              <TrendingDown className="mr-2 inline h-4 w-4" />
                              Remove Balance
                            </>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
