import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeft, Clock, Calendar, CalendarDays, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  fetchVoucherTypesByNetworkAndCategory,
  type VoucherType,
  type NetworkProvider,
  type VoucherCategory,
  type DataDuration,
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

  // Get unique data durations for data category
  const dataDurations = React.useMemo(() => {
    if (category !== 'data') return [];

    const durations = new Set<DataDuration>();
    voucherTypes.forEach(type => {
      if (type.sub_category && type.category === 'data') {
        durations.add(type.sub_category as DataDuration);
      }
    });

    return Array.from(durations).sort();
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
          {dataDurations.map(duration => (
            <DurationCard
              key={duration}
              duration={duration}
              provider={provider as string}
              providerName={providerName}
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
  onClick: () => void;
}

const DurationCard: React.FC<DurationCardProps> = ({
  duration,
  provider,
  providerName,
  onClick,
}) => {
  // Map duration to icon and color
  const durationConfig = React.useMemo(() => {
    switch (duration) {
      case 'daily':
        return {
          icon: Clock,
          title: `${providerName} Daily Data`,
          description: `${providerName} short-term data bundles`,
          colorClass: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        };
      case 'weekly':
        return {
          icon: Calendar,
          title: `${providerName} Weekly Data`,
          description: `${providerName} medium-term data bundles`,
          colorClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        };
      case 'monthly':
        return {
          icon: CalendarDays,
          title: `${providerName} Monthly Data`,
          description: `${providerName} long-term data bundles`,
          colorClass: 'bg-green-500/10 text-green-500 border-green-500/20',
        };
      default:
        return {
          icon: Calendar,
          title: `${providerName} ${String(duration).charAt(0).toUpperCase() + String(duration).slice(1)} Data`,
          description: `${providerName} ${String(duration)} data bundles`,
          colorClass: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
        };
    }
  }, [duration, providerName]);

  const { icon: Icon, title, description, colorClass } = durationConfig;

  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-lg border border-border bg-card p-6 shadow-sm',
        'cursor-pointer transition-all duration-200 hover:border-primary/20 hover:shadow-md',
        'transform hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <div
        className={cn('mb-4 flex h-12 w-12 items-center justify-center rounded-full', colorClass)}
      >
        <Icon className="h-6 w-6" />
      </div>

      <h3 className="mb-2 text-xl font-medium">{title}</h3>
      <p className="mb-4 text-muted-foreground">{description}</p>

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
