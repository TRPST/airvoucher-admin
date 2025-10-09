import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { CreditCard, Phone, Film, Zap, Loader2, AlertCircle } from 'lucide-react';
import useRequireRole from '@/hooks/useRequireRole';
import { cn } from '@/utils/cn';
import { SwrKeys } from '@/lib/swr/keys';
import useSWR from 'swr';
import { networkVoucherSummariesFetcher } from '@/lib/swr/fetchers';
import type { VoucherTypeSummary, NetworkVoucherSummary } from '@/actions/adminActions';

// SafeComponent wrapper to catch rendering errors
function SafeComponent({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = React.useState(false);
  const [errorDetails, setErrorDetails] = React.useState<string | null>(null);

  React.useEffect(() => {
    // no-op
  }, []);

  if (hasError) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <h2 className="mb-2 text-xl font-semibold">Rendering Error</h2>
          <p className="mb-4 text-muted-foreground">
            {errorDetails || 'An unexpected error occurred while rendering this page.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  try {
    return <>{children}</>;
  } catch (error) {
    console.error('Caught render error:', error);
    setErrorDetails(error instanceof Error ? error.message : 'Unknown error');
    setHasError(true);
    return null;
  }
}

// Configuration for voucher ordering - modify this array to change the display order
const VOUCHER_DISPLAY_ORDER = [
  'EasyLoad',
  'Hollywoodbets',
  'Ringa',
  'OTT',
  'Unipin',
  'DSTV',
  'Eskom',
  'HelloPaisa',
  'Mukuru',
  'Ecocash',
  'MangaungMunicipality',
  'GlobalAirtime',
  // Add new voucher type names here in your desired order
];

// Main component separated to handle errors properly
function VouchersPageContent() {
  // SWR: fetch enhanced voucher summaries with network categorization
  const {
    data,
    error,
  } = useSWR(SwrKeys.networkVoucherSummaries(), networkVoucherSummariesFetcher, {
    revalidateOnFocus: true,
  });

  const primed = data !== undefined;

  const networkSummaries: NetworkVoucherSummary[] = data?.networks ?? [];
  const otherVouchers: VoucherTypeSummary[] = data?.other ?? [];

  // Sort other vouchers based on predefined order
  const sortedOtherVouchers = React.useMemo(() => {
    if (!otherVouchers.length) return [];

    // Create a copy of the array to avoid mutating the original
    const sorted = [...otherVouchers];

    // Sort based on the predefined order
    sorted.sort((a, b) => {
      const aIndex = VOUCHER_DISPLAY_ORDER.findIndex(name =>
        a.name.toLowerCase().includes(name.toLowerCase())
      );
      const bIndex = VOUCHER_DISPLAY_ORDER.findIndex(name =>
        b.name.toLowerCase().includes(name.toLowerCase())
      );

      // If both items are in the order array, sort by their position
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }

      // If only one item is in the order array, prioritize it
      if (aIndex !== -1 && bIndex === -1) return -1;
      if (aIndex === -1 && bIndex !== -1) return 1;

      // If neither item is in the order array, maintain alphabetical order
      return a.name.localeCompare(b.name);
    });

    return sorted;
  }, [otherVouchers]);

  // Memoize expensive calculations combining both network and other vouchers
  const stats = React.useMemo(() => {
    const networkTotals = networkSummaries.reduce(
      (acc, network) => ({
        totalVouchers: acc.totalVouchers + network.total_vouchers,
        totalValue: acc.totalValue + network.total_value,
      }),
      { totalVouchers: 0, totalValue: 0 }
    );

    const otherTotals = sortedOtherVouchers.reduce(
      (acc, voucher) => ({
        availableVouchers: acc.availableVouchers + voucher.availableVouchers,
        totalValue: acc.totalValue + voucher.totalValue,
        soldVouchers: acc.soldVouchers + voucher.soldVouchers,
        disabledVouchers: acc.disabledVouchers + voucher.disabledVouchers,
      }),
      { availableVouchers: 0, totalValue: 0, soldVouchers: 0, disabledVouchers: 0 }
    );

    return {
      totalAvailableVouchers: networkTotals.totalVouchers + otherTotals.availableVouchers,
      totalVoucherValue: networkTotals.totalValue + otherTotals.totalValue,
      totalSoldVouchers: otherTotals.soldVouchers, // Networks don't track sold separately yet
      totalDisabledVouchers: otherTotals.disabledVouchers, // Networks don't track disabled separately yet
    };
  }, [networkSummaries, sortedOtherVouchers]);

  // Initial load only: show while cache is not primed yet
  if (!primed) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
          <p>Loading vouchers...</p>
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
          <p className="mb-4 text-muted-foreground">
            {error instanceof Error ? error.message : 'Failed to load voucher types'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Voucher Inventory</h1>
          <p className="text-muted-foreground">Manage voucher stock and upload new vouchers.</p>
        </div>
      </div>

      {/* Inventory Summary */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <h2 className="text-xl font-semibold">
                {stats.totalAvailableVouchers.toLocaleString()} Available
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Total inventory value:{' '}
              <span className="font-semibold">R {stats.totalVoucherValue.toFixed(2)}</span>
            </p>
          </div>

          <div className="flex gap-8">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <span className="font-medium">{stats.totalSoldVouchers.toLocaleString()} Sold</span>
              </div>
              <p className="text-xs text-muted-foreground">Used vouchers</p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="font-medium">
                  {stats.totalDisabledVouchers.toLocaleString()} Disabled
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Inactive vouchers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Networks Section */}
      {networkSummaries.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Mobile Networks</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {networkSummaries.map(network => (
              <NetworkCard key={network.network_provider} network={network} />
            ))}
          </div>
        </div>
      )}

      {/* Other Voucher Types Section */}
      {sortedOtherVouchers.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Other Vouchers</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedOtherVouchers.map(voucherType => (
              <VoucherTypeCard key={voucherType.id} summary={voucherType} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {networkSummaries.length === 0 && sortedOtherVouchers.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <CreditCard className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">No Voucher Types Found</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            There are no voucher types in the system. Contact an administrator to add voucher types.
          </p>
        </div>
      )}
    </div>
  );
}

// VoucherTypeCard component - memoized for performance
const VoucherTypeCard = React.memo(({ summary }: { summary: VoucherTypeSummary }) => {
  const router = useRouter();

  // Memoize icon selection
  const Icon = React.useMemo(() => {
    switch (summary.icon) {
      case 'phone':
        return Phone;
      case 'film':
        return Film;
      case 'zap':
        return Zap;
      default:
        return CreditCard;
    }
  }, [summary.icon]);

  // Memoize color selection
  const colorClass = React.useMemo(() => {
    const name = summary.name.toLowerCase();
    if (name.includes('ringa')) return 'bg-primary/10 text-primary border-primary/20';
    if (name.includes('hollywood')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    if (name.includes('easyload')) return 'bg-green-500/10 text-green-500 border-green-500/20';
    return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
  }, [summary.name]);

  const handleClick = React.useCallback(() => {
    router.push(`/admin/vouchers/${summary.id}`);
  }, [router, summary.id]);

  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-lg border border-border bg-card p-6 shadow-sm',
        'cursor-pointer transition-all duration-200 hover:border-primary/20 hover:shadow-md',
        'transform hover:scale-[1.02]'
      )}
      onClick={handleClick}
    >
      <div
        className={cn('mb-4 flex h-12 w-12 items-center justify-center rounded-full', colorClass)}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mb-2 text-xl font-medium">{summary.name}</h3>

      <div className="mb-3 space-y-1">
        {/* Available vouchers */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Available:</span>
          <span className="font-medium">{summary.availableVouchers.toLocaleString()}</span>
        </div>

        {/* Value */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Value:</span>
          <span className="font-medium">R {summary.totalValue.toFixed(2)}</span>
        </div>

        {/* Supplier Commission */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Supplier Commission:</span>
          <span className="font-medium">
            {summary.supplierCommissionPct?.toFixed(2) || '0.00'}%
          </span>
        </div>
      </div>

      <div className="mt-auto flex items-center text-sm text-primary">
        <span>View Vouchers</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ml-1 h-4 w-4"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </div>
    </div>
  );
});

VoucherTypeCard.displayName = 'VoucherTypeCard';

// NetworkCard component for mobile network providers
const NetworkCard = React.memo(({ network }: { network: NetworkVoucherSummary }) => {
  const router = useRouter();

  // Memoize color selection based on network
  const colorClass = React.useMemo(() => {
    switch (network.network_provider) {
      case 'cellc':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'mtn':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'vodacom':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'telkom':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  }, [network.network_provider]);

  const handleClick = React.useCallback(() => {
    router.push(`/admin/vouchers/networks/${network.network_provider}`);
  }, [router, network.network_provider]);

  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-lg border border-border bg-card p-6 shadow-sm',
        'cursor-pointer transition-all duration-200 hover:border-primary/20 hover:shadow-md',
        'pointer transform hover:scale-[1.02]'
      )}
      onClick={handleClick}
    >
      <div
        className={cn('mb-4 flex h-12 w-12 items-center justify-center rounded-full', colorClass)}
      >
        <Phone className="h-6 w-6" />
      </div>
      <h3 className="mb-2 text-xl font-medium">
        {network.name === 'Mtn' ? network.name.toUpperCase() : network.name}
      </h3>

      <div className="mb-3 space-y-1">
        {/* Total vouchers */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Vouchers:</span>
          <span className="font-medium">{network.total_vouchers.toLocaleString()}</span>
        </div>

        {/* Total Value */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Value:</span>
          <span className="font-medium">R {network.total_value.toFixed(2)}</span>
        </div>

        {/* Available categories */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Categories:</span>
          <span className="font-medium">
            {Object.keys(network.categories).length > 0
              ? Object.keys(network.categories).join(', ')
              : 'None'}
          </span>
        </div>
      </div>

      <div className="mt-auto flex items-center text-sm text-primary">
        <span>Manage Vouchers</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ml-1 h-4 w-4"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </div>
    </div>
  );
});

NetworkCard.displayName = 'NetworkCard';

// Main exported component that adds auth protection
export default function AdminVouchers() {
  // Check if user is authorized as admin
  // const { isLoading: isAuthLoading } = useRequireRole('admin');

  // if (isAuthLoading) {
  //   return (
  //     <div className="flex h-full items-center justify-center pt-10">
  //       <div className="flex flex-col items-center">
  //         <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
  //         <p>Verifying access...</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <SafeComponent>
      <VouchersPageContent />
    </SafeComponent>
  );
}
