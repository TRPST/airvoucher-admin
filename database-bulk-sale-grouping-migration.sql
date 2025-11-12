-- Migration: Add bulk_sale_id for grouping bulk sales
-- Created: 2025-11-09
-- Purpose: Track which sales were part of the same bulk transaction

-- Step 1: Add bulk_sale_id column to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS bulk_sale_id UUID;

-- Step 2: Add index for performance on grouped queries
CREATE INDEX IF NOT EXISTS idx_sales_bulk_sale_id ON sales(bulk_sale_id);

-- Step 3: Add comment to document the column
COMMENT ON COLUMN sales.bulk_sale_id IS 'Groups multiple sales that were created in a single bulk transaction. NULL for single sales.';

-- Step 4: Create function to get grouped sales report
CREATE OR REPLACE FUNCTION get_grouped_sales_report(
  start_date TIMESTAMPTZ DEFAULT NULL,
  end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  group_id TEXT,
  sale_ids UUID[],
  first_sale_id UUID,
  created_at TIMESTAMPTZ,
  terminal_id UUID,
  terminal_name TEXT,
  terminal_short_code TEXT,
  retailer_id UUID,
  retailer_name TEXT,
  retailer_short_code TEXT,
  agent_name TEXT,
  commission_group_name TEXT,
  commission_group_id UUID,
  voucher_type TEXT,
  supplier_commission_pct NUMERIC,
  quantity BIGINT,
  unit_amount NUMERIC,
  total_amount NUMERIC,
  total_supplier_commission NUMERIC,
  total_retailer_commission NUMERIC,
  total_agent_commission NUMERIC,
  total_profit NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Use bulk_sale_id as group_id, or individual sale id if not part of bulk
    COALESCE(s.bulk_sale_id::TEXT, s.id::TEXT) as group_id,
    -- Array of all sale IDs in this group
    ARRAY_AGG(s.id ORDER BY s.created_at) as sale_ids,
    -- First sale ID (for reference)
    MIN(s.id) as first_sale_id,
    -- Use earliest timestamp in group
    MIN(s.created_at) as created_at,
    -- Terminal info (same for all in group)
    MAX(t.id) as terminal_id,
    MAX(t.name) as terminal_name,
    MAX(t.short_code) as terminal_short_code,
    -- Retailer info (same for all in group)
    MAX(r.id) as retailer_id,
    MAX(r.name) as retailer_name,
    MAX(r.short_code) as retailer_short_code,
    -- Agent info (same for all in group)
    MAX(p.full_name) as agent_name,
    -- Commission group info (same for all in group)
    MAX(cg.name) as commission_group_name,
    MAX(cg.id) as commission_group_id,
    -- Voucher type (same for all in group)
    MAX(vt.name) as voucher_type,
    MAX(vt.supplier_commission_pct) as supplier_commission_pct,
    -- Quantity of vouchers in this group
    COUNT(*)::BIGINT as quantity,
    -- Unit amount (individual voucher price)
    MAX(s.sale_amount) as unit_amount,
    -- Aggregated totals
    SUM(s.sale_amount) as total_amount,
    SUM(s.supplier_commission) as total_supplier_commission,
    SUM(s.retailer_commission) as total_retailer_commission,
    SUM(s.agent_commission) as total_agent_commission,
    SUM(s.profit) as total_profit
  FROM sales s
  JOIN terminals t ON s.terminal_id = t.id
  JOIN retailers r ON t.retailer_id = r.id
  LEFT JOIN profiles p ON r.agent_profile_id = p.id
  LEFT JOIN commission_groups cg ON r.commission_group_id = cg.id
  JOIN voucher_inventory vi ON s.voucher_inventory_id = vi.id
  JOIN voucher_types vt ON vi.voucher_type_id = vt.id
  WHERE 
    (start_date IS NULL OR s.created_at >= start_date)
    AND (end_date IS NULL OR s.created_at <= end_date)
  GROUP BY 
    COALESCE(s.bulk_sale_id::TEXT, s.id::TEXT)
  ORDER BY MIN(s.created_at) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 5: Add comment to document the function
COMMENT ON FUNCTION get_grouped_sales_report IS 'Returns sales grouped by bulk_sale_id. Single sales appear as groups of 1.';

-- Verification queries (run these to test):
-- SELECT * FROM get_grouped_sales_report(NOW() - INTERVAL '7 days', NOW());
-- SELECT group_id, quantity, total_amount FROM get_grouped_sales_report() WHERE quantity > 1;
