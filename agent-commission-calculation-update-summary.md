# Agent Commission Calculation Update - Summary

## Overview
Updated the agent commission calculation method from being a percentage of the voucher amount to being a percentage of the net balance (remaining amount after retailer commission).

## Problem Statement

### Old (Incorrect) Calculation
```
agent_commission = sale_amount × agent_pct
```

**Example with R10 Hollywoodbets voucher:**
- Supplier commission (5%): R0.50
- Retailer commission (3%): R0.30  
- Agent commission (50%): **R5.00** (50% of R10) ❌
- AirVoucher profit: R0.50 - R0.30 - R5.00 = **-R4.80** (NEGATIVE!)

### New (Correct) Calculation
```
net_balance = supplier_commission - retailer_commission
agent_commission = net_balance × agent_pct
```

**Same example:**
- Supplier commission (5%): R0.50
- Retailer commission (3%): R0.30
- **Net balance**: R0.50 - R0.30 = R0.20
- Agent commission (50%): **R0.10** (50% of R0.20) ✅
- AirVoucher profit: R0.20 - R0.10 = **R0.10** ✅

## Files Modified

### 1. Database RPC Functions (2 files)
Both functions updated with the same logic:

#### `airvoucher-admin/src/lib/sale/complete_voucher_sale_rpc.sql`
#### `airvoucher-terminal/src/lib/sale/complete_voucher_sale_rpc.sql`

**Changes:**
```sql
-- OLD:
retailer_commission := sale_amount * (final_retailer_pct / 100);
agent_commission := sale_amount * (final_agent_pct / 100);
profit := airvoucher_commission - retailer_commission - agent_commission;

-- NEW:
retailer_commission := sale_amount * (final_retailer_pct / 100);
agent_commission := (airvoucher_commission - retailer_commission) * (final_agent_pct / 100);
profit := airvoucher_commission - retailer_commission - agent_commission;
```

### 2. Frontend Commission Overrides Page

#### `airvoucher-admin/src/pages/admin/commissions/[id]/voucher-type/[voucherTypeId].tsx`

**Changes:**
1. **Added "Net Balance" column** between Retailer Com and Agent Com
2. **Updated commission calculations:**
   ```typescript
   // OLD:
   const agentAmount = rate.amount * rate.agent_pct;
   
   // NEW:
   const netBalance = supplierAmount - retailerAmount;
   const agentAmount = netBalance * rate.agent_pct;
   const avProfit = netBalance - agentAmount;
   ```

3. **Table structure updated:**
   - Checkbox
   - Amount
   - Supplier Com
   - Retailer Com
   - **Net Balance** (NEW)
   - Agent Com
   - AV Profit
   - Status
   - Edit

### 3. Database Migration

#### `airvoucher-admin/database-agent-commission-recalculation.sql`

**Purpose:** Recalculates agent_commission and profit for all existing sales records

**Process:**
1. Extracts the original agent percentage from existing data
2. Applies new formula to recalculate agent_commission
3. Recalculates profit accordingly
4. Only updates sales where agent_commission > 0

**Safety:** Includes commented-out backup table creation

## Implementation Steps

### Step 1: Update RPC Functions
Execute both SQL files in Supabase SQL editor:
1. `airvoucher-admin/src/lib/sale/complete_voucher_sale_rpc.sql`
2. `airvoucher-terminal/src/lib/sale/complete_voucher_sale_rpc.sql`

### Step 2: Deploy Frontend Changes
The commission overrides page will now:
- Display the Net Balance column
- Calculate agent commissions correctly
- Update AV Profit calculations in real-time when editing

### Step 3: Run Migration (IMPORTANT)
Execute the migration to fix existing sales data:
```sql
-- Run this in Supabase SQL editor:
-- File: database-agent-commission-recalculation.sql
```

**⚠️ Warning:** Run this migration during low-traffic period as it updates all sales records with agent commissions.

## Validation

### Before Running Migration
Check current data:
```sql
SELECT 
    id,
    sale_amount,
    supplier_commission,
    retailer_commission,
    agent_commission,
    profit,
    -- Calculate what it should be:
    (supplier_commission - retailer_commission) * (agent_commission / sale_amount) as new_agent_commission,
    (supplier_commission - retailer_commission) - 
    ((supplier_commission - retailer_commission) * (agent_commission / sale_amount)) as new_profit
FROM sales
WHERE agent_commission > 0
ORDER BY created_at DESC
LIMIT 10;
```

### After Migration
Verify the changes:
```sql
SELECT 
    id,
    sale_amount,
    supplier_commission,
    retailer_commission,
    agent_commission,
    profit,
    created_at
FROM sales
WHERE agent_commission > 0
ORDER BY created_at DESC
LIMIT 10;
```

## Testing Checklist

- [ ] New sales calculate agent commission correctly
- [ ] Commission overrides page displays Net Balance column
- [ ] Agent commission properly calculated as % of net balance
- [ ] AV Profit updates correctly in edit mode
- [ ] Historical sales data migrated successfully
- [ ] Reports show corrected commission values
- [ ] No negative AirVoucher profits (unless by design)

## Example Calculations

### Scenario 1: R10 Hollywoodbets Voucher (RUBY Group)
- **Supplier**: 5% = R0.50
- **Retailer**: 3% = R0.30
- **Net Balance**: R0.50 - R0.30 = R0.20
- **Agent**: 50% of R0.20 = R0.10
- **AV Profit**: R0.20 - R0.10 = R0.10 ✅

### Scenario 2: R5 Hollywoodbets Voucher (Default)
- **Supplier**: 7% = R0.35
- **Retailer**: 5% = R0.25  
- **Net Balance**: R0.35 - R0.25 = R0.10
- **Agent**: 0% of R0.10 = R0.00
- **AV Profit**: R0.10 - R0.00 = R0.10 ✅

## Impact Summary

### Positive Impacts
- ✅ Agents now earn commission from actual remaining profit
- ✅ AirVoucher profit calculations are accurate
- ✅ No more negative profits due to excessive agent commissions
- ✅ Clearer commission structure with Net Balance visible

### Breaking Changes
- ⚠️ Agent commission amounts will be different (significantly lower in many cases)
- ⚠️ Historical reports will show updated values after migration
- ⚠️ May require communication to agents about commission calculation change

## Rollback Plan

If needed to rollback the migration:

```sql
-- Restore from backup (if backup was created)
UPDATE sales s
SET 
    agent_commission = b.agent_commission,
    profit = b.profit
FROM sales_backup_agent_commission b
WHERE s.id = b.id;
```

## Notes

- The Net Balance column helps visualize what amount the agent percentage is being applied to
- All commission percentages remain stored as decimals (e.g., 0.05 for 5%)
- Frontend displays percentages properly (multiplies by 100 for display)
- Commission override system remains unchanged - only calculation formula updated

## Date Implemented
2025-01-04
