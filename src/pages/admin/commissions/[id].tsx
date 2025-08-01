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
  supplier_pct: number;
  retailer_pct: number;
  agent_pct: number;
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
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editedRates, setEditedRates] = React.useState<Record<string, CommissionRate>>({});

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

        const currentGroup = allGroups?.find(g => g.id === groupId);
        if (!currentGroup) {
          throw new Error('Commission group not found in list');
        }

        // Fetch voucher types to get supplier commission
        const { data: voucherTypesData, error: voucherTypesError } = await fetchVoucherTypes();
        if (voucherTypesError) {
          throw new Error(`Failed to load voucher types: ${voucherTypesError.message}`);
        }

        const typedVoucherTypes = voucherTypesData as VoucherTypeWithCommission[] || [];
        setVoucherTypes(typedVoucherTypes);

        // Combine commission rates with voucher type info
        const rates: CommissionRate[] = currentGroup.rates.map(rate => {
          const voucherType = typedVoucherTypes.find(vt => vt.id === rate.voucher_type_id);
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

  // Start editing
  const startEditing = () => {
    const initialEditedRates: Record<string, CommissionRate> = {};
    commissionRates.forEach(rate => {
      initialEditedRates[rate.voucher_type_id] = { ...rate };
    });
    setEditedRates(initialEditedRates);
    setIsEditing(true);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditedRates({});
    setIsEditing(false);
  };

  // Handle rate change
  const handleRateChange = (
    voucherTypeId: string,
    field: 'supplier_pct' | 'retailer_pct' | 'agent_pct',
    value: string
  ) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) return;

    setEditedRates(prev => ({
      ...prev,
      [voucherTypeId]: {
        ...prev[voucherTypeId],
        [field]: numValue,
      },
    }));
  };

  // Save changes
  const saveChanges = async () => {
    try {
      setIsSaving(true);

      // Update each rate
      for (const [voucherTypeId, rate] of Object.entries(editedRates)) {
        const originalRate = commissionRates.find(r => r.voucher_type_id === voucherTypeId);
        if (!originalRate) continue;

        // Check if retailer or agent commission changed
        if (
          originalRate.retailer_pct !== rate.retailer_pct ||
          originalRate.agent_pct !== rate.agent_pct
        ) {
          const { error } = await upsertCommissionRate(
            groupId as string,
            voucherTypeId,
            rate.retailer_pct,
            rate.agent_pct
          );

          if (error) {
            console.error(`Error updating rate for ${rate.voucher_type_name}:`, error);
            throw new Error(`Failed to update commission for ${rate.voucher_type_name}`);
          }
        }

        // Update supplier commission if changed
        if (originalRate.supplier_pct !== rate.supplier_pct) {
          const { updateSupplierCommission } = await import('@/actions/admin/voucherActions');
          const { error } = await updateSupplierCommission(voucherTypeId, rate.supplier_pct);

          if (error) {
            console.error(`Error updating supplier commission for ${rate.voucher_type_name}:`, error);
            throw new Error(`Failed to update supplier commission for ${rate.voucher_type_name}`);
          }
        }
      }

      // Update local state with new values
      setCommissionRates(Object.values(editedRates));
      setIsEditing(false);
      setEditedRates({});
    } catch (err) {
      console.error('Error saving commission rates:', err);
      alert(err instanceof Error ? err.message : 'Failed to save commission rates');
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
        </div>
        {!isEditing ? (
          <button
            onClick={startEditing}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Rates
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={saveChanges}
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-green-700 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </button>
            <button
              onClick={cancelEditing}
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted disabled:opacity-50"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </button>
          </div>
        )}
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
                  Supplier Commission %
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">
                  Retailer Commission %
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">
                  Agent Commission %
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {commissionRates.map((rate) => {
                const editedRate = isEditing ? editedRates[rate.voucher_type_id] : rate;
                return (
                  <tr
                    key={rate.voucher_type_id}
                    className="border-b border-border transition-colors hover:bg-muted/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-medium">{rate.voucher_type_name}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={editedRate?.supplier_pct || 0}
                          onChange={(e) =>
                            handleRateChange(rate.voucher_type_id, 'supplier_pct', e.target.value)
                          }
                          className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
                        />
                      ) : (
                        <span className={cn(
                          "rounded-md px-2 py-1",
                          rate.supplier_pct > 0 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : ""
                        )}>
                          {rate.supplier_pct.toFixed(2)}%
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={(editedRate?.retailer_pct || 0) * 100}
                          onChange={(e) =>
                            handleRateChange(
                              rate.voucher_type_id,
                              'retailer_pct',
                              (parseFloat(e.target.value) / 100).toString()
                            )
                          }
                          className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
                        />
                      ) : (
                        <span className={cn(
                          "rounded-md px-2 py-1",
                          rate.retailer_pct > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : ""
                        )}>
                          {(rate.retailer_pct * 100).toFixed(2)}%
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={(editedRate?.agent_pct || 0) * 100}
                          onChange={(e) =>
                            handleRateChange(
                              rate.voucher_type_id,
                              'agent_pct',
                              (parseFloat(e.target.value) / 100).toString()
                            )
                          }
                          className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
                        />
                      ) : (
                        <span className={cn(
                          "rounded-md px-2 py-1",
                          rate.agent_pct > 0 ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" : ""
                        )}>
                          {(rate.agent_pct * 100).toFixed(2)}%
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        onClick={() => navigateToAmountOverrides(rate.voucher_type_id)}
                        className="inline-flex items-center text-sm text-primary hover:text-primary/80"
                        disabled={isEditing}
                      >
                        <span>Manage Amounts</span>
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {commissionRates.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No commission rates found for this group.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fixed save/cancel buttons when editing */}
      {isEditing && (
        <div className="fixed bottom-6 right-6 flex gap-2 rounded-lg bg-background p-2 shadow-lg border border-border">
          <button
            onClick={saveChanges}
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-green-700 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </button>
          <button
            onClick={cancelEditing}
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-muted disabled:opacity-50"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
