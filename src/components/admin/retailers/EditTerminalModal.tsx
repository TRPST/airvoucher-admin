import { useEffect, useState } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { updateTerminal } from "@/actions";
import type { EditTerminalModalProps } from "./types";

export function EditTerminalModal({
  isOpen,
  onClose,
  terminal,
  onTerminalUpdated,
}: EditTerminalModalProps) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (terminal) {
      setName(terminal.name);
      setStatus(terminal.status);
    }
  }, [terminal]);

  const resetState = () => {
    setError(null);
    setIsSubmitting(false);
    setName("");
    setStatus("active");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
      onClose();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!terminal) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const { data, error: updateError } = await updateTerminal(terminal.id, {
      name,
      status,
    });

    if (updateError) {
      setError(updateError.message);
      setIsSubmitting(false);
      return;
    }

    if (data) {
      onTerminalUpdated(data);
    }

    setIsSubmitting(false);
    handleOpenChange(false);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">
              Edit Terminal
            </Dialog.Title>
            <Dialog.Close
              type="button"
              className="rounded-full p-2 hover:bg-muted"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <div className="flex items-center">
                <AlertCircle className="mr-2 h-4 w-4" />
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="terminal-name">
                Terminal Name
              </label>
              <input
                id="terminal-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Enter terminal name"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="terminal-status">
                Status
              </label>
              <select
                id="terminal-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as "active" | "inactive")
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close
                type="button"
                className="rounded-md border border-input px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm hover:bg-muted"
              >
                Cancel
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
