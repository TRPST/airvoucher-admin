-- Complete Voucher Sale Function
-- This function performs all necessary database operations for a voucher sale in a single transaction

CREATE OR REPLACE FUNCTION complete_voucher_sale(
  voucher_inventory_id UUID,
  retailer_id UUID,
  terminal_id UUID,
  in_voucher_type_id UUID,
  sale_amount NUMERIC(12,2),
  retailer_commission_pct NUMERIC(5,2),
  agent_commission_pct NUMERIC(5,2)
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
  -- Commission override variables
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
  
  -- Calculate new balance (can go negative up to credit_limit)
  new_balance := retailer_balance - sale_amount;
  
  -- Check if balance would exceed credit limit (go too negative)
  IF new_balance < -retailer_credit_limit THEN
    RAISE EXCEPTION 'Insufficient balance and credit to complete sale';
  END IF;

  -- Get terminal name
  SELECT name INTO terminal_name
    FROM terminals
    WHERE id = terminal_id;

  -- Get product name, supplier commission percentage, and receipt fields from voucher type
  SELECT 
    vt.name, 
    vt.supplier_commission_pct,
    vt.instructions,
    vt.help,
    vt.website_url
  INTO 
    product_name, 
    voucher_supplier_commission_pct,
    instructions,
    help,
    website_url
  FROM voucher_types vt
  WHERE vt.id = in_voucher_type_id;

  -- Check for commission override for this voucher type and amount
  SELECT supplier_pct, retailer_pct, agent_pct 
    INTO override_supplier_pct, override_retailer_pct, override_agent_pct
    FROM voucher_commission_overrides
    WHERE voucher_commission_overrides.voucher_type_id = in_voucher_type_id
    AND voucher_commission_overrides.amount = sale_amount
    AND voucher_commission_overrides.commission_group_id = retailer_commission_group_id;

  -- Use override values if they exist, otherwise use the original values
  IF FOUND THEN
    -- Override exists, all stored as decimals
    -- Multiply by 100 to convert to whole numbers for consistent calculation
    final_supplier_pct := override_supplier_pct * 100;
    final_retailer_pct := override_retailer_pct * 100;
    final_agent_pct := override_agent_pct * 100;
  ELSE
    -- No override, use original values
    -- Note: supplier_commission_pct is stored as whole number, but retailer/agent rates are decimals
    final_supplier_pct := voucher_supplier_commission_pct;
    final_retailer_pct := retailer_commission_pct * 100; -- Convert decimal to whole number for consistency
    final_agent_pct := agent_commission_pct * 100; -- Convert decimal to whole number for consistency
  END IF;

  -- Calculate commissions correctly:
  -- 1. AirVoucher gets commission from supplier based on sale amount
  airvoucher_commission := sale_amount * (final_supplier_pct / 100);
  
  -- 2. Retailer commission is a percentage of the sale amount
  retailer_commission := sale_amount * (final_retailer_pct / 100);
  
  -- 3. Agent commission is a percentage of what remains after retailer takes their commission
  -- (i.e., agent gets a percentage of the net balance: supplier_commission - retailer_commission)
  agent_commission := (airvoucher_commission - retailer_commission) * (final_agent_pct / 100);
  
  -- 4. Calculate profit (what AirVoucher keeps after paying retailer and agent)
  profit := airvoucher_commission - retailer_commission - agent_commission;
  
  -- Get voucher details
  SELECT pin, serial_number INTO voucher_pin, voucher_serial
    FROM voucher_inventory
    WHERE id = voucher_inventory_id;

  -- Generate reference number in format: yymmdd-XXXXXXXX
  ref_number := TO_CHAR(NOW(), 'YYMMDD') || '-' || 
                LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 100000000)::TEXT, 8, '0');
  
  -- Start transaction operations
  
  -- 1. Mark voucher as sold
  UPDATE voucher_inventory
  SET 
    status = 'sold',
    sold_at = NOW()
  WHERE id = voucher_inventory_id;
  
  -- 2. Create sale record
  INSERT INTO sales (
    terminal_id,
    voucher_inventory_id,
    sale_amount,
    supplier_commission,
    retailer_commission,
    agent_commission,
    profit
  ) VALUES (
    terminal_id,
    voucher_inventory_id,
    sale_amount,
    airvoucher_commission,
    retailer_commission,
    agent_commission,
    profit
  ) RETURNING id, created_at INTO sale_id, sale_timestamp;
  
  -- 3. Update retailer balance and commission
  UPDATE retailers
  SET 
    balance = new_balance,
    commission_balance = commission_balance + retailer_commission
  WHERE id = retailer_id;
  
  -- 4. Create transaction record
  INSERT INTO transactions (
    type,
    amount,
    balance_after,
    retailer_id,
    agent_profile_id,
    sale_id,
    notes
  ) VALUES (
    'sale',
    sale_amount,
    new_balance,
    retailer_id,
    agent_profile_id,
    sale_id,
    'Voucher sale of ' || sale_amount || ' via terminal ' || terminal_id
  );
  
  -- 5. Update terminal last_active
  UPDATE terminals
  SET last_active = NOW()
  WHERE id = terminal_id;
  
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

-- Note: This function needs to be executed in the Supabase SQL editor
-- After creating the function, you can call it from your code using:
-- supabase.rpc('complete_voucher_sale', { params... })
