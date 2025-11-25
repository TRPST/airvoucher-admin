import * as React from 'react';
import { useRouter } from 'next/router';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

type DurationCardProps = {
  duration: 'daily' | 'weekly' | 'monthly';
  provider: 'mtn' | 'vodacom' | 'cellc' | 'telkom';
  groupId: string;
  voucherTypeId: string;
  index?: number;
};

const durationConfig = {
  daily: {
    name: 'Daily Data',
    description: '24-hour data bundles',
    icon: '📅',
  },
  weekly: {
    name: 'Weekly Data',
    description: '7-day data bundles',
    icon: '📆',
  },
  monthly: {
    name: 'Monthly Data',
    description: '30-day data bundles',
    icon: '🗓️',
  },
};

const providerColors = {
  mtn: 'bg-yellow-100 dark:bg-yellow-900/20',
  vodacom: 'bg-red-100 dark:bg-red-900/20',
  cellc: 'bg-blue-100 dark:bg-blue-900/20',
  telkom: 'bg-purple-100 dark:bg-purple-900/20',
};

export function DurationCard({
  duration,
  provider,
  groupId,
  voucherTypeId,
  index = 0,
}: DurationCardProps) {
  const router = useRouter();
  const config = durationConfig[duration];
  const bgColor = providerColors[provider];

  const handleClick = React.useCallback(() => {
    router.push(`/admin/commissions/${groupId}/voucher-type/${voucherTypeId}`);
  }, [router, groupId, voucherTypeId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={handleClick}
      className="group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
    >
      {/* Icon and Arrow */}
      <div className="mb-4 flex items-center justify-between">
        <div
          className={cn('flex h-14 w-14 items-center justify-center rounded-lg text-3xl', bgColor)}
        >
          {config.icon}
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>

      {/* Duration Info */}
      <div>
        <h3 className="text-lg font-semibold">{config.name}</h3>
        <p className="text-sm text-muted-foreground">{config.description}</p>
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.div>
  );
}
