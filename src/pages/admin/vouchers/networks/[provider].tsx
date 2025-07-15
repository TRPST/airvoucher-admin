import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeft, Phone, Database, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  fetchVoucherTypesByNetwork,
  type VoucherType,
  type NetworkProvider,
} from '@/actions/adminActions';

export default function NetworkProviderVoucherSelection() {
  const router = useRouter();
  const { provider } = router.query;
  const [voucherTypes, setVoucherTypes] = React.useState<VoucherType[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Capitalize provider name for display
  const providerName = React.useMemo(() => {
    if (typeof provider === 'string') {
      const name = provider.charAt(0).toUpperCase() + provider.slice(1);
      // Special case for MTN to ensure it's fully capitalized
      return name === 'Mtn' ? 'MTN' : name;
    }
    return '';
  }, [provider]);

  // Fetch voucher types for this network provider
  React.useEffect(() => {
    async function loadData() {
      try {
        if (!provider || typeof provider !== 'string') return;

        setIsLoading(true);
        const { data, error: fetchError } = await fetchVoucherTypesByNetwork(
          provider as NetworkProvider
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
  }, [provider]);

  // Check if provider has airtime and data categories
  const hasAirtime = React.useMemo(
    () => voucherTypes.some(type => type.category === 'airtime'),
    [voucherTypes]
  );

  const hasData = React.useMemo(
    () => voucherTypes.some(type => type.category === 'data'),
    [voucherTypes]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
          <p>Loading {providerName} voucher categories...</p>
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
      <Link href="/admin/vouchers" passHref>
        <button className="group inline-flex items-center text-sm font-medium transition-colors hover:text-primary">
          <ChevronLeft className="mr-2 h-5 w-5 transform transition-transform duration-200 group-hover:-translate-x-1" />
          Back to vouchers
        </button>
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{providerName} Vouchers</h1>
          <p className="text-muted-foreground">
            Select the type of {providerName} vouchers you want to manage
          </p>
        </div>
      </div>

      {/* Category Selection Cards */}
      <div className="grid max-w-2xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
        {hasAirtime && (
          <CategoryCard
            title={`${providerName} Airtime`}
            description={`Manage ${providerName} airtime vouchers`}
            icon={Phone}
            onClick={() => router.push(`/admin/vouchers/networks/${provider}/airtime`)}
            colorClass="bg-blue-500/10 text-blue-500 border-blue-500/20"
            linkText="Airtime"
          />
        )}

        {hasData && (
          <CategoryCard
            title={`${providerName} Data`}
            description={`Manage ${providerName} data bundle vouchers`}
            icon={Database}
            onClick={() => router.push(`/admin/vouchers/networks/${provider}/data`)}
            colorClass="bg-green-500/10 text-green-500 border-green-500/20"
            linkText="Data"
          />
        )}
      </div>

      {/* Empty state */}
      {!hasAirtime && !hasData && (
        <div className="flex h-[40vh] items-center justify-center">
          <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
            <Phone className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">No Voucher Categories Found</h2>
            <p className="text-muted-foreground">
              There are no {providerName} vouchers available in the system.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Category Card Component
interface CategoryCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  colorClass: string;
  linkText: string;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  title,
  description,
  icon: Icon,
  onClick,
  colorClass,
  linkText,
}) => {
  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-lg border border-border bg-card p-8 shadow-sm',
        'cursor-pointer transition-all duration-200 hover:border-primary/20 hover:shadow-md',
        'transform hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <div
        className={cn('mb-6 flex h-16 w-16 items-center justify-center rounded-full', colorClass)}
      >
        <Icon className="h-8 w-8" />
      </div>

      <h3 className="mb-2 text-2xl font-medium">{title}</h3>
      <p className="mb-6 text-muted-foreground">{description}</p>

      <div className="mt-auto flex items-center text-sm text-primary">
        <span>Manage {title}</span>
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
