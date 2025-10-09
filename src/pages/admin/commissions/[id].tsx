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
  fetchCommissionGroupById,
  fetchCommissionGroups,
  fetchVoucherTypes,
  upsertCommissionRate,
  type CommissionGroup,
} from '@/actions';
import { cn } from '@/utils/cn';

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
  const { id: groupId } = router.query;

  const [groupName, setGroupName] = React.useState<string>('');
  const [groupDescription, setGroupDescription] = React.useState<string>('');
  const [commissionRates, setCommissionRates] = React.useState<CommissionRate[]>([]);
  const [voucherTypes, setVoucherTypes] = React.useState<VoucherTypeWithCommission[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Per-row editing state
  const [editingRowId, setEditingRowId] = React.useState<string | null>(null);
  const [rowDrafts, setRowDrafts] = React.useState<Record<string, EditableCommissionRate>>({});
  const [isSaving, setIsSaving] = React.useState(false);

  // Fetch commission group details and voucher types
  React.useEffect(() => {
    async function loadData() {
      try {
        if (!groupId || typeof groupId !== 'string') return;

        setIsLoading(true);

        // Fetch commission group details
        const { data: groupData, error: groupError } = await fetchCommissionGroupById(groupId);
        if (groupError) {
          throw new Error(`Failed to load commission group: ${groupError.message}`);
        }

        if (!groupData) {
          throw new Error('Commission group not found');
        }

        setGroupName(groupData.name);
        setGroupDescription(groupData.description || '');

        // Fetch all commission groups to get the rates for this specific group
        const { data: allGroups, error: groupsError } = await fetchCommissionGroups();
        if (groupsError) {
          throw new Error(`Failed to load commission rates: ${groupsError.message}`);
        }

        const currentGroup = allGroups?.find((g) => g.id === groupId);
        if (!currentGroup) {
          throw new Error('Commission group not found in list');
        }

        // Fetch voucher types to get supplier commission (only active ones)
        const { data: voucherTypesData, error: voucherTypesError } = await fetchVoucherTypes(false);
        if (voucherTypesError) {
          throw new Error(`Failed to load voucher types: ${voucherTypesError.message}`);
        }

        const typedVoucherTypes = (voucherTypesData as VoucherTypeWithCommission[]) || [];
        setVoucherTypes(typedVoucherTypes);

        // Combine commission rates with voucher type info, but only for active voucher types
        const rates: CommissionRate[] = currentGroup.rates
          .filter((rate) => {
            // Only include rates for voucher types that are active (exist in typedVoucherTypes)
            return typedVoucherTypes.some((vt) => vt.id === rate.voucher_type_id);
          })
          .map((rate) => {
            const voucherType = typedVoucherTypes.find((vt) => vt.id === rate.voucher_type_id);
            return {
              voucher_type_id: rate.voucher_type_id,
              voucher_type_name: rate.voucher_type_name || '',
              supplier_pct: voucherType?.supplier_commission_pct || 0,
              retailer_pct: rate.retailer_pct,
              agent_pct: rate.agent_pct,
            };
          });

        // Sort rates by voucher type name
        rates.sort((a, b) => a.voucher_type_name.localeCompare(b.voucher_type_name));

        setCommissionRates(rates);
      } catch (err) {
        console.error('Error loading commission group data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load commission group');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [groupId]);

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
      delete copy[editingRowId];
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
    if (!editingRowId) return;
    const draft = rowDrafts[editingRowId];
    if (!draft) return;

    try {
      setIsSaving(true);

      const originalRate = commissionRates.find((r) => r.voucher_type_id === editingRowId);
      if (!originalRate) return;

      // Convert empty values to 0 before saving
      const sanitizedRate = {
        ...draft,
        supplier_pct: draft.supplier_pct === '' || draft.supplier_pct === undefined ? 0 : Number(draft.supplier_pct),
        retailer_pct: draft.retailer_pct === '' || draft.retailer_pct === undefined ? 0 : Number(draft.retailer_pct),
        agent_pct: draft.agent_pct === '' || draft.agent_pct === undefined ? 0 : Number(draft.agent_pct),
      };

      // Update retailer/agent defaults if changed
      if (originalRate.retailer_pct !== sanitizedRate.retailer_pct || originalRate.agent_pct !== sanitizedRate.agent_pct) {
        const { error } = await upsertCommissionRate(
          groupId as string,
          editingRowId,
          sanitizedRate.retailer_pct,
          sanitizedRate.agent_pct
        );

        if (error) {
          console.error(`Error updating commission for ${draft.voucher_type_name}:`, error);
          throw new Error(`Failed to update commission for ${draft.voucher_type_name}`);
        }
      }

      // Update supplier commission if changed
      if (originalRate.supplier_pct !== sanitizedRate.supplier_pct) {
        const { updateSupplierCommission } = await import('@/actions/admin/voucherActions');
        const { error } = await updateSupplierCommission(editingRowId, sanitizedRate.supplier_pct);

        if (error) {
          console.error(`Error updating supplier commission for ${draft.voucher_type_name}:`, error);
          throw new Error(`Failed to update supplier commission for ${draft.voucher_type_name}`);
        }
      }

      // Update local state
      const updatedRates: CommissionRate[] = commissionRates.map((r) => {
        if (r.voucher_type_id !== editingRowId) return r;
        return {
          voucher_type_id: r.voucher_type_id,
          voucher_type_name: r.voucher_type_name,
          supplier_pct: typeof sanitizedRate.supplier_pct === 'string' ? 0 : sanitizedRate.supplier_pct,
          retailer_pct: typeof sanitizedRate.retailer_pct === 'string' ? 0 : sanitizedRate.retailer_pct,
          agent_pct: typeof sanitizedRate.agent_pct === 'string' ? 0 : sanitizedRate.agent_pct,
        };
      });

      setCommissionRates(updatedRates);

      // Clear editing state
      setRowDrafts((prev) => {
        const copy = { ...prev };
        delete copy[editingRowId];
        return copy;
      });
      setEditingRowId(null);

    } catch (err) {
      console.error('Error saving commission rate:', err);
      alert(err instanceof Error ? err.message : 'Failed to save commission rate');
    } finally {
      setIsSaving(false);
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
          <p className="text-sm font-semibold text-foreground mt-5">
            Default commissions
          </p>
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
    </div>
  );
}
