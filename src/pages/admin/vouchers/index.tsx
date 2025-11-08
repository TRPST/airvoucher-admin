import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { CreditCard, Phone, Film, Zap, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
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
  const { data, error } = useSWR(
    SwrKeys.networkVoucherSummaries(),
    networkVoucherSummariesFetcher,
    {
      revalidateOnFocus: true,
    }
  );

  // Correct loading gate: show loader only when no data and no error
  const isLoading = !data && !error;

  const networkSummaries: NetworkVoucherSummary[] = data?.networks ?? [];
  const otherVouchers: VoucherTypeSummary[] = data?.other ?? [];
  const billPaymentVouchers: VoucherTypeSummary[] = data?.billPayments ?? [];

  const sortVoucherSummaries = React.useCallback((summaries: VoucherTypeSummary[]) => {
    if (!summaries.length) return [];

    const sorted = [...summaries];

    sorted.sort((a, b) => {
      const aIndex = VOUCHER_DISPLAY_ORDER.findIndex(name =>
        a.name.toLowerCase().includes(name.toLowerCase())
      );
      const bIndex = VOUCHER_DISPLAY_ORDER.findIndex(name =>
        b.name.toLowerCase().includes(name.toLowerCase())
      );

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      if (aIndex !== -1 && bIndex === -1) return -1;
      if (aIndex === -1 && bIndex !== -1) return 1;

      return a.name.localeCompare(b.name);
    });

    return sorted;
  }, []);

  const sortedOtherVouchers = React.useMemo(
    () => sortVoucherSummaries(otherVouchers),
    [otherVouchers, sortVoucherSummaries]
  );
  const sortedBillPaymentVouchers = React.useMemo(
    () => sortVoucherSummaries(billPaymentVouchers),
    [billPaymentVouchers, sortVoucherSummaries]
  );

  // Memoize aggregate stats across all voucher groups
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

    const billPaymentTotals = sortedBillPaymentVouchers.reduce(
      (acc, voucher) => ({
        availableVouchers: acc.availableVouchers + voucher.availableVouchers,
        totalValue: acc.totalValue + voucher.totalValue,
        soldVouchers: acc.soldVouchers + voucher.soldVouchers,
        disabledVouchers: acc.disabledVouchers + voucher.disabledVouchers,
      }),
      { availableVouchers: 0, totalValue: 0, soldVouchers: 0, disabledVouchers: 0 }
    );

    return {
      totalAvailableVouchers:
        networkTotals.totalVouchers +
        otherTotals.availableVouchers +
        billPaymentTotals.availableVouchers,
      totalVoucherValue:
        networkTotals.totalValue + otherTotals.totalValue + billPaymentTotals.totalValue,
      totalSoldVouchers: otherTotals.soldVouchers + billPaymentTotals.soldVouchers, // Networks don't track sold separately yet
      totalDisabledVouchers: otherTotals.disabledVouchers + billPaymentTotals.disabledVouchers, // Networks don't track disabled separately yet
    };
  }, [networkSummaries, sortedOtherVouchers, sortedBillPaymentVouchers]);

  // Initial load only: show while fetching (avoid spinner-on-error)
  if (isLoading) {
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
      {/* Sticky header section */}
      <div
        className="sticky top-0 z-10 -mx-6 border-b border-border bg-background px-6 pb-4 pt-6 md:-mx-8 md:px-8"
        style={{ marginTop: -40 }}
      >
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Voucher Inventory</h1>
        <p className="text-muted-foreground">Manage voucher stock and upload new vouchers.</p>
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {networkSummaries.map(network => (
              <NetworkCard key={network.network_provider} network={network} />
            ))}
          </div>
        </div>
      )}

      {/* Other Voucher Types Section */}
      {sortedOtherVouchers.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Vouchers</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {sortedOtherVouchers.map(voucherType => (
              <VoucherTypeCard key={voucherType.id} summary={voucherType} />
            ))}
          </div>
        </div>
      )}

      {/* Bill Payments Section */}
      {sortedBillPaymentVouchers.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Bill Payments</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {sortedBillPaymentVouchers.map(voucherType => (
              <VoucherTypeCard key={voucherType.id} summary={voucherType} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {networkSummaries.length === 0 &&
        sortedOtherVouchers.length === 0 &&
        sortedBillPaymentVouchers.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-10 text-center">
            <CreditCard className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">No Voucher Types Found</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              There are no voucher types in the system. Contact an administrator to add voucher
              types.
            </p>
          </div>
        )}
    </div>
  );
}

// VoucherTypeCard component - memoized for performance
const VoucherTypeCard = React.memo(({ summary }: { summary: VoucherTypeSummary }) => {
  const router = useRouter();

  // Memoize logo path and background color based on voucher type
  const { logoPath, iconBgColor } = React.useMemo(() => {
    const name = summary.name.toLowerCase();

    if (name.includes('ringa')) {
      return {
        logoPath: '/assets/vouchers/ringas-logo.jpg',
        iconBgColor: 'bg-primary/10',
      };
    }
    if (name.includes('hollywood')) {
      return {
        logoPath: '/assets/vouchers/hollywoodbets-logo.jpg',
        iconBgColor: 'bg-amber-100 dark:bg-amber-900/20',
      };
    }
    if (name.includes('easyload')) {
      return {
        logoPath: '/assets/vouchers/easyload-logo.png',
        iconBgColor: 'bg-green-100 dark:bg-green-900/20',
      };
    }
    if (name.includes('ott')) {
      return {
        logoPath: '/assets/vouchers/ott-logo.png',
        iconBgColor: 'bg-orange-100 dark:bg-orange-900/20',
      };
    }
    if (name.includes('swt')) {
      return {
        logoPath: '/assets/vouchers/swt-logo.jpeg',
        iconBgColor: 'bg-white dark:bg-white',
        padding: true,
      };
    }
    if (name.includes('unipin')) {
      return {
        logoPath: '/assets/vouchers/unipin-logo.png',
        iconBgColor: 'bg-blue-100 dark:bg-blue-900/20',
        padding: true,
      };
    }
    if (name.includes('globalairtime') || name.includes('global airtime')) {
      return {
        logoPath: '/assets/vouchers/global-airtime-logo.jpg',
        iconBgColor: 'bg-green-100 dark:bg-green-900/20',
        padding: true,
      };
    }
    if (name.includes('electricity') || name.includes('eskom')) {
      return {
        logoPath: '/assets/vouchers/eskom-logo.jpg',
        iconBgColor: 'bg-red-100 dark:bg-red-900/20',
      };
    }
    if (name.includes('dstv')) {
      return {
        logoPath: '/assets/vouchers/dstv-logo.png',
        iconBgColor: 'bg-blue-100 dark:bg-blue-900/20',
      };
    }
    if (name.includes('hellopaisa') || name.includes('hello paisa')) {
      return {
        logoPath: '/assets/vouchers/hellopaisa-logo.png',
        iconBgColor: 'bg-green-100 dark:bg-green-900/20',
        padding: true,
      };
    }
    if (name.includes('mukuru')) {
      return {
        logoPath: '/assets/vouchers/mukuru-logo.jpg',
        iconBgColor: 'bg-purple-100 dark:bg-purple-900/20',
        padding: true,
      };
    }
    if (name.includes('ecocash')) {
      return {
        logoPath: '/assets/vouchers/ecocash-logo.png',
        iconBgColor: 'bg-green-100 dark:bg-green-900/20',
        padding: true,
      };
    }
    if (name.includes('mangaung')) {
      return {
        logoPath: '/assets/vouchers/mangaung-logo.jpg',
        iconBgColor: 'bg-blue-100 dark:bg-blue-900/20',
        padding: true,
      };
    }

    // Default - no logo
    return {
      logoPath: null,
      iconBgColor: 'bg-gray-100 dark:bg-gray-900/20',
      padding: false,
    };
  }, [summary.name]);

  const handleClick = React.useCallback(() => {
    router.push(`/admin/vouchers/${summary.id}`);
  }, [router, summary.id]);

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
      onClick={handleClick}
    >
      <div className="mb-3 flex items-center justify-between">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg',
            iconBgColor
          )}
        >
          {logoPath ? (
            <img src={logoPath} alt={summary.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-5 w-5 rounded bg-gray-300" />
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>

      <h3 className="mb-3 text-base font-medium">{summary.name}</h3>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Available:</span>
          <span className="font-medium">{summary.availableVouchers.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Value:</span>
          <span className="font-medium">R {summary.totalValue.toFixed(2)}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Supplier Com:</span>
          <span className="font-medium">
            {summary.supplierCommissionPct?.toFixed(2) || '0.00'}%
          </span>
        </div>
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
});

VoucherTypeCard.displayName = 'VoucherTypeCard';

// NetworkCard component for mobile network providers
const NetworkCard = React.memo(({ network }: { network: NetworkVoucherSummary }) => {
  const router = useRouter();

  // Memoize logo path and background color based on network
  const { logoPath, iconBgColor } = React.useMemo(() => {
    switch (network.network_provider) {
      case 'cellc':
        return {
          logoPath: '/assets/vouchers/cellc-logo.png',
          iconBgColor: 'bg-blue-100 dark:bg-blue-900/20',
        };
      case 'mtn':
        return {
          logoPath: '/assets/vouchers/mtn-logo.jpg',
          iconBgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
        };
      case 'vodacom':
        return {
          logoPath: '/assets/vouchers/vodacom-logo.png',
          iconBgColor: 'bg-red-100 dark:bg-red-900/20',
        };
      case 'telkom':
        return {
          logoPath: '/assets/vouchers/telkom-logo.png',
          iconBgColor: 'bg-purple-100 dark:bg-purple-900/20',
        };
      default:
        return {
          logoPath: null,
          iconBgColor: 'bg-gray-100 dark:bg-gray-900/20',
        };
    }
  }, [network.network_provider]);

  const handleClick = React.useCallback(() => {
    router.push(`/admin/vouchers/networks/${network.network_provider}`);
  }, [router, network.network_provider]);

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
      onClick={handleClick}
    >
      <div className="mb-3 flex items-center justify-between">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg',
            iconBgColor
          )}
        >
          {logoPath ? (
            <img src={logoPath} alt={network.name} className="h-full w-full object-contain" />
          ) : (
            <Phone className="h-5 w-5" />
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>

      <h3 className="mb-3 text-base font-medium">
        {network.name === 'Mtn' ? network.name.toUpperCase() : network.name}
      </h3>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Vouchers:</span>
          <span className="font-medium">{network.total_vouchers.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Value:</span>
          <span className="font-medium">R {network.total_value.toFixed(2)}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Categories:</span>
          <span className="font-medium">
            {Object.keys(network.categories).length > 0
              ? Object.keys(network.categories).join(', ')
              : 'None'}
          </span>
        </div>
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
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
