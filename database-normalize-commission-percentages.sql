-- Migration: Normalize Commission Percentage Values
-- Date: 2025-11-25
-- Description: Converts incorrectly stored whole number percentages (2.0000, 5.0000, etc.) 
--              to proper decimal format (0.0200, 0.0500, etc.)
-- Issue: Percentage values stored as whole numbers (2.0) display as 200% instead of 2%
--        because UI multiplies by 100 for display

-- ============================================================================
-- STEP 1: BACKUP QUERIES (Run these first to save current state)
-- ============================================================================

-- Backup commission_group_rates before changes
CREATE TABLE IF NOT EXISTS commission_group_rates_backup_20251125 AS 
SELECT * FROM commission_group_rates;

-- Backup voucher_commission_overrides before changes  
CREATE TABLE IF NOT EXISTS voucher_commission_overrides_backup_20251125 AS
SELECT * FROM voucher_commission_overrides;

-- ============================================================================
-- STEP 2: VERIFY CURRENT INCONSISTENCIES
-- ============================================================================

-- Check commission_group_rates for values > 1 (these need normalization)
SELECT 
  id,
  voucher_type_id,
  commission_group_id,
  commission_type,
  supplier_pct,
  CASE WHEN supplier_pct > 1 THEN 'NEEDS FIX' ELSE 'OK' END as supplier_status,
  retailer_pct,
  CASE WHEN retailer_pct > 1 THEN 'NEEDS FIX' ELSE 'OK' END as retailer_status,
  agent_pct,
  CASE WHEN agent_pct > 1 THEN 'NEEDS FIX' ELSE 'OK' END as agent_status
FROM commission_group_rates
WHERE commission_type = 'percentage'
  AND (supplier_pct > 1 OR retailer_pct > 1 OR agent_pct > 1)
ORDER BY commission_group_id, voucher_type_id;

-- Check voucher_commission_overrides for values > 1
SELECT 
  voucher_type_id,
  amount,
  commission_group_id,
  commission_type,
  supplier_pct,
  CASE WHEN supplier_pct > 1 THEN 'NEEDS FIX' ELSE 'OK' END as supplier_status,
  retailer_pct,
  CASE WHEN retailer_pct > 1 THEN 'NEEDS FIX' ELSE 'OK' END as retailer_status,
  agent_pct,
  CASE WHEN agent_pct > 1 THEN 'NEEDS FIX' ELSE 'OK' END as agent_status
FROM voucher_commission_overrides
WHERE commission_type = 'percentage'
  AND (supplier_pct > 1 OR retailer_pct > 1 OR agent_pct > 1)
ORDER BY voucher_type_id, amount;

-- ============================================================================
-- STEP 3: NORMALIZE commission_group_rates
-- ============================================================================

-- Update supplier_pct: divide by 100 for percentage values > 1
UPDATE commission_group_rates
SET supplier_pct = supplier_pct / 100
WHERE commission_type = 'percentage'
  AND supplier_pct > 1;

-- Update retailer_pct: divide by 100 for percentage values > 1
UPDATE commission_group_rates
SET retailer_pct = retailer_pct / 100
WHERE commission_type = 'percentage'
  AND retailer_pct > 1;

-- Update agent_pct: divide by 100 for percentage values > 1
UPDATE commission_group_rates
SET agent_pct = agent_pct / 100
WHERE commission_type = 'percentage'
  AND agent_pct > 1;

-- ============================================================================
-- STEP 4: NORMALIZE voucher_commission_overrides
-- ============================================================================

-- Update supplier_pct: divide by 100 for percentage values > 1
UPDATE voucher_commission_overrides
SET supplier_pct = supplier_pct / 100
WHERE commission_type = 'percentage'
  AND supplier_pct > 1;

-- Update retailer_pct: divide by 100 for percentage values > 1
UPDATE voucher_commission_overrides
SET retailer_pct = retailer_pct / 100
WHERE commission_type = 'percentage'
  AND retailer_pct > 1;

-- Update agent_pct: divide by 100 for percentage values > 1
UPDATE voucher_commission_overrides
SET agent_pct = agent_pct / 100
WHERE commission_type = 'percentage'
  AND agent_pct > 1;

-- ============================================================================
-- STEP 5: VERIFICATION QUERIES (Run these after migration)
-- ============================================================================

-- Verify no percentage values > 1 remain in commission_group_rates
SELECT 
  COUNT(*) as remaining_issues,
  COUNT(*) FILTER (WHERE supplier_pct > 1) as supplier_issues,
  COUNT(*) FILTER (WHERE retailer_pct > 1) as retailer_issues,
  COUNT(*) FILTER (WHERE agent_pct > 1) as agent_issues
