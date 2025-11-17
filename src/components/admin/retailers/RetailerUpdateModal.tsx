import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import {
  fetchAgents,
  fetchCommissionGroups,
  updateRetailer,
  type CommissionGroup,
  type AdminRetailer,
} from '@/actions';
import { LocationAutocompleteInput } from './LocationAutocompleteInput';
import { ResetRetailerPasswordModal } from './ResetRetailerPasswordModal';

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
  const [name, setName] = useState(retailer.name || '');
  const [contactName, setContactName] = useState(retailer.contact_name || '');
  const [contactPhone, setContactPhone] = useState(retailer.contact_phone || '');
  const [secondaryContactName, setSecondaryContactName] = useState(
    retailer.secondary_contact_name || ''
  );
  const [secondaryContactPhone, setSecondaryContactPhone] = useState(
    retailer.secondary_contact_phone || ''
  );
  const [location, setLocation] = useState(retailer.location || '');
  const [status, setStatus] = useState<'active' | 'suspended' | 'inactive'>(retailer.status);
  const [agentId, setAgentId] = useState(retailer.agent_profile_id || '');
  const [commissionGroupId, setCommissionGroupId] = useState(retailer.commission_group_id || '');

  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [groups, setGroups] = useState<CommissionGroup[]>([]);

  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password reset modal state
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);

  // Reset form and load options when opened
  useEffect(() => {
    if (!isOpen) return;
    // Initialize from latest retailer data
    setName(retailer.name || '');
    setContactName(retailer.contact_name || '');
    setContactPhone(retailer.contact_phone || '');
    setSecondaryContactName(retailer.secondary_contact_name || '');
    setSecondaryContactPhone(retailer.secondary_contact_phone || '');
    setLocation(retailer.location || '');
    setStatus(retailer.status);
    setAgentId(retailer.agent_profile_id || '');
    setCommissionGroupId(retailer.commission_group_id || '');
    setShowPasswordResetModal(false);

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
    return agents.find(a => a.id === agentId)?.full_name;
  }, [agents, agentId]);

  const selectedGroupName = useMemo(() => {
    return groups.find(g => g.id === commissionGroupId)?.name;
  }, [groups, commissionGroupId]);

  const handleLocationSelect = (address: string) => {
    setLocation(address);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const { error: updError } = await updateRetailer(retailer.id, {
        name: name || undefined,
        contact_name: contactName || undefined,
        contact_phone: contactPhone || undefined,
        secondary_contact_name: secondaryContactName || undefined,
        secondary_contact_phone: secondaryContactPhone || undefined,
        location: location || undefined,
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
        name: name || '',
        contact_name: contactName || '',
        contact_phone: contactPhone || undefined,
        secondary_contact_name: secondaryContactName || undefined,
        secondary_contact_phone: secondaryContactPhone || undefined,
        location: location || '',
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
    setShowPasswordResetModal(false);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid max-h-[90vh] w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">Update Retailer</Dialog.Title>
            <Dialog.Close className="rounded-full p-2 hover:bg-muted">
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <div className="mt-2 space-y-4">
            {error && (
              <div className="mb-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <div className="flex items-center">
                  <AlertCircle className="mr-2 h-4 w-4" />
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
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Business Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Business name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Email <span className="text-xs text-muted-foreground">(read-only)</span>
                    </label>
                    <input
                      type="email"
                      value={retailer.email}
                      disabled
                      className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Primary Contact Name</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={e => setContactName(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Primary contact name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Primary Contact Phone</label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={e => setContactPhone(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Primary contact phone"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Secondary Contact Name</label>
                    <input
                      type="text"
                      value={secondaryContactName}
                      onChange={e => setSecondaryContactName(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Optional secondary contact"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Secondary Contact Phone</label>
                    <input
                      type="tel"
                      value={secondaryContactPhone}
                      onChange={e => setSecondaryContactPhone(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Optional secondary phone"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Location</label>
                    <LocationAutocompleteInput
                      type="text"
                      name="location"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      onLocationSelect={handleLocationSelect}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Enter a location"
                      apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <select
                      value={status}
                      onChange={e =>
                        setStatus(e.target.value as 'active' | 'suspended' | 'inactive')
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sales Agent</label>
                    <select
                      value={agentId}
                      onChange={e => setAgentId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">None</option>
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Commission Group</label>
                    <select
                      value={commissionGroupId}
                      onChange={e => setCommissionGroupId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">None</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Password Reset Section */}
                <div className="mt-6 rounded-lg border border-border p-4">
                  <div className="mb-3">
                    <h3 className="font-medium">Password Reset</h3>
                    <p className="text-xs text-muted-foreground">
                      Generate a new password for this retailer account
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPasswordResetModal(true)}
                    className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset Password
                  </button>
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
                    disabled={isSaving}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      {/* Password Reset Modal */}
      <ResetRetailerPasswordModal
        isOpen={showPasswordResetModal}
        onClose={() => setShowPasswordResetModal(false)}
        retailer={retailer}
      />
    </Dialog.Root>
  );
}
