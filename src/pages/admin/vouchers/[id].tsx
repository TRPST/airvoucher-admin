import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ChevronLeft,
  CreditCard,
  Search,
  Filter,
  ArrowDown,
  ArrowUp,
  Loader2,
  AlertCircle,
  Upload,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  getVoucherCommissionOverride,
  upsertVoucherCommissionOverride,
  getVoucherCommissionOverridesForType,
} from '@/actions/admin/commissionOverrideActions';
import { ManageVoucherCommissionModal } from '@/components/admin/vouchers/ManageVoucherCommissionModal';
import { Tooltip } from '@/components/ui/tooltip';

import { TablePlaceholder } from '@/components/ui/table-placeholder';
import { cn } from '@/utils/cn';
import { fetchVoucherInventory, fetchVoucherTypes } from '@/actions';
import type { VoucherInventory } from '@/actions/types/adminTypes';
import { VoucherUploadDialog } from '@/components/admin/vouchers/VoucherUploadDialog';

export default function VoucherTypeDetail() {
  const router = useRouter();
  const { id: typeId } = router.query;

  const [showUploadDialog, setShowUploadDialog] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortBy, setSortBy] = React.useState<{
    field: string;
    direction: 'asc' | 'desc';
  }>({
    field: 'amount',
    direction: 'asc',
  });
  const [vouchers, setVouchers] = React.useState<VoucherInventory[]>([]);
  const [typeName, setTypeName] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [supplierCommission, setSupplierCommission] = React.useState<number>(0);
  const [editingCommission, setEditingCommission] = React.useState(false);
  const [newCommission, setNewCommission] = React.useState<string>('');
  const [savingCommission, setSavingCommission] = React.useState(false);
  const [commissionError, setCommissionError] = React.useState<string | null>(null);
  const [commissionModalOpen, setCommissionModalOpen] = useState(false);
  const [commissionModalLoading, setCommissionModalLoading] = useState(false);
  const [commissionModalDefault, setCommissionModalDefault] = useState<any>(null);
  const [commissionModalVoucher, setCommissionModalVoucher] = useState<{
    amount: number;
  } | null>(null);
  const [commissionOverrides, setCommissionOverrides] = useState<Record<string, any>>({}); // key: amount as string

  // Fetch voucher type details including supplier commission
  React.useEffect(() => {
    async function loadData() {
      try {
        if (!typeId || typeof typeId !== 'string') return;

        setIsLoading(true);

        // First, get the voucher type details
        const { data: voucherTypes, error: typesError } = await fetchVoucherTypes();

        if (typesError) {
          throw new Error(`Failed to load voucher types: ${typesError.message}`);
        }

        const selectedType = voucherTypes?.find(t => t.id === typeId);
        if (!selectedType) {
          throw new Error('Voucher type not found');
        }

        setTypeName(selectedType.name);

        // Find the supplier commission percentage from the selected type
        const selectedTypeObj = voucherTypes?.find(t => t.id === typeId);
        if (selectedTypeObj && 'supplier_commission_pct' in selectedTypeObj) {
          const commissionPct = (selectedTypeObj as any).supplier_commission_pct || 0;
          setSupplierCommission(commissionPct);
          setNewCommission(commissionPct.toFixed(2));
        }

        // Then fetch vouchers for this type
        const { data, error: fetchError } = await fetchVoucherInventory(typeId);

        if (fetchError) {
          // Don't throw an error for no inventory, just set empty vouchers
          if (fetchError.message === 'No voucher inventory data found') {
            setVouchers([]);
          } else {
            throw new Error(`Failed to load voucher inventory: ${fetchError.message}`);
          }
        } else {
          setVouchers(data || []);
          console.log(`${selectedType.name} vouchers:`, data);
        }
      } catch (err) {
        console.error('Error loading voucher data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load voucher inventory');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [typeId]);

  // Group vouchers by amount for better inventory overview
  const groupedVouchers = React.useMemo(() => {
    const groups = new Map<
      string,
      {
        amount: number;
        count: number;
        available: number;
        sold: number;
        disabled: number;
        voucherId: string;
      }
    >();

    vouchers.forEach(voucher => {
      // Create a key based on the amount
      const key = `${voucher.amount}`;
      const current = groups.get(key) || {
        amount: voucher.amount,
        count: 0,
        available: 0,
        sold: 0,
        disabled: 0,
        voucherId: voucher.id, // first voucher with this amount
      };

      current.count++;
      if (voucher.status === 'available') {
        current.available++;
      } else if (voucher.status === 'sold') {
        current.sold++;
      } else if (voucher.status === 'disabled') {
        current.disabled++;
      }
      // Always keep the first voucherId for this amount
      groups.set(key, current);
    });

    return Array.from(groups.values());
  }, [vouchers]);

  // Fetch all overrides for this voucher_type_id on load and after save
  useEffect(() => {
    async function fetchOverrides() {
      if (!typeId || typeof typeId !== 'string') return;
      const { data, error } = await getVoucherCommissionOverridesForType(typeId);
      if (error || !data) {
        setCommissionOverrides({});
        return;
      }
      // Map: amount (as string) -> override
      const overrides: Record<string, any> = {};
      data.forEach((row: any) => {
        overrides[row.amount.toString()] = row;
      });
      setCommissionOverrides(overrides);
    }
    fetchOverrides();
  }, [typeId, vouchers]);

  // Handle upload success - fetch new vouchers in background without loading state
  const handleUploadSuccess = () => {
    // Fetch new vouchers in background without showing loading state
    if (typeId && typeof typeId === 'string') {
      fetchVoucherInventory(typeId)
        .then(({ data, error: fetchError }) => {
          if (fetchError) {
            console.error('Error reloading voucher inventory:', fetchError.message);
          } else {
            setVouchers(data || []);
          }
        })
        .catch(err => {
          console.error('Error reloading voucher data:', err);
        });
    }
    setShowUploadDialog(false); // Close the dialog after successful upload
  };

  // Filter and sort vouchers
  const filteredVouchers = React.useMemo(() => {
    let filtered = [...groupedVouchers];

    // Apply search filter (filter by amount)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(voucher => voucher.amount.toString().includes(term));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const field = sortBy.field as keyof typeof a;

      // For inventory value, calculate dynamically
      if (sortBy.field === 'inventoryValue') {
        const aValue = a.available * a.amount;
        const bValue = b.available * b.amount;
        return sortBy.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle number comparison
      if (typeof a[field] === 'number' && typeof b[field] === 'number') {
        return sortBy.direction === 'asc'
          ? (a[field] as number) - (b[field] as number)
          : (b[field] as number) - (a[field] as number);
      }

      return 0;
    });

    return filtered;
  }, [groupedVouchers, searchTerm, sortBy]);

  // Toggle sort direction for a column
  const toggleSort = (field: string) => {
    if (sortBy.field === field) {
      setSortBy({
        field,
        direction: sortBy.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      setSortBy({ field, direction: 'asc' });
    }
  };

  // Calculate total inventory value
  const totalInventoryValue = filteredVouchers.reduce(
    (sum, voucher) => sum + voucher.amount * voucher.available,
    0
  );

  // Format data for table
  const tableData = filteredVouchers.map(voucher => {
    const group = groupedVouchers.find(g => g.amount === voucher.amount);
    const amount = voucher.amount;
    const stockStatus = voucher.available < 10 ? 'Low' : voucher.available < 50 ? 'Medium' : 'High';
    const override = commissionOverrides[amount.toString()];
    return {
      Value: `R ${voucher.amount.toFixed(2)}`,
      Available: (
        <div className="flex items-center gap-2">
          <span>{voucher.available.toLocaleString()}</span>
          <div
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
              stockStatus === 'Low'
                ? 'bg-destructive/10 text-destructive'
                : stockStatus === 'Medium'
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'bg-green-500/10 text-green-500'
            )}
          >
            {stockStatus}
          </div>
        </div>
      ),
      Sold: voucher.sold.toLocaleString(),
      Disabled: voucher.disabled.toLocaleString(),
      'Inventory Value': `R ${(voucher.amount * voucher.available).toFixed(2)}`,
      Commissions: (
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center rounded border border-primary/20 bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20"
            onClick={async () => {
              setCommissionModalVoucher({ amount });
              setCommissionModalLoading(true);
              const { data } = await getVoucherCommissionOverride(typeId as string, amount);
              setCommissionModalDefault(
                data
                  ? {
                      supplier_pct: data.supplier_pct,
                      retailer_pct: data.retailer_pct,
                      agent_pct: data.agent_pct,
                    }
                  : undefined
              );
              setCommissionModalLoading(false);
              setCommissionModalOpen(true);
            }}
            disabled={commissionModalLoading}
            type="button"
          >
            Manage Commissions
          </button>
          {override && (
            <Tooltip content="This voucher has custom commission overrides.">
              <span className="ml-1 text-lg" role="img" aria-label="Override">
                ⚙️
              </span>
            </Tooltip>
          )}
        </div>
      ),
    };
  });

  // Update SortIndicator to show both arrows by default, and only the active one when sorted
  const SortIndicator = ({ field }: { field: string }) => {
    if (sortBy.field !== field) {
      // Not sorted: show both arrows faded
      return (
        <span className="ml-1 flex flex-col text-muted-foreground opacity-60">
          <ArrowUp className="-mb-1 h-3 w-3" />
          <ArrowDown className="-mt-1 h-3 w-3" />
        </span>
      );
    }
    // Sorted: show only the active direction, highlighted
    return sortBy.direction === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 text-primary" />
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
          <p>Loading voucher inventory...</p>
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

  // Empty state - if we have no vouchers at all but no error
  if (vouchers.length === 0) {
    return (
      <div className="space-y-6">
        <Link href="/admin/vouchers" passHref>
          <button className="group inline-flex items-center text-sm font-medium transition-colors hover:text-primary">
            <ChevronLeft className="mr-2 h-5 w-5 transform transition-transform duration-200 group-hover:-translate-x-1" />
            Back to vouchers
          </button>
        </Link>

        <div
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ marginTop: 10 }}
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{typeName} Vouchers</h1>
            <p className="text-muted-foreground">
              View and manage {typeName} vouchers by denomination
            </p>
          </div>
          <button
            onClick={() => setShowUploadDialog(true)}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload {typeName} Vouchers
          </button>
        </div>

        {/* Supplier Commission Card - Empty State */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Supplier Commission</h3>
              <p className="text-sm text-muted-foreground">
                Commission percentage paid to the supplier for each voucher sold
              </p>
            </div>

            {!editingCommission ? (
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-primary/10 px-3 py-1 text-primary">
                  {supplierCommission.toFixed(2)}%
                </div>
                <button
                  onClick={() => {
                    setEditingCommission(true);
                    setNewCommission(supplierCommission.toFixed(2));
                    setCommissionError(null);
                  }}
                  className="rounded-full p-2 text-muted-foreground hover:bg-muted"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={newCommission}
                    onChange={e => setNewCommission(e.target.value)}
                    className="w-24 rounded-md border border-input bg-background px-3 py-1 text-right text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
                    %
                  </div>
                </div>
                <button
                  onClick={async () => {
                    // Validate input
                    const value = parseFloat(newCommission);
                    if (isNaN(value) || value < 0 || value > 100) {
                      setCommissionError('Please enter a valid percentage between 0 and 100');
                      return;
                    }

                    setSavingCommission(true);
                    setCommissionError(null);

                    try {
                      // Import the action function
                      const { updateSupplierCommission } = await import(
                        '@/actions/admin/voucherActions'
                      );

                      // Use the action function
                      const { error } = await updateSupplierCommission(typeId as string, value);

                      if (error) {
                        throw new Error(error.message || 'Failed to update supplier commission');
                      }

                      // Update the local state with the new value
                      setSupplierCommission(value);
                      setEditingCommission(false);
                    } catch (err) {
                      console.error('Error updating supplier commission:', err);
                      setCommissionError(
                        err instanceof Error ? err.message : 'Failed to update supplier commission'
                      );
                    } finally {
                      setSavingCommission(false);
                    }
                  }}
                  disabled={savingCommission}
                  className="rounded-full p-1.5 text-green-500 hover:bg-green-500/10 disabled:opacity-50"
                >
                  {savingCommission ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setEditingCommission(false);
                    setCommissionError(null);
                  }}
                  disabled={savingCommission}
                  className="rounded-full p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {commissionError && (
            <div className="mt-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              {commissionError}
            </div>
          )}
        </div>

        <div className="flex h-[40vh] items-center justify-center">
          <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
            <CreditCard className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">No Vouchers Found</h2>
            <p className="text-muted-foreground">
              There are no {typeName} vouchers available in the inventory.
            </p>
          </div>
        </div>

        {/* Voucher Upload Dialog */}
        <VoucherUploadDialog
          isOpen={showUploadDialog}
          onClose={() => setShowUploadDialog(false)}
          onSuccess={handleUploadSuccess}
          voucherTypeId={typeId as string}
          voucherTypeName={typeName}
        />
      </div>
    );
  }

  // Custom column headers with sorting
  const columnHeaders = (
    <tr className="border-b border-border">
      <th
        className="cursor-pointer whitespace-nowrap px-4 py-3 text-left"
        onClick={() => toggleSort('amount')}
      >
        <span className="flex items-center gap-1">
          Value <SortIndicator field="amount" />
        </span>
      </th>
      <th
        className="cursor-pointer whitespace-nowrap px-4 py-3 text-left"
        onClick={() => toggleSort('available')}
      >
        <span className="flex items-center gap-1">
          Available <SortIndicator field="available" />
        </span>
      </th>
      <th
        className="cursor-pointer whitespace-nowrap px-4 py-3 text-left"
        onClick={() => toggleSort('sold')}
      >
        <span className="flex items-center gap-1">
          Sold <SortIndicator field="sold" />
        </span>
      </th>
      <th
        className="cursor-pointer whitespace-nowrap px-4 py-3 text-left"
        onClick={() => toggleSort('disabled')}
      >
        <span className="flex items-center gap-1">
          Disabled <SortIndicator field="disabled" />
        </span>
      </th>
      <th
        className="cursor-pointer whitespace-nowrap px-4 py-3 text-left"
        onClick={() => toggleSort('inventoryValue')}
      >
        <span className="flex items-center gap-1">
          Inventory Value <SortIndicator field="inventoryValue" />
        </span>
      </th>
      <th className="whitespace-nowrap px-4 py-3 text-left">Commissions</th>
    </tr>
  );

  return (
    <div className="space-y-6">
      <Link href="/admin/vouchers" passHref>
        <button className="group inline-flex items-center text-sm font-medium transition-colors hover:text-primary">
          <ChevronLeft className="mr-2 h-5 w-5 transform transition-transform duration-200 group-hover:-translate-x-1" />
          Back to vouchers
        </button>
      </Link>
      <div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        style={{ marginTop: 10 }}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{typeName} Vouchers</h1>
          <p className="text-muted-foreground">
            View and manage {typeName} vouchers by denomination
          </p>
        </div>
        <button
          onClick={() => setShowUploadDialog(true)}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload {typeName} Vouchers
        </button>
      </div>

      {/* Supplier Commission Card */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Supplier Commission</h3>
            <p className="text-sm text-muted-foreground">
              Commission percentage paid to the supplier for each voucher sold
            </p>
          </div>

          {!editingCommission ? (
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-primary/10 px-3 py-1 text-primary">
                {supplierCommission.toFixed(2)}%
              </div>
              <button
                onClick={() => {
                  setEditingCommission(true);
                  setNewCommission(supplierCommission.toFixed(2));
                  setCommissionError(null);
                }}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={newCommission}
                  onChange={e => setNewCommission(e.target.value)}
                  className="w-24 rounded-md border border-input bg-background px-3 py-1 text-right text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
                  %
                </div>
              </div>
              <button
                onClick={async () => {
                  // Validate input
                  const value = parseFloat(newCommission);
                  if (isNaN(value) || value < 0 || value > 100) {
                    setCommissionError('Please enter a valid percentage between 0 and 100');
                    return;
                  }

                  setSavingCommission(true);
                  setCommissionError(null);

                  try {
                    // Import the action function
                    const { updateSupplierCommission } = await import(
                      '@/actions/admin/voucherActions'
                    );

                    // Use the action function
                    const { error } = await updateSupplierCommission(typeId as string, value);

                    if (error) {
                      throw new Error(error.message || 'Failed to update supplier commission');
                    }

                    // Update the local state with the new value
                    setSupplierCommission(value);
                    setEditingCommission(false);
                  } catch (err) {
                    console.error('Error updating supplier commission:', err);
                    setCommissionError(
                      err instanceof Error ? err.message : 'Failed to update supplier commission'
                    );
                  } finally {
                    setSavingCommission(false);
                  }
                }}
                disabled={savingCommission}
                className="rounded-full p-1.5 text-green-500 hover:bg-green-500/10 disabled:opacity-50"
              >
                {savingCommission ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => {
                  setEditingCommission(false);
                  setCommissionError(null);
                }}
                disabled={savingCommission}
                className="rounded-full p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {commissionError && (
          <div className="mt-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
            {commissionError}
          </div>
        )}
      </div>

      {/* Inventory Summary */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <h2 className="text-xl font-semibold">
                {vouchers.filter(v => v.status === 'available').length.toLocaleString()} Available
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Total inventory value:{' '}
              <span className="font-semibold">R {totalInventoryValue.toFixed(2)}</span>
            </p>
          </div>

          <div className="flex gap-8">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <span className="font-medium">
                  {vouchers.filter(v => v.status === 'sold').length.toLocaleString()} Sold
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Used vouchers</p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="font-medium">
                  {vouchers.filter(v => v.status === 'disabled').length.toLocaleString()} Disabled
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Inactive vouchers</p>
            </div>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by amount..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Voucher Table */}
      <div className="rounded-lg border border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>{columnHeaders}</thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={i} className="border-b border-border transition-colors hover:bg-muted/50">
                  {Object.entries(row).map(([key, value]) => (
                    <td key={key} className="whitespace-nowrap p-4">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
              {tableData.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="whitespace-nowrap p-8 text-center text-muted-foreground"
                  >
                    No vouchers found. Try adjusting your search or upload new vouchers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Voucher Upload Dialog */}
      <VoucherUploadDialog
        isOpen={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        onSuccess={handleUploadSuccess}
        voucherTypeId={typeId as string}
        voucherTypeName={typeName}
      />
      <ManageVoucherCommissionModal
        open={commissionModalOpen}
        onClose={() => setCommissionModalOpen(false)}
        amount={commissionModalVoucher?.amount || 0}
        voucherTypeId={typeId as string}
        defaultValues={commissionModalDefault}
        onSave={async values => {
          if (!commissionModalVoucher) return;
          setCommissionModalLoading(true);
          const { error } = await upsertVoucherCommissionOverride({
            voucher_type_id: typeId as string,
            amount: commissionModalVoucher.amount,
            ...values,
          });
          setCommissionModalLoading(false);
          if (error) {
            toast.error(
              'Failed to save commission override: ' + (error.message || 'Unknown error')
            );
          } else {
            toast.success('Commission override saved!');
            setCommissionModalOpen(false);
            // Refresh overrides
            const { data } = await getVoucherCommissionOverridesForType(typeId as string);
            const overrides: Record<string, any> = {};
            (data || []).forEach((row: any) => {
              overrides[row.amount.toString()] = row;
            });
            setCommissionOverrides(overrides);
          }
        }}
      />
    </div>
  );
}
