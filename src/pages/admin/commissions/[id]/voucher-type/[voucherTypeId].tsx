import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeft, Loader2, AlertCircle, Check, X, Pencil } from 'lucide-react';
import {
  upsertVoucherCommissionOverride,
  upsertCommissionRate,
  type VoucherCommissionOverride,
} from '@/actions';
import { cn } from '@/utils/cn';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import useSWR, { useSWRConfig } from 'swr';
import { SwrKeys } from '@/lib/swr/keys';
import {
  commissionGroupByIdFetcher,
  commissionGroupsFetcher,
  voucherTypesFetcher,
  voucherAmountsFetcher,
  commissionOverridesFetcher,
} from '@/lib/swr/fetchers';

type VoucherAmountRate = {
  amount: number;
  supplier_pct: number; // stored as decimal e.g. 0.05 (5%)
  retailer_pct: number; // stored as decimal e.g. 0.05 (5%)
  agent_pct: number; // stored as decimal e.g. 0.05 (5%)
  hasOverride: boolean;
};

type EditableVoucherAmountRate = {
  amount: number;
  supplier_pct: number | string; // decimal (0-1) internally, but inputs as percent
  retailer_pct: number | string; // decimal (0-1) internally, but inputs as percent
  agent_pct: number | string; // decimal (0-1) internally, but inputs as percent
  hasOverride: boolean;
};

