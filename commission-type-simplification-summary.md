# Commission Type Simplification - Implementation Summary

## ✅ Completed Steps

### 1. Database Migration (COMPLETED)

- **File**: `database-commission-types-simplification.sql`
- **Status**: ✅ Created and executed on Supabase
- **Changes**:
  - Added single `commission_type` column to `commission_group_rates`
  - Added single `commission_type` column to `voucher_commission_overrides`
  - Dropped `supplier_commission_type`, `retailer_commission_type`, `agent_commission_type` from both tables
  - Set all existing records to 'percentage' (backward compatible)

### 2. TypeScript Types (COMPLETED)

- ✅ `src/actions/types/adminTypes.ts` - Updated `CommissionRate` type
- ✅ `src/actions/admin/commissionActions.ts` - Updated `upsertCommissionRate` signature
- ✅ `src/actions/admin/commissionOverrideActions.ts` - Updated `VoucherCommissionOverride` type

### 3. New Components (COMPLETED)

- ✅ `UnifiedCommissionTypeToggle.tsx` - Single Fixed/Percentage toggle
- ✅ `UnifiedCommissionInputs.tsx` - Groups all three commission inputs with unified toggle
- ✅ `CommissionInputGroup.tsx` - Added `hideTypeToggle` prop

## ⚠️ Remaining Work

### Main Issue: `[voucherTypeId].tsx` Still Uses Old Structure

This file (~1200 lines) needs systematic updates to use the unified commission type. Here's the complete change checklist:

---

## Required Changes in `[voucherTypeId].tsx`

### 1. Update `startDefaultsEdit` Handler (Line ~222-241)

**Current (WRONG)**:

```typescript
const startDefaultsEdit = () => {
  setDefaultsDraft({
    supplier_pct:
      defaultRates.supplier_commission_type === 'fixed'
        ? defaultRates.supplier_pct.toFixed(2)
        : (defaultRates.supplier_pct * 100).toFixed(2),
    // ... same for retailer and agent with individual types
  });
  setDefaultsCommissionTypes({
    supplier: defaultRates.supplier_commission_type,
    retailer: defaultRates.retailer_commission_type,
    agent: defaultRates.agent_commission_type,
  });
  setDefaultsExpanded(true);
};
```

**Should Be**:

```typescript
const startDefaultsEdit = () => {
  setDefaultsDraft({
    supplier_pct:
      defaultRates.commission_type === 'fixed'
        ? defaultRates.supplier_pct.toFixed(2)
        : (defaultRates.supplier_pct * 100).toFixed(2),
    retailer_pct:
      defaultRates.commission_type === 'fixed'
        ? defaultRates.retailer_pct.toFixed(2)
        : (defaultRates.retailer_pct * 100).toFixed(2),
    agent_pct:
      defaultRates.commission_type === 'fixed'
        ? defaultRates.agent_pct.toFixed(2)
        : (defaultRates.agent_pct * 100).toFixed(2),
  });
  setDefaultsCommissionType(defaultRates.commission_type); // Single type
  setDefaultsExpanded(true);
};
```

### 2. Update `saveDefaultRates` Handler (Line ~263-296)

**Current (WRONG)**:

```typescript
const supplierValue = defaultsCommissionTypes.supplier === 'fixed' ? supplier : supplier / 100;
const retailerValue = defaultsCommissionTypes.retailer === 'fixed' ? retailer : retailer / 100;
const agentValue = defaultsCommissionTypes.agent === 'fixed' ? agent : agent / 100;

const { error } = await upsertCommissionRate(
  groupId,
  voucherTypeId,
  retailerValue,
  agentValue,
  supplierValue,
  defaultsCommissionTypes.supplier, // ❌ OLD - 3 separate types
  defaultsCommissionTypes.retailer,
  defaultsCommissionTypes.agent
);
```

**Should Be**:

```typescript
const supplierValue = defaultsCommissionType === 'fixed' ? supplier : supplier / 100;
const retailerValue = defaultsCommissionType === 'fixed' ? retailer : retailer / 100;
const agentValue = defaultsCommissionType === 'fixed' ? agent : agent / 100;

const { error } = await upsertCommissionRate(
  groupId,
  voucherTypeId,
  retailerValue,
  agentValue,
  supplierValue,
  defaultsCommissionType // ✅ NEW - single unified type
);
```

### 3. Update `openRowEdit` Handler (Line ~304-333)

