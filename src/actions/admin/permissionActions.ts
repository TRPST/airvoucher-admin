import { createClient } from '@/utils/supabase/client';
import { PermissionKey, AdminPermission, ResponseType, ALL_PERMISSIONS } from '../types/adminTypes';

/**
 * Fetch permissions for a specific admin user
 */
export async function fetchAdminPermissions(
  adminProfileId: string
): Promise<ResponseType<PermissionKey[]>> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('admin_permissions')
      .select('permission_key')
      .eq('admin_profile_id', adminProfileId);

    if (error) {
      return { data: null, error };
    }

    const permissions = data.map(p => p.permission_key as PermissionKey);
    return { data: permissions, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Fetch the current user's permissions and super admin status
 */
export async function fetchMyPermissions(): Promise<
  ResponseType<{ permissions: PermissionKey[]; is_super_admin: boolean }>
> {
  const supabase = createClient();

  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: userError || new Error('User not found') };
    }

    // Get profile to check super admin status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return { data: null, error: profileError };
    }

    // If super admin, return all permissions
    if (profile.is_super_admin) {
      return {
        data: { permissions: ALL_PERMISSIONS, is_super_admin: true },
        error: null,
      };
    }

    // Otherwise, fetch specific permissions
    const { data: permissionsData, error: permissionsError } = await supabase
      .from('admin_permissions')
      .select('permission_key')
      .eq('admin_profile_id', user.id);

    if (permissionsError) {
      return { data: null, error: permissionsError };
    }

    const permissions = permissionsData.map(p => p.permission_key as PermissionKey);

    return {
      data: { permissions, is_super_admin: false },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Check if current user has a specific permission
 */
export async function hasPermission(permission: PermissionKey): Promise<boolean> {
  const { data, error } = await fetchMyPermissions();

  if (error || !data) {
    return false;
  }

  // Super admins have all permissions
  if (data.is_super_admin) {
    return true;
  }

  return data.permissions.includes(permission);
}

/**
 * Check if current user is a super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  const { data, error } = await fetchMyPermissions();

  if (error || !data) {
    return false;
  }

  return data.is_super_admin;
}

/**
 * Add a permission to an admin user (super admin only)
 */
export async function addPermission(
  adminProfileId: string,
  permission: PermissionKey
): Promise<ResponseType<AdminPermission>> {
  const supabase = createClient();

  try {
    // Check if current user is super admin
    const superAdmin = await isSuperAdmin();
    if (!superAdmin) {
      return { data: null, error: new Error('Only super admins can manage permissions') };
    }

    const { data, error } = await supabase
      .from('admin_permissions')
      .insert({
        admin_profile_id: adminProfileId,
        permission_key: permission,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Remove a permission from an admin user (super admin only)
 */
export async function removePermission(
  adminProfileId: string,
  permission: PermissionKey
): Promise<ResponseType<{ success: boolean }>> {
  const supabase = createClient();

  try {
    // Check if current user is super admin
    const superAdmin = await isSuperAdmin();
    if (!superAdmin) {
      return { data: null, error: new Error('Only super admins can manage permissions') };
    }

    const { error } = await supabase
      .from('admin_permissions')
      .delete()
      .eq('admin_profile_id', adminProfileId)
      .eq('permission_key', permission);

    if (error) {
      return { data: null, error };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Set all permissions for an admin user at once (super admin only)
 * This replaces all existing permissions with the new set
 */
export async function setAdminPermissions(
  adminProfileId: string,
  permissions: PermissionKey[]
): Promise<ResponseType<{ success: boolean }>> {
  const supabase = createClient();

  try {
    // Check if current user is super admin
    const superAdmin = await isSuperAdmin();
    if (!superAdmin) {
      return { data: null, error: new Error('Only super admins can manage permissions') };
    }

    // Delete all existing permissions
    const { error: deleteError } = await supabase
      .from('admin_permissions')
      .delete()
      .eq('admin_profile_id', adminProfileId);

    if (deleteError) {
      return { data: null, error: deleteError };
    }

    // Insert new permissions if any
    if (permissions.length > 0) {
      const permissionRecords = permissions.map(permission => ({
        admin_profile_id: adminProfileId,
        permission_key: permission,
      }));

      const { error: insertError } = await supabase
        .from('admin_permissions')
        .insert(permissionRecords);

      if (insertError) {
        return { data: null, error: insertError };
      }
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Toggle a permission on or off for an admin user
 */
export async function togglePermission(
  adminProfileId: string,
  permission: PermissionKey,
  enabled: boolean
): Promise<ResponseType<{ success: boolean }>> {
  if (enabled) {
    const result = await addPermission(adminProfileId, permission);
    return {
      data: result.error ? null : { success: true },
      error: result.error,
    };
  } else {
    return await removePermission(adminProfileId, permission);
  }
}
