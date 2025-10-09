import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Check,
  X,
  Pencil,
} from 'lucide-react';
import {
  upsertCommissionRate,
  updateCommissionGroup,
} from '@/actions';
import { updateSupplierCommission } from '@/actions/admin/voucherActions';
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
} from '@/lib/swr/fetchers';

type VoucherTypeWithCommission = {
  id: string;
  name: string;
  supplier_commission_pct?: number;
};

type CommissionRate = {
  voucher_type_id: string;
  voucher_type_name: string;
  supplier_pct: number; // supplier stored as percent e.g. 3.5
  retailer_pct: number; // stored as fraction e.g. 0.05 (5%)
  agent_pct: number; // stored as fraction e.g. 0.05 (5%)
};

type EditableCommissionRate = {
  voucher_type_id: string;
  voucher_type_name: string;
  supplier_pct: number | string; // supplier kept as percent
  retailer_pct: number | string; // fraction internally (0-1), but edit UI is percent
  agent_pct: number | string; // fraction internally (0-1), but edit UI is percent
};

export default function CommissionGroupDetail() {
  const router = useRouter();
  const { id: groupIdParam } = router.query;
  const groupId = typeof groupIdParam === 'string' ? groupIdParam : undefined;
  const { mutate } = useSWRConfig();

  const [groupName, setGroupName] = React.useState<string>('');
  const [groupDescription, setGroupDescription] = React.useState<string>('');

  // Per-row editing state
  const [editingRowId, setEditingRowId] = React.useState<string | null>(null);
  const [rowDrafts, setRowDrafts] = React.useState<Record<string, EditableCommissionRate>>({});
  const [isSaving, setIsSaving] = React.useState(false);

  // Edit group modal state
  const [isGroupModalOpen, setIsGroupModalOpen] = React.useState(false);
  const [isUpdatingGroup, setIsUpdatingGroup] = React.useState(false);
  const [groupForm, setGroupForm] = React.useState<{ name: string; description: string }>({
    name: '',
    description: '',
  });

  // SWR: fetch group meta by id
  const {
    data: group,
    error: groupError,
    isLoading: groupLoading,
  } = useSWR(groupId ? SwrKeys.commissionGroup(groupId) : null, commissionGroupByIdFetcher);

  // SWR: fetch all groups (contains rates)
  const {
    data: allGroups,
    error: groupsError,
    isLoading: allGroupsLoading,
  } = useSWR(SwrKeys.commissionGroups(), commissionGroupsFetcher);

  // SWR: fetch voucher types (include inactive = true, per existing logic)
  const {
    data: voucherTypesData,
    error: voucherTypesError,
    isLoading: voucherTypesLoading,
  } = useSWR(SwrKeys.voucherTypes('all'), voucherTypesFetcher);

  // Initialize header fields when group data is available
  React.useEffect(() => {
    if (group) {
      setGroupName(group.name);
      setGroupDescription(group.description || '');
    }
  }, [group]);

  // Build derived commission rates
  const typedVoucherTypes = (voucherTypesData as VoucherTypeWithCommission[]) || [];
  const currentGroup = React.useMemo(
    () => (allGroups ?? []).find((g) => g.id === groupId),
    [allGroups, groupId]
  );

  const commissionRates: CommissionRate[] = React.useMemo(() => {
    if (!currentGroup) return [];
    const rates: CommissionRate[] = currentGroup.rates
      .filter((rate) => typedVoucherTypes.some((vt) => vt.id === rate.voucher_type_id))
      .map((rate) => {
        const voucherType = typedVoucherTypes.find((vt) => vt.id === rate.voucher_type_id);
        return {
          voucher_type_id: rate.voucher_type_id,
          voucher_type_name: rate.voucher_type_name || '',
          supplier_pct: voucherType?.supplier_commission_pct || 0,
          retailer_pct: rate.retailer_pct,
          agent_pct: rate.agent_pct,
        };
      })
      .sort((a, b) => a.voucher_type_name.localeCompare(b.voucher_type_name));
    return rates;
  }, [currentGroup, typedVoucherTypes]);

  const isLoading = groupLoading || allGroupsLoading || voucherTypesLoading;
  const errorMsg =
    (groupError as any)?.message ||
    (groupsError as any)?.message ||
    (voucherTypesError as any)?.message ||
    null;

  // Helper function to format numbers to 2 decimal places
  const formatToTwoDecimals = (value: number): number => {
    return Math.round(value * 100) / 100;
  };

  // Per-row editing controls
  const startRowEdit = (voucherTypeId: string) => {
    if (editingRowId && editingRowId !== voucherTypeId) {
      // Require finishing current edit before switching
      return;
    }
    const current = commissionRates.find((r) => r.voucher_type_id === voucherTypeId);
    if (!current) return;

    const draft: EditableCommissionRate = {
      voucher_type_id: current.voucher_type_id,
      voucher_type_name: current.voucher_type_name,
      supplier_pct: current.supplier_pct,
      retailer_pct: current.retailer_pct,
      agent_pct: current.agent_pct,
    };

    setRowDrafts((prev) => ({
      ...prev,
      [voucherTypeId]: draft,
    }));
    setEditingRowId(voucherTypeId);
  };

  const cancelRowEdit = () => {
    if (!editingRowId) return;
    setRowDrafts((prev) => {
      const copy = { ...prev };
      delete copy[editingRowId!];
      return copy;
    });
    setEditingRowId(null);
  };

  // Handle per-row input change
  const handleRowRateChange = (
    voucherTypeId: string,
    field: 'supplier_pct' | 'retailer_pct' | 'agent_pct',
    value: string
  ) => {
    if (editingRowId !== voucherTypeId) return;

    // Allow empty values for better user experience
    if (value === '') {
      setRowDrafts((prev) => ({
        ...prev,
        [voucherTypeId]: {
          ...prev[voucherTypeId],
          [field]: '' as any,
        },
      }));
      return;
    }

    const normalized = value.replace(',', '.').trim();
    const numValue = parseFloat(normalized);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) return;

    // Supplier is kept as percent; retailer/agent are stored as fraction (0-1) with 4 decimals precision
    const formattedValue =
      field === 'supplier_pct'
        ? formatToTwoDecimals(numValue)
        : Math.round((numValue / 100) * 10000) / 10000;

    setRowDrafts((prev) => ({
      ...prev,
      [voucherTypeId]: {
        ...prev[voucherTypeId],
        [field]: formattedValue,
      },
    }));
  };

  // Save a single row
  const saveRowEdit = async () => {
    if (!editingRowId || !groupId) return;
    const draft = rowDrafts[editingRowId];
    if (!draft) return;

    try {
      setIsSaving(true);

      const originalRate = commissionRates.find((r) => r.voucher_type_id === editingRowId);
      if (!originalRate) return;

      // Convert empty values to 0 before saving
      const sanitizedRate = {
        ...draft,
        supplier_pct:
          draft.supplier_pct === '' || draft.supplier_pct === undefined ? 0 : Number(draft.supplier_pct),
        retailer_pct:
          draft.retailer_pct === '' || draft.retailer_pct === undefined ? 0 : Number(draft.retailer_pct),
        agent_pct: draft.agent_pct === '' || draft.agent_pct === undefined ? 0 : Number(draft.agent_pct),
      };

      const retailerChanged = originalRate.retailer_pct !== sanitizedRate.retailer_pct;
      const agentChanged = originalRate.agent_pct !== sanitizedRate.agent_pct;
      const supplierChanged = originalRate.supplier_pct !== sanitizedRate.supplier_pct;

      // Update retailer/agent defaults if changed
      if (retailerChanged || agentChanged) {
        const { error } = await upsertCommissionRate(
          groupId,
          editingRowId,
          sanitizedRate.retailer_pct,
          sanitizedRate.agent_pct
        );
        if (error) {
          // eslint-disable-next-line no-console
          console.error(`Error updating commission for ${draft.voucher_type_name}:`, error);
          throw new Error(`Failed to update commission for ${draft.voucher_type_name}`);
        }
      }

      // Update supplier commission if changed
      if (supplierChanged) {
        const { error } = await updateSupplierCommission(editingRowId, sanitizedRate.supplier_pct);
        if (error) {
          // eslint-disable-next-line no-console
          console.error(`Error updating supplier commission for ${draft.voucher_type_name}:`, error);
          throw new Error(`Failed to update supplier commission for ${draft.voucher_type_name}`);
        }
      }

      // Revalidate caches
      const tasks: Array<Promise<any>> = [];
      // Rates live in commissionGroups
      if (retailerChanged || agentChanged) {
        tasks.push(mutate(SwrKeys.commissionGroups()));
      }
      // Supplier lives on voucher types
      if (supplierChanged) {
        tasks.push(mutate(SwrKeys.voucherTypes('all')));
      }
      // Group header data (name/description) stays the same here, but ensure fresh
      tasks.push(mutate(SwrKeys.commissionGroup(groupId)));
      await Promise.all(tasks);

      // Clear editing state
      setRowDrafts((prev) => {
        const copy = { ...prev };
        delete copy[editingRowId];
        return copy;
      });
      setEditingRowId(null);

      toast.success('Commission updated');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error saving commission rate:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save commission rate');
    } finally {
      setIsSaving(false);
    }
  };

  // Edit Group modal handlers
  const openEditGroup = () => {
    setGroupForm({ name: groupName, description: groupDescription || '' });
    setIsGroupModalOpen(true);
  };

  const isNameValid = (name: string) => {
    const t = name.trim();
    return t.length >= 2 && t.length <= 80;
  };

  const isUnchanged =
    groupForm.name.trim() === groupName.trim() &&
    (groupForm.description || '').trim() === (groupDescription || '').trim();

  const saveGroupDetails = async () => {
    if (!groupId) return;
    const name = groupForm.name.trim();
    const description = (groupForm.description ?? '').trim();

    if (!isNameValid(name)) {
      toast.error('Name must be between 2 and 80 characters');
      return;
    }

    if (isUnchanged) {
      setIsGroupModalOpen(false);
      return;
    }

    try {
      setIsUpdatingGroup(true);
      const { data, error } = await updateCommissionGroup(groupId, { name, description });
      if (error) {
        // eslint-disable-next-line no-console
        console.error('Error updating commission group:', error);
        toast.error(error.message || 'Failed to update group');
        return;
      }
      setGroupName(data?.name ?? name);
      setGroupDescription(data?.description ?? description);
      toast.success('Group updated');
      setIsGroupModalOpen(false);

      // Revalidate group cache
      await mutate(SwrKeys.commissionGroup(groupId));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error updating commission group:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update group');
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  // Navigate to voucher amount overrides
  const navigateToAmountOverrides = (voucherTypeId: string) => {
    router.push(`/admin/commissions/${groupId}/voucher-type/${voucherTypeId}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
          <p>Loading commission group...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (errorMsg) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <h2 className="mb-2 text-xl font-semibold">Error</h2>
          <p className="mb-4 text-muted-foreground">{errorMsg}</p>
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
      <Link href="/admin/commissions" passHref>
        <button className="group inline-flex items-center text-sm font-medium transition-colors hover:text-primary">
          <ChevronLeft className="mr-2 h-5 w-5 transform transition-transform duration-200 group-hover:-translate-x-1" />
          Back to commission groups
        </button>
      </Link>

      {/* Page header */}
      <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{groupName}</h1>
          <p className="text-muted-foreground">
            {groupDescription || 'Manage commission rates for this group'}
          </p>
          <p className="text-sm font-semibold text-foreground mt-5">Default commissions</p>
        </div>
        <div>
          <button
            onClick={openEditGroup}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Group
          </button>
        </div>
      </div>

      {/* Commission rates table */}
      <div className="rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">
                  Voucher Type
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">
                  Supplier Com. %
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">
                  Retailer Com. %
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">
                  Agent Com. %
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">
                  Actions
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">
                  Edit
                </th>
              </tr>
            </thead>
            <tbody>
              {commissionRates.map((rate) => {
                const isRowEditing = editingRowId === rate.voucher_type_id;
                const draft = isRowEditing ? rowDrafts[rate.voucher_type_id] : null;

                // Draft numeric values for display
                const draftSupplier =
                  isRowEditing && typeof draft?.supplier_pct !== 'string' ? draft?.supplier_pct ?? 0 : 0;
                const draftRetailer =
                  isRowEditing && typeof draft?.retailer_pct !== 'string' ? draft?.retailer_pct ?? 0 : 0;
                const draftAgent =
                  isRowEditing && typeof draft?.agent_pct !== 'string' ? draft?.agent_pct ?? 0 : 0;

                return (
                  <tr
                    key={rate.voucher_type_id}
                    className="border-b border-border transition-colors hover:bg-muted/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-medium">{rate.voucher_type_name}</span>
                    </td>

                    {/* Supplier */}
                    <td className="whitespace-nowrap px-4 py-3">
                      {isRowEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={typeof draft?.supplier_pct === 'string' ? '' : formatToTwoDecimals(draftSupplier)}
                          onChange={(e) =>
                            handleRowRateChange(rate.voucher_type_id, 'supplier_pct', e.target.value)
                          }
                          className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
                        />
                      ) : (
                        <span
                          className={cn(
                            'rounded-md px-2 py-1',
                            rate.supplier_pct > 0
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : ''
                          )}
                        >
                          {rate.supplier_pct.toFixed(2)}%
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
                            typeof draft?.retailer_pct === 'string' ? '' : formatToTwoDecimals(draftRetailer * 100)
                          }
                          onChange={(e) =>
                            handleRowRateChange(rate.voucher_type_id, 'retailer_pct', e.target.value)
                          }
                          className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
                        />
                      ) : (
                        <span
                          className={cn(
                            'rounded-md px-2 py-1',
                            rate.retailer_pct > 0
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
                          value={typeof draft?.agent_pct === 'string' ? '' : formatToTwoDecimals(draftAgent * 100)}
                          onChange={(e) =>
                            handleRowRateChange(rate.voucher_type_id, 'agent_pct', e.target.value)
                          }
                          className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
                        />
                      ) : (
                        <span
                          className={cn(
                            'rounded-md px-2 py-1',
                            rate.agent_pct > 0
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                              : ''
                          )}
                        >
                          {(rate.agent_pct * 100).toFixed(2)}%
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        onClick={() => navigateToAmountOverrides(rate.voucher_type_id)}
                        className="inline-flex items-center text-sm text-primary hover:text-primary/80"
                        disabled={!!editingRowId && editingRowId !== rate.voucher_type_id}
                      >
                        <span>Manage Amounts</span>
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </button>
                    </td>

                    {/* Edit per row */}
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
                          onClick={() => startRowEdit(rate.voucher_type_id)}
                          disabled={!!editingRowId}
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
              {commissionRates.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No commission rates found for this group.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Group Modal */}
      <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Commission Group</DialogTitle>
            <DialogDescription>
              Update the name and description of this commission group.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Group name</label>
              <input
                type="text"
                value={groupForm.name}
                onChange={(e) => setGroupForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Enter group name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Description</label>
              <textarea
                value={groupForm.description}
                onChange={(e) =>
                  setGroupForm((prev) => ({ ...prev, description: e.target.value }))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Optional description"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <button
              onClick={() => setIsGroupModalOpen(false)}
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={saveGroupDetails}
              disabled={isUpdatingGroup || !groupForm.name.trim() || groupForm.name.trim().length < 2}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
            >
              {isUpdatingGroup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