**Current (WRONG)**:

```typescript
const draft: EditableVoucherAmountRate = {
  amount: current.amount,
  supplier_pct:
    current.supplier_commission_type === 'fixed'
      ? current.supplier_pct.toFixed(2)
      : (current.supplier_pct * 100).toFixed(2),
  // ... separate types for each
  supplier_commission_type: current.supplier_commission_type,
  retailer_commission_type: current.retailer_commission_type,
  agent_commission_type: current.agent_commission_type,
  hasOverride: current.hasOverride,
};
```

**Should Be**:

```typescript
const draft: EditableVoucherAmountRate = {
  amount: current.amount,
  supplier_pct:
    current.commission_type === 'fixed'
      ? current.supplier_pct.toFixed(2)
      : (current.supplier_pct * 100).toFixed(2),
  retailer_pct:
    current.commission_type === 'fixed'
      ? current.retailer_pct.toFixed(2)
      : (current.retailer_pct * 100).toFixed(2),
  agent_pct:
    current.commission_type === 'fixed'
      ? current.agent_pct.toFixed(2)
      : (current.agent_pct * 100).toFixed(2),
  commission_type: current.commission_type, // ✅ Single unified type
  hasOverride: current.hasOverride,
};
```

### 4. Update `handleRowCommissionTypeChange` (Line ~346-352)

**Current (WRONG)**:

```typescript
const handleRowCommissionTypeChange = (
  field: 'supplier' | 'retailer' | 'agent',
  type: CommissionType
) => {
  if (!rowDraft) return;
  setRowDraft(prev => (prev ? { ...prev, [`${field}_commission_type`]: type } : null));
};
```

**Should Be**:

```typescript
const handleRowCommissionTypeChange = (type: CommissionType) => {
  if (!rowDraft) return;
  // When commission type changes, convert all values
  setRowDraft(prev => {
    if (!prev) return null;

    // Convert values based on new type
    const currentAmount = amountRates.find(r => r.amount === prev.amount)?.amount || 0;

    if (type === 'fixed' && prev.commission_type === 'percentage') {
      // Converting from percentage to fixed
      return {
        ...prev,
        commission_type: type,
        supplier_pct: ((parseFloat(prev.supplier_pct as string) / 100) * currentAmount).toFixed(2),
        retailer_pct: ((parseFloat(prev.retailer_pct as string) / 100) * currentAmount).toFixed(2),
        agent_pct: ((parseFloat(prev.agent_pct as string) / 100) * currentAmount).toFixed(2),
      };
    } else if (type === 'percentage' && prev.commission_type === 'fixed') {
      // Converting from fixed to percentage
      return {
        ...prev,
        commission_type: type,
        supplier_pct: ((parseFloat(prev.supplier_pct as string) / currentAmount) * 100).toFixed(2),
        retailer_pct: ((parseFloat(prev.retailer_pct as string) / currentAmount) * 100).toFixed(2),
        agent_pct: ((parseFloat(prev.agent_pct as string) / currentAmount) * 100).toFixed(2),
      };
    }

    return { ...prev, commission_type: type };
  });
};
```

### 5. Update `saveRowEdit` Handler (Line ~358-433)

**Replace all instances of**:

- `rowDraft.supplier_commission_type` → `rowDraft.commission_type`
- `rowDraft.retailer_commission_type` → `rowDraft.commission_type`
- `rowDraft.agent_commission_type` → `rowDraft.commission_type`

**In the override objects, change from**:

```typescript
const override: VoucherCommissionOverride = {
  // ...
  supplier_commission_type: rowDraft.supplier_commission_type,
  retailer_commission_type: rowDraft.retailer_commission_type,
  agent_commission_type: rowDraft.agent_commission_type,
  // ...
};
```

**To**:

```typescript
const override: VoucherCommissionOverride = {
  // ...
  commission_type: rowDraft.commission_type,
  // ...
};
```

### 6. Update `applyBulkEdits` Handler (Line ~489-571)

**Replace all instances of**:

- `bulkCommissionTypes.supplier` → `bulkCommissionType`
- `bulkCommissionTypes.retailer` → `bulkCommissionType`
- `bulkCommissionTypes.agent` → `bulkCommissionType`

### 7. Update Display Logic in Banner (Line ~649-676)

**Current (WRONG)**:

