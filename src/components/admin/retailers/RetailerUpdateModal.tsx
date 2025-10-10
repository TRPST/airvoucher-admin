import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2, AlertCircle } from "lucide-react";
import {
  fetchAgents,
  fetchCommissionGroups,
  updateRetailer,
  type CommissionGroup,
  type AdminRetailer,
} from "@/actions";

type AgentOption = { id: string; full_name: string };

interface RetailerUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  retailer: AdminRetailer;
  onUpdated: (updated: AdminRetailer) => void;
}

export function RetailerUpdateModal({
  isOpen,
  onClose,
  retailer,
  onUpdated,
}: RetailerUpdateModalProps) {
  const [contactName, setContactName] = useState(retailer.contact_name || "");
  const [contactEmail, setContactEmail] = useState(retailer.contact_email || "");
  const [status, setStatus] = useState<"active" | "suspended" | "inactive">(retailer.status);
  const [agentId, setAgentId] = useState(retailer.agent_profile_id || "");
  const [commissionGroupId, setCommissionGroupId] = useState(retailer.commission_group_id || "");

  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [groups, setGroups] = useState<CommissionGroup[]>([]);

  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form and load options when opened
  useEffect(() => {
    if (!isOpen) return;
    // Initialize from latest retailer data
    setContactName(retailer.contact_name || "");
    setContactEmail(retailer.contact_email || "");
    setStatus(retailer.status);
    setAgentId(retailer.agent_profile_id || "");
    setCommissionGroupId(retailer.commission_group_id || "");

    const load = async () => {
      setIsLoadingOptions(true);
      setError(null);
      try {
        const [agentsRes, groupsRes] = await Promise.all([fetchAgents(), fetchCommissionGroups()]);
        if (agentsRes.error) {
          throw new Error(`Failed to load agents: ${agentsRes.error.message}`);
        }
        if (groupsRes.error) {
          throw new Error(`Failed to load commission groups: ${groupsRes.error.message}`);
        }
        setAgents(agentsRes.data || []);
        setGroups(groupsRes.data || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsLoadingOptions(false);
      }
    };
    void load();
  }, [isOpen, retailer]);

  const selectedAgentName = useMemo(() => {
    return agents.find((a) => a.id === agentId)?.full_name;
  }, [agents, agentId]);

  const selectedGroupName = useMemo(() => {
    return groups.find((g) => g.id === commissionGroupId)?.name;
  }, [groups, commissionGroupId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const { error: updError } = await updateRetailer(retailer.id, {
        contact_name: contactName || undefined,
        contact_email: contactEmail || undefined,
        status,
        agent_profile_id: agentId || undefined,
        commission_group_id: commissionGroupId || undefined,
      });
      if (updError) {
        setError(`Failed to update retailer: ${updError.message}`);
        return;
      }

      // Construct updated local object for immediate UI feedback
      const updated: AdminRetailer = {
        ...retailer,
        contact_name: contactName || "",
        contact_email: contactEmail || "",
        status,
        agent_profile_id: agentId || undefined,
        commission_group_id: commissionGroupId || undefined,
        agent_name: agentId ? selectedAgentName : undefined,
        commission_group_name: commissionGroupId ? selectedGroupName : undefined,
      };
      onUpdated(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid max-h-[90vh] w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">Update Retailer</Dialog.Title>
            <Dialog.Close className="rounded-full p-2 hover:bg-muted">
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <div className="mt-2 space-y-4">
            {error && (
              <div className="mb-2 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {error}
                </div>
              </div>
            )}

            {isLoadingOptions ? (
              <div className="flex justify-center p-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="space-y-2 mb-3">
                  <label className="text-sm font-medium">Contact Person</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Contact person name"
                  />
                </div>

                <div className="space-y-2 mb-3">
                  <label className="text-sm font-medium">Contact Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="email@example.com"
                  />
                </div>

                <div className="space-y-2 mb-3">
                  <label className="text-sm font-medium">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "active" | "suspended" | "inactive")}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sales Agent</label>
                    <select
                      value={agentId}
                      onChange={(e) => setAgentId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">None</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>{a.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Commission Group</label>
                    <select
                      value={commissionGroupId}
                      onChange={(e) => setCommissionGroupId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">None</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="rounded-md px-4 py-2 text-sm font-medium border border-input hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
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
