import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Pencil,
} from 'lucide-react';
import {
  updateCommissionGroup,
} from '@/actions';
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
import { VoucherTypeCommissionCard } from '@/components/admin/commissions/VoucherTypeCommissionCard';
import type { VoucherType } from '@/actions/types/adminTypes';

type CommissionRate = {
  voucher_type_id: string;
  voucher_type_name: string;
  supplier_pct: number;
  retailer_pct: number;
  agent_pct: number;
  network_provider?: string;
  category?: string;
};

export default function CommissionGroupDetail() {
  const router = useRouter();
  const { id: groupIdParam } = router.query;
  const groupId = typeof groupIdParam === 'string' ? groupIdParam : undefined;
  const { mutate } = useSWRConfig();

  const [groupName, setGroupName] = React.useState<string>('');
  const [groupDescription, setGroupDescription] = React.useState<string>('');

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

  // Build derived commission rates with network/category info
  const typedVoucherTypes = (voucherTypesData as VoucherType[]) || [];
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
          network_provider: voucherType?.network_provider || undefined,
          category: voucherType?.category || undefined,
        };
      })
      .sort((a, b) => a.voucher_type_name.localeCompare(b.voucher_type_name));
    return rates;
  }, [currentGroup, typedVoucherTypes]);

  // Group rates by category
  const { networkRates, billPaymentRates, otherRates } = React.useMemo(() => {
    const networkProviders = ['mtn', 'cellc', 'vodacom', 'telkom'];
    
    const networks: Record<string, CommissionRate[]> = {
      mtn: [],
      cellc: [],
      vodacom: [],
      telkom: [],
    };
    
    const billPayments: CommissionRate[] = [];
    const others: CommissionRate[] = [];

    commissionRates.forEach((rate) => {
      if (rate.network_provider && networkProviders.includes(rate.network_provider)) {
        networks[rate.network_provider].push(rate);
      } else if (rate.category === 'bill_payment') {
        billPayments.push(rate);
      } else {
        others.push(rate);
      }
    });

    return {
      networkRates: networks,
      billPaymentRates: billPayments,
      otherRates: others,
    };
  }, [commissionRates]);

  const isLoading = groupLoading || allGroupsLoading || voucherTypesLoading;
  const errorMsg =
    (groupError as any)?.message ||
    (groupsError as any)?.message ||
    (voucherTypesError as any)?.message ||
    null;

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
      console.error('Error updating commission group:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update group');
    } finally {
      setIsUpdatingGroup(false);
    }
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

      {/* MTN Vouchers Section */}
      {networkRates.mtn.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">MTN Vouchers</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {networkRates.mtn
              .filter((rate) => {
                const name = rate.voucher_type_name.toLowerCase();
                return (
                  name.includes('airtime') ||
                  name.includes('daily') ||
                  name.includes('weekly') ||
                  name.includes('monthly')
                );
              })
              .map((rate, index) => (
                <VoucherTypeCommissionCard
                  key={rate.voucher_type_id}
                  voucherTypeId={rate.voucher_type_id}
                  voucherTypeName={rate.voucher_type_name}
                  supplierPct={rate.supplier_pct}
                  retailerPct={rate.retailer_pct}
                  agentPct={rate.agent_pct}
                  groupId={groupId!}
                  index={index}
                  networkProvider="mtn"
                  category={rate.category}
                />
              ))}
          </div>
        </div>
      )}

      {/* CellC Vouchers Section */}
      {networkRates.cellc.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">CellC Vouchers</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {networkRates.cellc
              .filter((rate) => {
                const name = rate.voucher_type_name.toLowerCase();
                return (
                  name.includes('airtime') ||
                  name.includes('daily') ||
                  name.includes('weekly') ||
                  name.includes('monthly')
                );
              })
              .map((rate, index) => (
                <VoucherTypeCommissionCard
                  key={rate.voucher_type_id}
                  voucherTypeId={rate.voucher_type_id}
                  voucherTypeName={rate.voucher_type_name}
                  supplierPct={rate.supplier_pct}
                  retailerPct={rate.retailer_pct}
                  agentPct={rate.agent_pct}
                  groupId={groupId!}
                  index={index}
                  networkProvider="cellc"
                  category={rate.category}
                />
              ))}
          </div>
        </div>
      )}

      {/* Vodacom Vouchers Section */}
      {networkRates.vodacom.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Vodacom Vouchers</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {networkRates.vodacom
              .filter((rate) => {
                const name = rate.voucher_type_name.toLowerCase();
                return (
                  name.includes('airtime') ||
                  name.includes('daily') ||
                  name.includes('weekly') ||
                  name.includes('monthly')
                );
              })
              .map((rate, index) => (
                <VoucherTypeCommissionCard
                  key={rate.voucher_type_id}
                  voucherTypeId={rate.voucher_type_id}
                  voucherTypeName={rate.voucher_type_name}
                  supplierPct={rate.supplier_pct}
                  retailerPct={rate.retailer_pct}
                  agentPct={rate.agent_pct}
                  groupId={groupId!}
                  index={index}
                  networkProvider="vodacom"
                  category={rate.category}
                />
              ))}
          </div>
        </div>
      )}

      {/* Telkom Vouchers Section */}
      {networkRates.telkom.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Telkom Vouchers</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {networkRates.telkom
              .filter((rate) => {
                const name = rate.voucher_type_name.toLowerCase();
                return (
                  name.includes('airtime') ||
                  name.includes('daily') ||
                  name.includes('weekly') ||
                  name.includes('monthly')
                );
              })
              .map((rate, index) => (
                <VoucherTypeCommissionCard
                  key={rate.voucher_type_id}
                  voucherTypeId={rate.voucher_type_id}
                  voucherTypeName={rate.voucher_type_name}
                  supplierPct={rate.supplier_pct}
                  retailerPct={rate.retailer_pct}
                  agentPct={rate.agent_pct}
                  groupId={groupId!}
                  index={index}
                  networkProvider="telkom"
                  category={rate.category}
                />
              ))}
          </div>
        </div>
      )}

      {/* Other Vouchers Section */}
      {otherRates.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Other Vouchers</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {otherRates.map((rate, index) => (
              <VoucherTypeCommissionCard
                key={rate.voucher_type_id}
                voucherTypeId={rate.voucher_type_id}
                voucherTypeName={rate.voucher_type_name}
                supplierPct={rate.supplier_pct}
                retailerPct={rate.retailer_pct}
                agentPct={rate.agent_pct}
                groupId={groupId!}
                index={index}
                category={rate.category}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bill Payments Section */}
      {billPaymentRates.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Bill Payments</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {billPaymentRates.map((rate, index) => (
              <VoucherTypeCommissionCard
                key={rate.voucher_type_id}
                voucherTypeId={rate.voucher_type_id}
                voucherTypeName={rate.voucher_type_name}
                supplierPct={rate.supplier_pct}
                retailerPct={rate.retailer_pct}
                agentPct={rate.agent_pct}
                groupId={groupId!}
                index={index}
                category="bill_payment"
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {commissionRates.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">No Commission Rates Found</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            This commission group has no voucher types configured yet.
          </p>
        </div>
      )}

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
