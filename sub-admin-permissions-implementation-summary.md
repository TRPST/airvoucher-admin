# Sub-Admin Permission System Implementation Summary

## Overview

This document describes the implementation of a granular permission-based system for admin users in the AirVoucher Admin application. The system allows super admins to create sub-admins with specific, toggleable permissions.

## Architecture Decision

Instead of creating a new "subadmin" role, we implemented a **permission-based system** where all users with the "admin" role can have different permission levels. This approach is:

- More scalable and flexible
- Enterprise-ready
- Easy to extend with new permissions
- Allows for both "super admins" (all permissions) and regular admins (specific permissions)

## Database Changes

### New Database Table: `admin_permissions`

```sql
CREATE TABLE admin_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_admin_permission UNIQUE(admin_profile_id, permission_key)
);
```

### Modified Table: `profiles`

Added new column:

```sql
ALTER TABLE profiles
ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;
```

### Row Level Security (RLS) Policies

- Admins can view all admin permissions
- Only super admins can insert, update, or delete permissions
- Automatic timestamp updates via trigger

## Permission Types

### Complete Permission List

The system includes 13 granular permissions organized into 5 categories:

#### User Management

- `manage_retailers` - Create, edit, and delete retailer accounts
- `manage_agents` - Create, edit, and delete agent accounts
- `manage_terminals` - Create, edit, and delete terminal accounts
- `manage_admins` - Create and manage other admin users (super admin only)
- `reset_passwords` - Reset passwords for users

#### Financial Operations

- `manage_deposits` - Add deposits to retailer accounts
- `manage_credit_limits` - Adjust credit limits and balances
- `view_financial_data` - View balance and financial information

#### Inventory & Products

- `manage_vouchers` - Upload and manage voucher inventory
- `manage_commission_groups` - Create and edit commission structures

#### Reports & Settings

- `view_reports` - Access the reports section
- `manage_settings` - Access and modify system settings

#### Dashboard

- `view_dashboard` - Access the admin dashboard

## Backend Implementation

### New Files Created

1. **`src/actions/admin/permissionActions.ts`**

   - `fetchAdminPermissions()` - Get permissions for a specific admin
   - `fetchMyPermissions()` - Get current user's permissions
   - `hasPermission()` - Check if user has specific permission
   - `isSuperAdmin()` - Check if user is super admin
   - `addPermission()` - Add permission to admin
   - `removePermission()` - Remove permission from admin
   - `setAdminPermissions()` - Replace all permissions at once
   - `togglePermission()` - Toggle permission on/off

2. **`src/actions/admin/adminActions.ts`**

   - `fetchAdmins()` - Get all admin users with permissions
   - `fetchAdminById()` - Get single admin with permissions
   - `createAdmin()` - Create new admin user
   - `updateAdmin()` - Update admin profile information
   - `updateAdminPermissions()` - Update admin permissions
   - `deactivateAdmin()` / `activateAdmin()` - Manage admin status

3. **`src/contexts/PermissionContext.tsx`**
   - React Context provider for permissions
   - Automatically loads permissions on mount
   - Listens for auth changes
   - Provides `hasPermission()` and `isSuperAdmin()` helpers
   - Exports convenience hooks: `useHasPermission()`, `useIsSuperAdmin()`

### Updated Files

1. **`src/actions/types/adminTypes.ts`**

   - Added `PermissionKey` type
   - Added `ALL_PERMISSIONS` constant
   - Added `PERMISSION_LABELS` mapping
   - Added `PERMISSION_DESCRIPTIONS` mapping
   - Added `PERMISSION_CATEGORIES` for grouping
   - Added `AdminPermission`, `AdminUser`, `CreateAdminParams` types

2. **`src/components/Layout.tsx`**
   - Added "Admins" menu item to sidebar (visible to all admins)
   - Added Shield icon import

## Frontend Implementation

### New Pages

1. **`src/pages/admin/admins/index.tsx`**

   - Lists all admin users
   - Search and filter functionality
   - Access restricted to super admins only
   - Shows admin type (Super Admin vs Admin)
   - Displays permission count for each admin
   - "Add Admin" button to create new admins

2. **`src/pages/admin/admins/[id].tsx`**
   - Detailed view of admin user
   - Shows admin information card
   - Embedded permissions toggle component
   - Access restricted to super admins only
   - Real-time permission updates

### New Components

1. **`src/components/admin/admins/AdminTable.tsx`**

   - Displays admins in a responsive table
   - Shows admin type badges
   - Permission count display
   - Status indicators
   - Links to detail pages

2. **`src/components/admin/admins/AddAdminModal.tsx`**

   - Form to create new admin users
   - Auto-generate password option
   - Super admin checkbox
   - Permission selector with "Select All" toggle
   - Form validation
   - Real-time permission count

