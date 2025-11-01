import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeft, Loader2, AlertCircle, CreditCard, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {voucherTypes.map((voucherType, index) => (
          <VoucherTypeCard
            key={voucherType.id}
            voucherType={voucherType}
            index={index}
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
  index: number;
  onClick: () => void;
}

const VoucherTypeCard: React.FC<VoucherTypeCardProps> = ({ voucherType, index, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50'
      )}
      onClick={onClick}
    >
      {/* Icon and Chevron */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
          <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>

      {/* Content */}
      <div>
        <h3 className="mb-2 text-lg font-semibold">{voucherType.name}</h3>

        <div className="space-y-2">
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
            <span className="text-muted-foreground">Supplier Com:</span>
            <span className="font-medium">
              {voucherType.supplier_commission_pct?.toFixed(2) || '0.00'}%
            </span>
          </div>
        </div>
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.div>
  );
};
