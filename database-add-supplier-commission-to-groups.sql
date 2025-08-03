-- Add supplier commission percentage to commission group rates
-- This allows each commission group to have custom supplier commission rates per voucher type

ALTER TABLE commission_group_rates 
ADD COLUMN supplier_pct NUMERIC DEFAULT 0;

-- Update existing records to use the default supplier commission from voucher_types
UPDATE commission_group_rates 
SET supplier_pct = (
  SELECT COALESCE(vt.supplier_commission_pct, 0)
  FROM voucher_types vt 
  WHERE vt.id = commission_group_rates.voucher_type_id
);

-- Add comment for documentation
COMMENT ON COLUMN commission_group_rates.supplier_pct IS 'Supplier commission percentage (stored as whole number, e.g., 5.0 for 5%)';