FROM commission_group_rates
WHERE commission_type = 'percentage';

-- Verify no percentage values > 1 remain in voucher_commission_overrides
SELECT 
  COUNT(*) as remaining_issues,
  COUNT(*) FILTER (WHERE supplier_pct > 1) as supplier_issues,
  COUNT(*) FILTER (WHERE retailer_pct > 1) as retailer_issues,
  COUNT(*) FILTER (WHERE agent_pct > 1) as agent_issues
FROM voucher_commission_overrides
WHERE commission_type = 'percentage';

-- Show sample of normalized values from commission_group_rates
SELECT 
  id,
  voucher_type_id,
  commission_group_id,
  commission_type,
  supplier_pct,
  retailer_pct,
  agent_pct,
  -- Preview how these will display in UI (multiply by 100)
  (supplier_pct * 100)::numeric(10,2) as supplier_display_pct,
  (retailer_pct * 100)::numeric(10,2) as retailer_display_pct,
  (agent_pct * 100)::numeric(10,2) as agent_display_pct
FROM commission_group_rates
WHERE commission_type = 'percentage'
ORDER BY commission_group_id, voucher_type_id
LIMIT 20;

-- Show sample of normalized values from voucher_commission_overrides
SELECT 
  voucher_type_id,
  amount,
  commission_group_id,
  commission_type,
  supplier_pct,
  retailer_pct,
  agent_pct,
  -- Preview how these will display in UI (multiply by 100)
  (supplier_pct * 100)::numeric(10,2) as supplier_display_pct,
  (retailer_pct * 100)::numeric(10,2) as retailer_display_pct,
  (agent_pct * 100)::numeric(10,2) as agent_display_pct
FROM voucher_commission_overrides
WHERE commission_type = 'percentage'
ORDER BY voucher_type_id, amount
LIMIT 20;

-- ============================================================================
-- STEP 6: COMPARE BEFORE/AFTER (Optional)
-- ============================================================================

-- Compare commission_group_rates before and after
SELECT 
  'BEFORE' as data_source,
  commission_type,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE supplier_pct > 1) as supplier_over_1,
  COUNT(*) FILTER (WHERE retailer_pct > 1) as retailer_over_1,
  COUNT(*) FILTER (WHERE agent_pct > 1) as agent_over_1,
  AVG(supplier_pct) as avg_supplier,
  AVG(retailer_pct) as avg_retailer,
  AVG(agent_pct) as avg_agent
FROM commission_group_rates_backup_20251125
WHERE commission_type = 'percentage'
GROUP BY commission_type

UNION ALL

SELECT 
  'AFTER' as data_source,
  commission_type,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE supplier_pct > 1) as supplier_over_1,
  COUNT(*) FILTER (WHERE retailer_pct > 1) as retailer_over_1,
  COUNT(*) FILTER (WHERE agent_pct > 1) as agent_over_1,
  AVG(supplier_pct) as avg_supplier,
  AVG(retailer_pct) as avg_retailer,
  AVG(agent_pct) as avg_agent
FROM commission_group_rates
WHERE commission_type = 'percentage'
GROUP BY commission_type;

-- ============================================================================
-- ROLLBACK SCRIPT (Use only if migration needs to be undone)
-- ============================================================================

/*
-- ROLLBACK: Restore from backup tables
DROP TABLE IF EXISTS commission_group_rates;
CREATE TABLE commission_group_rates AS SELECT * FROM commission_group_rates_backup_20251125;

DROP TABLE IF EXISTS voucher_commission_overrides;
CREATE TABLE voucher_commission_overrides AS SELECT * FROM voucher_commission_overrides_backup_20251125;

-- Clean up backup tables after successful rollback
DROP TABLE IF EXISTS commission_group_rates_backup_20251125;
DROP TABLE IF EXISTS voucher_commission_overrides_backup_20251125;
*/

-- ============================================================================
-- NOTES
-- ============================================================================

-- This migration:
-- 1. Creates backup tables before making changes
-- 2. Only affects rows where commission_type = 'percentage'
-- 3. Only normalizes values > 1 (leaves 0-1 range values untouched)
-- 4. Converts: 2.0000 → 0.0200 (displays as 2%)
-- 5. Converts: 5.0000 → 0.0500 (displays as 5%)
-- 6. Converts: 10.0000 → 0.1000 (displays as 10%)
-- 7. Leaves fixed commission amounts unchanged
-- 8. Includes verification queries to confirm success
-- 9. Provides rollback capability via backup tables
