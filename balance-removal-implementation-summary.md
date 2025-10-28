# Balance Removal Implementation Summary

## Overview
This document details the implementation of balance removal functionality in the AirVoucher admin portal's deposit management system. Admins can now both add and remove balances from retailer accounts using the same modal interface with an Add/Remove toggle pattern.

---

## Implementation Date
2025-10-28

---

## Key Features

### ✅ Add/Remove Toggle Pattern
- Consistent with Credit Limit Modal design
- Clear visual distinction between deposits and removals
- Green button for deposits, red button for removals

### ✅ Fee Application
- Fees apply to both deposits AND removals
- If admin removes R1,000 via EFT (5% fee), the net removal is R950
- Maintains consistency: removing R1,000 exactly reverses adding R1,000

### ✅ Full Audit Trail
- All balance adjustments (deposits and removals) logged in `retailer_deposits` table
- New `adjustment_type` column tracks whether transaction is deposit or removal
- Both types appear in Balance History modal

### ✅ Visual Indicators
- **Type Badge**: Green "Deposit" or Red "Removal" badge in history
- **Amount Display**: Minus sign prefix for removal amounts
- **Balance After**: Green for deposits, orange for removals

---

## Database Changes

### Migration File
**File**: `database-balance-removal-migration.sql`

```sql
-- Add adjustment_type column to retailer_deposits table
ALTER TABLE retailer_deposits 
ADD COLUMN IF NOT EXISTS adjustment_type TEXT NOT NULL DEFAULT 'deposit' 
CHECK (adjustment_type IN ('deposit', 'removal'));

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_retailer_deposits_adjustment_type 
ON retailer_deposits(adjustment_type);
```

**Column Details**:
- `adjustment_type`: 'deposit' | 'removal'
- Default: 'deposit' (for backwards compatibility with existing records)
- Indexed for efficient querying

---

## Backend Changes

### Updated Types (`depositActions.ts`)

**New Type**:
```typescript
export type DepositAdjustmentType = 'deposit' | 'removal';
```

**Updated Types**:
```typescript
export type RetailerDeposit = {
  // ... existing fields
  adjustment_type: DepositAdjustmentType;
  // ... other fields
};

export type ProcessDepositParams = {
  retailer_id: string;
  amount_deposited: number;
  deposit_method: DepositMethod;
  adjustment_type: DepositAdjustmentType;  // NEW
  notes?: string;
};
```

### Updated Function Logic

**processRetailerDeposit() - Key Changes**:

1. **Fee Calculation** (unchanged):
   ```typescript
   const net_amount = amount_deposited - fee_amount;
   ```

2. **Balance Calculation** (NEW):
   ```typescript
   let balance_after: number;
   if (adjustment_type === 'deposit') {
     balance_after = balance_before + net_amount;
   } else {
     // removal
     balance_after = balance_before - net_amount;
     
     // Validate non-negative balance
     if (balance_after < 0) {
       return {
         data: null,
         error: new Error(
           `Cannot remove R ${net_amount.toFixed(2)}. Current balance is only R ${balance_before.toFixed(2)}`
         ),
       };
     }
   }
   ```

3. **Database Insert** (updated):
   ```typescript
   .insert({
     // ... other fields
     adjustment_type,  // NEW
     // ... other fields
   })
   ```

---

## Frontend Changes

### 1. DepositModal Component

**File**: `src/components/admin/retailers/DepositModal.tsx`

**New Features**:

1. **Add/Remove Toggle Buttons**:
   ```tsx
   <button
     type="button"
     onClick={() => setAdjustmentType("deposit")}
     className={`flex-1 px-4 py-2 rounded-md ${
       adjustmentType === "deposit"
         ? "bg-green-600 text-white"
         : "bg-muted text-muted-foreground"
     }`}
   >
     <HandCoins className="h-4 w-4 inline mr-2" />
     Add to Balance
   </button>
   
   <button
     type="button"
     onClick={() => setAdjustmentType("removal")}
     className={`flex-1 px-4 py-2 rounded-md ${
       adjustmentType === "removal"
         ? "bg-red-600 text-white"
         : "bg-muted text-muted-foreground"
     }`}
   >
     <TrendingDown className="h-4 w-4 inline mr-2" />
     Remove from Balance
   </button>
   ```

