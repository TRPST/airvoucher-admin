import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { RetailerForm } from './RetailerForm';
import type { Agent, CommissionGroup } from '@/actions';

interface AddRetailerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: {
    businessName: string;
    contactName: string;
    email: string;
    location: string;
    agentId: string;
    commissionGroupId: string;
    initialBalance: string;
    creditLimit: string;
    password: string;
    autoGeneratePassword: boolean;
  };
  agents: Agent[];
  commissionGroups: CommissionGroup[];
  formError: string | null;
  isSubmitting: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onRegeneratePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddRetailerDialog({
  open,
  onOpenChange,
  formData,
  agents,
  commissionGroups,
  formError,
  isSubmitting,
  onInputChange,
  onRegeneratePassword,
  onSubmit,
}: AddRetailerDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid max-h-[90vh] w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">Add New Retailer</Dialog.Title>
            <Dialog.Close className="rounded-full p-2 hover:bg-muted">
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>
          <div className="mt-4 space-y-6">
            <RetailerForm
              formData={formData}
              agents={agents}
              commissionGroups={commissionGroups}
              formError={formError}
              isSubmitting={isSubmitting}
              onInputChange={onInputChange}
              onRegeneratePassword={onRegeneratePassword}
              onSubmit={onSubmit}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
