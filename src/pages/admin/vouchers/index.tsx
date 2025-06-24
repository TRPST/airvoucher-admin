import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { CreditCard, Phone, Film, Zap, Loader2, AlertCircle, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import useRequireRole from '@/hooks/useRequireRole';
import { cn } from '@/utils/cn';
import { fetchVoucherTypeSummaries, type VoucherTypeSummary } from '@/actions/adminActions';
import type { GetStaticProps } from 'next';

// SafeComponent wrapper to catch rendering errors
function SafeComponent({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = React.useState(false);
  const [errorDetails, setErrorDetails] = React.useState<string | null>(null);

  React.useEffect(() => {
    console.log('SafeComponent mounted');
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

// Main component separated to handle errors properly
function VouchersPageContent() {
  const [voucherTypes, setVoucherTypes] = React.useState<VoucherTypeSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch voucher type summaries
  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const { data, error: fetchError } = await fetchVoucherTypeSummaries();

        if (!isMounted) return;

        if (fetchError) {
          throw new Error(`Failed to load voucher types: ${fetchError.message}`);
        }

        setVoucherTypes(data || []);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load voucher types');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Memoize expensive calculations
  const stats = React.useMemo(
    () => ({
      totalAvailableVouchers: voucherTypes.reduce((sum, type) => sum + type.availableVouchers, 0),
      totalVoucherValue: voucherTypes.reduce((sum, type) => sum + type.totalValue, 0),
      totalSoldVouchers: voucherTypes.reduce((sum, type) => sum + type.soldVouchers, 0),
      totalDisabledVouchers: voucherTypes.reduce((sum, type) => sum + type.disabledVouchers, 0),
    }),
    [voucherTypes]
  );

  // Loading state
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
          <p className="mb-4 text-muted-foreground">{error}</p>
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

      {/* Voucher Type Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {voucherTypes.map(voucherType => (
          <VoucherTypeCard key={voucherType.id} summary={voucherType} />
        ))}

        {voucherTypes.length === 0 && (
          <div className="col-span-3 rounded-lg border border-border bg-card p-10 text-center">
            <CreditCard className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">No Voucher Types Found</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              There are no voucher types in the system. Contact an administrator to add voucher
              types.
            </p>
          </div>
        )}
      </div>
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

// Main exported component that adds auth protection
export default function AdminVouchers() {
  // Check if user is authorized as admin
  const { isLoading: isAuthLoading } = useRequireRole('admin');

  if (isAuthLoading) {
    return (
      <div className="flex h-full items-center justify-center pt-10">
        <div className="flex flex-col items-center">
          <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
          <p>Verifying access...</p>
        </div>
      </div>
    );
  }

  return <VouchersPageContent />;
}