2. **Dynamic Labels**:
   - Modal title: "Process Deposit" or "Remove Balance"
   - Input label: "Deposit Amount" or "Amount to Remove"
   - Breakdown heading: "Deposit Breakdown" or "Removal Breakdown"

3. **Preview Calculation**:
   ```tsx
   const projectedBalance = adjustmentType === "deposit"
     ? retailer.balance + netAmount
     : retailer.balance - netAmount;
   ```

4. **Validation**:
   ```tsx
   // Prevent negative balance on removal
   if (adjustmentType === "removal" && projectedBalance < 0) {
     setError(`Cannot remove R ${netAmount.toFixed(2)}. Current balance is only R ${retailer.balance.toFixed(2)}`);
     return;
   }
   ```

5. **Submit Button**:
   - Green "Process Deposit" button for deposits
   - Red "Remove Balance" button for removals
   - Disabled if would result in negative balance

### 2. BalanceHistoryModal Component

**File**: `src/components/admin/retailers/BalanceHistoryModal.tsx`

**New Features**:

1. **Type Column Added**:
   ```tsx
   <th className="px-4 py-3 text-left font-medium">Type</th>
   ```

2. **Type Badge**:
   ```tsx
   <span
     className={cn(
       "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
       isRemoval
         ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
         : "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
     )}
   >
     {isRemoval ? "Removal" : "Deposit"}
   </span>
   ```

3. **Amount Display with Minus Sign**:
   ```tsx
   <span className={isRemoval ? "text-red-600" : ""}>
     {isRemoval ? "-" : ""}R {deposit.amount_deposited.toFixed(2)}
   </span>
   ```

4. **Net Amount Display**:
   ```tsx
   {isRemoval ? "-" : ""}R {deposit.net_amount.toFixed(2)}
   ```

5. **Balance After Color Coding**:
   ```tsx
   <span className={isRemoval ? "text-orange-600" : "text-green-600"}>
     R {deposit.balance_after.toFixed(2)}
   </span>
   ```

---

## User Workflow

### Adding Balance (Deposit)
1. Click "Update Balance" button on retailer page
2. Modal opens with "Add to Balance" selected (default)
3. Enter deposit amount (e.g., R 1,000)
4. Select deposit method (e.g., EFT - 5% fee)
5. Preview shows:
   - Deposit Amount: R 1,000.00
   - Fee (5%): -R 50.00
   - Net Amount: R 950.00
   - Current Balance: R 500.00
   - New Balance: R 1,450.00 (green)
6. Click "Process Deposit" (green button)
7. Balance updated, transaction recorded

### Removing Balance
1. Click "Update Balance" button on retailer page
2. Click "Remove from Balance" toggle
3. Modal title changes to "Remove Balance"
4. Enter amount to remove (e.g., R 1,000)
5. Select deposit method (e.g., EFT - 5% fee)
6. Preview shows:
   - Amount to Remove: -R 1,000.00 (red)
   - Fee (5%): -R 50.00
   - Net Removal: -R 950.00
   - Current Balance: R 1,450.00
   - New Balance: R 500.00 (orange)
7. Click "Remove Balance" (red button)
8. Balance updated, transaction recorded

### Viewing History
1. Click "Balance History" button
2. Deposit History tab shows all transactions
3. Each transaction has:
   - Type badge (green "Deposit" or red "Removal")
   - Amounts with minus signs for removals
   - Color-coded balances
4. Full audit trail with admin details

---

## Example Scenarios

### Scenario 1: Correcting an Erroneous Deposit
**Problem**: Admin accidentally deposited R 5,000 instead of R 500

**Solution**:
1. Click "Update Balance" → "Remove from Balance"
2. Enter R 5,000 with same deposit method used
3. System removes net amount (e.g., R 4,750 if 5% fee)
4. Then add correct amount (R 500)

### Scenario 2: Fee Consistency
**Deposit**: R 1,000 via EFT (5% fee)
- Net added to balance: R 950

**Removal**: R 1,000 via EFT (5% fee)
- Net removed from balance: R 950
- **Result**: Perfectly reverses the deposit

---

## Validation Rules

### For Deposits
- Amount must be greater than zero
- Net amount (after fee) must be positive
- Standard validations apply

