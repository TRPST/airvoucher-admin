# Per-Voucher Commission Override Refactor — Admin App

## Context & Motivation

Previously, commission overrides in the admin app were managed per individual voucher (`voucher_inventory_id`). This was inflexible and confusing for admins, who needed to set commission rates for all vouchers of a given denomination (e.g., all R10 Easyload vouchers), not just one. The new approach allows overrides to be set per voucher type and amount, greatly improving usability and maintainability.

---

## Key Changes

### 1. **Data Model**

- **Old:** Overrides were stored by `voucher_inventory_id` (one record per voucher).
- **New:** Overrides are now stored by `voucher_type_id` and `amount` (one record per type+denomination).
- **Table:** `voucher_commission_overrides`
  - `voucher_type_id` (string)
  - `amount` (number)
  - `supplier_pct` (number)
  - `retailer_pct` (number)
  - `agent_pct` (number)

### 2. **Supabase Actions**

- All DB queries are now in `@/actions/admin/commissionOverrideActions.ts`.
- Fetch, upsert, and list overrides by `voucher_type_id` and `amount` only.
- No logic references `voucher_inventory_id`.

### 3. **UI/UX**

- On `/admin/vouchers/[type]`, each row in the voucher denomination table has a **Manage Commissions** button.
- A settings (⚙️) icon appears if an override exists for that type+amount.
- The modal uses a consistent, theme-aware dialog (Radix + Tailwind) for editing overrides.
- All table headings are left-aligned and sortable, with clear up/down arrows indicating sortability and active sort state.
- Toast notifications provide feedback on save/failure.

### 4. **Logic**

- When opening the modal, the app fetches the override for the current `voucher_type_id` and `amount`.
- On save, the app upserts the override for that pair.
- The override icon is shown if any override exists for that type+amount, even after reload.
- All error handling and input validation (0-100%) is enforced in the modal.

### 5. **Developer Notes**

- All Supabase queries are made from the `@/actions` folder, never directly in components/pages.
- The override fetch is efficient: all overrides for a voucher type are loaded in one query.
- The modal and table are fully dark/light mode compatible.
- The code uses React hooks and idiomatic patterns for state, effects, and UI updates.

### 6. **User Experience**

- Admins can now easily manage commission overrides for all vouchers of a given denomination.
- The UI clearly indicates which denominations have custom overrides.
- Sorting and searching are intuitive and visually clear.
- All changes are immediately reflected and persist after reload.

### 7. **Migration/Upgrade Notes**

- Ensure the `voucher_commission_overrides` table is migrated to use `voucher_type_id` and `amount` as the unique constraint.
- Remove any legacy code or data referencing `voucher_inventory_id` for overrides.

### 8. **Example UX (Screenshots)**

- **Table:** Each row shows a Manage Commissions button and, if applicable, a settings icon.
- **Modal:** Clean, accessible dialog with fields for supplier, retailer, and agent commission (%), with validation and Save/Cancel.
- **Sorting:** All headings show up/down arrows; active sort is highlighted.

---

## Summary

This refactor brings the commission override system in line with real-world admin needs, improves code maintainability, and delivers a much better user experience for managing voucher commissions at scale.
