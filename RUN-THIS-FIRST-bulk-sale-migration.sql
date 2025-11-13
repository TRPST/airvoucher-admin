-- =====================================================
-- BULK SALE GROUPING MIGRATION
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Add bulk_sale_id column to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS bulk_sale_id UUID;

-- Step 2: Add index for performance
CREATE INDEX IF NOT EXISTS idx_sales_bulk_sale_id ON sales(bulk_sale_id);

-- Step 3: Add comment
COMMENT ON COLUMN sales.bulk_sale_id IS 'Groups multiple sales that were created in a single bulk transaction. NULL for single sales.';

-- Step 4: Update the complete_voucher_sale function to accept bulk_sale_id
CREATE OR REPLACE FUNCTION complete_voucher_sale(
  voucher_inventory_id UUID,
  retailer_id UUID,
  terminal_id UUID,
  in_voucher_type_id UUID,
  sale_amount NUMERIC(12,2),
  retailer_commission_pct NUMERIC(5,2),
  agent_commission_pct NUMERIC(5,2),
  bulk_sale_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  sale_id UUID;
  voucher_supplier_commission_pct NUMERIC(5,2);
  airvoucher_commission NUMERIC(12,4);
  retailer_commission NUMERIC(12,4);
  agent_commission NUMERIC(12,4);
  profit NUMERIC(12,4);
  voucher_pin TEXT;
  voucher_serial TEXT;
  retailer_balance NUMERIC(12,2);
  retailer_credit_limit NUMERIC(12,2);
  new_balance NUMERIC(12,2);
  retailer_commission_group_id UUID;
  agent_profile_id UUID;
  terminal_name TEXT;
  retailer_name TEXT;
  product_name TEXT;
  ref_number TEXT;
  sale_timestamp TIMESTAMPTZ;
  instructions TEXT;
  help TEXT;
  website_url TEXT;
  override_supplier_pct NUMERIC(6,4);
  override_retailer_pct NUMERIC(6,4);
  override_agent_pct NUMERIC(6,4);
  final_supplier_pct NUMERIC(6,4);
  final_retailer_pct NUMERIC(6,4);
  final_agent_pct NUMERIC(6,4);
BEGIN
  -- Check if voucher is available
  PERFORM id FROM voucher_inventory 
    WHERE id = voucher_inventory_id 
    AND status = 'available';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voucher is not available for sale';
  END IF;
  
  -- Get retailer details
  SELECT r.balance, r.credit_limit, r.commission_group_id, r.agent_profile_id, r.name 
    INTO retailer_balance, retailer_credit_limit, retailer_commission_group_id, agent_profile_id, retailer_name
    FROM retailers r
    WHERE r.id = retailer_id;
  
  -- Calculate new balance
  new_balance := retailer_balance - sale_amount;
  
  -- Check credit limit
  IF new_balance < -retailer_credit_limit THEN
    RAISE EXCEPTION 'Insufficient balance and credit to complete sale';
  END IF;

  -- Get terminal name
  SELECT name INTO terminal_name FROM terminals WHERE id = terminal_id;

  -- Get product details
  SELECT vt.name, vt.supplier_commission_pct, vt.instructions, vt.help, vt.website_url
  INTO product_name, voucher_supplier_commission_pct, instructions, help, website_url
  FROM voucher_types vt WHERE vt.id = in_voucher_type_id;

  -- Check for commission override
  SELECT supplier_pct, retailer_pct, agent_pct 
    INTO override_supplier_pct, override_retailer_pct, override_agent_pct
    FROM voucher_commission_overrides
    WHERE voucher_commission_overrides.voucher_type_id = in_voucher_type_id
    AND voucher_commission_overrides.amount = sale_amount
    AND voucher_commission_overrides.commission_group_id = retailer_commission_group_id;

  -- Use override or original values
  IF FOUND THEN
    final_supplier_pct := override_supplier_pct * 100;
    final_retailer_pct := override_retailer_pct * 100;
    final_agent_pct := override_agent_pct * 100;
  ELSE
    final_supplier_pct := voucher_supplier_commission_pct;
    final_retailer_pct := retailer_commission_pct * 100;
    final_agent_pct := agent_commission_pct * 100;
  END IF;

  -- Calculate commissions
  airvoucher_commission := sale_amount * (final_supplier_pct / 100);
  retailer_commission := sale_amount * (final_retailer_pct / 100);
  agent_commission := (airvoucher_commission - retailer_commission) * (final_agent_pct / 100);
  profit := airvoucher_commission - retailer_commission - agent_commission;
  
  -- Get voucher details
  SELECT pin, serial_number INTO voucher_pin, voucher_serial
    FROM voucher_inventory WHERE id = voucher_inventory_id;

  -- Generate reference number
  ref_number := TO_CHAR(NOW(), 'YYMMDD') || '-' || 
                LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 100000000)::TEXT, 8, '0');
  
  -- Mark voucher as sold
  UPDATE voucher_inventory
  SET status = 'sold', sold_at = NOW()
  WHERE id = voucher_inventory_id;
  
  -- Create sale record (WITH bulk_sale_id)
  INSERT INTO sales (
    terminal_id,
    voucher_inventory_id,
    sale_amount,
    supplier_commission,
    retailer_commission,
    agent_commission,
    profit,
    bulk_sale_id
  ) VALUES (
    terminal_id,
    voucher_inventory_id,
    sale_amount,
    airvoucher_commission,
    retailer_commission,
    agent_commission,
    profit,
    bulk_sale_id
  ) RETURNING id, created_at INTO sale_id, sale_timestamp;
  
  -- Update retailer balance
  UPDATE retailers
  SET balance = new_balance,
      commission_balance = commission_balance + retailer_commission
  WHERE id = retailer_id;
  
  -- Create transaction record
  INSERT INTO transactions (
    type, amount, balance_after, retailer_id, agent_profile_id, sale_id,
    notes
  ) VALUES (
    'sale', sale_amount, new_balance, retailer_id, agent_profile_id, sale_id,
    'Voucher sale of ' || sale_amount || ' via terminal ' || terminal_id
  );
  
  -- Update terminal last_active
  UPDATE terminals SET last_active = NOW() WHERE id = terminal_id;
  
  -- Return receipt data
  RETURN jsonb_build_object(
    'sale_id', sale_id,
    'voucher_code', voucher_pin,
    'serial_number', voucher_serial,
    'ref_number', ref_number,
    'retailer_name', retailer_name,
    'retailer_id', retailer_id,
    'terminal_name', terminal_name,
    'terminal_id', terminal_id,
    'product_name', product_name,
    'sale_amount', sale_amount,
    'retailer_commission', retailer_commission,
    'agent_commission', agent_commission,
    'timestamp', sale_timestamp,
    'instructions', instructions,
    'help', help,
    'website_url', website_url
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create the grouped sales report function
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
    COALESCE(s.bulk_sale_id::TEXT, s.id::TEXT) as group_id,
    ARRAY_AGG(s.id ORDER BY s.created_at) as sale_ids,
    (ARRAY_AGG(s.id ORDER BY s.created_at))[1] as first_sale_id,
    MIN(s.created_at) as created_at,
    (ARRAY_AGG(t.id))[1] as terminal_id,
    (ARRAY_AGG(t.name))[1] as terminal_name,
    (ARRAY_AGG(t.short_code))[1] as terminal_short_code,
    (ARRAY_AGG(r.id))[1] as retailer_id,
    (ARRAY_AGG(r.name))[1] as retailer_name,
    (ARRAY_AGG(r.short_code))[1] as retailer_short_code,
    (ARRAY_AGG(p.full_name))[1] as agent_name,
    (ARRAY_AGG(cg.name))[1] as commission_group_name,
    (ARRAY_AGG(cg.id))[1] as commission_group_id,
    (ARRAY_AGG(vt.name))[1] as voucher_type,
    (ARRAY_AGG(vt.supplier_commission_pct))[1] as supplier_commission_pct,
    COUNT(*)::BIGINT as quantity,
    (ARRAY_AGG(s.sale_amount))[1] as unit_amount,
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

-- Done! You can now test with:
-- SELECT * FROM get_grouped_sales_report(NOW() - INTERVAL '7 days', NOW());
