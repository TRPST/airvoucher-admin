import * as React from 'react';
import { Plus, Loader2, AlertCircle, Search, X } from 'lucide-react';
import { AdminUser } from '@/actions/types/adminTypes';
import { fetchAdmins } from '@/actions/admin/adminActions';
import { AdminTable, AddAdminModal } from '@/components/admin/admins';
import { useIsSuperAdmin } from '@/contexts/PermissionContext';
import useRequireRole from '@/hooks/useRequireRole';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export default function AdminAdmins() {
  // Protect this route - only allow admin role
  useRequireRole('admin');

  const isSuperAdmin = useIsSuperAdmin();

  // State
  const [admins, setAdmins] = React.useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  // Load admins
  const loadAdmins = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await fetchAdmins();

      if (fetchError) {
        setError(`Failed to load admins: ${fetchError.message}`);
      } else if (data) {
        setAdmins(data);
      }
    } catch (err) {
      setError(`Error loading admins: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount
  React.useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  // Handler for admin added
  const handleAdminAdded = () => {
    loadAdmins();
  };

  // Filter admins based on search
  const filteredAdmins = React.useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();

    if (!term) return admins;

    return admins.filter(admin => {
      const values = [
        admin.full_name,
        admin.email,
        admin.phone,
        admin.is_super_admin ? 'super admin' : 'admin',
        admin.status,
      ]
        .filter(Boolean)
        .map(v => String(v).toLowerCase());

      return values.some(value => value.includes(term));
    });
  }, [admins, debouncedSearch]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading admins...</span>
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
        <h2 className="mb-2 text-xl font-semibold">Error Loading Admins</h2>
        <p className="max-w-md text-muted-foreground">{error}</p>
        <button
          onClick={loadAdmins}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try Again
        </button>
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
          Only super admins can manage admin users. Please contact a super admin if you need access.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] flex-col gap-6">
      {/* Sticky header section */}
      <div
        className="sticky top-0 z-10 -mx-6 border-b border-border bg-background px-6 pb-4 pt-6 md:-mx-8 md:px-8"
        style={{ marginTop: -40 }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Admins</h1>
            <p className="text-muted-foreground">Manage admin users and their permissions.</p>
          </div>
          <button
            onClick={() => setShowAddDialog(true)}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Admin
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="Search admins"
            placeholder="Search admins..."
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-8 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={search}
            onChange={e => setSearch(e.target.value)}
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
          {filteredAdmins.length} of {admins.length}
        </div>
      </div>

      {/* Admins table */}
      <div className="min-h-[70vh] flex-1">
        <AdminTable admins={filteredAdmins} />
      </div>

      {/* Add Admin Modal */}
      <AddAdminModal
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdminAdded={handleAdminAdded}
      />
    </div>
  );
}
