# Commission Calculation Update - Summary

**Date:** March 11, 2025  
**Status:** ✅ READY FOR DEPLOYMENT

## The Problem

Retailer and agent commissions were being calculated as percentages of **AirVoucher's commission** instead of percentages of the **sale amount**. This resulted in significantly lower commissions than intended.

### Example (R10 voucher, 5% supplier, 3% retailer, 1% agent):

**WRONG (Previous Calculation):**
- AirVoucher Commission: R10 × 5% = R0.50
- Retailer Commission: R0.50 × 3% = **R0.015** ❌
- Agent Commission: R0.50 × 1% = **R0.005** ❌
- Profit: R0.50 - R0.015 - R0.005 = R0.48

**CORRECT (New Calculation):**
- AirVoucher Commission: R10 × 5% = R0.50
- Retailer Commission: R10 × 3% = **R0.30** ✅
- Agent Commission: R10 × 1% = **R0.10** ✅
- Profit: R0.50 - R0.30 - R0.10 = R0.10

## The Solution

### Files Modified

1. **airvoucher-terminal/src/lib/sale/complete_voucher_sale_rpc.sql**
2. **airvoucher-admin/src/lib/sale/complete_voucher_sale_rpc.sql**

### Code Changes

Changed from:
```sql
-- OLD (WRONG):
retailer_commission := airvoucher_commission * (final_retailer_pct / 100);
agent_commission := airvoucher_commission * (final_agent_pct / 100);
```

To:
```sql
-- NEW (CORRECT):
retailer_commission := sale_amount * (final_retailer_pct / 100);
agent_commission := sale_amount * (final_agent_pct / 100);
```

### Migration Script Created

**File:** `airvoucher-admin/database-commission-recalculation-migration.sql`

This script:
- Recalculates ALL historical sales with the correct commission logic
- Updates retailer commission balances to reflect the corrected amounts
- Provides progress updates and verification queries
- Is idempotent (safe to run multiple times)

## Deployment Steps

### Step 1: Deploy Updated SQL Functions

1. Open Supabase SQL Editor
2. Copy and paste the contents of **EITHER** file (they are identical):
   - `airvoucher-terminal/src/lib/sale/complete_voucher_sale_rpc.sql` OR
   - `airvoucher-admin/src/lib/sale/complete_voucher_sale_rpc.sql`
3. Execute the SQL
4. Verify the function was created successfully

### Step 2: Run Historical Data Migration

**IMPORTANT:** Run this during off-peak hours as it processes all sales records.

1. Open Supabase SQL Editor
2. Copy and paste the contents of:
   - `airvoucher-admin/database-commission-recalculation-migration.sql`
3. Review the script to ensure you understand what it does
4. Execute the SQL
5. Monitor the progress messages (it shows progress every 100 sales)
6. Review the verification queries at the end

### Step 3: Verify Changes

After the migration completes, verify:

1. Check the total commissions in the verification query
2. Review recent sales in the sales reports UI
3. Verify that retailer commission balances have been updated correctly
4. Test making a new sale to ensure commissions calculate correctly

## Impact Analysis

### Database Tables Updated

1. **sales** - All records recalculated
   - `retailer_commission` - Updated to use sale_amount as base
   - `agent_commission` - Updated to use sale_amount as base
   - `profit` - Recalculated based on new commission values

2. **retailers** - All records adjusted
   - `commission_balance` - Adjusted by the difference between old and new calculations

### Future Sales

All new sales (created after deploying the updated SQL function) will automatically use the correct calculation logic.

### Historical Sales

All historical sales will be corrected by the migration script to use the new calculation.

## Commission Calculation Flow (New)

```
Sale Amount (R10.00)
    ↓
Supplier Commission = Amount × (supplier_pct / 100)
    = 10 × (5 / 100) = R0.50
    ↓
Retailer Commission = Amount × (retailer_pct / 100)  ← CHANGED
    = 10 × (3 / 100) = R0.30
    ↓
Agent Commission = Amount × (agent_pct / 100)  ← CHANGED
    = 10 × (1 / 100) = R0.10
    ↓
AirVoucher Profit = Supplier Commission - Retailer Commission - Agent Commission
    = 0.50 - 0.30 - 0.10 = R0.10
```

## Testing Checklist

Before deploying to production, test:

- [ ] Deploy SQL function to staging/test environment
- [ ] Run migration on staging/test database
- [ ] Verify sample sales calculations are correct
- [ ] Test creating new sales
- [ ] Verify UI displays correct commission amounts
- [ ] Check retailer commission balances are accurate
- [ ] Review sales reports for correctness

After deploying to production:

- [ ] Monitor first few sales for correct calculations
- [ ] Verify retailer commission balances
- [ ] Check sales reports display correctly
- [ ] Review profit calculations

## Rollback Plan

If issues are discovered after deployment:

1. Revert the `complete_voucher_sale` function to previous version
2. Historical sales remain corrected (no need to rollback those)
3. Only new sales after rollback would use old calculation

## Notes

1. **Precision:** The database already supports 4 decimal places for commission amounts (from previous fix)
2. **Commission Groups:** The function correctly handles both default and override commission rates
3. **Agent Commissions:** Agent commission calculations follow the same logic as retailer commissions
4. **Balance Updates:** Retailer commission_balance is automatically adjusted during migration
5. **Performance:** The migration processes sales sequentially with progress updates

## Financial Impact

The new calculation significantly increases retailer and agent earnings:

- **Before:** Commissions were calculated on AirVoucher's small percentage
- **After:** Commissions are calculated on the full sale amount
- **Result:** Retailers and agents earn much more per transaction
- **AirVoucher Profit:** Reduced accordingly (this is the intended business model)

## Status: ✅ READY FOR DEPLOYMENT

All code changes complete. Ready to deploy SQL function and run migration.
