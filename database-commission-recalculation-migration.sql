-- Commission Recalculation Migration
-- This script recalculates all historical sales to use the new commission calculation logic
-- where retailer and agent commissions are percentages of the sale amount, not the supplier commission

-- IMPORTANT: Run this in Supabase SQL Editor
-- Before running, review the changes and consider running on a backup first

-- Step 1: Create a temporary function to recalculate a single sale
CREATE OR REPLACE FUNCTION recalculate_sale_commissions(sale_id_param UUID)
RETURNS void AS $$
DECLARE
  v_sale_amount NUMERIC(12,2);
  v_supplier_commission NUMERIC(12,4);
  v_voucher_type_id UUID;
  v_retailer_id UUID;
  v_commission_group_id UUID;
  
  -- Commission rate variables
  v_override_supplier_pct NUMERIC(6,4);
  v_override_retailer_pct NUMERIC(6,4);
  v_override_agent_pct NUMERIC(6,4);
  v_base_retailer_pct NUMERIC(6,4);
  v_base_agent_pct NUMERIC(6,4);
  v_final_retailer_pct NUMERIC(6,4);
  v_final_agent_pct NUMERIC(6,4);
  
  -- New commission values
  v_new_retailer_commission NUMERIC(12,4);
  v_new_agent_commission NUMERIC(12,4);
  v_new_profit NUMERIC(12,4);
  v_old_retailer_commission NUMERIC(12,4);
  v_commission_difference NUMERIC(12,4);
BEGIN
  -- Get the sale details
  SELECT 
    s.sale_amount,
    s.supplier_commission,
    s.retailer_commission,
    vi.voucher_type_id,
    t.retailer_id
  INTO 
    v_sale_amount,
    v_supplier_commission,
    v_old_retailer_commission,
    v_voucher_type_id,
    v_retailer_id
  FROM sales s
  JOIN voucher_inventory vi ON s.voucher_inventory_id = vi.id
  JOIN terminals t ON s.terminal_id = t.id
  WHERE s.id = sale_id_param;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Sale % not found', sale_id_param;
    RETURN;
  END IF;
  
  -- Get retailer's commission group
  SELECT commission_group_id 
  INTO v_commission_group_id
  FROM retailers 
  WHERE id = v_retailer_id;
  
  -- Check for commission override
  SELECT retailer_pct, agent_pct
  INTO v_override_retailer_pct, v_override_agent_pct
  FROM voucher_commission_overrides
  WHERE voucher_type_id = v_voucher_type_id
    AND amount = v_sale_amount
    AND commission_group_id = v_commission_group_id;
  
  IF FOUND THEN
    -- Use override rates (stored as decimals, multiply by 100 for calculation)
    v_final_retailer_pct := v_override_retailer_pct * 100;
    v_final_agent_pct := v_override_agent_pct * 100;
  ELSE
    -- Use base commission group rates
    SELECT retailer_pct, agent_pct
    INTO v_base_retailer_pct, v_base_agent_pct
    FROM commission_group_rates
    WHERE commission_group_id = v_commission_group_id;
    
    -- Stored as decimals, multiply by 100 for calculation
    v_final_retailer_pct := COALESCE(v_base_retailer_pct, 0) * 100;
    v_final_agent_pct := COALESCE(v_base_agent_pct, 0) * 100;
  END IF;
  
  -- Calculate NEW commissions based on sale_amount
  v_new_retailer_commission := v_sale_amount * (v_final_retailer_pct / 100);
  v_new_agent_commission := v_sale_amount * (v_final_agent_pct / 100);
  
  -- Calculate new profit
  v_new_profit := v_supplier_commission - v_new_retailer_commission - v_new_agent_commission;
  
  -- Update the sale record
  UPDATE sales
  SET 
    retailer_commission = v_new_retailer_commission,
    agent_commission = v_new_agent_commission,
    profit = v_new_profit
  WHERE id = sale_id_param;
  
  -- Calculate the difference in retailer commission
  v_commission_difference := v_new_retailer_commission - v_old_retailer_commission;
  
  -- Update retailer's commission balance to reflect the corrected amount
  -- NOTE: This adjusts the commission_balance to account for the difference
  UPDATE retailers
  SET commission_balance = commission_balance + v_commission_difference
  WHERE id = v_retailer_id;
  
  RAISE NOTICE 'Updated sale %: Old retailer commission: %, New: %, Difference: %', 
    sale_id_param, v_old_retailer_commission, v_new_retailer_commission, v_commission_difference;
    
END;
$$ LANGUAGE plpgsql;

-- Step 2: Recalculate all sales
DO $$
DECLARE
  sale_record RECORD;
  total_sales INTEGER;
  processed_sales INTEGER := 0;
BEGIN
  -- Count total sales to process
  SELECT COUNT(*) INTO total_sales FROM sales;
  
  RAISE NOTICE 'Starting commission recalculation for % sales...', total_sales;
  
  -- Loop through all sales
  FOR sale_record IN 
    SELECT id FROM sales ORDER BY created_at ASC
  LOOP
    -- Recalculate this sale
    PERFORM recalculate_sale_commissions(sale_record.id);
    
    processed_sales := processed_sales + 1;
    
    -- Progress update every 100 sales
    IF processed_sales % 100 = 0 THEN
      RAISE NOTICE 'Processed % of % sales (%.1f%%)', 
        processed_sales, total_sales, (processed_sales::NUMERIC / total_sales * 100);
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Commission recalculation complete! Processed % sales.', processed_sales;
END $$;

-- Step 3: Clean up the temporary function
DROP FUNCTION IF EXISTS recalculate_sale_commissions(UUID);

-- Step 4: Verify the changes with a sample query
-- This shows before/after comparison for verification
SELECT 
  'Verification Query' as note,
  COUNT(*) as total_sales,
  ROUND(SUM(retailer_commission)::NUMERIC, 2) as total_retailer_commissions,
  ROUND(SUM(agent_commission)::NUMERIC, 2) as total_agent_commissions,
  ROUND(SUM(profit)::NUMERIC, 2) as total_profit
FROM sales;

-- Sample of recalculated sales
SELECT 
  id,
  sale_amount,
  supplier_commission,
  retailer_commission,
  agent_commission,
  profit,
  created_at
FROM sales
ORDER BY created_at DESC
LIMIT 10;

-- NOTES:
-- 1. This migration recalculates ALL historical sales to use the correct commission calculation
-- 2. Retailer commission balances are adjusted by the difference between old and new calculations
-- 3. The supplier_commission values remain unchanged (they were always calculated correctly)
-- 4. This is a one-time migration - future sales will use the updated complete_voucher_sale function
-- 5. Consider running this during off-peak hours as it processes all sales
-- 6. The migration is idempotent - running it multiple times will keep recalculating based on current commission rates
