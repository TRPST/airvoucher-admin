'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { PermissionKey } from '@/actions/types/adminTypes';
import { fetchMyPermissions } from '@/actions/admin/permissionActions';
import { createClient } from '@/utils/supabase/client';

interface PermissionContextType {
  permissions: PermissionKey[];
  isSuperAdmin: boolean;
  isLoading: boolean;
  hasPermission: (permission: PermissionKey) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseClient] = useState(() => createClient());

  const loadPermissions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await fetchMyPermissions();

      if (error) {
        console.error('Error loading permissions:', error);
        setPermissions([]);
        setIsSuperAdmin(false);
      } else if (data) {
        setPermissions(data.permissions);
        setIsSuperAdmin(data.is_super_admin);
      }
    } catch (err) {
      console.error('Unexpected error loading permissions:', err);
      setPermissions([]);
      setIsSuperAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Load permissions on mount
  useEffect(() => {
    loadPermissions();
  }, []);

  // Listen for auth changes and reload permissions
  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadPermissions();
      } else if (event === 'SIGNED_OUT') {
        setPermissions([]);
        setIsSuperAdmin(false);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabaseClient]);

  const hasPermission = (permission: PermissionKey): boolean => {
    // Super admins have all permissions
    if (isSuperAdmin) {
      return true;
    }

    return permissions.includes(permission);
  };

  const refreshPermissions = async () => {
    await loadPermissions();
  };

  const value: PermissionContextType = {
    permissions,
    isSuperAdmin,
    isLoading,
    hasPermission,
    refreshPermissions,
  };

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions(): PermissionContextType {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}

// Convenience hooks
export function useHasPermission(permission: PermissionKey): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
}

export function useIsSuperAdmin(): boolean {
  const { isSuperAdmin } = usePermissions();
  return isSuperAdmin;
}
