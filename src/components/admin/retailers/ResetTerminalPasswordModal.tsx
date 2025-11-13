import { useState } from 'react';
import { X, Loader2, AlertCircle, Copy, AlertTriangle, RefreshCw } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { resetTerminalPassword } from '@/actions';
import { generatePassword } from '@/utils/password';
import type { AdminTerminal } from '@/actions';

interface ResetTerminalPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  terminal: AdminTerminal;
}

export function ResetTerminalPasswordModal({
  isOpen,
  onClose,
  terminal,
}: ResetTerminalPasswordModalProps) {
  const [formData, setFormData] = useState({
    password: '',
    autoGeneratePassword: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);

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
      const { data, error: resetError } = await resetTerminalPassword(
        terminal.id,
        formData.password
      );

      if (resetError) {
        setError(resetError);
        return;
      }

      if (!data) {
        setError('Failed to reset password');
        return;
      }

      // Show success with new password
      setNewPassword(data.password);
    } catch (err) {
      setError(err ?? 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      password: '',
      autoGeneratePassword: false,
    });
    setError(null);
    setNewPassword(null);
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
              {newPassword ? 'Password Reset Successfully' : 'Reset Terminal Password'}
            </Dialog.Title>
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

            {newPassword ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  The password has been reset successfully. The new password is shown below and will
                  not be displayed again:
                </p>

                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium">Terminal ID</label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={`${terminal.short_code}`}
                        readOnly
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(terminal.short_code)}
                        className="rounded-md p-2 hover:bg-muted"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">New Password</label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={newPassword}
                        readOnly
                        className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(newPassword)}
                        className="rounded-md p-2 hover:bg-muted"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-500">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Important:</p>
                      <p className="mt-1">
                        The terminal will be logged out and will need to sign in with this new
                        password. Make sure to save this password now.
                      </p>
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
                  <div className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-500">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Warning:</p>
                        <p className="mt-1">
                          This will reset the password for <strong>{terminal.name}</strong> (
                          {terminal.short_code}). The terminal will be logged out and will need to
                          sign in with the new password.
                        </p>
                      </div>
                    </div>
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

                  <div className="flex justify-end space-x-2">
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
                          Resetting...
                        </>
                      ) : (
                        'Reset Password'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
