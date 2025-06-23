import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

type Props = {
  open: boolean;
  onClose: () => void;
  voucherTypeId: string;
  amount: number;
  defaultValues?: {
    supplier_pct: number;
    retailer_pct: number;
    agent_pct: number;
  };
  onSave: (values: {
    supplier_pct: number;
    retailer_pct: number;
    agent_pct: number;
  }) => Promise<void>;
};

export function ManageVoucherCommissionModal({
  open,
  onClose,
  voucherTypeId,
  amount,
  defaultValues,
  onSave,
}: Props) {
  const [supplierPct, setSupplierPct] = useState('');
  const [retailerPct, setRetailerPct] = useState('');
  const [agentPct, setAgentPct] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (defaultValues) {
      setSupplierPct(defaultValues.supplier_pct.toString());
      setRetailerPct(defaultValues.retailer_pct.toString());
      setAgentPct(defaultValues.agent_pct.toString());
    } else {
      setSupplierPct('');
      setRetailerPct('');
      setAgentPct('');
    }
    setError(null);
  }, [defaultValues, open, voucherTypeId, amount]);

  if (!open) return null;

  const validate = (val: string) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0 && num <= 100;
  };

  const handleSave = async () => {
    if (!validate(supplierPct) || !validate(retailerPct) || !validate(agentPct)) {
      setError('All percentages must be between 0 and 100');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSave({
        supplier_pct: parseFloat(supplierPct),
        retailer_pct: parseFloat(retailerPct),
        agent_pct: parseFloat(agentPct),
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Voucher Commissions</DialogTitle>
          <DialogDescription>
            Set custom commission percentages for all vouchers of this denomination. All values must
            be between 0 and 100.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Supplier Commission (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={supplierPct}
              onChange={e => setSupplierPct(e.target.value)}
              className="w-full rounded border bg-background px-3 py-2 text-foreground"
              disabled={loading}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Retailer Commission (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={retailerPct}
              onChange={e => setRetailerPct(e.target.value)}
              className="w-full rounded border bg-background px-3 py-2 text-foreground"
              disabled={loading}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Sales Agent Commission (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={agentPct}
              onChange={e => setAgentPct(e.target.value)}
              className="w-full rounded border bg-background px-3 py-2 text-foreground"
              disabled={loading}
            />
          </div>
        </div>
        {error && <div className="mt-3 text-sm text-red-500">{error}</div>}
        <DialogFooter>
          <button
            className="rounded bg-muted px-4 py-2 text-foreground hover:bg-gray-200 dark:hover:bg-gray-700"
            onClick={onClose}
            disabled={loading}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            onClick={handleSave}
            disabled={loading}
            type="button"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
