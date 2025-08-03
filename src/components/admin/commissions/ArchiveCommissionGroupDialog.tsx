import * as React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ArchiveCommissionGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  groupName: string;
  isLoading: boolean;
}

export function ArchiveCommissionGroupDialog({
  isOpen,
  onClose,
  onConfirm,
  groupName,
  isLoading,
}: ArchiveCommissionGroupDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <DialogTitle>Archive Commission Group</DialogTitle>
              <DialogDescription className="text-left">
                This action will archive the commission group and hide it from the system.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/10">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              <strong>Commission Group:</strong> {groupName}
            </p>
            <div className="mt-3 space-y-1 text-xs text-orange-700 dark:text-orange-300">
              <p>• The commission group will be hidden from all listings</p>
              <p>• Historical data and commission records will be preserved</p>
              <p>• Retailers currently using this group will keep their commission history</p>
              <p>• This action can be reversed by an administrator if needed</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Archiving...
              </>
            ) : (
              'Archive Group'
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
