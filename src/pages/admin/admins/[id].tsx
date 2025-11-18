import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Shield,
  ShieldCheck,
  ShieldOff,
  Mail,
  Phone,
  Calendar,
} from 'lucide-react';
import { AdminUser } from '@/actions/types/adminTypes';
import { fetchAdminById, updateAdmin } from '@/actions/admin/adminActions';
import { PermissionsToggle } from '@/components/admin/admins';
import { useIsSuperAdmin, usePermissions } from '@/contexts/PermissionContext';
import useRequireRole from '@/hooks/useRequireRole';
import { cn } from '@/utils/cn';
import { createClient } from '@/utils/supabase/client';

export default function AdminDetails() {
  const router = useRouter();
  const { id } = router.query;

  // Protect this route - only allow admin role
  useRequireRole('admin');
  const isSuperAdmin = useIsSuperAdmin();
  const { refreshPermissions } = usePermissions();

  // State
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTogglingSuper, setIsTogglingSuper] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Load admin data
  useEffect(() => {
    async function loadAdminData() {
      if (typeof id !== 'string') return;

      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await fetchAdminById(id);

        if (fetchError) {
          throw new Error(`Failed to load admin: ${fetchError.message}`);
        }

        if (!data) {
          throw new Error('Admin not found');
        }

        setAdmin(data);
      } catch (err) {
        console.error('Error in admin details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load admin data');
      } finally {
        setIsLoading(false);
      }
    }

    loadAdminData();
  }, [id]);

  // Handler for permissions updated
  const handlePermissionsUpdated = (permissions: string[]) => {
    if (admin) {
      setAdmin({
        ...admin,
        permissions: permissions as any[],
      });
    }
  };

  // Handler for toggling super admin status
  const handleToggleSuperAdmin = async () => {
    if (!admin) return;

    setIsTogglingSuper(true);
    setShowConfirmDialog(false);

    try {
      const newStatus = !admin.is_super_admin;
      const { error } = await updateAdmin(admin.id, { is_super_admin: newStatus });

      if (error) {
        console.error('Error updating super admin status:', error);
        alert('Failed to update super admin status. Please try again.');
        setIsTogglingSuper(false);
        return;
      }

      // Check if the current user just demoted themselves
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && user.id === admin.id && !newStatus) {
        // Current user just removed their own super admin status
        // Refresh permissions to update the global context
        await refreshPermissions();

        // Redirect back to admins list
        router.push('/admin/admins');
        return;
      }

      // Update local state for other cases
      setAdmin({
        ...admin,
        is_super_admin: newStatus,
      });
    } catch (err) {
      console.error('Unexpected error updating super admin status:', err);
      alert('Failed to update super admin status. Please try again.');
    } finally {
      setIsTogglingSuper(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading admin...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="mb-4 rounded-full bg-red-500/10 p-3 text-red-500">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Error</h2>
        <p className="max-w-md text-center text-muted-foreground">{error}</p>
        <Link
          href="/admin/admins"
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Back to Admins
        </Link>
      </div>
    );
  }

  // Not found state
  if (!admin) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="mb-4 rounded-full bg-yellow-500/10 p-3 text-yellow-500">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Admin Not Found</h2>
        <p className="max-w-md text-center text-muted-foreground">
          The admin you're looking for doesn't exist or has been deleted.
        </p>
        <Link
          href="/admin/admins"
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Back to Admins
        </Link>
      </div>
    );
  }

  // Access denied for non-super admins
  if (!isSuperAdmin) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="mb-4 rounded-full bg-yellow-500/10 p-3 text-yellow-500">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Access Restricted</h2>
        <p className="max-w-md text-center text-muted-foreground">
          Only super admins can view and manage admin users.
        </p>
        <Link
          href="/admin"
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/admins">
        <button className="group inline-flex items-center text-sm font-medium transition-colors hover:text-primary">
          <ChevronLeft className="mr-2 h-5 w-5 transform transition-transform duration-200 group-hover:-translate-x-1" />
          Back to admins
        </button>
      </Link>

      <div style={{ marginTop: 10 }} className="flex items-center justify-between">
        <div className="flex-col items-center">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Admin Details</h1>
          <p className="text-muted-foreground">View and manage admin permissions.</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              {admin.is_super_admin ? (
                <ShieldCheck className="h-8 w-8" />
              ) : (
                <Shield className="h-8 w-8" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-semibold">{admin.full_name}</h3>
                {admin.is_super_admin ? (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Super Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                    <Shield className="mr-1 h-3 w-3" />
                    Admin
                  </span>
                )}
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    admin.status === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400'
                  )}
                >
                  {admin.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="mr-2 h-4 w-4" />
                  {admin.email}
                </div>
                {admin.phone && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="mr-2 h-4 w-4" />
                    {admin.phone}
                  </div>
                )}
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4" />
                  Created: {new Date(admin.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4" />
                  Updated: {new Date(admin.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Super Admin Control Card */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-muted/30 px-6 py-4">
          <h2 className="text-lg font-semibold">Super Admin Status</h2>
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              {admin.is_super_admin ? (
                <ShieldCheck className="h-5 w-5 flex-shrink-0 text-primary" />
              ) : (
                <ShieldOff className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              )}
              <div>
                <h3 className="font-medium">
                  {admin.is_super_admin ? 'Super Admin Privileges Enabled' : 'Regular Admin'}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {admin.is_super_admin
                    ? 'This user has unrestricted access to all features and functions. Super admins cannot have individual permissions restricted.'
                    : 'This user has access based on their assigned permissions. You can promote them to super admin to grant full access.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowConfirmDialog(true)}
              disabled={isTogglingSuper}
              className={cn(
                'ml-4 inline-flex flex-shrink-0 items-center rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors',
                admin.is_super_admin
                  ? 'border border-input bg-background hover:bg-muted disabled:opacity-50'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
              )}
            >
              {isTogglingSuper ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : admin.is_super_admin ? (
                <>
                  <ShieldOff className="mr-2 h-4 w-4" />
                  Remove Super Admin
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Make Super Admin
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Permissions Section */}
      <PermissionsToggle
        adminId={admin.id}
        currentPermissions={admin.permissions}
        isSuperAdmin={admin.is_super_admin}
        readOnly={false}
        onPermissionsUpdated={handlePermissionsUpdated}
      />

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-start space-x-3">
              <div
                className={cn(
                  'rounded-full p-2',
                  admin.is_super_admin ? 'bg-yellow-500/10' : 'bg-primary/10'
                )}
              >
                {admin.is_super_admin ? (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                ) : (
                  <ShieldCheck className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  {admin.is_super_admin ? 'Remove Super Admin Status?' : 'Make Super Admin?'}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {admin.is_super_admin
                    ? `Are you sure you want to remove super admin privileges from ${admin.full_name}? They will be restricted to their assigned permissions.`
                    : `Are you sure you want to grant super admin privileges to ${admin.full_name}? They will have unrestricted access to all features.`}
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={isTogglingSuper}
                className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleSuperAdmin}
                disabled={isTogglingSuper}
                className={cn(
                  'inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-50',
                  admin.is_super_admin
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                {isTogglingSuper ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : admin.is_super_admin ? (
                  'Remove Super Admin'
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