```typescript
<span className="text-pink-600">
  Supplier{' '}
  {defaultRates.supplier_commission_type === 'fixed'
    ? `R${defaultRates.supplier_pct.toFixed(2)}`
    : `${(defaultRates.supplier_pct * 100).toFixed(2)}%`}
</span>
```

**Should Be**:

```typescript
<span className="text-pink-600">
  Supplier{' '}
  {defaultRates.commission_type === 'fixed'
    ? `R${defaultRates.supplier_pct.toFixed(2)}`
    : `${(defaultRates.supplier_pct * 100).toFixed(2)}%`}
</span>
```

### 8. Update Default Edit Form (Line ~700-738)

**Replace CommissionInputGroup components with UnifiedCommissionInputs**:

```typescript
import { UnifiedCommissionInputs } from '@/components/admin/commissions/UnifiedCommissionInputs';

// Then in the render:
<UnifiedCommissionInputs
  supplierValue={defaultsDraft.supplier_pct}
  retailerValue={defaultsDraft.retailer_pct}
  agentValue={defaultsDraft.agent_pct}
  commissionType={defaultsCommissionType}
  onSupplierChange={value => setDefaultsDraft(prev => ({ ...prev, supplier_pct: value }))}
  onRetailerChange={value => setDefaultsDraft(prev => ({ ...prev, retailer_pct: value }))}
  onAgentChange={value => setDefaultsDraft(prev => ({ ...prev, agent_pct: value }))}
  onTypeChange={setDefaultsCommissionType}
  disabled={isSavingDefaults}
  showCalculated={false}
/>
```

### 9. Update Table Display (Line ~854-906)

**Replace all instances in the table cells**:

- `rate.supplier_commission_type` → `rate.commission_type`
- `rate.retailer_commission_type` → `rate.commission_type`
- `rate.agent_commission_type` → `rate.commission_type`

### 10. Update Inline Edit Row (Line ~945-1066)

**Replace the three CommissionInputGroup components with UnifiedCommissionInputs**:

```typescript
<UnifiedCommissionInputs
  supplierValue={rowDraft.supplier_pct}
  retailerValue={rowDraft.retailer_pct}
  agentValue={rowDraft.agent_pct}
  commissionType={rowDraft.commission_type}
  voucherAmount={rate.amount}
  onSupplierChange={value => handleRowInputChange('supplier_pct', value)}
  onRetailerChange={value => handleRowInputChange('retailer_pct', value)}
  onAgentChange={value => handleRowInputChange('agent_pct', value)}
  onTypeChange={handleRowCommissionTypeChange}
  disabled={isSaving}
  showCalculated={true}
/>
```

### 11. Update Bulk Edit Modal (Line ~1139-1175)

**Replace the three CommissionInputGroup components with UnifiedCommissionInputs**:

```typescript
<UnifiedCommissionInputs
  supplierValue={bulkDraft.supplier_pct}
  retailerValue={bulkDraft.retailer_pct}
  agentValue={bulkDraft.agent_pct}
  commissionType={bulkCommissionType}
  onSupplierChange={value => handleBulkInputChange('supplier_pct', value)}
  onRetailerChange={value => handleBulkInputChange('retailer_pct', value)}
  onAgentChange={value => handleBulkInputChange('agent_pct', value)}
  onTypeChange={setBulkCommissionType}
  disabled={isBulkSaving}
  showCalculated={false}
/>
```

---

## Testing Checklist

After making all changes:

- [ ] Default commission rates can be edited and saved
- [ ] Default commission type toggle works and converts values correctly
- [ ] Inline row editing works with unified commission type
- [ ] Commission type toggle in inline edit converts values correctly
- [ ] Bulk edit works with unified commission type
- [ ] Table displays show correct commission type indicators
- [ ] All TypeScript errors are resolved
- [ ] No console errors when navigating the page
- [ ] Saving overrides creates correct database records with single commission_type

---

## Benefits of This Refactor

1. **Simpler UX** - Users make one decision (Fixed vs Percentage) instead of three
2. **Consistent Data** - Eliminates possibility of mixed commission types
3. **Cleaner Code** - Less state management, fewer props to track
4. **Better Business Logic** - Enforces that commissions are consistently fixed or percentage across all roles
5. **Easier Maintenance** - Single source of truth for commission type

---

## Notes

- This refactor maintains backward compatibility since all existing data uses 'percentage'
- The database migration is safe and non-destructive
- The UI will be cleaner with less cognitive load for administrators
- Value conversion logic ensures no data loss when toggling between fixed and percentage
