import { useState } from 'react';
import { X, Loader2, AlertCircle, Copy, RefreshCw } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { createTerminalWithUser, fetchAdminTerminals } from '@/actions';
import { generatePassword } from '@/utils/password';
import type { AddTerminalModalProps } from './types';

export function AddTerminalModal({
  isOpen,
  onClose,
  retailerId,
  onTerminalAdded,
}: AddTerminalModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    password: '',
    autoGeneratePassword: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTerminal, setCreatedTerminal] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      // If auto-generate is checked, generate a new password
      ...(name === 'autoGeneratePassword' && checked && { password: generatePassword() }),
      // If auto-generate is unchecked, clear the password
      ...(name === 'autoGeneratePassword' && !checked && { password: '' }),
    }));
  };

  const handleRegeneratePassword = () => {
    setFormData(prev => ({
      ...prev,
      password: generatePassword(),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error } = await createTerminalWithUser({
        name: formData.name,
        contact_person: formData.contact_person,
        retailer_id: retailerId,
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (!data) {
        setError('Failed to create terminal');
        return;
      }

      // Show success message with credentials
      setCreatedTerminal({
        email: formData.email,
        password: formData.password,
      });

      // Notify parent that terminal was added
      onTerminalAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      contact_person: '',
      email: '',
      password: '',
      autoGeneratePassword: false,
    });
    setError(null);
    setCreatedTerminal(null);
    onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border border-border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">
              {createdTerminal ? 'Terminal Created Successfully' : 'Add New Terminal'}
            </Dialog.Title>
            <Dialog.Close className="rounded-full p-2 hover:bg-muted">
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <div className="mt-2 space-y-4">
            {error && (
              <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <div className="flex items-center">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  {error}
                </div>
              </div>
            )}

            {createdTerminal ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  The terminal has been created successfully. Please save these credentials as they
                  will not be shown again:
                </p>

                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={createdTerminal.email}
                        readOnly
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(createdTerminal.email)}
                        className="rounded-md p-2 hover:bg-muted"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Password</label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={createdTerminal.password}
                        readOnly
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(createdTerminal.password)}
                        className="rounded-md p-2 hover:bg-muted"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleClose}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Terminal Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Enter terminal name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contact Person</label>
                    <input
                      type="text"
                      name="contact_person"
                      value={formData.contact_person}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Enter contact person's full name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Enter contact person's email"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Password</label>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            name="autoGeneratePassword"
                            checked={formData.autoGeneratePassword}
                            onChange={handleInputChange}
                            className="h-4 w-4 rounded border-input"
                          />
                          Auto-generate
                        </label>
                        {formData.autoGeneratePassword && (
                          <button
                            type="button"
                            onClick={handleRegeneratePassword}
                            className="rounded-md p-1 hover:bg-muted"
                            title="Regenerate password"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="text"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      disabled={formData.autoGeneratePassword}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Enter password"
                      required
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-2">
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
                        Processing...
                      </>
                    ) : (
                      'Add Terminal'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
