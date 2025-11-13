import { useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { updateTerminal } from '@/actions';
import type { AdminTerminal } from '@/actions';

interface EditTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  terminal: AdminTerminal;
  onTerminalUpdated: () => void;
}

export function EditTerminalModal({
  isOpen,
  onClose,
  terminal,
  onTerminalUpdated,
}: EditTerminalModalProps) {
  const [formData, setFormData] = useState({
    name: terminal.name,
    status: terminal.status,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const extractErrorMessage = (err: unknown): string => {
    if (!err) return 'An unexpected error occurred';
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message || 'An unexpected error occurred';
    if (typeof err === 'object') {
      const candidate =
        (err as { message?: unknown; error?: unknown }).message ??
        (err as { message?: unknown; error?: unknown }).error;
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
      try {
        return JSON.stringify(err);
      } catch {
        // fall through to generic string conversion
      }
    }
    return String(err);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error: updateError } = await updateTerminal(terminal.id, {
        name: formData.name,
        status: formData.status as 'active' | 'inactive',
      });

      if (updateError) {
        setError(updateError);
        return;
      }

      if (!data) {
        setError('Failed to update terminal');
        return;
      }

      // Notify parent component to refresh the terminals list
      onTerminalUpdated();
      handleClose();
    } catch (err) {
      setError(err ?? 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form to terminal's current values
    setFormData({
      name: terminal.name,
      status: terminal.status,
    });
    setError(null);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border border-border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">Edit Terminal</Dialog.Title>
            <Dialog.Close className="rounded-full p-2 hover:bg-muted">
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <div className="mt-2 space-y-4">
            {error != null && (
              <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <div className="flex items-center">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  {extractErrorMessage(error)}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Terminal ID</label>
                  <input
                    type="text"
                    value={terminal.short_code}
                    disabled
                    className="mt-1 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="name" className="text-sm font-medium">
                    Terminal Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Enter terminal name"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="status" className="text-sm font-medium">
                    Status <span className="text-destructive">*</span>
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Terminal'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