export default function VoucherAmountCommissions() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { id: groupIdParam, voucherTypeId: voucherTypeIdParam } = router.query;
  const groupId = typeof groupIdParam === 'string' ? groupIdParam : undefined;
  const voucherTypeId = typeof voucherTypeIdParam === 'string' ? voucherTypeIdParam : undefined;

  // Default rates editing state
  const [editingDefaults, setEditingDefaults] = React.useState(false);
  const [defaultsDraft, setDefaultsDraft] = React.useState<{
    supplier_pct: string;
    retailer_pct: string;
    agent_pct: string;
  }>({ supplier_pct: '', retailer_pct: '', agent_pct: '' });
  const [isSavingDefaults, setIsSavingDefaults] = React.useState(false);

  // Per-row editing state
  const [editingRowAmount, setEditingRowAmount] = React.useState<number | null>(null);
  const [rowDrafts, setRowDrafts] = React.useState<Record<string, EditableVoucherAmountRate>>({});
  const [isSaving, setIsSaving] = React.useState(false);

  // Multi-select and bulk edit
  const [selectedAmounts, setSelectedAmounts] = React.useState<Set<number>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = React.useState(false);
  const [isBulkSaving, setIsBulkSaving] = React.useState(false);
  const [bulkDraft, setBulkDraft] = React.useState<{ supplier_pct: string; retailer_pct: string; agent_pct: string }>({
    supplier_pct: '',
    retailer_pct: '',
    agent_pct: '',
  });

  // SWR: group header info
  const {
    data: group,
    error: groupError,
    isLoading: groupLoading,
  } = useSWR(groupId ? SwrKeys.commissionGroup(groupId) : null, commissionGroupByIdFetcher);

  // SWR: all groups with rates (for defaults)
  const {
    data: allGroups,
    error: allGroupsError,
    isLoading: allGroupsLoading,
  } = useSWR(SwrKeys.commissionGroups(), commissionGroupsFetcher);

  // SWR: voucher types to display name and supplier default
  const {
    data: voucherTypes,
    error: voucherTypesError,
    isLoading: voucherTypesLoading,
  } = useSWR(SwrKeys.voucherTypes('all'), voucherTypesFetcher);

  // SWR: voucher amounts list for this voucher type
  const {
    data: amounts,
    error: amountsError,
    isLoading: amountsLoading,
  } = useSWR(voucherTypeId ? SwrKeys.voucherAmounts(voucherTypeId) : null, voucherAmountsFetcher);

  // SWR: commission overrides for this group + voucher type
  const {
    data: overrides,
    error: overridesError,
    isLoading: overridesLoading,
  } = useSWR(groupId && voucherTypeId ? SwrKeys.commissionOverrides(groupId, voucherTypeId) : null, commissionOverridesFetcher);

  // Derived names
  const groupName = group?.name ?? '';
  const voucherType = React.useMemo(
    () => (voucherTypes ?? []).find((vt: any) => vt.id === voucherTypeId),
    [voucherTypes, voucherTypeId]
  );
  const voucherTypeName = voucherType?.name ?? '';

  // Determine logo path based on voucher type
  const logoPath = React.useMemo(() => {
    const name = voucherTypeName.toLowerCase();
    const networkProvider = voucherType?.network_provider;

    // Network-based logos
    if (networkProvider) {
      switch (networkProvider) {
        case 'mtn':
          return '/assets/vouchers/mtn-logo.jpg';
        case 'cellc':
          return '/assets/vouchers/cellc-logo.png';
        case 'vodacom':
          return '/assets/vouchers/vodacom-logo.png';
        case 'telkom':
          return '/assets/vouchers/telkom-logo.png';
      }
    }

    // Other voucher types by name
    if (name.includes('ringa')) return '/assets/vouchers/ringas-logo.jpg';
    if (name.includes('hollywood')) return '/assets/vouchers/hollywoodbets-logo.jpg';
    if (name.includes('easyload')) return '/assets/vouchers/easyload-logo.png';
    if (name.includes('ott')) return '/assets/vouchers/ott-logo.png';

    return null;
  }, [voucherTypeName, voucherType]);

  // Derived default rates (all commission values from group rates, stored as decimals)
  const defaultRates = React.useMemo(() => {
    const currentGroup = (allGroups ?? []).find((g: any) => g.id === groupId);
    const rate = currentGroup?.rates?.find((r: any) => r.voucher_type_id === voucherTypeId);
    return {
      supplier_pct: rate?.supplier_pct || 0,
      retailer_pct: rate?.retailer_pct || 0,
      agent_pct: rate?.agent_pct || 0,
    };
  }, [allGroups, groupId, voucherTypeId]);

  // Derived combined table rows
  const amountRates: VoucherAmountRate[] = React.useMemo(() => {
    const overrideMap = new Map<number, VoucherCommissionOverride>();
    (overrides ?? []).forEach((o: VoucherCommissionOverride) => overrideMap.set(o.amount, o));
    const base = (amounts ?? []).map((a: any) => a.amount as number);
    const rows = base.map((amount) => {
      const override = overrideMap.get(amount);
      if (override) {
        return {
          amount,
          supplier_pct: override.supplier_pct,
          retailer_pct: override.retailer_pct,
          agent_pct: override.agent_pct,
          hasOverride: true,
        };
      }
      return {
        amount,
        supplier_pct: defaultRates.supplier_pct,
        retailer_pct: defaultRates.retailer_pct,
        agent_pct: defaultRates.agent_pct,
        hasOverride: false,
      };
    });
    rows.sort((a, b) => a.amount - b.amount);
    return rows;
  }, [amounts, overrides, defaultRates]);

  const isLoading =
    groupLoading || allGroupsLoading || voucherTypesLoading || amountsLoading || overridesLoading;

  const error =
    (groupError as any)?.message ||
    (allGroupsError as any)?.message ||
    (voucherTypesError as any)?.message ||
    (amountsError as any)?.message ||
    (overridesError as any)?.message ||
    null;

  // Helper function to format numbers to 2 decimal places
  const formatToTwoDecimals = (value: number): number => {
    return Math.round(value * 100) / 100;
  };

  // Default rates editing handlers
  const startDefaultsEdit = () => {
    setDefaultsDraft({
      supplier_pct: (defaultRates.supplier_pct * 100).toFixed(2),
      retailer_pct: (defaultRates.retailer_pct * 100).toFixed(2),
      agent_pct: (defaultRates.agent_pct * 100).toFixed(2),
    });
    setEditingDefaults(true);
  };

  const cancelDefaultsEdit = () => {
    setEditingDefaults(false);
    setDefaultsDraft({ supplier_pct: '', retailer_pct: '', agent_pct: '' });
  };

  const handleDefaultRateChange = (
    field: 'supplier_pct' | 'retailer_pct' | 'agent_pct',
    value: string
  ) => {
    if (value === '') {
      setDefaultsDraft((prev) => ({ ...prev, [field]: '' }));
      return;
    }

    const normalized = value.replace(',', '.').trim();
    const numValue = parseFloat(normalized);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) return;

    setDefaultsDraft((prev) => ({ ...prev, [field]: normalized }));
  };

  const saveDefaultRates = async () => {
    if (!groupId || !voucherTypeId) return;

    const supplier = parseFloat(defaultsDraft.supplier_pct);
    const retailer = parseFloat(defaultsDraft.retailer_pct);
    const agent = parseFloat(defaultsDraft.agent_pct);

    if (isNaN(supplier) || isNaN(retailer) || isNaN(agent)) {
      toast.error('Please enter valid commission percentages');
      return;
    }

    try {
      setIsSavingDefaults(true);

      const supplierChanged = (supplier / 100) !== defaultRates.supplier_pct;
      const retailerChanged = (retailer / 100) !== defaultRates.retailer_pct;
      const agentChanged = (agent / 100) !== defaultRates.agent_pct;

      // Update all commission rates if any changed (ALL stored as decimals now)
      if (supplierChanged || retailerChanged || agentChanged) {
        const { error } = await upsertCommissionRate(
          groupId,
          voucherTypeId,
          retailer / 100, // Convert percentage to decimal
          agent / 100, // Convert percentage to decimal
          supplier / 100 // Convert percentage to decimal
        );
        if (error) {
          console.error('Error updating commission rates:', error);
          throw new Error('Failed to update commission rates');
        }
      }

      // Revalidate commission groups cache
      await mutate(SwrKeys.commissionGroups());

      setEditingDefaults(false);
      toast.success('Default commission rates updated');
    } catch (err) {
      console.error('Error saving default rates:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save default rates');
    } finally {
      setIsSavingDefaults(false);
    }
  };

  // Row editing controls
  const startRowEdit = (amount: number) => {
    if (editingRowAmount !== null && editingRowAmount !== amount) {
      toast.message('Finish or cancel the current row edit first');
      return;
    }
    const current = amountRates.find((r) => r.amount === amount);
    if (!current) return;

    const draft: EditableVoucherAmountRate = {
      amount: current.amount,
      supplier_pct: current.supplier_pct,
      retailer_pct: current.retailer_pct,
      agent_pct: current.agent_pct,
      hasOverride: current.hasOverride,
    };

    setRowDrafts((prev) => ({
      ...prev,
      [amount.toString()]: draft,
    }));
    setEditingRowAmount(amount);
  };

  const cancelRowEdit = () => {
    if (editingRowAmount === null) return;
    setRowDrafts((prev) => {
      const copy = { ...prev };
      delete copy[editingRowAmount.toString()];
      return copy;
    });
    setEditingRowAmount(null);
  };

  // Per-row input change
  const handleRowRateChange = (
    amount: number,
    field: 'supplier_pct' | 'retailer_pct' | 'agent_pct',
    value: string
  ) => {
    if (editingRowAmount !== amount) return;

    // Allow empty values for better UX
    if (value === '') {
      setRowDrafts((prev) => ({
        ...prev,
        [amount.toString()]: {
          ...prev[amount.toString()],
          [field]: '' as any,
        },
      }));
      return;
    }

    const normalized = value.replace(',', '.').trim();
    const numValue = parseFloat(normalized);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) return;

    // All percentages stored as decimals (divided by 100) for consistency
    const formattedValue = Math.round((numValue / 100) * 10000) / 10000;

    setRowDrafts((prev) => ({
      ...prev,
      [amount.toString()]: {
        ...prev[amount.toString()],
        [field]: formattedValue,
      },
    }));
  };

  const saveRowEdit = async () => {
    if (editingRowAmount === null || !groupId || !voucherTypeId) return;
    const amount = editingRowAmount;
    const draft = rowDrafts[amount.toString()];
    if (!draft) return;

    try {
      setIsSaving(true);

      const originalRate = amountRates.find((r) => r.amount === amount);
      if (!originalRate) return;

      // Convert empty values to 0 before processing
      const sanitizedRate = {
        ...draft,
        supplier_pct: draft.supplier_pct === '' || draft.supplier_pct === undefined ? 0 : Number(draft.supplier_pct),
        retailer_pct: draft.retailer_pct === '' || draft.retailer_pct === undefined ? 0 : Number(draft.retailer_pct),
        agent_pct: draft.agent_pct === '' || draft.agent_pct === undefined ? 0 : Number(draft.agent_pct),
      };

      const hasChanges =
        originalRate.supplier_pct !== sanitizedRate.supplier_pct ||
        originalRate.retailer_pct !== sanitizedRate.retailer_pct ||
        originalRate.agent_pct !== sanitizedRate.agent_pct;

      if (hasChanges) {
        const matchesDefaults =
          sanitizedRate.supplier_pct === defaultRates.supplier_pct &&
          sanitizedRate.retailer_pct === defaultRates.retailer_pct &&
          sanitizedRate.agent_pct === defaultRates.agent_pct;

        if (!matchesDefaults) {
          const override: VoucherCommissionOverride = {
            voucher_type_id: voucherTypeId,
            amount,
            supplier_pct: sanitizedRate.supplier_pct,
            retailer_pct: sanitizedRate.retailer_pct,
            agent_pct: sanitizedRate.agent_pct,
            commission_group_id: groupId,
          };
          const { error } = await upsertVoucherCommissionOverride(override);
          if (error) {
            // eslint-disable-next-line no-console
            console.error(`Error updating override for R${amount}:`, error);
            throw new Error(`Failed to update commission for R${amount}`);
          }
        } else if (originalRate.hasOverride) {
          // Reset to defaults (set override equal to defaults)
          const override: VoucherCommissionOverride = {
            voucher_type_id: voucherTypeId,
            amount,
            supplier_pct: defaultRates.supplier_pct,
            retailer_pct: defaultRates.retailer_pct,
            agent_pct: defaultRates.agent_pct,
            commission_group_id: groupId,
          };
          const { error } = await upsertVoucherCommissionOverride(override);
          if (error) {
            // eslint-disable-next-line no-console
            console.error(`Error resetting override for R${amount}:`, error);
            throw new Error(`Failed to reset commission for R${amount}`);
          }
        }
      }

      // Revalidate overrides cache so derived rows refresh
      await mutate(SwrKeys.commissionOverrides(groupId, voucherTypeId));

      // Clear edit state
      setRowDrafts((prev) => {
        const copy = { ...prev };
        delete copy[amount.toString()];
        return copy;
      });
      setEditingRowAmount(null);

      toast.success('Commission override saved');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error saving commission override:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save commission override');
    } finally {
      setIsSaving(false);
    }
  };

  // Selection handlers
  const toggleSelectAmount = (amount: number) => {
    setSelectedAmounts((prev) => {
      const next = new Set(prev);
      if (next.has(amount)) {
        next.delete(amount);
      } else {
        next.add(amount);
      }
      return next;
    });
  };

  const allSelected = amountRates.length > 0 && selectedAmounts.size === amountRates.length;

  const toggleSelectAll = () => {
    setSelectedAmounts((prev) => {
      if (allSelected) return new Set();
      return new Set(amountRates.map((r) => r.amount));
    });
  };

  const clearSelection = () => setSelectedAmounts(new Set());

  // Bulk edit input handlers (keep as percent strings; convert on apply)
  const handleBulkInputChange = (field: 'supplier_pct' | 'retailer_pct' | 'agent_pct', value: string) => {
    if (value === '') {
      setBulkDraft((prev) => ({ ...prev, [field]: '' }));
      return;
    }
    const normalized = value.replace(',', '.').trim();
    const numValue = parseFloat(normalized);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) return;
    // Keep as string to preserve user formatting; we'll convert on apply
    setBulkDraft((prev) => ({ ...prev, [field]: normalized }));
  };

  const applyBulkEdits = async () => {
    if (selectedAmounts.size === 0 || !groupId || !voucherTypeId) return;

    // Ensure at least one field has a non-empty value
    if (bulkDraft.supplier_pct === '' && bulkDraft.retailer_pct === '' && bulkDraft.agent_pct === '') {
      toast.message('Enter at least one commission value to apply');
      return;
    }

    try {
      setIsBulkSaving(true);

      // Helper to convert percent string to stored number for fields
      // All percentages divided by 100 to store as decimals
      const parseFraction = (s: string) => {
        const n = parseFloat(s);
        return Math.round((n / 100) * 10000) / 10000;
      };

      for (const amount of selectedAmounts) {
        const originalRate = amountRates.find((r) => r.amount === amount);
        if (!originalRate) continue;

        const nextSupplier =
          bulkDraft.supplier_pct === '' ? originalRate.supplier_pct : parseFraction(bulkDraft.supplier_pct);
        const nextRetailer =
          bulkDraft.retailer_pct === '' ? originalRate.retailer_pct : parseFraction(bulkDraft.retailer_pct);
        const nextAgent =
          bulkDraft.agent_pct === '' ? originalRate.agent_pct : parseFraction(bulkDraft.agent_pct);

        const hasChanges =
          originalRate.supplier_pct !== nextSupplier ||
          originalRate.retailer_pct !== nextRetailer ||
          originalRate.agent_pct !== nextAgent;

        if (!hasChanges) continue;

        const matchesDefaults =
          nextSupplier === defaultRates.supplier_pct &&
          nextRetailer === defaultRates.retailer_pct &&
          nextAgent === defaultRates.agent_pct;

        if (!matchesDefaults) {
          const override: VoucherCommissionOverride = {
            voucher_type_id: voucherTypeId,
            amount,
            supplier_pct: nextSupplier,
            retailer_pct: nextRetailer,
            agent_pct: nextAgent,
            commission_group_id: groupId,
          };

          const { error } = await upsertVoucherCommissionOverride(override);
          if (error) {
            // eslint-disable-next-line no-console
            console.error(`Error updating override for R${amount}:`, error);
            throw new Error(`Failed to update commission for R${amount}`);
          }
        } else if (originalRate.hasOverride) {
          const override: VoucherCommissionOverride = {
            voucher_type_id: voucherTypeId,
            amount,
            supplier_pct: defaultRates.supplier_pct,
            retailer_pct: defaultRates.retailer_pct,
            agent_pct: defaultRates.agent_pct,
            commission_group_id: groupId,
          };

          const { error } = await upsertVoucherCommissionOverride(override);
          if (error) {
            // eslint-disable-next-line no-console
            console.error(`Error resetting override for R${amount}:`, error);
            throw new Error(`Failed to reset commission for R${amount}`);
          }
        }
      }

      // Revalidate overrides after bulk apply
      await mutate(SwrKeys.commissionOverrides(groupId, voucherTypeId));

      setIsBulkModalOpen(false);
      setBulkDraft({ supplier_pct: '', retailer_pct: '', agent_pct: '' });
      clearSelection();

      toast.success('Bulk commission overrides applied');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error applying bulk commission overrides:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to apply bulk commission overrides');
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <h2 className="mb-2 text-xl font-semibold">Error</h2>
          <p className="mb-4 text-muted-foreground">{error}</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href={`/admin/commissions/${groupId}`} passHref>
        <button className="group inline-flex items-center text-sm font-medium transition-colors hover:text-primary">
          <ChevronLeft className="mr-2 h-5 w-5 transform transition-transform duration-200 group-hover:-translate-x-1" />
          Back to {groupName}
        </button>
      </Link>

      {/* Page header */}
      <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
        <div className="flex items-start gap-4">
          {logoPath && (
            <div className="flex-shrink-0">
              <img
                src={logoPath}
                alt={voucherTypeName}
                className="h-16 w-16 rounded-lg object-contain"
              />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{voucherTypeName} Commission Overrides</h1>
            <p className="text-muted-foreground">Manage commission rates for specific voucher amounts in {groupName}</p>
          </div>
        </div>
      </div>

      {/* Default rates section */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-medium">Default Commission Rates</h3>
            <p className="text-xs text-muted-foreground">
              Base rates for all {voucherTypeName} vouchers in {groupName}
            </p>
          </div>
          {!editingDefaults && (
            <button
              onClick={startDefaultsEdit}
              disabled={editingRowAmount !== null}
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-muted disabled:opacity-50"
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit Defaults
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Supplier Commission */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Supplier Commission</label>
            {editingDefaults ? (
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={defaultsDraft.supplier_pct}
                  onChange={(e) => handleDefaultRateChange('supplier_pct', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 pr-7 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="0.00"
                />
                <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">
                  %
                </div>
              </div>
            ) : (
              <div className="rounded-md bg-blue-100 px-2.5 py-1.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                <span className="text-base font-semibold">{(defaultRates.supplier_pct * 100).toFixed(2)}%</span>
              </div>
            )}
          </div>

          {/* Retailer Commission */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Retailer Commission</label>
            {editingDefaults ? (
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={defaultsDraft.retailer_pct}
                  onChange={(e) => handleDefaultRateChange('retailer_pct', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 pr-7 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="0.00"
                />
                <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">
                  %
                </div>
              </div>
            ) : (
              <div className="rounded-md bg-green-100 px-2.5 py-1.5 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                <span className="text-base font-semibold">
                  {(defaultRates.retailer_pct * 100).toFixed(2)}%
                </span>
              </div>
            )}
          </div>

          {/* Agent Commission */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Agent Commission</label>
            {editingDefaults ? (
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={defaultsDraft.agent_pct}
                  onChange={(e) => handleDefaultRateChange('agent_pct', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 pr-7 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="0.00"
                />
                <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">
                  %
                </div>
              </div>
            ) : (
              <div className="rounded-md bg-purple-100 px-2.5 py-1.5 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                <span className="text-base font-semibold">
                  {(defaultRates.agent_pct * 100).toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Edit actions */}
        {editingDefaults && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={saveDefaultRates}
              disabled={isSavingDefaults}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
            >
              {isSavingDefaults ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Save Defaults
            </button>
            <button
              onClick={cancelDefaultsEdit}
              disabled={isSavingDefaults}
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted disabled:opacity-50"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Per-Amount Overrides Section Header */}
      <div>
        <h3 className="text-lg font-medium">Per-Amount Commission Overrides</h3>
        <p className="text-sm text-muted-foreground">
          Override default rates for specific voucher amounts. Amounts not listed here will use the default rates above.
        </p>
      </div>

      {/* Bulk actions bar */}
      {selectedAmounts.size > 0 && (
        <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 p-3">
          <div className="text-sm text-muted-foreground">
            Selected {selectedAmounts.size} voucher{selectedAmounts.size > 1 ? 's' : ''}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
              disabled={editingRowAmount !== null}
            >
              Bulk Edit
            </button>
            <button
              onClick={clearSelection}
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium shadow-sm hover:bg-muted"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Voucher amounts table */}
      <div className="rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">Voucher Amount</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">Supplier Commission %</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">Retailer Commission %</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">Agent Commission %</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">Edit</th>
              </tr>
            </thead>
            <tbody>
              {amountRates.map((rate) => {
                const isRowEditing = editingRowAmount === rate.amount;
                const draft = isRowEditing ? rowDrafts[rate.amount.toString()] : null;

                // Values to display in inputs when editing
                // All stored as decimals, multiply by 100 for display
                const draftSupplier =
                  isRowEditing && typeof draft?.supplier_pct !== 'string' ? draft?.supplier_pct ?? 0 : 0;
                const draftRetailer =
                  isRowEditing && typeof draft?.retailer_pct !== 'string' ? draft?.retailer_pct ?? 0 : 0;
                const draftAgent =
                  isRowEditing && typeof draft?.agent_pct !== 'string' ? draft?.agent_pct ?? 0 : 0;

                const isOverridden =
                  rate.supplier_pct !== defaultRates.supplier_pct ||
                  rate.retailer_pct !== defaultRates.retailer_pct ||
                  rate.agent_pct !== defaultRates.agent_pct ||
                  (draft?.hasOverride ?? false);

                return (
                  <tr key={rate.amount} className="border-b border-border transition-colors hover:bg-muted/50">
                    {/* Select */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedAmounts.has(rate.amount)}
                        onChange={() => toggleSelectAmount(rate.amount)}
                        aria-label={`Select R ${rate.amount.toFixed(2)}`}
                        disabled={editingRowAmount !== null && editingRowAmount !== rate.amount}
                      />
                    </td>

                    {/* Amount */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-medium">R {rate.amount.toFixed(2)}</span>
                    </td>

                    {/* Supplier */}
                    <td className="whitespace-nowrap px-4 py-3">
                      {isRowEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={typeof draft?.supplier_pct === 'string' ? '' : formatToTwoDecimals(draftSupplier * 100)}
                          onChange={(e) => handleRowRateChange(rate.amount, 'supplier_pct', e.target.value)}
                          className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm"
                        />
                      ) : (
                        <span
                          className={cn(
                            'rounded-md px-2 py-1',
                            rate.supplier_pct !== defaultRates.supplier_pct
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : ''
                          )}
                        >
                          {(rate.supplier_pct * 100).toFixed(2)}%
                        </span>
                      )}
                    </td>

                    {/* Retailer */}
                    <td className="whitespace-nowrap px-4 py-3">
                      {isRowEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={
                            typeof draft?.retailer_pct === 'string'
                              ? ''
                              : formatToTwoDecimals(draftRetailer * 100)
                          }
                          onChange={(e) => handleRowRateChange(rate.amount, 'retailer_pct', e.target.value)}
                          className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm"
                        />
                      ) : (
                        <span
                          className={cn(
                            'rounded-md px-2 py-1',
                            rate.retailer_pct !== defaultRates.retailer_pct
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : ''
                          )}
                        >
                          {(rate.retailer_pct * 100).toFixed(2)}%
                        </span>
                      )}
                    </td>

                    {/* Agent */}
                    <td className="whitespace-nowrap px-4 py-3">
                      {isRowEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={
                            typeof draft?.agent_pct === 'string' ? '' : formatToTwoDecimals(draftAgent * 100)
                          }
                          onChange={(e) => handleRowRateChange(rate.amount, 'agent_pct', e.target.value)}
                          className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm"
                        />
                      ) : (
                        <span
                          className={cn(
                            'rounded-md px-2 py-1',
                            rate.agent_pct !== defaultRates.agent_pct
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                              : ''
                          )}
                        >
                          {(rate.agent_pct * 100).toFixed(2)}%
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="whitespace-nowrap px-4 py-3">
                      {isOverridden ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          Override
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
                          Default
                        </span>
                      )}
                    </td>

                    {/* Edit actions */}
                    <td className="whitespace-nowrap px-4 py-3">
                      {isRowEditing ? (
                        <div className="flex gap-2">
                          <button
                            onClick={saveRowEdit}
                            disabled={isSaving}
                            className="inline-flex items-center justify-center rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-green-700 disabled:opacity-50"
                          >
                            {isSaving ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="mr-2 h-4 w-4" />
                            )}
                            Save
                          </button>
                          <button
                            onClick={cancelRowEdit}
                            disabled={isSaving}
                            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-muted disabled:opacity-50"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startRowEdit(rate.amount)}
                          disabled={editingRowAmount !== null}
                          className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-muted disabled:opacity-50"
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {amountRates.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No voucher amounts found for this voucher type.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Edit Modal */}
      <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Edit Commission Overrides</DialogTitle>
            <DialogDescription>Apply these changes to all selected vouchers.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <div className="mb-1 text-sm font-medium">Vouchers to update</div>
              <div className="text-sm text-muted-foreground">
                {Array.from(selectedAmounts)
                  .sort((a, b) => a - b)
                  .map((a) => `R ${a.toFixed(2)}`)
                  .join(', ')}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Supplier Com %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={bulkDraft.supplier_pct}
                  placeholder="e.g. 3.5"
                  onChange={(e) => handleBulkInputChange('supplier_pct', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Retailer Com %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={bulkDraft.retailer_pct}
                  placeholder="e.g. 5"
                  onChange={(e) => handleBulkInputChange('retailer_pct', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Agent Com %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={bulkDraft.agent_pct}
                  placeholder="e.g. 1.25"
                  onChange={(e) => handleBulkInputChange('agent_pct', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <button
              onClick={() => setIsBulkModalOpen(false)}
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={applyBulkEdits}
              disabled={isBulkSaving || selectedAmounts.size === 0}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
            >
              {isBulkSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Apply to {selectedAmounts.size} {selectedAmounts.size === 1 ? 'voucher' : 'vouchers'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
