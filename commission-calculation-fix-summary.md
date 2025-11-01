# Commission Calculation Fix - Complete Summary

**Date:** October 31, 2025  
**Status:** ✅ RESOLVED

## The Problem

Commission calculations were incorrect for voucher sales with override commission values. For example:
- A R10 Hollywoodbets voucher in the Platinum commission group
- Override values: Supplier 5.5%, Retailer 4.5%, Agent 0.5%
- **Expected:** Supplier R0.55, Retailer R0.0248, Agent R0.0028
- **Actual:** Supplier R0.60, Retailer R0.02, Agent R0.00

## Root Causes Discovered

We found **7 distinct bugs** causing the incorrect calculations:

### 1. Database Schema - Supplier Percentage Precision
**Issue:** `supplier_pct` column in both tables was NUMERIC(5,2) - only 2 decimal places
- When saving 5.5%, it stored as 0.055 but rounded to 0.06 when fetched
- **Fix:** Changed to NUMERIC(6,4) to support 4 decimal places

**Files Modified:**
```sql
-- airvoucher-admin/database-add-supplier-commission-to-groups.sql
ALTER TABLE commission_group_rates 
  ALTER COLUMN supplier_pct TYPE NUMERIC(6,4);

ALTER TABLE voucher_commission_overrides 
  ALTER COLUMN supplier_pct TYPE NUMERIC(6,4);
```

### 2. UI Display/Save Logic Inconsistency  
**Issue:** UI didn't multiply supplier percentage by 100 for display (unlike retailer/agent)
- Displayed 0.055 instead of 5.5%
- **Fix:** Consistent handling across all commission types

**File Modified:**
- `airvoucher-admin/src/pages/admin/commissions/[id]/voucher-type/[voucherTypeId].tsx`

**Changes:**
```typescript
// Display: Multiply ALL by 100
supplier: (commissionRate?.supplier_pct || 0) * 100,
retailer: (commissionRate?.retailer_pct || 0) * 100,
agent: (commissionRate?.agent_pct || 0) * 100,

// Save: Divide ALL by 100
supplier_pct: values.supplier / 100,
retailer_pct: values.retailer / 100,
agent_pct: values.agent / 100,
```

### 3. SQL Function - Missing Commission Group Filter
**Issue:** Override lookup didn't filter by commission_group_id
- Could fetch wrong commission group's override values
- **Fix:** Added commission_group_id to WHERE clause

**Files Modified:**
- `airvoucher-terminal/src/lib/sale/complete_voucher_sale_rpc.sql`
- `airvoucher-admin/src/lib/sale/complete_voucher_sale_rpc.sql`

**Changes:**
```sql
-- Added retailer_commission_group_id variable
retailer_commission_group_id UUID;

-- Fetch it from retailer
SELECT r.balance, r.credit_limit, r.commission_group_id, ...
INTO retailer_balance, retailer_credit_limit, retailer_commission_group_id, ...

-- Use it in override lookup
SELECT supplier_pct, retailer_pct, agent_pct 
FROM voucher_commission_overrides
WHERE voucher_type_id = in_voucher_type_id
AND amount = sale_amount
AND commission_group_id = retailer_commission_group_id;  -- ADDED THIS
```

### 4. SQL Function - Override Variable Precision
**Issue:** Override variables declared as NUMERIC(5,2) 
- Rounded 0.055 to 0.06 when storing
- **Fix:** Changed to NUMERIC(6,4)

**Files Modified:**
- `airvoucher-terminal/src/lib/sale/complete_voucher_sale_rpc.sql`
- `airvoucher-admin/src/lib/sale/complete_voucher_sale_rpc.sql`

**Changes:**
```sql
-- Before
override_supplier_pct NUMERIC(5,2);
override_retailer_pct NUMERIC(5,2);
override_agent_pct NUMERIC(5,2);
final_supplier_pct NUMERIC(5,2);
final_retailer_pct NUMERIC(5,2);
final_agent_pct NUMERIC(5,2);

-- After
override_supplier_pct NUMERIC(6,4);
override_retailer_pct NUMERIC(6,4);
override_agent_pct NUMERIC(6,4);
final_supplier_pct NUMERIC(6,4);
final_retailer_pct NUMERIC(6,4);
final_agent_pct NUMERIC(6,4);
```

### 5. SQL Function - Override Multiplier Missing
**Issue:** Didn't multiply override supplier_pct by 100 like other percentages
- **Fix:** Added multiplication for consistency

