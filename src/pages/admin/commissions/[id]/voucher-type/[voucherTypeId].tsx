import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Check,
  X,
  Pencil,
} from 'lucide-react';
import {
  fetchCommissionGroupById,
  fetchVoucherTypes,
  getVoucherAmountsForType,
  getVoucherCommissionOverridesForType,
  upsertVoucherCommissionOverride,
  type VoucherCommissionOverride,
} from '@/actions';
import { cn } from '@/utils/cn';
import { toast } from 'sonner';

type VoucherAmountRate = {
  amount: number;
  supplier_pct: number;
  retailer_pct: number;
  agent_pct: number;
  hasOverride: boolean;
};

type EditableVoucherAmountRate = {
  amount: number;
  supplier_pct: number | string;
  retailer_pct: number | string;
  agent_pct: number | string;
  hasOverride: boolean;
};

export default function VoucherAmountCommissions() {
  const router = useRouter();
  const { id: groupId, voucherTypeId } = router.query;

  const [groupName, setGroupName] = React.useState<string>('');
  const [voucherTypeName, setVoucherTypeName] = React.useState<string>('');
  const [defaultRates, setDefaultRates] = React.useState({
    supplier_pct: 0,
    retailer_pct: 0,
    agent_pct: 0,
  });
  const [amountRates, setAmountRates] = React.useState<VoucherAmountRate[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editedRates, setEditedRates] = React.useState<Record<string, EditableVoucherAmountRate>>({});

  // Fetch data
  React.useEffect(() => {
    async function loadData() {
      try {
        if (!groupId || !voucherTypeId || typeof groupId !== 'string' || typeof voucherTypeId !== 'string') return;

        setIsLoading(true);

        // Fetch commission group details
        const { data: groupData, error: groupError } = await fetchCommissionGroupById(groupId);
        if (groupError) {
          throw new Error(`Failed to load commission group: ${groupError.message}`);
        }
        setGroupName(groupData?.name || '');

        // Fetch voucher type details
        const { data: voucherTypes, error: voucherTypesError } = await fetchVoucherTypes();
        if (voucherTypesError) {
          throw new Error(`Failed to load voucher types: ${voucherTypesError.message}`);
        }

        const voucherType = voucherTypes?.find(vt => vt.id === voucherTypeId);
        if (!voucherType) {
          throw new Error('Voucher type not found');
        }
        setVoucherTypeName(voucherType.name);

        // Fetch default commission rates for this voucher type in this group
        const { fetchCommissionGroups } = await import('@/actions');
        const { data: allGroups, error: groupsError } = await fetchCommissionGroups();
        if (groupsError) {
          throw new Error(`Failed to load commission rates: ${groupsError.message}`);
        }

        const currentGroup = allGroups?.find(g => g.id === groupId);
        const defaultRate = currentGroup?.rates.find(r => r.voucher_type_id === voucherTypeId);
        
        if (defaultRate) {
          setDefaultRates({
            supplier_pct: voucherType.supplier_commission_pct || 0,
            retailer_pct: defaultRate.retailer_pct,
            agent_pct: defaultRate.agent_pct,
          });
        }

        // Fetch voucher amounts for this type
        const { data: amounts, error: amountsError } = await getVoucherAmountsForType(voucherTypeId);
        if (amountsError) {
          throw new Error(`Failed to load voucher amounts: ${amountsError.message}`);
        }

        // Fetch commission overrides for this voucher type and commission group
        const { data: overrides, error: overridesError } = await getVoucherCommissionOverridesForType(
          voucherTypeId,
          groupId
        );
        if (overridesError) {
          console.error('Error loading commission overrides:', overridesError);
        }

        // Create a map of overrides by amount
        const overrideMap = new Map<number, VoucherCommissionOverride>();
        overrides?.forEach(override => {
          overrideMap.set(override.amount, override);
        });

        // Combine amounts with overrides
        const rates: VoucherAmountRate[] = (amounts || []).map(({ amount }) => {
          const override = overrideMap.get(amount);
          if (override) {
            return {
              amount,
              supplier_pct: override.supplier_pct,
              retailer_pct: override.retailer_pct,
              agent_pct: override.agent_pct,
              hasOverride: true,
            };
          } else {
            // Use default rates
            return {
              amount,
              supplier_pct: defaultRates.supplier_pct,
              retailer_pct: defaultRates.retailer_pct,
              agent_pct: defaultRates.agent_pct,
              hasOverride: false,
            };
          }
        });

        // Sort by amount
        rates.sort((a, b) => a.amount - b.amount);

        setAmountRates(rates);
      } catch (err) {
        console.error('Error loading voucher amount data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load voucher amount data');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [groupId, voucherTypeId, defaultRates.supplier_pct, defaultRates.retailer_pct, defaultRates.agent_pct]);

  // Start editing
  const startEditing = () => {
    const initialEditedRates: Record<string, VoucherAmountRate> = {};
    amountRates.forEach(rate => {
      initialEditedRates[rate.amount.toString()] = { ...rate };
    });
    setEditedRates(initialEditedRates);
    setIsEditing(true);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditedRates({});
    setIsEditing(false);
  };

  // Helper function to format numbers to 2 decimal places
  const formatToTwoDecimals = (value: number): number => {
    return Math.round(value * 100) / 100;
  };

  // Handle rate change
  const handleRateChange = (
    amount: number,
    field: 'supplier_pct' | 'retailer_pct' | 'agent_pct',
    value: string
  ) => {
    // Allow empty values for better user experience
    if (value === '') {
      setEditedRates(prev => ({
        ...prev,
        [amount.toString()]: {
          ...prev[amount.toString()],
          [field]: '' as any, // Store empty string temporarily
        },
      }));
      return;
    }

    const normalized = value.replace(',', '.').trim();
    const numValue = parseFloat(normalized);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) return;

    // Use 2 decimals for supplier (percent value) and 4 decimals for retailer/agent (fractional)
    const formattedValue =
      field === 'supplier_pct'
        ? formatToTwoDecimals(numValue)
        : Math.round((numValue / 100) * 10000) / 10000;

    setEditedRates(prev => ({
      ...prev,
      [amount.toString()]: {
        ...prev[amount.toString()],
        [field]: formattedValue,
      },
    }));
  };

  // Save changes
  const saveChanges = async () => {
    try {
      setIsSaving(true);

      // Update each rate that has changed
      for (const [amountStr, editedRate] of Object.entries(editedRates)) {
        const amount = parseFloat(amountStr);
        const originalRate = amountRates.find(r => r.amount === amount);
        if (!originalRate) continue;

        // Convert empty values to 0 before processing
        const sanitizedRate = {
          ...editedRate,
          supplier_pct: (editedRate.supplier_pct === '' || editedRate.supplier_pct === undefined) ? 0 : Number(editedRate.supplier_pct),
          retailer_pct: (editedRate.retailer_pct === '' || editedRate.retailer_pct === undefined) ? 0 : Number(editedRate.retailer_pct),
          agent_pct: (editedRate.agent_pct === '' || editedRate.agent_pct === undefined) ? 0 : Number(editedRate.agent_pct),
        };

        // Check if any commission changed from the default
        const hasChanges = 
          originalRate.supplier_pct !== sanitizedRate.supplier_pct ||
          originalRate.retailer_pct !== sanitizedRate.retailer_pct ||
          originalRate.agent_pct !== sanitizedRate.agent_pct;

        if (hasChanges) {
          // Check if the edited values match the defaults
          const matchesDefaults = 
            sanitizedRate.supplier_pct === defaultRates.supplier_pct &&
            sanitizedRate.retailer_pct === defaultRates.retailer_pct &&
            sanitizedRate.agent_pct === defaultRates.agent_pct;

          if (!matchesDefaults) {
            // Create or update override
            const override: VoucherCommissionOverride = {
              voucher_type_id: voucherTypeId as string,
              amount,
              supplier_pct: sanitizedRate.supplier_pct,
              retailer_pct: sanitizedRate.retailer_pct,
              agent_pct: sanitizedRate.agent_pct,
              commission_group_id: groupId as string,
            };

            const { error } = await upsertVoucherCommissionOverride(override);
            if (error) {
              console.error(`Error updating override for R${amount}:`, error);
              throw new Error(`Failed to update commission for R${amount}`);
            }
          } else if (originalRate.hasOverride) {
            // If it matches defaults and had an override, we should delete the override
            // For now, we'll just set it to match defaults
            const override: VoucherCommissionOverride = {
              voucher_type_id: voucherTypeId as string,
              amount,
              supplier_pct: defaultRates.supplier_pct,
              retailer_pct: defaultRates.retailer_pct,
              agent_pct: defaultRates.agent_pct,
              commission_group_id: groupId as string,
            };

            const { error } = await upsertVoucherCommissionOverride(override);
            if (error) {
              console.error(`Error resetting override for R${amount}:`, error);
              throw new Error(`Failed to reset commission for R${amount}`);
            }
          }
        }

        // Update the edited rate with sanitized values
        editedRates[amountStr] = sanitizedRate;
      }

      // Update local state with new values - convert to VoucherAmountRate type
      const updatedRates: VoucherAmountRate[] = amountRates.map(rate => {
        const edited = editedRates[rate.amount.toString()];
        if (edited) {
          const sanitizedEdited = {
            amount: edited.amount,
            supplier_pct: typeof edited.supplier_pct === 'string' ? 0 : edited.supplier_pct,
            retailer_pct: typeof edited.retailer_pct === 'string' ? 0 : edited.retailer_pct,
            agent_pct: typeof edited.agent_pct === 'string' ? 0 : edited.agent_pct,
            hasOverride: edited.hasOverride,
          };

          const matchesDefaults = 
            sanitizedEdited.supplier_pct === defaultRates.supplier_pct &&
            sanitizedEdited.retailer_pct === defaultRates.retailer_pct &&
            sanitizedEdited.agent_pct === defaultRates.agent_pct;

          return {
            ...sanitizedEdited,
            hasOverride: !matchesDefaults,
          };
        }
        return rate;
      });

      setAmountRates(updatedRates);
      setIsEditing(false);
      setEditedRates({});
      toast.success('Commission overrides saved successfully');
    } catch (err) {
      console.error('Error saving commission overrides:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save commission overrides');
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
          <p>Loading voucher amounts...</p>
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {voucherTypeName} Commission Overrides
          </h1>
          <p className="text-muted-foreground">
            Manage commission rates for specific voucher amounts in {groupName}
          </p>
        </div>
        {!isEditing ? (
          <button
            onClick={startEditing}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Overrides
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

      {/* Default rates info */}
      <div className="rounded-lg border border-border bg-muted/50 p-4">
        <h3 className="mb-2 font-medium">Default Commission Rates for {voucherTypeName}</h3>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Supplier:</span>{' '}
            <span className="font-medium">{defaultRates.supplier_pct.toFixed(2)}%</span>
          </div>
          <div>
            <span className="text-muted-foreground">Retailer:</span>{' '}
            <span className="font-medium">{(defaultRates.retailer_pct * 100).toFixed(2)}%</span>
          </div>
          <div>
            <span className="text-muted-foreground">Agent:</span>{' '}
            <span className="font-medium">{(defaultRates.agent_pct * 100).toFixed(2)}%</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          These are the default rates. You can override them for specific voucher amounts below.
        </p>
      </div>

      {/* Voucher amounts table */}
      <div className="rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium">
                  Voucher Amount
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
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {amountRates.map((rate) => {
                const editedRate = isEditing ? editedRates[rate.amount.toString()] : rate;
                const isOverridden = editedRate?.hasOverride || rate.hasOverride;
                
                return (
                  <tr
                    key={rate.amount}
                    className="border-b border-border transition-colors hover:bg-muted/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-medium">R {rate.amount.toFixed(2)}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={typeof editedRate?.supplier_pct === 'string' ? '' : formatToTwoDecimals(editedRate?.supplier_pct || 0)}
                          onChange={(e) =>
                            handleRateChange(rate.amount, 'supplier_pct', e.target.value)
                          }
                          className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
                        />
                      ) : (
                        <span className={cn(
                          "rounded-md px-2 py-1",
                          rate.supplier_pct !== defaultRates.supplier_pct ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : ""
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
                          value={typeof editedRate?.retailer_pct === 'string' ? '' : formatToTwoDecimals((editedRate?.retailer_pct || 0) * 100)}
                          onChange={(e) =>
                            handleRateChange(rate.amount, 'retailer_pct', e.target.value)
                          }
                          className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
                        />
                      ) : (
                        <span className={cn(
                          "rounded-md px-2 py-1",
                          rate.retailer_pct !== defaultRates.retailer_pct ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : ""
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
                          value={typeof editedRate?.agent_pct === 'string' ? '' : formatToTwoDecimals((editedRate?.agent_pct || 0) * 100)}
                          onChange={(e) =>
                            handleRateChange(rate.amount, 'agent_pct', e.target.value)
                          }
                          className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
                        />
                      ) : (
                        <span className={cn(
                          "rounded-md px-2 py-1",
                          rate.agent_pct !== defaultRates.agent_pct ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" : ""
                        )}>
                          {(rate.agent_pct * 100).toFixed(2)}%
                        </span>
                      )}
                    </td>
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
                  </tr>
                );
              })}
              {amountRates.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No voucher amounts found for this voucher type.
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
