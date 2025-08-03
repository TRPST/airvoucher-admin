-- Migration: Add commission group support to voucher commission overrides
-- This allows different commission structures for each commission group at the voucher amount level

-- Step 1: Add commission_group_id column to voucher_commission_overrides
ALTER TABLE voucher_commission_overrides 
ADD COLUMN commission_group_id UUID REFERENCES commission_groups(id);

-- Step 2: Drop the existing unique constraint
ALTER TABLE voucher_commission_overrides 
DROP CONSTRAINT IF EXISTS voucher_commission_overrides_voucher_type_id_amount_key;

-- Step 3: Add new unique constraint including commission_group_id
ALTER TABLE voucher_commission_overrides 
ADD CONSTRAINT voucher_commission_overrides_unique 
UNIQUE (commission_group_id, voucher_type_id, amount);

-- Step 4: Create index for better query performance
CREATE INDEX idx_voucher_commission_overrides_group 
ON voucher_commission_overrides(commission_group_id);

-- Note: Existing records will have NULL commission_group_id, which means they are global overrides
-- The application logic should handle both cases:
-- 1. If commission_group_id is NULL, it's a global override (backward compatibility)
-- 2. If commission_group_id is set, it's a group-specific override
