-- Migration: Add voucher categorization fields and create specific voucher types
-- This adds support for differentiating between airtime, data bundles, and data duration types

-- Add new columns to voucher_types table
ALTER TABLE voucher_types 
ADD COLUMN category text,
ADD COLUMN sub_category text,
ADD COLUMN network_provider text;

-- Add comments for clarity
COMMENT ON COLUMN voucher_types.category IS 'Type of voucher: airtime, data, other';
COMMENT ON COLUMN voucher_types.sub_category IS 'Sub-category for data vouchers: daily, weekly, monthly';
COMMENT ON COLUMN voucher_types.network_provider IS 'Mobile network provider: cellc, mtn, vodacom, telkom';

-- Create specific voucher types for each network provider and category combination

-- CellC voucher types
INSERT INTO voucher_types (id, name, category, sub_category, network_provider, supplier_commission_pct, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'CellC Airtime', 'airtime', NULL, 'cellc', 3.00, NOW(), NOW()),
  (gen_random_uuid(), 'CellC Daily Data', 'data', 'daily', 'cellc', 3.00, NOW(), NOW()),
  (gen_random_uuid(), 'CellC Weekly Data', 'data', 'weekly', 'cellc', 3.00, NOW(), NOW()),
  (gen_random_uuid(), 'CellC Monthly Data', 'data', 'monthly', 'cellc', 3.00, NOW(), NOW());

-- MTN voucher types
INSERT INTO voucher_types (id, name, category, sub_category, network_provider, supplier_commission_pct, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'MTN Airtime', 'airtime', NULL, 'mtn', 2.00, NOW(), NOW()),
  (gen_random_uuid(), 'MTN Daily Data', 'data', 'daily', 'mtn', 2.00, NOW(), NOW()),
  (gen_random_uuid(), 'MTN Weekly Data', 'data', 'weekly', 'mtn', 2.00, NOW(), NOW()),
  (gen_random_uuid(), 'MTN Monthly Data', 'data', 'monthly', 'mtn', 2.00, NOW(), NOW());

-- Vodacom voucher types
INSERT INTO voucher_types (id, name, category, sub_category, network_provider, supplier_commission_pct, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'Vodacom Airtime', 'airtime', NULL, 'vodacom', 5.00, NOW(), NOW()),
  (gen_random_uuid(), 'Vodacom Daily Data', 'data', 'daily', 'vodacom', 5.00, NOW(), NOW()),
  (gen_random_uuid(), 'Vodacom Weekly Data', 'data', 'weekly', 'vodacom', 5.00, NOW(), NOW()),
  (gen_random_uuid(), 'Vodacom Monthly Data', 'data', 'monthly', 'vodacom', 5.00, NOW(), NOW());

-- Telkom voucher types
INSERT INTO voucher_types (id, name, category, sub_category, network_provider, supplier_commission_pct, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'Telkom Airtime', 'airtime', NULL, 'telkom', 5.00, NOW(), NOW()),
  (gen_random_uuid(), 'Telkom Daily Data', 'data', 'daily', 'telkom', 5.00, NOW(), NOW()),
  (gen_random_uuid(), 'Telkom Weekly Data', 'data', 'weekly', 'telkom', 5.00, NOW(), NOW()),
  (gen_random_uuid(), 'Telkom Monthly Data', 'data', 'monthly', 'telkom', 5.00, NOW(), NOW());

-- Update existing non-mobile voucher types with appropriate categories
UPDATE voucher_types 
SET category = 'other' 
WHERE LOWER(name) LIKE '%ringa%' 
   OR LOWER(name) LIKE '%hollywood%' 
   OR LOWER(name) LIKE '%easyload%'
   OR LOWER(name) LIKE '%betting%'
   OR LOWER(name) LIKE '%entertainment%'
   OR LOWER(name) LIKE '%ott%'
   OR LOWER(name) LIKE '%dstv%'
   OR LOWER(name) LIKE '%mukuru%'
   OR LOWER(name) LIKE '%ecocash%'
   OR LOWER(name) LIKE '%eskom%'
   OR LOWER(name) LIKE '%unipin%'
   OR LOWER(name) LIKE '%globalairtime%'
   OR LOWER(name) LIKE '%hellopaisa%'
   OR LOWER(name) LIKE '%mangaungmunicipality%';

-- Update existing mobile network voucher types (the original single entries)
-- Mark them as 'general' category to distinguish from the specific ones
UPDATE voucher_types 
SET category = 'general', 
    network_provider = 'cellc' 
WHERE LOWER(name) = 'cellc';

UPDATE voucher_types 
SET category = 'general', 
    network_provider = 'mtn' 
WHERE LOWER(name) = 'mtn';

UPDATE voucher_types 
SET category = 'general', 
    network_provider = 'vodacom' 
WHERE LOWER(name) = 'vodacom';

UPDATE voucher_types 
SET category = 'general', 
    network_provider = 'telkom' 
WHERE LOWER(name) = 'telkom';

-- Create indexes for better query performance
CREATE INDEX idx_voucher_types_category ON voucher_types(category);
CREATE INDEX idx_voucher_types_network_provider ON voucher_types(network_provider);
CREATE INDEX idx_voucher_types_sub_category ON voucher_types(sub_category);

-- Create a composite index for common queries
CREATE INDEX idx_voucher_types_full_category ON voucher_types(network_provider, category, sub_category);
