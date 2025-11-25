import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import useSWR from 'swr';
import { SwrKeys } from '@/lib/swr/keys';
import {
  commissionGroupByIdFetcher,
  commissionGroupsFetcher,
  voucherTypesFetcher,
} from '@/lib/swr/fetchers';
import { DurationCard } from '@/components/admin/commissions/DurationCard';
import type { VoucherType } from '@/actions/types/adminTypes';

const networkNames = {
  mtn: 'MTN',
  vodacom: 'Vodacom',
  cellc: 'Cell C',
  telkom: 'Telkom',
};

export default function NetworkDataCommissions() {
  const router = useRouter();
  const { id: groupIdParam, provider: providerParam } = router.query;
  const groupId = typeof groupIdParam === 'string' ? groupIdParam : undefined;
  const provider = typeof providerParam === 'string' ? providerParam : undefined;

  // SWR: fetch group meta
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

  // SWR: fetch voucher types
  const {
    data: voucherTypesData,
    error: voucherTypesError,
    isLoading: voucherTypesLoading,
  } = useSWR(SwrKeys.voucherTypes('all'), voucherTypesFetcher);

  const isLoading = groupLoading || allGroupsLoading || voucherTypesLoading;
  const errorMsg =
    (groupError as any)?.message ||
    (groupsError as any)?.message ||
    (voucherTypesError as any)?.message ||
    null;

  const groupName = group?.name ?? '';
  const networkName = provider
    ? networkNames[provider as keyof typeof networkNames] || provider
    : '';

  // Find daily, weekly, and monthly data voucher types for this provider
  const typedVoucherTypes = (voucherTypesData as VoucherType[]) || [];
  const currentGroup = React.useMemo(
    () => (allGroups ?? []).find(g => g.id === groupId),
    [allGroups, groupId]
  );

  const dataVouchers = React.useMemo(() => {
    if (!currentGroup || !provider) {
      return { dailyId: undefined, weeklyId: undefined, monthlyId: undefined };
    }

    const providerVouchers = typedVoucherTypes.filter(
      vt =>
        vt.network_provider === provider &&
        currentGroup.rates.some(r => r.voucher_type_id === vt.id)
    );

    const daily = providerVouchers.find(vt => {
      const name = vt.name.toLowerCase();
      return name.includes('daily');
    });

    const weekly = providerVouchers.find(vt => {
      const name = vt.name.toLowerCase();
      return name.includes('weekly');
    });

    const monthly = providerVouchers.find(vt => {
      const name = vt.name.toLowerCase();
      return name.includes('monthly');
    });

    return {
      dailyId: daily?.id,
      weeklyId: weekly?.id,
      monthlyId: monthly?.id,
    };
  }, [currentGroup, typedVoucherTypes, provider]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
          <p>Loading data vouchers...</p>
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

  const hasAnyData = dataVouchers.dailyId || dataVouchers.weeklyId || dataVouchers.monthlyId;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href={`/admin/commissions/${groupId}/networks/${provider}`} passHref>
        <button className="group inline-flex items-center text-sm font-medium transition-colors hover:text-primary">
          <ChevronLeft className="mr-2 h-5 w-5 transform transition-transform duration-200 group-hover:-translate-x-1" />
          Back to {networkName} Vouchers
        </button>
      </Link>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {networkName} Data Bundles
        </h1>
        <p className="text-muted-foreground">Select a duration to manage commission rates</p>
      </div>

      {/* Duration cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {dataVouchers.dailyId && (
          <DurationCard
            duration="daily"
            provider={provider as any}
            groupId={groupId!}
            voucherTypeId={dataVouchers.dailyId}
            index={0}
          />
        )}
        {dataVouchers.weeklyId && (
          <DurationCard
            duration="weekly"
            provider={provider as any}
            groupId={groupId!}
            voucherTypeId={dataVouchers.weeklyId}
            index={1}
          />
        )}
        {dataVouchers.monthlyId && (
          <DurationCard
            duration="monthly"
            provider={provider as any}
            groupId={groupId!}
            voucherTypeId={dataVouchers.monthlyId}
            index={2}
          />
        )}
      </div>

      {/* Empty state */}
      {!hasAnyData && (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">No {networkName} Data Vouchers Found</h3>
          <p className="text-sm text-muted-foreground">
            This network provider has no data voucher types configured for this commission group.
          </p>
        </div>
      )}
    </div>
  );
}
