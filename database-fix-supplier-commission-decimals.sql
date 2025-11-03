-- Fix supplier_pct in commission_group_rates to use decimals instead of whole numbers
-- Convert values like 5.0000 to 0.0500 (5% -> 0.05)

-- Step 1: Convert all supplier_pct values from percentage to decimal
UPDATE commission_group_rates 
SET supplier_pct = supplier_pct / 100
WHERE supplier_pct > 1;

-- Step 2: Also update any overrides that might have supplier_pct
UPDATE voucher_commission_overrides
SET supplier_pct = supplier_pct / 100
WHERE supplier_pct IS NOT NULL AND supplier_pct > 1;

-- Verify the changes
-- SELECT 
--   commission_group_id,
--   voucher_type_id,
--   supplier_pct,
--   retailer_pct,
--   agent_pct
-- FROM commission_group_rates
-- ORDER BY commission_group_id, voucher_type_id;
