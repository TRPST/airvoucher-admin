-- =====================================================
-- Admin Permissions System Migration
-- =====================================================
-- This migration adds a permission-based system for admins
-- Allows super admins to create sub-admins with specific permissions

-- Step 1: Add is_super_admin column to profiles table
-- =====================================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN profiles.is_super_admin IS 'Flag to identify super admins who have all permissions and can manage other admins';

-- Step 2: Create admin_permissions table
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_admin_permission UNIQUE(admin_profile_id, permission_key)
);

-- Add comments
COMMENT ON TABLE admin_permissions IS 'Stores individual permissions for admin users';
COMMENT ON COLUMN admin_permissions.admin_profile_id IS 'Reference to the admin user profile';
COMMENT ON COLUMN admin_permissions.permission_key IS 'Key identifying the specific permission (e.g., manage_retailers, view_reports)';

-- Step 3: Create indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_admin_permissions_profile 
  ON admin_permissions(admin_profile_id);

CREATE INDEX IF NOT EXISTS idx_admin_permissions_key 
  ON admin_permissions(permission_key);

-- Step 4: Enable Row Level Security
-- =====================================================
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS Policies
-- =====================================================

-- Policy 1: Allow admins to view all admin permissions
DROP POLICY IF EXISTS "Admins can view all admin permissions" ON admin_permissions;
CREATE POLICY "Admins can view all admin permissions"
  ON admin_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy 2: Only super admins can insert permissions
DROP POLICY IF EXISTS "Super admins can insert permissions" ON admin_permissions;
CREATE POLICY "Super admins can insert permissions"
  ON admin_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.is_super_admin = TRUE
    )
  );

-- Policy 3: Only super admins can update permissions
DROP POLICY IF EXISTS "Super admins can update permissions" ON admin_permissions;
CREATE POLICY "Super admins can update permissions"
  ON admin_permissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.is_super_admin = TRUE
    )
  );

-- Policy 4: Only super admins can delete permissions
DROP POLICY IF EXISTS "Super admins can delete permissions" ON admin_permissions;
CREATE POLICY "Super admins can delete permissions"
  ON admin_permissions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.is_super_admin = TRUE
    )
  );

-- Step 6: Create function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_admin_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for updated_at
-- =====================================================
DROP TRIGGER IF EXISTS update_admin_permissions_timestamp ON admin_permissions;
CREATE TRIGGER update_admin_permissions_timestamp
  BEFORE UPDATE ON admin_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_permissions_updated_at();

-- Step 8: Grant necessary permissions
-- =====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_permissions TO authenticated;
-- =====================================================
-- Migration Complete
-- =====================================================
-- Next steps:
-- 1. Run this migration in your Supabase SQL editor
-- 2. Set existing admin users as super admins if needed:
--    UPDATE profiles SET is_super_admin = TRUE WHERE role = 'admin' AND email = 'your-admin@email.com';
