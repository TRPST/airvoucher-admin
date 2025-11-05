-- Agent Commission Recalculation Migration
-- Updates agent_commission calculation to be a percentage of the net balance
-- (supplier_commission - retailer_commission) instead of the sale amount

-- Backup existing values (optional, for safety)
-- CREATE TABLE IF NOT EXISTS sales_backup_agent_commission AS 
-- SELECT id, agent_commission, profit, created_at 
-- FROM sales;

-- Update agent_commission and profit for all existing sales
-- New formula:
-- net_balance = supplier_commission - retailer_commission
-- agent_commission = net_balance * (original_agent_pct)
-- profit = net_balance - agent_commission

UPDATE sales
SET 
    agent_commission = GREATEST(0, (
        supplier_commission - retailer_commission
    ) * (
        -- Calculate the original agent percentage from the old agent_commission
        -- old formula: agent_commission = sale_amount * agent_pct
        -- so: agent_pct = agent_commission / sale_amount
        CASE 
            WHEN sale_amount > 0 THEN agent_commission / sale_amount
            ELSE 0
        END
    )),
    profit = (
        supplier_commission - retailer_commission
    ) - GREATEST(0, (
        (supplier_commission - retailer_commission) * (
            CASE 
                WHEN sale_amount > 0 THEN agent_commission / sale_amount
                ELSE 0
            END
        )
    ))
WHERE 
    -- Only update sales where agent has a commission
    agent_commission > 0
    AND sale_amount > 0;

-- Verify the update (check a few sample records)
-- SELECT 
--     id,
--     sale_amount,
--     supplier_commission,
--     retailer_commission,
--     agent_commission,
--     profit,
--     created_at
-- FROM sales
-- WHERE agent_commission > 0
-- ORDER BY created_at DESC
-- LIMIT 10;

-- Summary statistics after migration
SELECT 
    COUNT(*) as total_sales_updated,
    SUM(agent_commission) as total_agent_commission,
    SUM(profit) as total_profit,
    MIN(created_at) as oldest_sale,
    MAX(created_at) as newest_sale
FROM sales
WHERE agent_commission > 0;
