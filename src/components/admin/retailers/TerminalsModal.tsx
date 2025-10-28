import { X, Smartphone, Plus, MoreHorizontal } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { TablePlaceholder } from "@/components/ui/table-placeholder";
import { cn } from "@/utils/cn";
import type { AdminTerminal } from "@/actions";

interface TerminalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  retailerId: string;
  terminals: AdminTerminal[];
  onAddTerminal: () => void;
  onTerminalsUpdate: (terminals: AdminTerminal[]) => void;
}

export function TerminalsModal({
  isOpen,
  onClose,
  retailerId,
  terminals,
  onAddTerminal,
  onTerminalsUpdate,
}: TerminalsModalProps) {
  // Format terminal data for table
  const terminalData = terminals.map((terminal) => ({
    Name: terminal.name,
    Status: (
      <div
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
          terminal.status === "active"
            ? "bg-green-500/10 text-green-500"
            : "bg-amber-500/10 text-amber-500"
        )}
      >
        {terminal.status.charAt(0).toUpperCase() + terminal.status.slice(1)}
      </div>
    ),
    "Last Active": terminal.last_active
      ? new Date(terminal.last_active).toLocaleString("en-ZA", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Never",
    Actions: (
      <div className="flex items-center gap-2">
        <button className="rounded-md p-2 hover:bg-muted">
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    ),
  }));

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-[90vw] translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg max-h-[85vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <Dialog.Title className="text-lg font-semibold">
                Terminals
              </Dialog.Title>
              <div className="ml-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {terminals.length}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onAddTerminal}
                className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Terminal
              </button>
              <Dialog.Close className="rounded-full p-2 hover:bg-muted">
                <X className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Close</span>
              </Dialog.Close>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <TablePlaceholder
              columns={["Name", "Status", "Last Active", "Actions"]}
              data={terminalData}
              emptyMessage="No terminals found for this retailer"
            />
          </div>

          <div className="flex justify-end pt-4 border-border">
            <Dialog.Close asChild>
              <button className="rounded-md px-4 py-2 text-sm font-medium border border-input hover:bg-muted">
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