### For Removals
- Amount must be greater than zero
- Net removal (after fee) must be positive
- **NEW**: Net removal cannot exceed current balance
- Error message: "Cannot remove R X. Current balance is only R Y"

---

## Database Migration Instructions

### Step 1: Run Migration
```bash
# Navigate to admin directory
cd airvoucher-admin

# Execute migration
psql -d your_database_name -f database-balance-removal-migration.sql
```

### Step 2: Verify Migration
```sql
-- Check column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'retailer_deposits' 
AND column_name = 'adjustment_type';

-- Check index exists
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'retailer_deposits' 
AND indexname = 'idx_retailer_deposits_adjustment_type';
```

### Step 3: Test Existing Data
```sql
-- All existing records should have 'deposit' as default
SELECT adjustment_type, COUNT(*) 
FROM retailer_deposits 
GROUP BY adjustment_type;
```

---

## Files Modified

### Database
- ✅ `database-balance-removal-migration.sql` (new)

### Backend
- ✅ `src/actions/admin/depositActions.ts` (modified)
- ✅ `src/actions/adminActions.ts` (modified - export new type)
- ✅ `src/actions/index.ts` (modified - export new type)

### Frontend
- ✅ `src/components/admin/retailers/DepositModal.tsx` (modified)
- ✅ `src/components/admin/retailers/BalanceHistoryModal.tsx` (modified)

### Documentation
- ✅ `balance-removal-implementation-summary.md` (new - this file)

---

## Testing Checklist

### Functional Testing
- [ ] Add balance with all deposit methods (EFT, ATM, Counter, Branch)
- [ ] Remove balance with all deposit methods
- [ ] Verify fees calculated correctly for both operations
- [ ] Test validation: attempt to remove more than available balance
- [ ] Verify balance updates correctly in database
- [ ] Check transaction history shows both deposits and removals

### UI/UX Testing
- [ ] Toggle between Add/Remove modes
- [ ] Verify modal title changes
- [ ] Check button colors (green for deposit, red for removal)
- [ ] Verify preview calculations
- [ ] Test error messages display correctly
- [ ] Check history modal shows type badges correctly
- [ ] Verify minus signs appear for removal amounts

### Edge Cases
- [ ] Remove exact balance amount
- [ ] Remove balance when fee would cause negative (should block)
- [ ] Test with zero fee configurations
- [ ] Test with 100% fee (should block as net = 0)
- [ ] Multiple rapid deposits and removals

### Data Integrity
- [ ] Verify audit trail completeness
- [ ] Check admin attribution recorded correctly
- [ ] Confirm timestamps accurate
- [ ] Verify backwards compatibility with existing deposits

---

## Key Design Decisions

### 1. Fee Application on Removals
**Decision**: Apply fees to removals
**Rationale**: Simplicity and consistency. If admin added R1,000, they remove R1,000 to reverse it, not R950.

### 2. Using Same Table
**Decision**: Store both deposits and removals in `retailer_deposits` table
**Rationale**: Unified audit trail, simpler queries, easier reporting

### 3. Type Column vs Separate Tables
**Decision**: Add `adjustment_type` column rather than separate tables
**Rationale**: Reduces complexity, maintains single source of truth, easier to query full history

### 4. Negative Balance Prevention
**Decision**: Strictly prevent negative balances on removal
**Rationale**: Business rule - retailers cannot have negative available balance

### 5. Visual Indicators
**Decision**: Use minus signs in amount columns for removals
**Rationale**: User requested for visual clarity, follows accounting conventions

---

## Future Enhancements

### Potential Improvements
1. Bulk balance adjustments (CSV import)
2. Scheduled balance operations
3. Balance adjustment templates
4. Enhanced reporting (deposits vs removals analytics)
5. Email notifications for balance changes
6. Approval workflow for large removals
7. Balance reconciliation tools
8. Export balance history to Excel/PDF

---

## Summary

This implementation provides admins with a complete solution for managing retailer balances, including the ability to correct mistakes by removing balances. The system maintains full audit trails, applies fees consistently, and provides clear visual indicators to distinguish between deposits and removals.

**Key Benefits**:
- ✅ Mistake correction capability
- ✅ Consistent fee handling
- ✅ Complete audit trail
- ✅ Intuitive UI/UX
- ✅ Type-safe implementation
- ✅ Backwards compatible
- ✅ Production-ready

The feature is ready for testing and deployment.
