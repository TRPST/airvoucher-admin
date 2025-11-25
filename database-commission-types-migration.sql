-- Migration: Add commission type columns to support fixed and percentage commissions
-- Date: 2025-11-21
-- Description: Adds commission_type columns to commission_group_rates and voucher_commission_overrides tables
-- Note: Existing _pct columns will store either percentage values (0-1) or fixed rand amounts depending on type

-- Add commission type columns to commission_group_rates table
ALTER TABLE commission_group_rates
ADD COLUMN IF NOT EXISTS supplier_commission_type TEXT DEFAULT 'percentage' CHECK (supplier_commission_type IN ('fixed', 'percentage')),
ADD COLUMN IF NOT EXISTS retailer_commission_type TEXT DEFAULT 'percentage' CHECK (retailer_commission_type IN ('fixed', 'percentage')),
ADD COLUMN IF NOT EXISTS agent_commission_type TEXT DEFAULT 'percentage' CHECK (agent_commission_type IN ('fixed', 'percentage'));

-- Add commission type columns to voucher_commission_overrides table
ALTER TABLE voucher_commission_overrides
ADD COLUMN IF NOT EXISTS supplier_commission_type TEXT DEFAULT 'percentage' CHECK (supplier_commission_type IN ('fixed', 'percentage')),
ADD COLUMN IF NOT EXISTS retailer_commission_type TEXT DEFAULT 'percentage' CHECK (retailer_commission_type IN ('fixed', 'percentage')),
ADD COLUMN IF NOT EXISTS agent_commission_type TEXT DEFAULT 'percentage' CHECK (agent_commission_type IN ('fixed', 'percentage'));

-- Add comments to clarify the dual nature of _pct columns
COMMENT ON COLUMN commission_group_rates.supplier_pct IS 'Commission value - decimal (0-1) if supplier_commission_type=percentage, rand amount if fixed';
COMMENT ON COLUMN commission_group_rates.retailer_pct IS 'Commission value - decimal (0-1) if retailer_commission_type=percentage, rand amount if fixed';
COMMENT ON COLUMN commission_group_rates.agent_pct IS 'Commission value - decimal (0-1) if agent_commission_type=percentage, rand amount if fixed';

COMMENT ON COLUMN voucher_commission_overrides.supplier_pct IS 'Commission value - decimal (0-1) if supplier_commission_type=percentage, rand amount if fixed';
COMMENT ON COLUMN voucher_commission_overrides.retailer_pct IS 'Commission value - decimal (0-1) if retailer_commission_type=percentage, rand amount if fixed';
COMMENT ON COLUMN voucher_commission_overrides.agent_pct IS 'Commission value - decimal (0-1) if agent_commission_type=percentage, rand amount if fixed';

-- Set all existing records to 'percentage' type (backward compatibility)
UPDATE commission_group_rates
SET 
  supplier_commission_type = 'percentage',
  retailer_commission_type = 'percentage',
  agent_commission_type = 'percentage'
WHERE supplier_commission_type IS NULL 
   OR retailer_commission_type IS NULL 
   OR agent_commission_type IS NULL;

UPDATE voucher_commission_overrides
SET 
  supplier_commission_type = 'percentage',
  retailer_commission_type = 'percentage',
  agent_commission_type = 'percentage'
WHERE supplier_commission_type IS NULL 
   OR retailer_commission_type IS NULL 
   OR agent_commission_type IS NULL;
