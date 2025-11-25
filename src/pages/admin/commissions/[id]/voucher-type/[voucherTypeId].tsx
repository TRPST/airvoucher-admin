import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Check,
  X,
  Pencil,
} from 'lucide-react';
import {
  upsertVoucherCommissionOverride,
  upsertCommissionRate,
  type VoucherCommissionOverride,
  type CommissionType,
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
import { UnifiedCommissionInputs } from '@/components/admin/commissions/UnifiedCommissionInputs';
import { CompactCommissionTypeToggle } from '@/components/admin/commissions/CompactCommissionTypeToggle';

type VoucherAmountRate = {
  amount: number;
  supplier_pct: number;
  retailer_pct: number;
  agent_pct: number;
  commission_type: CommissionType;
  hasOverride: boolean;
};

type EditableVoucherAmountRate = {
  amount: number;
  supplier_pct: number | string;
  retailer_pct: number | string;
  agent_pct: number | string;
  commission_type: CommissionType;
  hasOverride: boolean;
};

export default function VoucherAmountCommissions() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { id: groupIdParam, voucherTypeId: voucherTypeIdParam } = router.query;
  const groupId = typeof groupIdParam === 'string' ? groupIdParam : undefined;
  const voucherTypeId = typeof voucherTypeIdParam === 'string' ? voucherTypeIdParam : undefined;

  // Default rates editing state
  const [defaultsDraft, setDefaultsDraft] = React.useState<{
    supplier_pct: string;
    retailer_pct: string;
    agent_pct: string;
  }>({ supplier_pct: '', retailer_pct: '', agent_pct: '' });
  const [defaultsCommissionType, setDefaultsCommissionType] =
    React.useState<CommissionType>('percentage');
  const [isSavingDefaults, setIsSavingDefaults] = React.useState(false);

  // Inline row editing state (replaces modal)
  const [editingRowAmount, setEditingRowAmount] = React.useState<number | null>(null);
  const [rowDraft, setRowDraft] = React.useState<EditableVoucherAmountRate | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Multi-select and bulk edit
  const [selectedAmounts, setSelectedAmounts] = React.useState<Set<number>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = React.useState(false);
  const [isBulkSaving, setIsBulkSaving] = React.useState(false);
  const [bulkDraft, setBulkDraft] = React.useState<{
    supplier_pct: string;
    retailer_pct: string;
    agent_pct: string;
  }>({ supplier_pct: '', retailer_pct: '', agent_pct: '' });
  const [bulkCommissionType, setBulkCommissionType] = React.useState<CommissionType>('percentage');

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
  } = useSWR(
    groupId && voucherTypeId ? SwrKeys.commissionOverrides(groupId, voucherTypeId) : null,
    commissionOverridesFetcher
  );

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

    if (name.includes('ringa')) return '/assets/vouchers/ringas-logo.jpg';
    if (name.includes('hollywood')) return '/assets/vouchers/hollywoodbets-logo.jpg';
    if (name.includes('easyload')) return '/assets/vouchers/easyload-logo.png';
    if (name.includes('ott')) return '/assets/vouchers/ott-logo.png';

    return null;
  }, [voucherTypeName, voucherType]);

  // Derived default rates
  const defaultRates = React.useMemo(() => {
    const currentGroup = (allGroups ?? []).find((g: any) => g.id === groupId);
    const rate = currentGroup?.rates?.find((r: any) => r.voucher_type_id === voucherTypeId);
    return {
      supplier_pct: rate?.supplier_pct || 0,
      retailer_pct: rate?.retailer_pct || 0,
      agent_pct: rate?.agent_pct || 0,
      commission_type: (rate?.commission_type as CommissionType) || 'percentage',
    };
  }, [allGroups, groupId, voucherTypeId]);

  // Initialize form when defaultRates change
  React.useEffect(() => {
    setDefaultsDraft({
      supplier_pct:
        defaultRates.commission_type === 'fixed'
          ? defaultRates.supplier_pct.toFixed(2)
          : (defaultRates.supplier_pct * 100).toFixed(2),
      retailer_pct:
        defaultRates.commission_type === 'fixed'
          ? defaultRates.retailer_pct.toFixed(2)
          : (defaultRates.retailer_pct * 100).toFixed(2),
      agent_pct:
        defaultRates.commission_type === 'fixed'
          ? defaultRates.agent_pct.toFixed(2)
          : (defaultRates.agent_pct * 100).toFixed(2),
    });
    setDefaultsCommissionType(defaultRates.commission_type);
  }, [defaultRates]);

  // Check if default rates have been modified
  const hasDefaultChanges = React.useMemo(() => {
    const originalSupplier =
      defaultRates.commission_type === 'fixed'
        ? defaultRates.supplier_pct.toFixed(2)
        : (defaultRates.supplier_pct * 100).toFixed(2);
    const originalRetailer =
      defaultRates.commission_type === 'fixed'
        ? defaultRates.retailer_pct.toFixed(2)
        : (defaultRates.retailer_pct * 100).toFixed(2);
    const originalAgent =
      defaultRates.commission_type === 'fixed'
        ? defaultRates.agent_pct.toFixed(2)
        : (defaultRates.agent_pct * 100).toFixed(2);

    return (
      defaultsDraft.supplier_pct !== originalSupplier ||
      defaultsDraft.retailer_pct !== originalRetailer ||
      defaultsDraft.agent_pct !== originalAgent ||
      defaultsCommissionType !== defaultRates.commission_type
    );
  }, [defaultsDraft, defaultsCommissionType, defaultRates]);

  // Derived combined table rows
  const amountRates: VoucherAmountRate[] = React.useMemo(() => {
    const overrideMap = new Map<number, VoucherCommissionOverride>();
    (overrides ?? []).forEach((o: VoucherCommissionOverride) => overrideMap.set(o.amount, o));
    const base = (amounts ?? []).map((a: any) => a.amount as number);
    const rows = base.map(amount => {
      const override = overrideMap.get(amount);
      if (override) {
        return {
          amount,
          supplier_pct: override.supplier_pct,
          retailer_pct: override.retailer_pct,
          agent_pct: override.agent_pct,
          commission_type: override.commission_type,
          hasOverride: true,
        };
      }
      return {
        amount,
        supplier_pct: defaultRates.supplier_pct,
        retailer_pct: defaultRates.retailer_pct,
        agent_pct: defaultRates.agent_pct,
        commission_type: defaultRates.commission_type,
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

  // Default rates save handler
  const saveDefaultRates = async () => {
    if (!groupId || !voucherTypeId) return;

    const supplier = parseFloat(defaultsDraft.supplier_pct);
    const retailer = parseFloat(defaultsDraft.retailer_pct);
    const agent = parseFloat(defaultsDraft.agent_pct);

    if (isNaN(supplier) || isNaN(retailer) || isNaN(agent)) {
      toast.error('Please enter valid commission values');
      return;
    }

    try {
      setIsSavingDefaults(true);

      const supplierValue = defaultsCommissionType === 'fixed' ? supplier : supplier / 100;
      const retailerValue = defaultsCommissionType === 'fixed' ? retailer : retailer / 100;
      const agentValue = defaultsCommissionType === 'fixed' ? agent : agent / 100;

      const { error } = await upsertCommissionRate(
        groupId,
        voucherTypeId,
        retailerValue,
        agentValue,
        supplierValue,
        defaultsCommissionType
      );

      if (error) {
        console.error('Error updating commission rates:', error);
        throw new Error('Failed to update commission rates');
      }

      await mutate(SwrKeys.commissionGroups());
      toast.success('Default commission rates updated');
    } catch (err) {
      console.error('Error saving default rates:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save default rates');
    } finally {
      setIsSavingDefaults(false);
    }
  };

  // Default rates cancel handler
  const cancelDefaultsEdit = () => {
    setDefaultsDraft({
      supplier_pct:
        defaultRates.commission_type === 'fixed'
          ? defaultRates.supplier_pct.toFixed(2)
          : (defaultRates.supplier_pct * 100).toFixed(2),
      retailer_pct:
        defaultRates.commission_type === 'fixed'
          ? defaultRates.retailer_pct.toFixed(2)
          : (defaultRates.retailer_pct * 100).toFixed(2),
      agent_pct:
        defaultRates.commission_type === 'fixed'
          ? defaultRates.agent_pct.toFixed(2)
          : (defaultRates.agent_pct * 100).toFixed(2),
    });
    setDefaultsCommissionType(defaultRates.commission_type);
  };

  // Inline row editing controls
  const openRowEdit = (amount: number) => {
    const current = amountRates.find(r => r.amount === amount);
    if (!current) return;

    // Convert to display format (percentages as 0-100, fixed as-is)
    const draft: EditableVoucherAmountRate = {
      amount: current.amount,
      supplier_pct:
        current.commission_type === 'fixed'
          ? current.supplier_pct.toFixed(2)
          : (current.supplier_pct * 100).toFixed(2),
      retailer_pct:
        current.commission_type === 'fixed'
          ? current.retailer_pct.toFixed(2)
          : (current.retailer_pct * 100).toFixed(2),
      agent_pct:
        current.commission_type === 'fixed'
          ? current.agent_pct.toFixed(2)
          : (current.agent_pct * 100).toFixed(2),
      commission_type: current.commission_type,
      hasOverride: current.hasOverride,
    };

    setRowDraft(draft);
    setEditingRowAmount(amount);
  };

  const closeRowEdit = () => {
    setEditingRowAmount(null);
    setRowDraft(null);
  };

  const handleRowInputChange = (
    field: 'supplier_pct' | 'retailer_pct' | 'agent_pct',
    value: string
  ) => {
    if (!rowDraft) return;
    setRowDraft(prev => (prev ? { ...prev, [field]: value } : null));
  };

  const handleRowCommissionTypeChange = (type: CommissionType) => {
    if (!rowDraft) return;
    // When commission type changes, convert all values
    setRowDraft(prev => {
      if (!prev) return null;

      const currentAmount = amountRates.find(r => r.amount === prev.amount)?.amount || 0;

      if (type === 'fixed' && prev.commission_type === 'percentage') {
        // Converting from percentage to fixed
        return {
          ...prev,
          commission_type: type,
          supplier_pct: ((parseFloat(prev.supplier_pct as string) / 100) * currentAmount).toFixed(
            2
          ),
          retailer_pct: ((parseFloat(prev.retailer_pct as string) / 100) * currentAmount).toFixed(
            2
          ),
          agent_pct: ((parseFloat(prev.agent_pct as string) / 100) * currentAmount).toFixed(2),
        };
      } else if (type === 'percentage' && prev.commission_type === 'fixed') {
        // Converting from fixed to percentage
        return {
          ...prev,
          commission_type: type,
          supplier_pct: ((parseFloat(prev.supplier_pct as string) / currentAmount) * 100).toFixed(
            2
          ),
          retailer_pct: ((parseFloat(prev.retailer_pct as string) / currentAmount) * 100).toFixed(
            2
          ),
          agent_pct: ((parseFloat(prev.agent_pct as string) / currentAmount) * 100).toFixed(2),
        };
      }

      return { ...prev, commission_type: type };
    });
  };

  const saveRowEdit = async () => {
    if (!rowDraft || !groupId || !voucherTypeId) return;
    const amount = rowDraft.amount;

    try {
      setIsSaving(true);

      const originalRate = amountRates.find(r => r.amount === amount);
      if (!originalRate) return;

      // Convert from display format to storage format
      const supplier =
        rowDraft.commission_type === 'fixed'
          ? parseFloat(rowDraft.supplier_pct as string)
          : parseFloat(rowDraft.supplier_pct as string) / 100;
      const retailer =
        rowDraft.commission_type === 'fixed'
          ? parseFloat(rowDraft.retailer_pct as string)
          : parseFloat(rowDraft.retailer_pct as string) / 100;
      const agent =
        rowDraft.commission_type === 'fixed'
          ? parseFloat(rowDraft.agent_pct as string)
          : parseFloat(rowDraft.agent_pct as string) / 100;

      if (isNaN(supplier) || isNaN(retailer) || isNaN(agent)) {
        toast.error('Please enter valid commission values');
        return;
      }

      const hasChanges =
        originalRate.supplier_pct !== supplier ||
        originalRate.retailer_pct !== retailer ||
        originalRate.agent_pct !== agent;

      if (hasChanges) {
        const matchesDefaults =
          supplier === defaultRates.supplier_pct &&
          retailer === defaultRates.retailer_pct &&
          agent === defaultRates.agent_pct;

        if (!matchesDefaults) {
          const override: VoucherCommissionOverride = {
            voucher_type_id: voucherTypeId,
            amount,
            supplier_pct: supplier,
            retailer_pct: retailer,
            agent_pct: agent,
            commission_type: rowDraft.commission_type,
            commission_group_id: groupId,
          };
          const { error } = await upsertVoucherCommissionOverride(override);
          if (error) {
            console.error(`Error updating override for R${amount}:`, error);
            throw new Error(`Failed to update commission for R${amount}`);
          }
        } else if (originalRate.hasOverride) {
          // Reset to defaults
          const override: VoucherCommissionOverride = {
            voucher_type_id: voucherTypeId,
            amount,
            supplier_pct: defaultRates.supplier_pct,
            retailer_pct: defaultRates.retailer_pct,
            agent_pct: defaultRates.agent_pct,
            commission_type: defaultRates.commission_type,
            commission_group_id: groupId,
          };
          const { error } = await upsertVoucherCommissionOverride(override);
          if (error) {
            console.error(`Error resetting override for R${amount}:`, error);
            throw new Error(`Failed to reset commission for R${amount}`);
          }
        }
      }

      await mutate(SwrKeys.commissionOverrides(groupId, voucherTypeId));
      closeRowEdit();
      toast.success('Commission override saved');
    } catch (err) {
      console.error('Error saving commission override:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save commission override');
    } finally {
      setIsSaving(false);
    }
  };

  // Selection handlers
  const toggleSelectAmount = (amount: number) => {
    setSelectedAmounts(prev => {
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
    setSelectedAmounts(prev => {
      if (allSelected) return new Set();
      return new Set(amountRates.map(r => r.amount));
    });
  };

  const clearSelection = () => setSelectedAmounts(new Set());

  // Bulk edit handlers
  const handleBulkInputChange = (
    field: 'supplier_pct' | 'retailer_pct' | 'agent_pct',
    value: string
  ) => {
    if (value === '') {
      setBulkDraft(prev => ({ ...prev, [field]: '' }));
      return;
    }
    const normalized = value.replace(',', '.').trim();
    const numValue = parseFloat(normalized);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) return;
    setBulkDraft(prev => ({ ...prev, [field]: normalized }));
  };

  const applyBulkEdits = async () => {
    if (selectedAmounts.size === 0 || !groupId || !voucherTypeId) return;

    if (
      bulkDraft.supplier_pct === '' &&
      bulkDraft.retailer_pct === '' &&
      bulkDraft.agent_pct === ''
    ) {
      toast.message('Enter at least one commission value to apply');
      return;
    }

    try {
      setIsBulkSaving(true);

      const parseFraction = (s: string) => {
        const n = parseFloat(s);
        return Math.round((n / 100) * 10000) / 10000;
      };

      for (const amount of selectedAmounts) {
        const originalRate = amountRates.find(r => r.amount === amount);
        if (!originalRate) continue;

        const nextSupplier =
          bulkDraft.supplier_pct === ''
            ? originalRate.supplier_pct
            : parseFraction(bulkDraft.supplier_pct);
        const nextRetailer =
          bulkDraft.retailer_pct === ''
            ? originalRate.retailer_pct
            : parseFraction(bulkDraft.retailer_pct);
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
            commission_type: bulkCommissionType,
            commission_group_id: groupId,
          };

          const { error } = await upsertVoucherCommissionOverride(override);
          if (error) {
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
            commission_type: defaultRates.commission_type,
            commission_group_id: groupId,
          };

          const { error } = await upsertVoucherCommissionOverride(override);
          if (error) {
            console.error(`Error resetting override for R${amount}:`, error);
            throw new Error(`Failed to reset commission for R${amount}`);
          }
        }
      }

      await mutate(SwrKeys.commissionOverrides(groupId, voucherTypeId));
      setIsBulkModalOpen(false);
      setBulkDraft({ supplier_pct: '', retailer_pct: '', agent_pct: '' });
      clearSelection();
      toast.success('Bulk commission overrides applied');
    } catch (err) {
      console.error('Error applying bulk commission overrides:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to apply bulk commission overrides');
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Calculate summary stats
  const overridesCount = amountRates.filter(r => r.hasOverride).length;
  const defaultsCount = amountRates.length - overridesCount;

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
    <div className="space-y-4">
      {/* Back button */}
      <Link href={`/admin/commissions/${groupId}`} passHref>
        <button className="group inline-flex items-center text-sm font-medium transition-colors hover:text-primary">
          <ChevronLeft className="mr-2 h-5 w-5 transform transition-transform duration-200 group-hover:-translate-x-1" />
          Back to {groupName}
        </button>
      </Link>

      {/* Page header */}
      <div className="flex items-center justify-between">
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
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {voucherTypeName} Commission Overrides
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage commission rates for specific voucher amounts in {groupName}
            </p>
          </div>
        </div>
      </div>

      {/* Default Commission Rates - Compact Edit Form */}
      <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <h3 className="text-sm font-medium">Default Commission Rates</h3>
          <CompactCommissionTypeToggle
            value={defaultsCommissionType}
            onChange={setDefaultsCommissionType}
            disabled={isSavingDefaults}
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Supplier Input */}
          <div className="flex items-center gap-1">
            <label className="text-xs font-medium text-pink-600">Supplier</label>
            <input
              type="text"
              value={defaultsDraft.supplier_pct}
              onChange={e => setDefaultsDraft(prev => ({ ...prev, supplier_pct: e.target.value }))}
              disabled={isSavingDefaults}
              className="w-16 rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground">
              {defaultsCommissionType === 'percentage' ? '%' : 'R'}
            </span>
          </div>

          {/* Retailer Input */}
          <div className="flex items-center gap-1">
            <label className="text-xs font-medium text-purple-600">Retailer</label>
            <input
              type="text"
              value={defaultsDraft.retailer_pct}
              onChange={e => setDefaultsDraft(prev => ({ ...prev, retailer_pct: e.target.value }))}
              disabled={isSavingDefaults}
              className="w-16 rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground">
              {defaultsCommissionType === 'percentage' ? '%' : 'R'}
            </span>
          </div>

          {/* Agent Input */}
          <div className="flex items-center gap-1">
            <label className="text-xs font-medium text-blue-600">Agent</label>
            <input
              type="text"
              value={defaultsDraft.agent_pct}
              onChange={e => setDefaultsDraft(prev => ({ ...prev, agent_pct: e.target.value }))}
              disabled={isSavingDefaults}
              className="w-16 rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground">
              {defaultsCommissionType === 'percentage' ? '%' : 'R'}
            </span>
          </div>

          {/* Save and Cancel buttons - only show when there are changes */}
          {hasDefaultChanges && (
            <>
              {/* Save Button */}
              <button
                onClick={saveDefaultRates}
                disabled={isSavingDefaults}
                className="ml-auto inline-flex items-center justify-center rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-50"
                title="Save"
              >
                {isSavingDefaults ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </button>

              {/* Cancel Button */}
              <button
                onClick={cancelDefaultsEdit}
                disabled={isSavingDefaults}
                className="inline-flex items-center justify-center rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* SECTION 2 & 5: Batch Tools Bar */}
      {selectedAmounts.size > 0 && (
        <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 p-3">
          <div className="text-sm font-medium">
            Selected {selectedAmounts.size} voucher{selectedAmounts.size > 1 ? 's' : ''}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
              disabled={editingRowAmount !== null}
            >
              Bulk Edit
            </button>
            <button
              onClick={clearSelection}
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-muted"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* SECTION 2: Per-Amount Commission Overrides Table with Inline Editing */}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-2 text-left text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="rounded"
                    aria-label="Select all"
                  />
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium">Amount</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Supplier</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Retailer</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Net</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Agent</th>
                <th className="px-3 py-2 text-left text-xs font-medium">AV Profit</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Edit</th>
              </tr>
            </thead>
            <tbody>
              {amountRates.map(rate => {
                const isEditing = editingRowAmount === rate.amount;
                const isOverridden =
                  rate.supplier_pct !== defaultRates.supplier_pct ||
                  rate.retailer_pct !== defaultRates.retailer_pct ||
                  rate.agent_pct !== defaultRates.agent_pct;

                // Calculate commission amounts (for display mode)
                const supplierAmount = rate.amount * rate.supplier_pct;
                const retailerAmount = rate.amount * rate.retailer_pct;
                const netBalance = supplierAmount - retailerAmount;
                const agentAmount = netBalance * rate.agent_pct;
                const avProfit = netBalance - agentAmount;

                // Calculate live preview (for edit mode)
                const liveSupplierValue =
                  isEditing && rowDraft ? parseFloat(rowDraft.supplier_pct as string) || 0 : 0;
                const liveRetailerValue =
                  isEditing && rowDraft ? parseFloat(rowDraft.retailer_pct as string) || 0 : 0;
                const liveAgentValue =
                  isEditing && rowDraft ? parseFloat(rowDraft.agent_pct as string) || 0 : 0;

                const liveSupplierAmount =
                  isEditing && rowDraft
                    ? rowDraft.commission_type === 'fixed'
                      ? liveSupplierValue
                      : (rate.amount * liveSupplierValue) / 100
                    : 0;
                const liveRetailerAmount =
                  isEditing && rowDraft
                    ? rowDraft.commission_type === 'fixed'
                      ? liveRetailerValue
                      : (rate.amount * liveRetailerValue) / 100
                    : 0;
                const liveNetBalance = liveSupplierAmount - liveRetailerAmount;
                const liveAgentAmount =
                  isEditing && rowDraft
                    ? rowDraft.commission_type === 'fixed'
                      ? liveAgentValue
                      : (liveNetBalance * liveAgentValue) / 100
                    : 0;
                const liveAvProfit = liveNetBalance - liveAgentAmount;

                return (
                  <tr
                    key={rate.amount}
                    className={cn(
                      'border-b border-border transition-colors',
                      isEditing ? 'bg-muted/30' : 'hover:bg-muted/50'
                    )}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedAmounts.has(rate.amount)}
                        onChange={() => toggleSelectAmount(rate.amount)}
                        disabled={isEditing}
                        className="rounded"
                        aria-label={`Select R ${rate.amount.toFixed(2)}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm font-medium">R {rate.amount.toFixed(2)}</span>
                    </td>

                    {/* Supplier Column - Editable */}
                    <td className="px-3 py-2">
                      {isEditing && rowDraft ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={rowDraft.supplier_pct}
                            onChange={e => handleRowInputChange('supplier_pct', e.target.value)}
                            disabled={isSaving}
                            className="w-16 rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <span className="text-xs text-muted-foreground">
                            {rowDraft.commission_type === 'percentage' ? '%' : 'R'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            (R{liveSupplierAmount.toFixed(2)})
                          </span>
                        </div>
                      ) : (
                        <span
                          className={cn(
                            'text-sm',
                            rate.supplier_pct !== defaultRates.supplier_pct &&
                              'font-medium text-pink-600'
                          )}
                        >
                          {rate.commission_type === 'fixed'
                            ? `R${rate.supplier_pct.toFixed(2)}`
                            : `${(rate.supplier_pct * 100).toFixed(2)}%`}
                          <span className="ml-1 text-xs text-muted-foreground">
                            (R{supplierAmount.toFixed(2)})
                          </span>
                        </span>
                      )}
                    </td>

                    {/* Retailer Column - Editable */}
                    <td className="px-3 py-2">
                      {isEditing && rowDraft ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={rowDraft.retailer_pct}
                            onChange={e => handleRowInputChange('retailer_pct', e.target.value)}
                            disabled={isSaving}
                            className="w-16 rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <span className="text-xs text-muted-foreground">
                            {rowDraft.commission_type === 'percentage' ? '%' : 'R'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            (R{liveRetailerAmount.toFixed(2)})
                          </span>
                        </div>
                      ) : (
                        <span
                          className={cn(
                            'text-sm',
                            rate.retailer_pct !== defaultRates.retailer_pct &&
                              'font-medium text-purple-600'
                          )}
                        >
                          {rate.commission_type === 'fixed'
                            ? `R${rate.retailer_pct.toFixed(2)}`
                            : `${(rate.retailer_pct * 100).toFixed(2)}%`}
                          <span className="ml-1 text-xs text-muted-foreground">
                            (R{retailerAmount.toFixed(2)})
                          </span>
                        </span>
                      )}
                    </td>

                    {/* Net Column - Calculated */}
                    <td className="px-3 py-2">
                      <span className="text-sm font-medium">
                        R{' '}
                        {isEditing && rowDraft ? liveNetBalance.toFixed(2) : netBalance.toFixed(2)}
                      </span>
                    </td>

                    {/* Agent Column - Editable */}
                    <td className="px-3 py-2">
                      {isEditing && rowDraft ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={rowDraft.agent_pct}
                            onChange={e => handleRowInputChange('agent_pct', e.target.value)}
                            disabled={isSaving}
                            className="w-16 rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <span className="text-xs text-muted-foreground">
                            {rowDraft.commission_type === 'percentage' ? '%' : 'R'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            (R{liveAgentAmount.toFixed(2)})
                          </span>
                        </div>
                      ) : (
                        <span
                          className={cn(
                            'text-sm',
                            rate.agent_pct !== defaultRates.agent_pct && 'font-medium text-blue-600'
                          )}
                        >
                          {rate.commission_type === 'fixed'
                            ? `R${rate.agent_pct.toFixed(2)}`
                            : `${(rate.agent_pct * 100).toFixed(2)}%`}
                          <span className="ml-1 text-xs text-muted-foreground">
                            (R{agentAmount.toFixed(2)})
                          </span>
                        </span>
                      )}
                    </td>

                    {/* AV Profit Column - Calculated */}
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          (isEditing && rowDraft ? liveAvProfit : avProfit) >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        )}
                      >
                        R {isEditing && rowDraft ? liveAvProfit.toFixed(2) : avProfit.toFixed(2)}
                      </span>
                    </td>

                    {/* Status Column */}
                    <td className="px-3 py-2">
                      {isOverridden ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          Override
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-900/30 dark:text-gray-400">
                          Default
                        </span>
                      )}
                    </td>

                    {/* Edit Column - Actions or Toggle */}
                    <td className="px-3 py-2">
                      {isEditing && rowDraft ? (
                        <div className="flex items-center gap-1">
                          <CompactCommissionTypeToggle
                            value={rowDraft.commission_type}
                            onChange={handleRowCommissionTypeChange}
                            disabled={isSaving}
                          />
                          <button
                            onClick={saveRowEdit}
                            disabled={isSaving}
                            className="inline-flex items-center justify-center rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-50"
                            title="Save"
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={closeRowEdit}
                            disabled={isSaving}
                            className="inline-flex items-center justify-center rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openRowEdit(rate.amount)}
                          disabled={editingRowAmount !== null}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {amountRates.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No voucher amounts found for this voucher type.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 6: Footer Summary */}
      {/* <div className="sticky bottom-0 rounded-lg border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-muted-foreground">Summary:</span>
          <div className="flex items-center gap-4">
            <span>
              <span className="font-medium text-amber-600">{overridesCount}</span> Override
              {overridesCount !== 1 ? 's' : ''}
            </span>
            <span className="text-muted-foreground">|</span>
            <span>
              <span className="font-medium text-gray-600">{defaultsCount}</span> Using Default
              {defaultsCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div> */}

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
                  .map(a => `R ${a.toFixed(2)}`)
                  .join(', ')}
              </div>
            </div>

            <UnifiedCommissionInputs
              supplierValue={bulkDraft.supplier_pct}
              retailerValue={bulkDraft.retailer_pct}
              agentValue={bulkDraft.agent_pct}
              commissionType={bulkCommissionType}
              onSupplierChange={value => handleBulkInputChange('supplier_pct', value)}
              onRetailerChange={value => handleBulkInputChange('retailer_pct', value)}
              onAgentChange={value => handleBulkInputChange('agent_pct', value)}
              onTypeChange={setBulkCommissionType}
              disabled={isBulkSaving}
              showCalculated={false}
            />
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
