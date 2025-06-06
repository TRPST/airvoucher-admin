import * as React from 'react';
import { Plus, Store, MoreHorizontal, Loader2, AlertCircle, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';

import { TablePlaceholder } from '@/components/ui/table-placeholder';
import { cn } from '@/utils/cn';
import {
  fetchRetailers,
  fetchCommissionGroups,
  fetchAllAgents,
  createRetailer,
  type AdminRetailer,
  type CommissionGroup,
  type Agent,
  type ProfileData,
  type RetailerData,
} from '@/actions';
import useRequireRole from '@/hooks/useRequireRole';
import { RetailerTable } from '@/components/admin/retailers/RetailerTable';
import { AddRetailerDialog } from '@/components/admin/retailers/AddRetailerDialog';

export default function AdminRetailers() {
  // Protect this route - only allow admin role
  const { isLoading: isRoleLoading } = useRequireRole('admin');

  // States for data
  const [retailers, setRetailers] = React.useState<AdminRetailer[]>([]);
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [commissionGroups, setCommissionGroups] = React.useState<CommissionGroup[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Form state for adding a new retailer
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
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

  // Load retailers and commission groups data
  React.useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch retailers
        const { data: retailersData, error: retailersError } = await fetchRetailers();

        if (retailersError) {
          setError(`Failed to load retailers: ${retailersError.message}`);
          return;
        }

        setRetailers(retailersData || []);

        // Fetch commission groups
        const { data: groupsData, error: groupsError } = await fetchCommissionGroups();

        if (groupsError) {
          setError(`Failed to load commission groups: ${groupsError.message}`);
          return;
        }

        setCommissionGroups(groupsData || []);

        // Fetch agents
        const { data: agentsData, error: agentsError } = await fetchAllAgents();

        if (agentsError) {
          setError(`Failed to load agents: ${agentsError.message}`);
          return;
        }

        setAgents(agentsData || []);
      } catch (err) {
        setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

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
    setError(null); // Clear any previous page errors

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

      // Add the new retailer to the list and close the dialog
      if (data) {
        // Refresh the retailer list instead of trying to add incomplete data
        const { data: refreshedData } = await fetchRetailers();
        if (refreshedData) {
          setRetailers(refreshedData);
        }
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
      setError(`Error creating retailer: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state
  if (isRoleLoading || isLoading) {
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

      <RetailerTable retailers={retailers} />

      <AddRetailerDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        formData={formData}
        agents={agents}
        commissionGroups={commissionGroups}
        formError={formError}
        isSubmitting={isSubmitting}
        onInputChange={handleInputChange}
        onRegeneratePassword={handleRegeneratePassword}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
