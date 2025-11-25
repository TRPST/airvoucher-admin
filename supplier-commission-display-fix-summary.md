# Supplier Commission Display Fix - Summary

## Issue Description

The commission management UI was displaying supplier commission percentages incorrectly (e.g., showing 200% instead of 2%).

### Symptoms

- Supplier commission set to 2% displayed as 200%
- Supplier commission set to 5% displayed as 500%
- Some voucher amounts displayed correctly, others didn't

## Root Cause

**Inconsistent data storage** in the `commission_group_rates` table where supplier commission values were stored in two different formats:

| Storage Value | Expected Format            | Display Result | Status   |
| ------------- | -------------------------- | -------------- | -------- |
| 0.0200        | ✓ Correct (decimal)        | 2%             | ✓ Works  |
| 2.0000        | ✗ Incorrect (whole number) | 200%           | ✗ Broken |
| 0.0500        | ✓ Correct (decimal)        | 5%             | ✓ Works  |
| 5.0000        | ✗ Incorrect (whole number) | 500%           | ✗ Broken |

### Why It Happened

The UI code correctly multiplies by 100 for display:

```typescript
`${(rate.supplier_pct * 100).toFixed(2)}%`;
```

This means:

- `0.0200 × 100 = 2%` ✓
- `2.0000 × 100 = 200%` ✗

The inconsistent data likely originated from:

1. Manual database edits
2. Data migration issues
3. Previous code versions that didn't normalize values
4. Direct database imports

## Solution

### Migration Script: `database-normalize-commission-percentages.sql`

The migration script:

1. **Creates backup tables** before any changes
2. **Identifies problematic values** (percentage values > 1)
3. **Normalizes the data** by dividing by 100:
   - 2.0000 → 0.0200 (displays as 2%)
   - 5.0000 → 0.0500 (displays as 5%)
   - 10.0000 → 0.1000 (displays as 10%)
4. **Only affects percentage types** (leaves fixed amounts unchanged)
5. **Includes verification queries** to confirm success
6. **Provides rollback capability** via backup tables

### Tables Affected

- `commission_group_rates` - Default commission rates per voucher type
- `voucher_commission_overrides` - Amount-specific commission overrides

### Columns Normalized

For both tables, when `commission_type = 'percentage'`:

- `supplier_pct`
- `retailer_pct`
- `agent_pct`

## How to Apply

1. **Review the migration script** to understand what it does
2. **Back up your database** (the script also creates backup tables)
3. **Run the verification queries** (Step 2) to see current inconsistencies
4. **Execute the normalization** (Steps 3-4)
5. **Run verification queries** (Step 5) to confirm success
6. **Test the UI** - refresh and verify percentages display correctly
7. **Keep backup tables** for a few days, then drop them if satisfied

## Expected Results

After running the migration:

- All percentage values stored as decimals (0-1 range)
- UI displays: 2%, 5%, 10%, etc. (correctly)
- No more 200%, 500%, 1000% display errors
- Fixed commission amounts remain unchanged

## Rollback

If needed, the script includes a rollback section that restores from backup tables.

## Prevention

To prevent this issue in the future:

- The code already handles percentage conversion correctly
- Always save percentages as decimals (0-1 range) in the database
- Use the existing UI which handles conversion automatically
- Avoid direct database edits; use the admin UI instead

## Files Changed

- `database-normalize-commission-percentages.sql` - New migration script
- `supplier-commission-display-fix-summary.md` - This documentation

## Code Review

The existing code in `[voucherTypeId].tsx` is correct:

- ✓ Converts user input (0-100) to storage format (0-1) by dividing by 100
- ✓ Converts storage format (0-1) to display (0-100) by multiplying by 100
- ✓ Handles both percentage and fixed commission types

No code changes needed - only data normalization required.
