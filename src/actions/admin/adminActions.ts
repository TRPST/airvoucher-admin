import { createClient } from '@/utils/supabase/client';
import { AdminUser, CreateAdminParams, ResponseType, PermissionKey } from '../types/adminTypes';
import { setAdminPermissions, fetchAdminPermissions } from './permissionActions';

/**
 * Fetch all admin users with their permissions
 */
export async function fetchAdmins(): Promise<ResponseType<AdminUser[]>> {
  const supabase = createClient();

  try {
    // Fetch all admin profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, is_super_admin, created_at, updated_at, status')
      .eq('role', 'admin')
      .order('created_at', { ascending: false });

    if (profilesError) {
      return { data: null, error: profilesError };
    }

    // Fetch permissions for all admins in one query
    const adminIds = profiles.map(p => p.id);
    const { data: permissionsData, error: permissionsError } = await supabase
      .from('admin_permissions')
      .select('admin_profile_id, permission_key')
      .in('admin_profile_id', adminIds);

    if (permissionsError) {
      console.error('Error fetching permissions:', permissionsError);
      // Continue without permissions data
    }

    // Group permissions by admin ID
    const permissionsByAdmin: Record<string, PermissionKey[]> = {};
    if (permissionsData) {
      permissionsData.forEach(p => {
        if (!permissionsByAdmin[p.admin_profile_id]) {
          permissionsByAdmin[p.admin_profile_id] = [];
        }
        permissionsByAdmin[p.admin_profile_id].push(p.permission_key as PermissionKey);
      });
    }

    // Combine profiles with their permissions
    const admins: AdminUser[] = profiles.map(profile => ({
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      phone: profile.phone || undefined,
      is_super_admin: profile.is_super_admin || false,
      permissions: permissionsByAdmin[profile.id] || [],
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      status: (profile.status as 'active' | 'inactive') || 'active',
    }));

    return { data: admins, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Fetch a single admin user by ID with permissions
 */
export async function fetchAdminById(id: string): Promise<ResponseType<AdminUser>> {
  const supabase = createClient();

  try {
    // Fetch admin profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, is_super_admin, created_at, updated_at, status')
      .eq('id', id)
      .eq('role', 'admin')
      .single();

    if (profileError) {
      return { data: null, error: profileError };
    }

    if (!profile) {
      return { data: null, error: new Error('Admin not found') };
    }

    // Fetch permissions
    const { data: permissionsData, error: permissionsError } = await fetchAdminPermissions(id);

    const admin: AdminUser = {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      phone: profile.phone || undefined,
      is_super_admin: profile.is_super_admin || false,
      permissions: permissionsData || [],
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      status: (profile.status as 'active' | 'inactive') || 'active',
    };

    return { data: admin, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Create a new admin user
 */
export async function createAdmin({
  profileData,
  password,
  is_super_admin = false,
  permissions = [],
}: CreateAdminParams): Promise<ResponseType<{ id: string }>> {
  const supabase = createClient();

  try {
    // Use the API route to create a user (this calls the server-side admin client)
    const response = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: profileData.email,
        password: password,
        userData: {
          role: 'admin',
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { data: null, error: new Error(errorData.error || 'Failed to create user') };
    }

    const { user } = await response.json();

    if (!user) {
      return {
        data: null,
        error: new Error('Failed to create user in authentication system'),
      };
    }

    // Create the profile linked to the new user ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: profileData.full_name,
        email: profileData.email,
        phone: profileData.phone,
        role: 'admin',
        is_super_admin: is_super_admin,
        status: 'active',
      })
      .select('id')
      .single();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      return { data: null, error: profileError };
    }

    // Set permissions if not a super admin and permissions are provided
    if (!is_super_admin && permissions.length > 0) {
      const { error: permissionsError } = await setAdminPermissions(profile.id, permissions);

      if (permissionsError) {
        console.error('Error setting permissions:', permissionsError);
        // Don't fail the whole operation if permissions fail
        // Admin can set them later
      }
    }

    return { data: { id: profile.id }, error: null };
  } catch (error) {
    console.error('Unexpected error in createAdmin:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Update an admin user's profile information
 */
export async function updateAdmin(
  id: string,
  updates: {
    full_name?: string;
    email?: string;
    phone?: string;
    is_super_admin?: boolean;
    status?: 'active' | 'inactive';
  }
): Promise<ResponseType<{ id: string }>> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .eq('role', 'admin')
      .select('id')
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
 * Update admin permissions
 */
export async function updateAdminPermissions(
  adminId: string,
  permissions: PermissionKey[]
): Promise<ResponseType<{ success: boolean }>> {
  return await setAdminPermissions(adminId, permissions);
}

/**
 * Deactivate an admin user (super admin only)
 */
export async function deactivateAdmin(id: string): Promise<ResponseType<{ id: string }>> {
  return await updateAdmin(id, { status: 'inactive' });
}

/**
 * Activate an admin user (super admin only)
 */
export async function activateAdmin(id: string): Promise<ResponseType<{ id: string }>> {
  return await updateAdmin(id, { status: 'active' });
}
