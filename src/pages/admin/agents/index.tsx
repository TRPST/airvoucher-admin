import * as React from "react";
import {
  Plus,
  Users,
  MoreHorizontal,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";

import { TablePlaceholder } from "@/components/ui/table-placeholder";
import { cn } from "@/utils/cn";
import {
  fetchAllAgents,
  createAgent,
  fetchUnassignedRetailers,
  assignRetailerToAgent,
  type Agent,
} from "@/actions";
import useRequireRole from "@/hooks/useRequireRole";

export default function AdminAgents() {
  // Protect this route - only allow admin role
  const { isLoading: isRoleLoading } = useRequireRole("admin");

  // States for data
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [unassignedRetailers, setUnassignedRetailers] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Form state for adding a new agent
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
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

  // Load agents and unassigned retailers data
  React.useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch agents
        const { data: agentsData, error: agentsError } = await fetchAllAgents();

        if (agentsError) {
          setError(`Failed to load agents: ${agentsError.message}`);
          return;
        }

        setAgents(agentsData || []);

        // Fetch unassigned retailers
        const { data: retailersData, error: retailersError } =
          await fetchUnassignedRetailers();

        if (retailersError) {
          console.warn("Failed to load unassigned retailers:", retailersError);
          // Don't fail the whole page for this
        } else {
          setUnassignedRetailers(retailersData || []);
        }
      } catch (err) {
        setError(
          `Unexpected error: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (!isRoleLoading) {
      loadData();
    }
  }, [isRoleLoading]);

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
    setError(null);

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

        // Refresh the data
        const { data: refreshedAgents } = await fetchAllAgents();
        const { data: refreshedRetailers } = await fetchUnassignedRetailers();
        
        if (refreshedAgents) setAgents(refreshedAgents);
        if (refreshedRetailers) setUnassignedRetailers(refreshedRetailers);
        
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
      setError(
        `Error creating agent: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking authentication
  if (isRoleLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="ml-2">Loading authentication...</span>
      </div>
    );
  }

  // Show loading state
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

  // Format data for the table
  const tableData = agents.map((agent) => {
    const row = {
      Name: (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium">{agent.full_name}</div>
            <div className="text-xs text-muted-foreground">
              {agent.email}
            </div>
          </div>
        </div>
      ),
      Phone: agent.phone || "Not provided",
      "Retailers": agent.retailer_count,
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

    // Wrap each row in a Link component
    return Object.entries(row).reduce((acc, [key, value]) => {
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
    }, {} as Record<string, React.ReactNode>);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
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
            {unassignedRetailers.length}
          </div>
        </div>
      </div>

      <TablePlaceholder
        columns={["Name", "Phone", "Retailers", "Current Commission", "Status"]}
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
                {unassignedRetailers.length > 0 && (
                  <div className="space-y-2 mb-6">
                    <label className="text-sm font-medium">
                      Assign Retailers (Optional)
                    </label>
                    <div className="border border-input rounded-md max-h-40 overflow-y-auto p-2">
                      {unassignedRetailers.map((retailer) => (
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
    </div>
  );
} 