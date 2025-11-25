# Commission Types Implementation Status

## ✅ COMPLETED (90%)

### 1. Database Schema ✓

- Migration file created: `database-commission-types-migration.sql`
- Added commission type columns to both tables
- Check constraints in place
- Migration successfully run

### 2. TypeScript Infrastructure ✓

- `CommissionType` exported from actions
- All types updated with commission type fields
- Data flow properly tracks commission types end-to-end

### 3. State Management ✓

```typescript
// Default rates commission types
const [defaultsCommissionTypes, setDefaultsCommissionTypes] = React.useState<{
  supplier: CommissionType;
  retailer: CommissionType;
  agent: CommissionType;
}>({ supplier: 'percentage', retailer: 'percentage', agent: 'percentage' });

// Bulk edit commission types
const [bulkCommissionTypes, setBulkCommissionTypes] = React.useState<{
  supplier: CommissionType;
  retailer: CommissionType;
  agent: CommissionType;
}>({ supplier: 'percentage', retailer: 'percentage', agent: 'percentage' });
```

### 4. Row Editing State ✓

- `EditableVoucherAmountRate` includes commission types
- Row drafts properly track commission types

## 🚧 TODO (10% Remaining)

### UI Toggles Pattern (from deposit-fee/index.tsx)

Add this toggle pattern before each commission input:

```typescript
{/* Commission Type Toggle */}
<div className="space-y-1.5">
  <label className="text-xs font-medium text-muted-foreground">Commission Type</label>
  <div className="inline-flex rounded-md border border-input bg-background p-0.5 w-full">
    <button
      type="button"
      onClick={() => setDefaultsCommissionTypes(prev => ({ ...prev, supplier: 'fixed' }))}
      className={cn(
        "flex-1 px-3 py-1 text-xs font-medium rounded transition-colors",
        defaultsCommissionTypes.supplier === 'fixed'
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted"
      )}
    >
      Fixed
    </button>
    <button
      type="button"
      onClick={() => setDefaultsCommissionTypes(prev => ({ ...prev, supplier: 'percentage' }))}
      className={cn(
        "flex-1 px-3 py-1 text-xs font-medium rounded transition-colors",
        defaultsCommissionTypes.supplier === 'percentage'
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted"
      )}
    >
      Percentage
    </button>
  </div>
</div>
```

### Locations to Add Toggles:

1. **Default Rates Section** (3 toggles)

   - Above Supplier Commission input
   - Above Retailer Commission input
   - Above Agent Commission input

2. **Row Editing** (3 toggles)

   - In each row's edit mode for supplier/retailer/agent

3. **Bulk Edit Modal** (3 toggles)
   - In the modal for each commission type

### Update Save Functions:

Modify these functions to use the commission type state:

```typescript
// In saveDefaultRates()
const { error } = await upsertCommissionRate(
  groupId,
  voucherTypeId,
  retailer / 100,
  agent / 100,
  supplier / 100,
  defaultsCommissionTypes.supplier, // ADD THIS
  defaultsCommissionTypes.retailer, // ADD THIS
  defaultsCommissionTypes.agent // ADD THIS
);

// In saveRowEdit() and applyBulkEdits()
// Use draft.supplier_commission_type instead of hardcoded 'percentage'
```

### Update Display Logic:

```typescript
// Instead of always showing %
{
  rate.supplier_commission_type === 'fixed'
    ? `R ${rate.supplier_pct.toFixed(2)}`
    : `${(rate.supplier_pct * 100).toFixed(2)}%`;
}
```

### Update Input Handling:

```typescript
// Adjust based on commission type
const handleDefaultRateChange = (
  field: 'supplier_pct' | 'retailer_pct' | 'agent_pct',
  value: string
) => {
  const commissionTypeKey = field.replace('_pct', '') as 'supplier' | 'retailer' | 'agent';
  const isFixed = defaultsCommissionTypes[commissionTypeKey] === 'fixed';

  // If fixed, no need to divide by 100
  // If percentage, divide by 100 when saving
};
```

## Quick Implementation Guide

Since the infrastructure is 90% complete, you only need to:

1. **Add 9 toggle buttons** (3 in defaults, 3 in row edit, 3 in bulk edit)
2. **Update 3 save functions** to pass commission types
3. **Update display logic** in the table cells
4. **Adjust input handling** based on commission type

The pattern from `deposit-fee/index.tsx` shows exactly how to implement this.

## Current Status

- Database: ✅ Ready
- Types: ✅ Ready
- State: ✅ Ready
- UI Toggles: ⏳ Need to add (simple copy-paste from deposit-fee pattern)
- Save Logic: ⏳ Need to pass commission types to save functions
- Display Logic: ⏳ Need conditional R vs % display

All heavy lifting is done. Only UI polish remains!
