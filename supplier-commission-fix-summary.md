# Supplier Commission Fix Summary

## Problem
Supplier commission values in the `commission_group_rates` table were stored as whole numbers (e.g., 5.0, 7.0) instead of decimals (e.g., 0.05, 0.07), causing them to display as 500% and 700% in the UI.

This was inconsistent with retailer and agent commission storage, which correctly used decimals.

## Root Cause
When the `supplier_pct` column was added to `commission_group_rates`, the data migration from `voucher_types.supplier_commission_pct` copied values directly without converting from percentage format to decimal format.

## Solution

### 1. Database Migration
**File:** `database-fix-supplier-commission-decimals.sql`

Converts all `supplier_pct` values from whole numbers to decimals by dividing by 100:
- `commission_group_rates.supplier_pct`
- `voucher_commission_overrides.supplier_pct` (if applicable)

**Example:**
- Before: `5.0000` (representing 5%)
- After: `0.0500` (representing 5%)

### 2. Type Definition Updates
**File:** `airvoucher-admin/src/pages/admin/commissions/[id]/voucher-type/[voucherTypeId].tsx`

Updated type comments to reflect that ALL commission fields are stored as decimals:
```typescript
type VoucherAmountRate = {
  amount: number;
  supplier_pct: number; // stored as decimal e.g. 0.05 (5%)
  retailer_pct: number; // stored as decimal e.g. 0.05 (5%)
  agent_pct: number; // stored as decimal e.g. 0.05 (5%)
  hasOverride: boolean;
};
```

### 3. Default Rates Calculation
**Changed from:**
```typescript
const defaultRates = React.useMemo(() => {
  return {
    supplier_pct: voucherType?.supplier_commission_pct || 0,  // From voucher_types
    retailer_pct: rate?.retailer_pct || 0,                   // From commission_group_rates
    agent_pct: rate?.agent_pct || 0,                         // From commission_group_rates
  };
}, [voucherType, rate]);
```

**Changed to:**
```typescript
const defaultRates = React.useMemo(() => {
  const currentGroup = (allGroups ?? []).find((g: any) => g.id === groupId);
  const rate = currentGroup?.rates?.find((r: any) => r.voucher_type_id === voucherTypeId);
  return {
    supplier_pct: rate?.supplier_pct || 0,  // Now from commission_group_rates
    retailer_pct: rate?.retailer_pct || 0,
    agent_pct: rate?.agent_pct || 0,
  };
}, [allGroups, groupId, voucherTypeId]);
```

### 4. Save Logic Update
**Removed:** Separate calls to `updateSupplierCommission()` for voucher_types table
**Updated:** Single call to `upsertCommissionRate()` with all three commission values

```typescript
const { error } = await upsertCommissionRate(
  groupId,
  voucherTypeId,
  retailer / 100, // Convert percentage to decimal
  agent / 100,    // Convert percentage to decimal
  supplier / 100  // Convert percentage to decimal - NOW INCLUDED
);
```

### 5. Function Signature Update
**File:** `airvoucher-admin/src/actions/admin/commissionActions.ts`

Updated `upsertCommissionRate` to accept optional `supplierPct` parameter:

```typescript
export async function upsertCommissionRate(
  groupId: string,
  typeId: string,
  retailerPct: number,
  agentPct: number,
  supplierPct?: number  // NEW: Optional supplier commission parameter
): Promise<ResponseType<{ id: string }>>
```

### 6. Removed Imports
Removed unused import:
```typescript
import { updateSupplierCommission } from '@/actions/admin/voucherActions';
```

## Data Consistency
All commission percentages are now consistently stored as decimals (0-1 range):
- **Storage:** 0.05 represents 5%
- **Display:** Multiply by 100 to show "5.00%"
- **Input:** Divide by 100 to store user input of "5" as 0.05

## Migration Steps
1. Run the SQL migration: `database-fix-supplier-commission-decimals.sql`
2. Code changes automatically handle the new decimal format
3. Test commission displays and edits

## Benefits
1. **Consistency:** All commission fields use the same decimal storage format
2. **Accuracy:** No more 500% display errors
3. **Centralization:** All commission values come from `commission_group_rates` table
4. **Flexibility:** Different commission groups can have different supplier rates

## Files Modified
1. `database-fix-supplier-commission-decimals.sql` - NEW
2. `airvoucher-admin/src/pages/admin/commissions/[id]/voucher-type/[voucherTypeId].tsx`
3. `airvoucher-admin/src/actions/admin/commissionActions.ts`

## Testing Checklist
- [ ] Run database migration
- [ ] Verify supplier commission displays correctly (e.g., 5% not 500%)
- [ ] Test editing default rates
- [ ] Test per-amount overrides
- [ ] Test bulk editing
- [ ] Verify all saves work correctly
- [ ] Check commission calculations in sales
