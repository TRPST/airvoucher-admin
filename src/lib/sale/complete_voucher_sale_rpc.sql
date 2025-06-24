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
  airvoucher_commission NUMERIC(12,2);
  retailer_commission NUMERIC(12,2);
  agent_commission NUMERIC(12,2);
  profit NUMERIC(12,2);
  voucher_pin TEXT;
  voucher_serial TEXT;
  retailer_balance NUMERIC(12,2);
  retailer_credit_limit NUMERIC(12,2);
  retailer_credit_used NUMERIC(12,2);
  available_credit NUMERIC(12,2);
  total_available NUMERIC(12,2);
  amount_from_balance NUMERIC(12,2);
  amount_from_credit NUMERIC(12,2);
  new_balance NUMERIC(12,2);
  new_credit_used NUMERIC(12,2);
  agent_profile_id UUID;
  terminal_name TEXT;
  retailer_name TEXT;
  product_name TEXT;
  ref_number TEXT;
  sale_timestamp TIMESTAMPTZ;
  -- Commission override variables
  override_supplier_pct NUMERIC(5,2);
  override_retailer_pct NUMERIC(5,2);
  override_agent_pct NUMERIC(5,2);
  final_supplier_pct NUMERIC(5,2);
  final_retailer_pct NUMERIC(5,2);
  final_agent_pct NUMERIC(5,2);
BEGIN
  -- Check if voucher is available
  PERFORM id FROM voucher_inventory 
    WHERE id = voucher_inventory_id 
    AND status = 'available';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voucher is not available for sale';
  END IF;
  
  -- Get retailer details and check sufficient balance + credit
  SELECT r.balance, r.credit_limit, r.credit_used, r.agent_profile_id, r.name 
    INTO retailer_balance, retailer_credit_limit, retailer_credit_used, agent_profile_id, retailer_name
    FROM retailers r
    WHERE r.id = retailer_id;
  
  -- Calculate available credit and total available funds
  available_credit := retailer_credit_limit - retailer_credit_used;
  total_available := retailer_balance + available_credit;
  
  IF total_available < sale_amount THEN
    RAISE EXCEPTION 'Insufficient balance and credit to complete sale';
  END IF;

  -- Calculate how much to take from balance vs credit
  IF retailer_balance >= sale_amount THEN
    -- Sufficient balance, use balance only
    amount_from_balance := sale_amount;
    amount_from_credit := 0;
    new_balance := retailer_balance - sale_amount;
    new_credit_used := retailer_credit_used;
  ELSE
    -- Need to use credit
    amount_from_balance := retailer_balance;
    amount_from_credit := sale_amount - retailer_balance;
    new_balance := 0;
    new_credit_used := retailer_credit_used + amount_from_credit;
  END IF;

  -- Get terminal name
  SELECT name INTO terminal_name
    FROM terminals
    WHERE id = terminal_id;

  -- Get product name and supplier commission percentage from voucher type
  SELECT vt.name, vt.supplier_commission_pct INTO product_name, voucher_supplier_commission_pct
    FROM voucher_types vt
    WHERE vt.id = in_voucher_type_id;

  -- Check for commission override for this voucher type and amount
  SELECT supplier_pct, retailer_pct, agent_pct 
    INTO override_supplier_pct, override_retailer_pct, override_agent_pct
    FROM voucher_commission_overrides
    WHERE voucher_commission_overrides.voucher_type_id = in_voucher_type_id
    AND voucher_commission_overrides.amount = sale_amount;

  -- Use override values if they exist, otherwise use the original values
  IF FOUND THEN
    -- Override exists, use override values (stored as whole numbers 0-100)
    final_supplier_pct := override_supplier_pct;
    final_retailer_pct := override_retailer_pct;
    final_agent_pct := override_agent_pct;
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
  
  -- 2. Retailer and agent commissions are percentages of what AirVoucher receives
  -- Note: All final_*_pct values are now consistently whole numbers, so divide by 100
  retailer_commission := airvoucher_commission * (final_retailer_pct / 100);
  agent_commission := airvoucher_commission * (final_agent_pct / 100);
  
  -- 3. Calculate profit (what AirVoucher keeps)
  profit := airvoucher_commission - retailer_commission - agent_commission;
  
  -- Get voucher details
  SELECT pin, serial_number INTO voucher_pin, voucher_serial
    FROM voucher_inventory
    WHERE id = voucher_inventory_id;

  -- Generate reference number
  ref_number := 'REF-' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || FLOOR(RANDOM() * 1000)::TEXT;
  
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
  
  -- 3. Update retailer balance, credit_used, and commission
  UPDATE retailers
  SET 
    balance = new_balance,
    credit_used = new_credit_used,
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
    CASE 
      WHEN amount_from_credit > 0 THEN 
        'Voucher sale of ' || sale_amount || ' via terminal ' || terminal_id || 
        ' (Balance: ' || amount_from_balance || ', Credit: ' || amount_from_credit || ')'
      ELSE
        'Voucher sale of ' || sale_amount || ' via terminal ' || terminal_id
    END
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
    'terminal_name', terminal_name,
    'terminal_id', terminal_id,
    'product_name', product_name,
    'sale_amount', sale_amount,
    'retailer_commission', retailer_commission,
    'agent_commission', agent_commission,
    'timestamp', sale_timestamp,
    'amount_from_balance', amount_from_balance,
    'amount_from_credit', amount_from_credit
  );
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This function needs to be executed in the Supabase SQL editor
-- After creating the function, you can call it from your code using:
-- supabase.rpc('complete_voucher_sale', { params... })
