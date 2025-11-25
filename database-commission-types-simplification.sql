-- Migration: Simplify commission types to single unified type per voucher amount
-- Date: 2025-11-22
-- Description: Removes individual commission type columns and adds single commission_type column
-- Rationale: Business logic simplification - if using fixed commissions, they should be fixed
--            across the board for consistency. Same with percentages.

-- ============================================================================
-- STEP 1: Add single commission_type column to both tables
-- ============================================================================

-- Add to commission_group_rates table
ALTER TABLE commission_group_rates
ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'percentage' 
CHECK (commission_type IN ('fixed', 'percentage'));

-- Add to voucher_commission_overrides table
ALTER TABLE voucher_commission_overrides
ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'percentage'
CHECK (commission_type IN ('fixed', 'percentage'));

-- ============================================================================
-- STEP 2: Migrate existing data (set all to 'percentage' since that's current state)
-- ============================================================================

-- Update commission_group_rates - all existing data uses 'percentage'
UPDATE commission_group_rates
SET commission_type = 'percentage'
WHERE commission_type IS NULL;

-- Update voucher_commission_overrides - all existing data uses 'percentage'
UPDATE voucher_commission_overrides
SET commission_type = 'percentage'
WHERE commission_type IS NULL;

-- ============================================================================
-- STEP 3: Drop the old individual commission type columns
-- ============================================================================

-- Drop from commission_group_rates
ALTER TABLE commission_group_rates
DROP COLUMN IF EXISTS supplier_commission_type,
DROP COLUMN IF EXISTS retailer_commission_type,
DROP COLUMN IF EXISTS agent_commission_type;

-- Drop from voucher_commission_overrides
ALTER TABLE voucher_commission_overrides
DROP COLUMN IF EXISTS supplier_commission_type,
DROP COLUMN IF EXISTS retailer_commission_type,
DROP COLUMN IF EXISTS agent_commission_type;

-- ============================================================================
-- STEP 4: Add helpful comments
-- ============================================================================

COMMENT ON COLUMN commission_group_rates.commission_type IS 'Commission type (fixed or percentage) applies to all three roles (supplier, retailer, agent) uniformly';
COMMENT ON COLUMN voucher_commission_overrides.commission_type IS 'Commission type (fixed or percentage) applies to all three roles (supplier, retailer, agent) uniformly for this specific voucher amount';

-- ============================================================================
-- VERIFICATION QUERIES (run these after migration to verify)
-- ============================================================================

-- Verify commission_group_rates structure
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'commission_group_rates' 
-- AND column_name LIKE '%commission%'
-- ORDER BY ordinal_position;

-- Verify voucher_commission_overrides structure
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'voucher_commission_overrides' 
-- AND column_name LIKE '%commission%'
-- ORDER BY ordinal_position;

-- Check all records have commission_type set
-- SELECT COUNT(*) as total, 
--        SUM(CASE WHEN commission_type IS NULL THEN 1 ELSE 0 END) as null_count,
--        commission_type
-- FROM commission_group_rates
-- GROUP BY commission_type;

-- SELECT COUNT(*) as total,
--        SUM(CASE WHEN commission_type IS NULL THEN 1 ELSE 0 END) as null_count,
--        commission_type
-- FROM voucher_commission_overrides
-- GROUP BY commission_type;
