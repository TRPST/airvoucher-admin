import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeft, Loader2, AlertCircle, CreditCard } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  fetchVoucherTypesByNetworkCategoryAndDuration,
  type VoucherType,
  type NetworkProvider,
  type DataDuration,
} from '@/actions/adminActions';

export default function DataDurationVoucherSelection() {
  const router = useRouter();
  const { provider, duration } = router.query;
  const [voucherTypes, setVoucherTypes] = React.useState<VoucherType[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Capitalize names for display
  const providerName = React.useMemo(() => {
    if (typeof provider === 'string') {
      return provider.charAt(0).toUpperCase() + provider.slice(1);
    }
    return '';
  }, [provider]);

  const durationName = React.useMemo(() => {
    if (typeof duration === 'string') {
      return duration.charAt(0).toUpperCase() + duration.slice(1);
    }
    return '';
  }, [duration]);

  // Fetch voucher types for this network provider, data category, and duration
  React.useEffect(() => {
    async function loadData() {
      try {
        if (
          !provider ||
          typeof provider !== 'string' ||
          !duration ||
          typeof duration !== 'string'
        ) {
          return;
        }

        setIsLoading(true);
        const { data, error: fetchError } = await fetchVoucherTypesByNetworkCategoryAndDuration(
          provider as NetworkProvider,
          'data',
          duration as DataDuration
        );

        if (fetchError) {
          throw new Error(`Failed to load voucher types: ${fetchError.message}`);
        }

        setVoucherTypes(data || []);
      } catch (err) {
        console.error('Error loading voucher data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load voucher types');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [provider, duration]);

  // If there's only one voucher type, redirect directly to its management page
  React.useEffect(() => {
    if (voucherTypes.length === 1 && !isLoading) {
      router.replace(`/admin/vouchers/${voucherTypes[0].id}`);
    }
  }, [voucherTypes, isLoading, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
          <p>
            Loading {providerName} {durationName} data vouchers...
          </p>
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

  // Empty state
  if (voucherTypes.length === 0) {
    return (
      <div className="space-y-6">
        <Link href={`/admin/vouchers/networks/${provider}/data`} passHref>
          <button className="group inline-flex items-center text-sm font-medium transition-colors hover:text-primary">
            <ChevronLeft className="mr-2 h-5 w-5 transform transition-transform duration-200 group-hover:-translate-x-1" />
            Back to {providerName} Data
          </button>
        </Link>

        <div className="flex h-[40vh] items-center justify-center">
          <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
            <CreditCard className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">No Voucher Types Found</h2>
            <p className="text-muted-foreground">
              There are no {providerName} {durationName} data vouchers available in the system.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If there are multiple voucher types, show them for selection
  return (
    <div className="space-y-6">
      <Link href={`/admin/vouchers/networks/${provider}/data`} passHref>
        <button className="group inline-flex items-center text-sm font-medium transition-colors hover:text-primary">
          <ChevronLeft className="transition-transformation mr-2 h-5 w-5 transform duration-200 group-hover:-translate-x-1" />
          Back to {providerName} Data
        </button>
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {providerName} {durationName} Data Vouchers
          </h1>
          <p className="text-muted-foreground">
            Select a {providerName} {durationName} data voucher type to manage
          </p>
        </div>
      </div>

      {/* Voucher Type Selection */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {voucherTypes.map(voucherType => (
          <VoucherTypeCard
            key={voucherType.id}
            voucherType={voucherType}
            onClick={() => router.push(`/admin/vouchers/${voucherType.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

// Voucher Type Card Component
interface VoucherTypeCardProps {
  voucherType: VoucherType;
  onClick: () => void;
}

const VoucherTypeCard: React.FC<VoucherTypeCardProps> = ({ voucherType, onClick }) => {
  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-lg border border-border bg-card p-6 shadow-sm',
        'cursor-pointer transition-all duration-200 hover:border-primary/20 hover:shadow-md',
        'transform hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <CreditCard className="h-6 w-6" />
      </div>

      <h3 className="mb-2 text-xl font-medium">{voucherType.name}</h3>

      <div className="mb-3 space-y-1">
        {/* Network Provider */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Network:</span>
          <span className="font-medium">
            {voucherType.network_provider
              ? voucherType.network_provider.charAt(0).toUpperCase() +
                voucherType.network_provider.slice(1)
              : 'Unknown'}
          </span>
        </div>

        {/* Category */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Category:</span>
          <span className="font-medium">
            {voucherType.category
              ? voucherType.category.charAt(0).toUpperCase() + voucherType.category.slice(1)
              : 'Unknown'}
          </span>
        </div>

        {/* Duration/Sub-category */}
        {voucherType.sub_category && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Duration:</span>
            <span className="font-medium">
              {voucherType.sub_category.charAt(0).toUpperCase() + voucherType.sub_category.slice(1)}
            </span>
          </div>
        )}

        {/* Supplier Commission */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Supplier Commission:</span>
          <span className="font-medium">
            {voucherType.supplier_commission_pct?.toFixed(2) || '0.00'}%
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
};
