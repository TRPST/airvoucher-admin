-- Add is_active column to commission_groups table for soft delete functionality
-- This allows admins to "archive" commission groups instead of permanently deleting them

-- Add the is_active column with default value of true
ALTER TABLE commission_groups 
ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;

-- Update existing records to be active (in case any have NULL values)
UPDATE commission_groups SET is_active = true WHERE is_active IS NULL;

-- Add an index for better query performance when filtering by is_active
CREATE INDEX IF NOT EXISTS idx_commission_groups_is_active ON commission_groups(is_active);

-- Add a comment to document the purpose of this column
COMMENT ON COLUMN commission_groups.is_active IS 'Indicates if the commission group is active. When false, the group is archived/soft-deleted and should not appear in normal listings.';
