-- Migration: Add is_active field to voucher_types table for soft delete functionality
-- This allows hiding old voucher types while preserving historical data

-- Step 1: Add is_active column with default true for existing records
ALTER TABLE voucher_types 
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Step 2: Mark old generic network voucher types as inactive
-- These are the voucher types that don't have specific categories (airtime, data)
-- and represent the old "main" network voucher types that are being replaced
UPDATE voucher_types 
SET is_active = false 
WHERE (
  -- CellC main voucher type (no category specified)
  (name = 'CellC' AND category IS NULL) OR
  
  -- MTN main voucher type (no category specified)
  (name = 'MTN' AND category IS NULL) OR
  
  -- Vodacom main voucher type (no category specified)
  (name = 'Vodacom' AND category IS NULL) OR
  
  -- Telkom main voucher type (no category specified)
  (name = 'Telkom' AND category IS NULL) OR
  
  -- Any other network provider voucher types without categories
  (network_provider IN ('cellc', 'mtn', 'vodacom', 'telkom') AND category IS NULL)
);

-- Step 3: Verify the changes
-- Show all voucher types with their active status
SELECT 
  id,
  name,
  category,
  sub_category,
  network_provider,
  is_active,
  created_at
FROM voucher_types 
ORDER BY network_provider, category, sub_category, name;

-- Step 4: Show count of active vs inactive voucher types
SELECT 
  is_active,
  COUNT(*) as count
FROM voucher_types 
GROUP BY is_active;

-- Step 5: Show any voucher inventory that might be affected
SELECT 
  vt.name as voucher_type_name,
  vt.is_active,
  COUNT(vi.id) as inventory_count,
  COUNT(CASE WHEN vi.status = 'available' THEN 1 END) as available_count,
  COUNT(CASE WHEN vi.status = 'sold' THEN 1 END) as sold_count,
  COUNT(CASE WHEN vi.status = 'disabled' THEN 1 END) as disabled_count
FROM voucher_types vt
LEFT JOIN voucher_inventory vi ON vt.id = vi.voucher_type_id
WHERE vt.is_active = false
GROUP BY vt.id, vt.name, vt.is_active
ORDER BY vt.name;

-- Note: This migration preserves all existing data and relationships.
-- Inactive voucher types will still be accessible for historical reports
-- but will be filtered out from new voucher operations.
