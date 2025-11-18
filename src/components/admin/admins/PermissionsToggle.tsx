import React, { useState, useEffect } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import {
  PermissionKey,
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
  PERMISSION_DESCRIPTIONS,
  PERMISSION_CATEGORIES,
} from '@/actions/types/adminTypes';
import { updateAdminPermissions } from '@/actions/admin/adminActions';
import { cn } from '@/utils/cn';

interface PermissionsToggleProps {
  adminId: string;
  currentPermissions: PermissionKey[];
  isSuperAdmin: boolean;
  readOnly?: boolean;
  onPermissionsUpdated?: (permissions: PermissionKey[]) => void;
}

export function PermissionsToggle({
  adminId,
  currentPermissions,
  isSuperAdmin,
  readOnly = false,
  onPermissionsUpdated,
}: PermissionsToggleProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<Set<PermissionKey>>(
    new Set(currentPermissions)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Update when currentPermissions changes or isSuperAdmin changes
  useEffect(() => {
    // If super admin, ensure all permissions are selected
    if (isSuperAdmin) {
      setSelectedPermissions(new Set(ALL_PERMISSIONS));
    } else {
      setSelectedPermissions(new Set(currentPermissions));
    }
    setHasChanges(false);
  }, [currentPermissions, isSuperAdmin]);

  // Check if there are unsaved changes
  useEffect(() => {
    const current = Array.from(selectedPermissions).sort().join(',');
    const original = currentPermissions.sort().join(',');
    setHasChanges(current !== original);
  }, [selectedPermissions, currentPermissions]);

  // Toggle individual permission
  const handleTogglePermission = (permission: PermissionKey) => {
    if (readOnly || isSuperAdmin) return;

    const newPermissions = new Set(selectedPermissions);
    if (newPermissions.has(permission)) {
      newPermissions.delete(permission);
    } else {
      newPermissions.add(permission);
    }
    setSelectedPermissions(newPermissions);
  };

  // Get category state (all, some, or none selected)
  const getCategoryState = (permissions: PermissionKey[]): 'all' | 'some' | 'none' => {
    const selectedCount = permissions.filter(p => selectedPermissions.has(p)).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === permissions.length) return 'all';
    return 'some';
  };

  // Toggle all permissions in a category
  const handleToggleCategory = (categoryPermissions: PermissionKey[]) => {
    if (readOnly || isSuperAdmin) return;

    const categoryState = getCategoryState(categoryPermissions);
    const newPermissions = new Set(selectedPermissions);

    if (categoryState === 'all') {
      // Deselect all in category
      categoryPermissions.forEach(p => newPermissions.delete(p));
    } else {
      // Select all in category
      categoryPermissions.forEach(p => newPermissions.add(p));
    }

    setSelectedPermissions(newPermissions);
  };

  // Toggle all permissions
  const handleToggleAll = () => {
    if (readOnly || isSuperAdmin) return;

    if (selectedPermissions.size === ALL_PERMISSIONS.length) {
      setSelectedPermissions(new Set());
    } else {
      setSelectedPermissions(new Set(ALL_PERMISSIONS));
    }
  };

  // Save permissions
  const handleSave = async () => {
    if (readOnly || isSuperAdmin || !hasChanges) return;

    setIsSaving(true);
    try {
      const { error } = await updateAdminPermissions(adminId, Array.from(selectedPermissions));

      if (error) {
        console.error('Error updating permissions:', error);
        // Revert to original permissions on error
        setSelectedPermissions(new Set(currentPermissions));
        alert('Failed to update permissions. Please try again.');
      } else {
        // Notify parent of the update
        if (onPermissionsUpdated) {
          onPermissionsUpdated(Array.from(selectedPermissions));
        }
        setHasChanges(false);
      }
    } catch (err) {
      console.error('Unexpected error updating permissions:', err);
      alert('Failed to update permissions. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel changes
  const handleCancel = () => {
    setSelectedPermissions(new Set(currentPermissions));
    setHasChanges(false);
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border bg-muted/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Permissions</h3>
            <p className="text-sm text-muted-foreground">
              {isSuperAdmin
                ? 'Super admins have all permissions and cannot be restricted'
                : readOnly
                  ? 'View permissions for this admin'
                  : 'Manage permissions for this admin'}
            </p>
          </div>
          {!readOnly && !isSuperAdmin && (
            <button
              type="button"
              onClick={handleToggleAll}
              className="text-sm font-medium text-primary hover:text-primary/80"
            >
              {selectedPermissions.size === ALL_PERMISSIONS.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {isSuperAdmin && (
          <div className="mb-6 flex items-start space-x-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <Shield className="h-5 w-5 flex-shrink-0 text-primary" />
            <div>
              <h4 className="text-sm font-semibold text-foreground">Super Admin Status</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                This user has unrestricted access to all features and cannot have individual
                permissions modified. To restrict permissions, first remove super admin status.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {Object.entries(PERMISSION_CATEGORIES).map(([category, permissions]) => {
            const categoryState = getCategoryState(permissions);
            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={categoryState === 'all'}
                    ref={input => {
                      if (input) {
                        input.indeterminate = categoryState === 'some';
                      }
                    }}
                    onChange={() => handleToggleCategory(permissions)}
                    disabled={readOnly || isSuperAdmin}
                    className={cn(
                      'h-5 w-5 flex-shrink-0 rounded border-gray-300',
                      readOnly || isSuperAdmin ? 'cursor-not-allowed' : 'cursor-pointer'
                    )}
                  />
                  <h4 className="text-sm font-semibold text-foreground">{category}</h4>
                </div>
                <div className="space-y-2">
                  {permissions.map(permission => (
                    <label
                      key={permission}
                      className={cn(
                        'flex items-start space-x-3 rounded-md border border-border p-3 transition-colors',
                        readOnly || isSuperAdmin
                          ? 'cursor-default'
                          : 'cursor-pointer hover:border-primary/50 hover:bg-muted/30'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.has(permission)}
                        onChange={() => handleTogglePermission(permission)}
                        disabled={readOnly || isSuperAdmin}
                        className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">
                          {PERMISSION_LABELS[permission]}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {PERMISSION_DESCRIPTIONS[permission]}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {!readOnly && !isSuperAdmin && hasChanges && (
          <div className="mt-6 flex items-center justify-between rounded-md border border-primary/50 bg-primary/5 px-4 py-3">
            <p className="text-sm text-foreground">You have unsaved changes to permissions.</p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="rounded-md border border-input px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-md bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            Selected: {selectedPermissions.size} of {ALL_PERMISSIONS.length} permissions
          </p>
        </div>
      </div>
    </div>
  );
}
