import * as React from 'react';
import { useRouter } from 'next/router';
import { Users, Store, Percent } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import type { CommissionGroupWithCounts } from '@/actions';

interface CommissionGroupOverviewCardProps {
  group: CommissionGroupWithCounts;
}

export function CommissionGroupOverviewCard({ group }: CommissionGroupOverviewCardProps) {
  const router = useRouter();

  const handleClick = React.useCallback(() => {
    router.push(`/admin/commissions/${group.id}`);
  }, [router, group.id]);

  // Determine color based on group name
  const colorClass = React.useMemo(() => {
    const name = group.name.toLowerCase();
    if (name.includes('gold')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    if (name.includes('silver')) return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    if (name.includes('platinum')) return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    if (name.includes('bronze')) return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    return 'bg-primary/10 text-primary border-primary/20';
  }, [group.name]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
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
        <Percent className="h-6 w-6" />
      </div>
      
      <h3 className="mb-2 text-xl font-medium">{group.name}</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        {group.description || 'No description provided'}
      </p>

      <div className="mb-4 space-y-2">
        {/* Retailers count */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Store className="h-4 w-4" />
            <span>Retailers:</span>
          </div>
          <span className="font-medium">{group.retailer_count.toLocaleString()}</span>
        </div>

        {/* Sales agents count */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Sales Agents:</span>
          </div>
          <span className="font-medium">{group.agent_count.toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-auto flex items-center text-sm text-primary">
        <span>Manage Commission Rates</span>
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
    </motion.div>
  );
}
