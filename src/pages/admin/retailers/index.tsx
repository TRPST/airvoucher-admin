import * as React from 'react';
import { Plus, Loader2, AlertCircle, X, Search } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';

import { TablePlaceholder } from '@/components/ui/table-placeholder';
import { cn } from '@/utils/cn';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  createRetailer,
  type AdminRetailer,
  type CommissionGroup,
  type Agent,
  type ProfileData,
  type RetailerData,
} from '@/actions';
import useRequireRole from '@/hooks/useRequireRole';
import { RetailerTable } from '@/components/admin/retailers/RetailerTable';
import useSWR, { useSWRConfig } from 'swr';
import { SwrKeys } from '@/lib/swr/keys';
import {
  retailersFetcher,
  agentsFetcher,
  commissionGroupsFetcher,
} from '@/lib/swr/fetchers';

export default function AdminRetailers() {
  // Protect this route - only allow admin role
  const { isLoading: isRoleLoading } = useRequireRole('admin');
  const { mutate } = useSWRConfig();

  // SWR data
  const {
    data: retailers,
    error: retailersError,
    isLoading: retailersLoading,
  } = useSWR(SwrKeys.retailers(), retailersFetcher);

  const {
    data: commissionGroups,
    error: groupsError,
    isLoading: groupsLoading,
  } = useSWR(SwrKeys.commissionGroups(), commissionGroupsFetcher);

  const {
    data: agents,
    error: agentsError,
    isLoading: agentsLoading,
  } = useSWR(SwrKeys.agents(), agentsFetcher);

  // Derived loading and error states
  const isLoading =
    (retailersLoading as boolean) ||
    (groupsLoading as boolean) ||
    (agentsLoading as boolean);

  const error =
    (retailersError as any)?.message ||
    (groupsError as any)?.message ||
    (agentsError as any)?.message ||
    null;

  // Form UI state
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Form state for adding a new retailer
  const [formData, setFormData] = React.useState<{
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
  }>({
    businessName: '',
    contactName: '',
    email: '',
    location: '',
    agentId: '',
    commissionGroupId: '',
    initialBalance: '0',
    creditLimit: '0',
    password: '',
    autoGeneratePassword: false,
  });

  // Search state with URL sync
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search, 300);



  // Handler for input changes in the form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));

      // If auto-generate is checked, generate a random password
      if (name === 'autoGeneratePassword' && checked) {
        const generatedPassword = generateRandomPassword();
        setFormData(prev => ({ ...prev, password: generatedPassword }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Generate a random password with letters, numbers, and special characters
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Handler for re-generating password
  const handleRegeneratePassword = () => {
    const newPassword = generateRandomPassword();
    setFormData(prev => ({ ...prev, password: newPassword }));
  };

  // Validate form before submission
  const validateForm = (): { isValid: boolean; error?: string } => {
    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }

    // Check password length - Supabase requires at least 6 characters
    if (formData.password.length < 6) {
      return {
        isValid: false,
        error: 'Password must be at least 6 characters long',
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
      setFormError(validation.error || 'Invalid form submission');
      return;
    }

    setIsSubmitting(true);
    setFormError(null); // Clear any previous form errors

    try {
      // Create profile data
      const profileData: ProfileData = {
        full_name: formData.contactName,
        email: formData.email,
        role: 'retailer',
      };

      // Create retailer data
      const retailerData: RetailerData = {
        name: formData.businessName,
        contact_name: formData.contactName,
        contact_email: formData.email,
        location: formData.location,
        agent_profile_id: formData.agentId || undefined,
        commission_group_id: formData.commissionGroupId || undefined,
        initial_balance: parseFloat(formData.initialBalance) || 0,
        credit_limit: parseFloat(formData.creditLimit) || 0,
        status: 'active',
      };

      // Call the createRetailer action with the new parameter format
      const { data, error } = await createRetailer({
        profileData,
        retailerData,
        password: formData.password,
      });

      if (error) {
        setFormError(`Failed to create retailer: ${error.message}`);
        setIsSubmitting(false);
        return;
      }

      if (data) {
        // Revalidate retailer list
        await mutate(SwrKeys.retailers());

        setShowAddDialog(false);

        // Reset form data
        setFormData({
          businessName: '',
          contactName: '',
          email: '',
          location: '',
          agentId: '',
          commissionGroupId: '',
          initialBalance: '0',
          creditLimit: '0',
          password: '',
          autoGeneratePassword: false,
        });
      }
    } catch (err) {
      setFormError(`Error creating retailer: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initial load only (no cache yet)
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading retailers...</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="mb-4 rounded-full bg-red-500/10 p-3 text-red-500">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Error Loading Data</h2>
        <p className="max-w-md text-muted-foreground">{error}</p>
      </div>
    );
  }

  const retailerList = (retailers as AdminRetailer[]) ?? [];
  const agentList = (agents as Agent[]) ?? [];
  const groupList = (commissionGroups as CommissionGroup[]) ?? [];

  const filteredRetailers = (() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return retailerList;
    return retailerList.filter((r) => {
      const values = [
        r.name,
        (r as any).contact_name,
        r.email,
        (r as any).contact_email,
        (r as any).location,
        r.agent_name,
        r.commission_group_name,
        r.status,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());
      return values.some((v) => v.includes(term));
    });
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Retailers</h1>
          <p className="text-muted-foreground">Manage retailer accounts and settings.</p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Retailer
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="Search retailers"
            placeholder="Search retailers..."
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-8 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="ml-4 hidden text-sm text-muted-foreground sm:block">
          {filteredRetailers.length} of {retailerList.length}
        </div>
      </div>

      <RetailerTable retailers={filteredRetailers} />

      <Dialog.Root open={showAddDialog} onOpenChange={setShowAddDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg max-h-[90vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold">
                Add New Retailer
              </Dialog.Title>
              <Dialog.Close className="rounded-full p-2 hover:bg-muted">
                <X className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Close</span>
              </Dialog.Close>
            </div>
            <div className="mt-2 space-y-6">
              {formError && (
                <div className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {formError}
                  </div>
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Business Name</label>
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Enter business name"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Contact Name</label>
                    <input
                      type="text"
                      name="contactName"
                      value={formData.contactName}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Enter contact name"
                      required
                    />
                  </div>
                  <div className="space-y-1">
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
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Location</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="e.g. Cape Town"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Agent</label>
                    <select
                      name="agentId"
                      value={formData.agentId}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Unassigned</option>
                      {agentList.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Commission Group</label>
                    <select
                      name="commissionGroupId"
                      value={formData.commissionGroupId}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Default</option>
                      {groupList.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Initial Balance</label>
                    <input
                      type="number"
                      name="initialBalance"
                      value={formData.initialBalance}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Credit Limit</label>
                    <input
                      type="number"
                      name="creditLimit"
                      value={formData.creditLimit}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
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
                        <label htmlFor="autoGeneratePassword" className="text-sm text-muted-foreground">
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
                        placeholder={formData.autoGeneratePassword ? 'Auto-generated password' : 'Set password'}
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
                      <p className="text-xs text-muted-foreground">This password will be used for the retailer's login account.</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex justify-end space-x-2">
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
                      'Add Retailer'
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
