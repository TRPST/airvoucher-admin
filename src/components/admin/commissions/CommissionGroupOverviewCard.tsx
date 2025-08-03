import * as React from 'react';
import { useRouter } from 'next/router';
import { Users, Store, Percent, Calendar, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { archiveCommissionGroup, fetchCommissionGroupsWithCounts, type CommissionGroupWithCounts } from '@/actions';
import { ArchiveCommissionGroupDialog } from './ArchiveCommissionGroupDialog';

interface CommissionGroupOverviewCardProps {
  group: CommissionGroupWithCounts;
  onArchive?: () => void;
}

export function CommissionGroupOverviewCard({ group, onArchive }: CommissionGroupOverviewCardProps) {
  const router = useRouter();
  const [showArchiveDialog, setShowArchiveDialog] = React.useState(false);
  const [isArchiving, setIsArchiving] = React.useState(false);

  const handleClick = React.useCallback(() => {
    router.push(`/admin/commissions/${group.id}`);
  }, [router, group.id]);

  const handleDeleteClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setShowArchiveDialog(true);
  }, []);

  const handleArchiveConfirm = React.useCallback(async () => {
    setIsArchiving(true);
    try {
      const { error } = await archiveCommissionGroup(group.id);
      
      if (error) {
        console.error('Error archiving commission group:', error);
        // You might want to show a toast notification here
        return;
      }

      // Close dialog and trigger refresh
      setShowArchiveDialog(false);
      if (onArchive) {
        onArchive();
      }
    } catch (err) {
      console.error('Error archiving commission group:', err);
    } finally {
      setIsArchiving(false);
    }
  }, [group.id, onArchive]);

  const handleArchiveCancel = React.useCallback(() => {
    setShowArchiveDialog(false);
  }, []);

  // Format creation date
  const formattedDate = React.useMemo(() => {
    const date = new Date(group.created_at);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, [group.created_at]);

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
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'group relative flex h-full flex-col rounded-lg border border-border bg-card p-6 shadow-sm',
          'cursor-pointer transition-all duration-200 hover:border-primary/20 hover:shadow-md',
          'transform hover:scale-[1.02]'
        )}
        onClick={handleClick}
      >
        {/* Delete button in top-right corner */}
        <button
          onClick={handleDeleteClick}
          className={cn(
            'absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full',
            'opacity-0 transition-all duration-200 hover:bg-red-100 hover:text-red-600',
            'group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
            'dark:hover:bg-red-900/20 dark:hover:text-red-400'
          )}
          title="Archive commission group"
        >
          <Trash2 className="h-4 w-4" />
        </button>

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

          {/* Creation date */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Created:</span>
            </div>
            <span className="font-medium">{formattedDate}</span>
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

      {/* Archive confirmation dialog */}
      <ArchiveCommissionGroupDialog
        isOpen={showArchiveDialog}
        onClose={handleArchiveCancel}
        onConfirm={handleArchiveConfirm}
        groupName={group.name}
        isLoading={isArchiving}
      />
    </>
  );
}
