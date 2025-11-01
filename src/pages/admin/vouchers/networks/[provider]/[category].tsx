import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeft, ChevronRight, Clock, Calendar, CalendarDays, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import {
  fetchVoucherTypesByNetworkAndCategory,
  fetchNetworkCategoryDurationStats,
  type VoucherType,
  type NetworkProvider,
  type VoucherCategory,
  type DataDuration,
  type CategoryStats,
} from '@/actions/adminActions';

export default function CategoryVoucherSelection() {
  const router = useRouter();
  const { provider, category } = router.query;
  const [voucherTypes, setVoucherTypes] = React.useState<VoucherType[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Capitalize names for display
  const providerName = React.useMemo(() => {
    if (typeof provider === 'string') {
      const name = provider.charAt(0).toUpperCase() + provider.slice(1);
      // Special case for MTN to ensure it's fully capitalized
      return name === 'Mtn' ? 'MTN' : name;
    }
    return '';
  }, [provider]);

  const categoryName = React.useMemo(() => {
    if (typeof category === 'string') {
      return category.charAt(0).toUpperCase() + category.slice(1);
    }
    return '';
  }, [category]);

  // Fetch voucher types for this network provider and category
  React.useEffect(() => {
    async function loadData() {
      try {
        if (
          !provider ||
          typeof provider !== 'string' ||
          !category ||
          typeof category !== 'string'
        ) {
          return;
        }

        setIsLoading(true);
        const { data, error: fetchError } = await fetchVoucherTypesByNetworkAndCategory(
          provider as NetworkProvider,
          category as VoucherCategory
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
  }, [provider, category]);

  // For airtime, redirect immediately to the voucher management page
  React.useEffect(() => {
    if (category === 'airtime' && voucherTypes.length > 0 && !isLoading) {
      // Find the first airtime voucher type and redirect to it
      const airtimeType = voucherTypes.find(type => type.category === 'airtime');
      if (airtimeType) {
        router.replace(`/admin/vouchers/${airtimeType.id}`);
      }
    }
  }, [category, voucherTypes, isLoading, router]);

  // Define preferred order for data durations (easily configurable)
  const dataDurationOrder: DataDuration[] = ['daily', 'weekly', 'monthly'];

  // Get unique data durations for data category and sort by preferred order
  const dataDurations = React.useMemo(() => {
    if (category !== 'data') return [];

    const durations = new Set<DataDuration>();
    voucherTypes.forEach(type => {
      if (type.sub_category && type.category === 'data') {
        durations.add(type.sub_category as DataDuration);
      }
    });

    const availableDurations = Array.from(durations);

    // Sort by the predefined order, with any unknown durations at the end
    return dataDurationOrder
      .filter(duration => availableDurations.includes(duration))
      .concat(availableDurations.filter(duration => !dataDurationOrder.includes(duration)));
  }, [voucherTypes, category]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
          <p>
            Loading {providerName} {categoryName} options...
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

  // For data category, show duration selection
  if (category === 'data') {
    return (
      <div className="space-y-6">
        <Link href={`/admin/vouchers/networks/${provider}`} passHref>
          <button className="group inline-flex items-center text-sm font-medium transition-colors hover:text-primary">
            <ChevronLeft className="mr-2 h-5 w-5 transform transition-transform duration-200 group-hover:-translate-x-1" />
            Back to {providerName}
          </button>
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {providerName} Data Bundles
            </h1>
            <p className="text-muted-foreground">
              Select the duration type for {providerName} data bundles
            </p>
          </div>
        </div>

        {/* Duration Selection Cards */}
        <div className="grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-3">
          {dataDurations.map((duration, index) => (
            <DurationCard
              key={duration}
              duration={duration}
              provider={provider as string}
              providerName={providerName}
              index={index}
              onClick={() => router.push(`/admin/vouchers/networks/${provider}/data/${duration}`)}
            />
          ))}
        </div>

        {/* Empty state */}
        {dataDurations.length === 0 && (
          <div className="flex h-[40vh] items-center justify-center">
            <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
              <Calendar className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <h2 className="mb-2 text-xl font-semibold">No Data Durations Found</h2>
              <p className="text-muted-foreground">
                There are no {providerName} data vouchers available in the system.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback for other categories or loading states
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center">
        <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
        <p>Processing...</p>
      </div>
    </div>
  );
}

// Duration Card Component
interface DurationCardProps {
  duration: DataDuration;
  provider: string;
  providerName: string;
  index: number;
  onClick: () => void;
}

const DurationCard: React.FC<DurationCardProps> = ({
  duration,
  provider,
  providerName,
  index,
  onClick,
}) => {
  const [stats, setStats] = React.useState<CategoryStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = React.useState(true);

  // Fetch stats for this duration
  React.useEffect(() => {
    async function loadStats() {
      try {
        setIsLoadingStats(true);
        const { data, error } = await fetchNetworkCategoryDurationStats(
          provider as NetworkProvider,
          'data',
          duration
        );

        if (error) {
          console.error(`Error loading ${duration} data stats:`, error);
          setStats({ totalVouchers: 0, inventoryValue: 0, soldValue: 0 });
        } else {
          setStats(data);
        }
      } catch (err) {
        console.error(`Error loading ${duration} data stats:`, err);
        setStats({ totalVouchers: 0, inventoryValue: 0, soldValue: 0 });
      } finally {
        setIsLoadingStats(false);
      }
    }

    loadStats();
  }, [provider, duration]);

  // Map duration to icon and color
  const durationConfig = React.useMemo(() => {
    switch (duration) {
      case 'daily':
        return {
          icon: Clock,
          title: `${providerName} Daily Data`,
          description: `${providerName} short-term data bundles`,
          iconBgColor: 'bg-orange-100 dark:bg-orange-900/20',
          iconColor: 'text-orange-600 dark:text-orange-400',
        };
      case 'weekly':
        return {
          icon: Calendar,
          title: `${providerName} Weekly Data`,
          description: `${providerName} medium-term data bundles`,
          iconBgColor: 'bg-blue-100 dark:bg-blue-900/20',
          iconColor: 'text-blue-600 dark:text-blue-400',
        };
      case 'monthly':
        return {
          icon: CalendarDays,
          title: `${providerName} Monthly Data`,
          description: `${providerName} long-term data bundles`,
          iconBgColor: 'bg-green-100 dark:bg-green-900/20',
          iconColor: 'text-green-600 dark:text-green-400',
        };
      default:
        return {
          icon: Calendar,
          title: `${providerName} ${String(duration).charAt(0).toUpperCase() + String(duration).slice(1)} Data`,
          description: `${providerName} ${String(duration)} data bundles`,
          iconBgColor: 'bg-gray-100 dark:bg-gray-900/20',
          iconColor: 'text-gray-600 dark:text-gray-400',
        };
    }
  }, [duration, providerName]);

  const { icon: Icon, title, description, iconBgColor, iconColor } = durationConfig;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className={cn(
        'group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md'
      )}
      onClick={onClick}
    >
      {/* Icon and Chevron */}
      <div className="mb-4 flex items-center justify-between">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg', iconBgColor)}>
          <Icon className={cn('h-6 w-6', iconColor)} />
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>

      {/* Content */}
      <div>
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>

        {/* Stats Section */}
        {isLoadingStats ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Loading stats...</span>
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
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.div>
  );
};