**Files Modified:**
- `airvoucher-terminal/src/lib/sale/complete_voucher_sale_rpc.sql`
- `airvoucher-admin/src/lib/sale/complete_voucher_sale_rpc.sql`

**Changes:**
```sql
-- Before
IF FOUND THEN
  final_supplier_pct := override_supplier_pct;  -- Missing * 100
  final_retailer_pct := override_retailer_pct * 100;
  final_agent_pct := override_agent_pct * 100;

-- After
IF FOUND THEN
  final_supplier_pct := override_supplier_pct * 100;  -- ADDED * 100
  final_retailer_pct := override_retailer_pct * 100;
  final_agent_pct := override_agent_pct * 100;
```

### 6. Database Columns - Commission Storage Precision
**Issue:** `retailer_commission` and `agent_commission` columns were NUMERIC(12,2)
- Small values like 0.0028 rounded to 0.00
- **Fix:** Changed to NUMERIC(12,4)

**SQL Command:**
```sql
ALTER TABLE sales 
  ALTER COLUMN retailer_commission TYPE NUMERIC(12,4),
  ALTER COLUMN agent_commission TYPE NUMERIC(12,4);
```

### 7. SQL Function - Calculation Variable Precision
**Issue:** Commission calculation variables were NUMERIC(12,2)
- Values rounded during calculation before being stored
- **Fix:** Changed to NUMERIC(12,4)

**Files Modified:**
- `airvoucher-terminal/src/lib/sale/complete_voucher_sale_rpc.sql`
- `airvoucher-admin/src/lib/sale/complete_voucher_sale_rpc.sql`

**Changes:**
```sql
-- Before
airvoucher_commission NUMERIC(12,2);
retailer_commission NUMERIC(12,2);
agent_commission NUMERIC(12,2);
profit NUMERIC(12,2);

-- After
airvoucher_commission NUMERIC(12,4);
retailer_commission NUMERIC(12,4);
agent_commission NUMERIC(12,4);
profit NUMERIC(12,4);
```

## The Solution

### Files Changed

1. **Database Migrations:**
   - `airvoucher-admin/database-add-supplier-commission-to-groups.sql`
   - ALTER TABLE commands for sales columns

2. **UI Code:**
   - `airvoucher-admin/src/pages/admin/commissions/[id]/voucher-type/[voucherTypeId].tsx`

3. **SQL Functions:**
   - `airvoucher-terminal/src/lib/sale/complete_voucher_sale_rpc.sql`
   - `airvoucher-admin/src/lib/sale/complete_voucher_sale_rpc.sql`

### Deployment Steps

1. Run database migrations for column precision updates
2. Deploy SQL function via Supabase SQL Editor
3. Test with new sales (old sales retain old calculated values)

## Verification

**Test Case:** R10 Hollywoodbets sale with Platinum commission group overrides

**Override Values:**
- Supplier: 5.5% of sale amount
- Retailer: 4.5% of supplier commission
- Agent: 0.5% of supplier commission

**Expected Results:**
- Supplier Commission: R0.5500 (10 × 5.5%)
- Retailer Commission: R0.0248 (0.55 × 4.5%)
- Agent Commission: R0.0028 (0.55 × 0.5%)
- AirVoucher Profit: R0.5224 (0.55 - 0.0248 - 0.0028)

**Actual Results (After Fix):** ✅ All values match expected

## Key Learnings

1. **Precision Matters:** PostgreSQL NUMERIC types need sufficient scale for financial calculations
2. **Consistency is Critical:** All percentage handling must be uniform (multiply/divide by 100)
3. **Variable Precision:** Even temporary calculation variables need proper precision
4. **Database vs. Code:** Precision issues can occur at multiple layers (DB schema, SQL variables, columns)
5. **Testing is Essential:** Small percentage differences compound in complex calculations

## Commission Calculation Flow

```
Sale Amount (R10.00)
    ↓
Supplier Commission = Amount × (supplier_pct / 100)
    = 10 × (5.5 / 100) = R0.55
    ↓
Retailer Commission = Supplier Commission × (retailer_pct / 100)
    = 0.55 × (4.5 / 100) = R0.0248
    ↓
Agent Commission = Supplier Commission × (agent_pct / 100)
    = 0.55 × (0.5 / 100) = R0.0028
    ↓
AirVoucher Profit = Supplier Commission - Retailer Commission - Agent Commission
    = 0.55 - 0.0248 - 0.0028 = R0.5224
```

## Status: RESOLVED ✅

All commission calculations now work correctly with full precision support for override values.
