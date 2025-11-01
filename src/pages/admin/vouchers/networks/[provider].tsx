import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeft, Phone, Database, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  fetchVoucherTypesByNetwork,
  fetchNetworkCategoryStats,
  type VoucherType,
  type NetworkProvider,
  type CategoryStats,
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {hasAirtime && (
          <CategoryCard
            title={`${providerName} Airtime`}
            description={`Manage ${providerName} airtime vouchers`}
            icon={Phone}
            onClick={() => router.push(`/admin/vouchers/networks/${provider}/airtime`)}
            colorClass="bg-blue-100 dark:bg-blue-900/20"
            linkText="Airtime"
            provider={provider as NetworkProvider}
            category="airtime"
          />
        )}

        {hasData && (
          <CategoryCard
            title={`${providerName} Data`}
            description={`Manage ${providerName} data bundle vouchers`}
            icon={Database}
            onClick={() => router.push(`/admin/vouchers/networks/${provider}/data`)}
            colorClass="bg-green-100 dark:bg-green-900/20"
            linkText="Data"
            provider={provider as NetworkProvider}
            category="data"
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
  provider: NetworkProvider;
  category: 'airtime' | 'data';
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  title,
  description,
  icon: Icon,
  onClick,
  colorClass,
  linkText,
  provider,
  category,
}) => {
  const [stats, setStats] = React.useState<CategoryStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = React.useState(true);

  // Fetch stats for this category
  React.useEffect(() => {
    async function loadStats() {
      try {
        setIsLoadingStats(true);
        const { data, error } = await fetchNetworkCategoryStats(provider, category);

        if (error) {
          console.error(`Error loading ${category} stats:`, error);
          setStats({ totalVouchers: 0, inventoryValue: 0, soldValue: 0 });
        } else {
          setStats(data);
        }
      } catch (err) {
        console.error(`Error loading ${category} stats:`, err);
        setStats({ totalVouchers: 0, inventoryValue: 0, soldValue: 0 });
      } finally {
        setIsLoadingStats(false);
      }
    }

    loadStats();
  }, [provider, category]);

  return (
    <div
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/50'
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden', colorClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>
      
      <h3 className="mb-3 text-base font-medium">{title}</h3>

      {/* Stats Section */}
      {isLoadingStats ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Loading...</span>
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        </div>
      ) : stats ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Vouchers:</span>
            <span className="font-medium">{stats.totalVouchers.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Inventory Value:</span>
            <span className="font-medium">R {stats.inventoryValue.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Sold Value:</span>
            <span className="font-medium">R {stats.soldValue.toFixed(2)}</span>
          </div>
        </div>
      ) : null}

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
};