3. **`src/components/admin/admins/PermissionsToggle.tsx`**

   - Displays permissions grouped by category
   - Individual permission toggles with descriptions
   - "Select All" / "Deselect All" functionality
   - Save/Cancel buttons for unsaved changes
   - Special display for super admins
   - Permission count indicator
   - Real-time save functionality

4. **`src/components/admin/admins/index.ts`**
   - Barrel export file for admin components

## User Experience

### Creating a Sub-Admin

1. Super admin navigates to "Admins" in sidebar
2. Clicks "Add Admin" button
3. Fills in admin details (name, email, phone, password)
4. Optionally checks "Super Admin" checkbox
5. If not super admin, selects individual permissions
6. Can use "Select All" / "Deselect All" for convenience
7. Submits form - new admin is created

### Managing Permissions

1. Super admin clicks on an admin from the list
2. Views admin information card
3. Sees all permissions grouped by category
4. Toggles permissions on/off as needed
5. Unsaved changes are highlighted
6. Clicks "Save Changes" to apply
7. Can cancel to revert changes

### Permission Checks

- Super admins have all permissions automatically
- Regular admins only have explicitly granted permissions
- UI elements are shown/hidden based on permissions
- API calls validate permissions server-side
- Access denied messages for restricted areas

## Security Features

1. **Row Level Security (RLS)**

   - Database-level permission enforcement
   - Super admin verification for modifications

2. **Server-Side Validation**

   - All permission changes verified server-side
   - Super admin status checked on every request

3. **Client-Side Guards**

   - Permission Context prevents unauthorized access
   - Route-level protection with `useRequireRole`
   - Component-level checks with `useHasPermission`

4. **Cascade Deletion**
   - Permissions automatically deleted when admin is deleted
   - Maintains database integrity

## Setup Instructions

### 1. Run Database Migration

```sql
-- Execute the migration in your Supabase SQL editor
-- File: database-admin-permissions-migration.sql
```

### 2. Set Initial Super Admin

```sql
-- Update your existing admin account to super admin
UPDATE profiles
SET is_super_admin = TRUE
WHERE role = 'admin'
AND email = 'your-admin@email.com';
```

### 3. Wrap App with PermissionProvider

```tsx
// In your main app file or layout
import { PermissionProvider } from '@/contexts/PermissionContext';

<PermissionProvider>{/* Your app content */}</PermissionProvider>;
```

### 4. Use Permission Hooks

```tsx
// Check permissions in components
import { useHasPermission, useIsSuperAdmin } from '@/contexts/PermissionContext';

function MyComponent() {
  const canManageRetailers = useHasPermission('manage_retailers');
  const isSuperAdmin = useIsSuperAdmin();

  // Conditional rendering based on permissions
  if (!canManageRetailers) return null;

  return <div>...</div>;
}
```

## Future Enhancements

### Potential Additional Permissions

- `view_audit_logs` - Access to system audit logs
- `manage_api_keys` - Create and manage API keys
- `export_data` - Export system data
- `manage_notifications` - Configure system notifications
- `manage_integrations` - Configure third-party integrations
- `view_analytics` - Access advanced analytics

### Possible Features

- Permission templates (e.g., "Accountant", "Support Staff")
- Time-based permissions (expires after X days)
- Permission inheritance/groups
- Audit trail for permission changes
- Bulk permission assignment
- Permission request workflow

## Files Created/Modified

### Created (13 files)

- `database-admin-permissions-migration.sql`
- `src/actions/admin/permissionActions.ts`
- `src/actions/admin/adminActions.ts`
- `src/contexts/PermissionContext.tsx`
- `src/components/admin/admins/AdminTable.tsx`
- `src/components/admin/admins/AddAdminModal.tsx`
- `src/components/admin/admins/PermissionsToggle.tsx`
- `src/components/admin/admins/index.ts`
- `src/pages/admin/admins/index.tsx`
- `src/pages/admin/admins/[id].tsx`
- `sub-admin-permissions-implementation-summary.md`

### Modified (2 files)

- `src/actions/types/adminTypes.ts` - Added permission types and constants
- `src/components/Layout.tsx` - Added "Admins" menu item with Shield icon

## Testing Checklist

- [ ] Run database migration successfully
- [ ] Set at least one user as super admin
- [ ] Verify super admin can access /admin/admins
- [ ] Create a new admin with specific permissions
- [ ] Verify created admin can only access permitted areas
- [ ] Toggle permissions and verify changes persist
- [ ] Verify non-super admins cannot access admin management
- [ ] Test "Select All" / "Deselect All" functionality
- [ ] Verify permission checks work across the application
- [ ] Test with different permission combinations

## Notes

- The "Admins" menu item is visible to all admins but only super admins can actually use it
- Super admins cannot have their permissions restricted
- At least one super admin should always exist in the system
- Permission checks are performed both client-side (UI) and server-side (API)
- The system is designed to be easily extended with new permissions as needed

## Implementation Date

November 18, 2025
