import * as React from "react";
import {
  Plus,
  Users,
  Loader2,
  AlertCircle,
  X,
  Search,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";

import { TablePlaceholder } from "@/components/ui/table-placeholder";
import { cn } from "@/utils/cn";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  createAgent,
  fetchUnassignedRetailers,
  assignRetailerToAgent,
  updateAgent,
  type Agent,
} from "@/actions";
import useRequireRole from "@/hooks/useRequireRole";

import useSWR, { useSWRConfig } from "swr";
import { SwrKeys } from "@/lib/swr/keys";
import { agentsFetcher, unassignedRetailersFetcher } from "@/lib/swr/fetchers";

export default function AdminAgents() {
  // Protect this route - only allow admin role
  useRequireRole("admin");
  const { mutate } = useSWRConfig();

  // SWR: agents list
  const {
    data: agentsData,
    error: agentsError,
    isLoading: agentsLoading,
  } = useSWR(SwrKeys.agents(), agentsFetcher);

  // SWR: unassigned retailers for assignment
  const {
    data: unassignedRetailers,
    error: unassignedError,
    isLoading: unassignedLoading,
  } = useSWR(SwrKeys.unassignedRetailers(), unassignedRetailersFetcher);

  // Derived loading/error state (use cache presence only to gate initial loader)
  const isLoading = (agentsLoading as boolean) || (unassignedLoading as boolean);
  const error =
    (agentsError as any)?.message ||
    (unassignedError as any)?.message ||
    null;

  // Form state for adding a new agent
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<{
    fullName: string;
    email: string;
    phone: string;
    password: string;
    autoGeneratePassword: boolean;
    assignedRetailers: string[];
  }>({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    autoGeneratePassword: false,
    assignedRetailers: [],
  });

  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingAgent, setEditingAgent] = React.useState<Agent | null>(null);
  const [editFormData, setEditFormData] = React.useState<{ fullName: string; phone: string }>({
    fullName: "",
    phone: "",
  });
  const [editError, setEditError] = React.useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = React.useState(false);
  
  // Search state with URL sync
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);



  // Handler for input changes in the form
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));

      // If auto-generate is checked, generate a random password
      if (name === "autoGeneratePassword" && checked) {
        const generatedPassword = generateRandomPassword();
        setFormData((prev) => ({ ...prev, password: generatedPassword }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handler for retailer assignment changes
  const handleRetailerToggle = (retailerId: string) => {
    setFormData((prev) => ({
      ...prev,
      assignedRetailers: prev.assignedRetailers.includes(retailerId)
        ? prev.assignedRetailers.filter((id) => id !== retailerId)
        : [...prev.assignedRetailers, retailerId],
    }));
  };

  React.useEffect(() => {
    if (editingAgent) {
      setEditFormData({
        fullName: editingAgent.full_name ?? "",
        phone: editingAgent.phone ?? "",
      });
    }
  }, [editingAgent]);

  const handleEditDialogChange = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setEditingAgent(null);
      setEditError(null);
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;

    setIsEditSubmitting(true);
    setEditError(null);

    try {
      const trimmedName = editFormData.fullName.trim();
      const trimmedPhone = editFormData.phone.trim();

      if (!trimmedName) {
        setEditError("Name is required.");
        setIsEditSubmitting(false);
        return;
      }

      const { error: updateError } = await updateAgent(editingAgent.id, {
        full_name: trimmedName,
        phone: trimmedPhone || undefined,
      });

      if (updateError) {
        setEditError(updateError.message);
        setIsEditSubmitting(false);
        return;
      }

      await mutate(SwrKeys.agents());
      handleEditDialogChange(false);
    } catch (err) {
      setEditError(
        `Error updating agent: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleEditClick = (
    agent: Agent,
    event?: React.MouseEvent<HTMLButtonElement>
  ) => {
    event?.preventDefault();
    event?.stopPropagation();
    setEditingAgent(agent);
    setIsEditDialogOpen(true);
  };

  // Generate a random password
  const generateRandomPassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Handler for re-generating password
  const handleRegeneratePassword = () => {
    const newPassword = generateRandomPassword();
    setFormData((prev) => ({ ...prev, password: newPassword }));
  };

  // Validate form before submission
  const validateForm = (): { isValid: boolean; error?: string } => {
    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return { isValid: false, error: "Please enter a valid email address" };
    }

    // Check password length
    if (formData.password.length < 6) {
      return {
        isValid: false,
        error: "Password must be at least 6 characters long",
      };
    }

    return { isValid: true };
  };

  // Handler for form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate the form first
    const validation = validateForm();
    if (!validation.isValid) {
      setFormError(validation.error || "Invalid form submission");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      // Create agent
      const { data, error } = await createAgent({
        profileData: {
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone || undefined,
        },
        password: formData.password,
      });

      if (error) {
        setFormError(`Failed to create agent: ${error.message}`);
        setIsSubmitting(false);
        return;
      }

      if (data) {
        // Assign selected retailers to the new agent
        for (const retailerId of formData.assignedRetailers) {
          await assignRetailerToAgent(retailerId, data.id);
        }

        // Revalidate agents and unassigned retailers lists
        await Promise.all([
          mutate(SwrKeys.agents()),
          mutate(SwrKeys.unassignedRetailers()),
        ]);

        setShowAddDialog(false);

        // Reset form data
        setFormData({
          fullName: "",
          email: "",
          phone: "",
          password: "",
          autoGeneratePassword: false,
          assignedRetailers: [],
        });
      }
    } catch (err) {
      setFormError(
        `Error creating agent: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initial load only (no cache yet)
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading agents...</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center text-red-500">
        <AlertCircle className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-bold">Error Loading Agents</h2>
        <p>{error}</p>
      </div>
    );
  }

  const agents = (agentsData as Agent[]) ?? [];

  const filteredAgents = (() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return agents;
    return agents.filter((a) => {
      const values = [
        a.full_name,
        a.email,
        a.phone,
        a.status,
        String(a.retailer_count),
        a.total_commission_earned != null ? a.total_commission_earned.toFixed(2) : "",
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());
      return values.some((v) => v.includes(term));
    });
  })();

  const unassigned = (unassignedRetailers as any[]) ?? [];

  // Format data for the table
  const tableColumns = [
    "Name",
    "Phone",
    "Retailers",
    "Current Commission",
    "Status",
    "Actions",
  ];

  const tableData = filteredAgents.map((agent) => {
    const baseRow = {
      Name: (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium">{agent.full_name}</div>
            <div className="text-xs text-muted-foreground">{agent.email}</div>
          </div>
        </div>
      ),
      Phone: agent.phone || "Not provided",
      Retailers: agent.retailer_count,
      "Current Commission": `R ${agent.total_commission_earned.toFixed(2)}`,
      Status: (
        <div
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            agent.status === "active"
              ? "bg-green-500/10 text-green-500"
              : "bg-amber-500/10 text-amber-500"
          )}
        >
          {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
        </div>
      ),
    };

    const linkedRow = Object.entries(baseRow).reduce(
      (acc, [key, value]) => {
        acc[key] = (
          <Link
            href={`/admin/agents/${agent.id}`}
            className="cursor-pointer"
            style={{ display: "block" }}
          >
            {value}
          </Link>
        );
        return acc;
      },
      {} as Record<string, React.ReactNode>
    );

    linkedRow.Actions = (
      <button
        type="button"
        onClick={(event) => handleEditClick(agent, event)}
        className="rounded-md border border-input px-3 py-1 text-xs font-medium hover:bg-muted"
      >
        Edit
      </button>
    );

    return linkedRow;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Sales Agents
          </h1>
          <p className="text-muted-foreground">
            Manage sales agents and assign retailers to them.
          </p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Agent
        </button>
      </div>

      {/* Summary Cards */}
      {/* <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="text-muted-foreground">Total Agents</div>
          <div className="mt-1 text-2xl font-semibold">{agents.length}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="text-muted-foreground">Active Agents</div>
          <div className="mt-1 text-2xl font-semibold text-green-600">
            {agents.filter((a) => a.status === "active").length}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="text-muted-foreground">Total Retailers Managed</div>
          <div className="mt-1 text-2xl font-semibold">
            {agents.reduce((sum, a) => sum + a.retailer_count, 0)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="text-muted-foreground">Unassigned Retailers</div>
          <div className="mt-1 text-2xl font-semibold text-amber-600">
            {unassigned.length}
          </div>
        </div>
      </div> */}

      <div className="flex items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="Search agents"
            placeholder="Search agents..."
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-8 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="ml-4 hidden text-sm text-muted-foreground sm:block">
          {filteredAgents.length} of {agents.length}
        </div>
      </div>

      <TablePlaceholder
        columns={tableColumns}
        data={tableData}
        rowsClickable={true}
        emptyMessage="No agents found."
      />

      {/* Add Agent Dialog */}
      <Dialog.Root open={showAddDialog} onOpenChange={setShowAddDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg max-h-[90vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold">
                Add New Sales Agent
              </Dialog.Title>
              <Dialog.Close className="rounded-full p-2 hover:bg-muted">
                <X className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Close</span>
              </Dialog.Close>
            </div>
            <div className="mt-4 space-y-6">
              {formError && (
                <div className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {formError}
                  </div>
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <div className="space-y-2 mb-4">
                  <label className="text-sm font-medium">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div className="space-y-2 mb-4">
                  <label className="text-sm font-medium">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Contact email"
                    required
                  />
                </div>
                <div className="space-y-2 mb-4">
                  <label className="text-sm font-medium">Phone (Optional)</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Password</label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="autoGeneratePassword"
                        name="autoGeneratePassword"
                        checked={formData.autoGeneratePassword}
                        onChange={handleInputChange}
                        className="mr-2 h-4 w-4 rounded border-gray-300"
                      />
                      <label
                        htmlFor="autoGeneratePassword"
                        className="text-sm text-muted-foreground"
                      >
                        Auto-generate password
                      </label>
                    </div>
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      disabled={formData.autoGeneratePassword}
                      className="w-full rounded-md rounded-r-none border border-input bg-background px-3 py-2 text-sm"
                      placeholder={
                        formData.autoGeneratePassword
                          ? "Auto-generated password"
                          : "Set password"
                      }
                      required
                    />
                    {formData.autoGeneratePassword && (
                      <button
                        type="button"
                        onClick={handleRegeneratePassword}
                        className="flex items-center justify-center rounded-md rounded-l-none border border-l-0 border-input bg-muted px-3 py-2 text-sm font-medium hover:bg-muted/90"
                      >
                        Regenerate
                      </button>
                    )}
                  </div>
                  {formData.autoGeneratePassword && (
                    <p className="text-xs text-muted-foreground">
                      This password will be used for the agent's login account.
                    </p>
                  )}
                </div>
                
                {/* Retailer Assignment Section */}
                {unassigned.length > 0 && (
                  <div className="space-y-2 mb-6">
                    <label className="text-sm font-medium">
                      Assign Retailers (Optional)
                    </label>
                    <div className="border border-input rounded-md max-h-40 overflow-y-auto p-2">
                      {unassigned.map((retailer: any) => (
                        <div
                          key={retailer.id}
                          className="flex items-center space-x-2 py-1"
                        >
                          <input
                            type="checkbox"
                            id={`retailer-${retailer.id}`}
                            checked={formData.assignedRetailers.includes(
                              retailer.id
                            )}
                            onChange={() => handleRetailerToggle(retailer.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <label
                            htmlFor={`retailer-${retailer.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            <div className="font-medium">{retailer.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {retailer.location}
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select retailers to assign to this agent. You can also assign retailers later.
                    </p>
                  </div>
                )}

                <div className="pt-2 flex justify-end space-x-2">
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
                    disabled={isSubmitting}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Add Agent"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Edit Agent Dialog */}
      <Dialog.Root open={isEditDialogOpen} onOpenChange={handleEditDialogChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md max-h-[90vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold">
                Edit Agent
              </Dialog.Title>
              <Dialog.Close className="rounded-full p-2 hover:bg-muted">
                <X className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Close</span>
              </Dialog.Close>
            </div>
            {editError && (
              <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                <div className="flex items-center">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  {editError}
                </div>
              </div>
            )}
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={editFormData.fullName}
                  onChange={handleEditInputChange}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={editingAgent?.email ?? ""}
                  disabled
                  className="w-full cursor-not-allowed rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone (Optional)</label>
                <input
                  type="tel"
                  name="phone"
                  value={editFormData.phone}
                  onChange={handleEditInputChange}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Phone number"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
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
                  disabled={isEditSubmitting}
                  className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isEditSubmitting ? (
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
    </div>
  );
}
