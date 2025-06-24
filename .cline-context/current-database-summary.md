# Database Summary

## Tables

### 1. bank_accounts

- **Fields:**
  - id: uuid (Primary Key)
  - profile_id: uuid (Foreign Key)
  - bank_name: text
  - account_holder: text
  - account_number: text
  - branch_code: text
  - account_type: text
  - is_primary: boolean
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone
- **Relationships:**
  - profile_id references profiles(id)

### 2. commission_group_rates

- **Fields:**
  - id: uuid (Primary Key)
  - commission_group_id: uuid (Foreign Key)
  - voucher_type_id: uuid (Foreign Key)
  - retailer_pct: numeric(5,2)
  - agent_pct: numeric(5,2)
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone
- **Relationships:**
  - commission_group_id references commission_groups(id)
  - voucher_type_id references voucher_types(id)

### 3. commission_groups

- **Fields:**
  - id: uuid (Primary Key)
  - name: text
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone
  - description: text

### 4. profiles

- **Fields:**
  - id: uuid (Primary Key, Foreign Key)
  - role: text
  - full_name: text
  - email: text
  - phone: text
  - avatar_url: text
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone
- **Relationships:**
  - id references auth.users(id)

### 5. retailers

- **Fields:**
  - id: uuid (Primary Key)
  - user_profile_id: uuid (Foreign Key)
  - name: text
  - contact_name: text
  - contact_email: text
  - location: text
  - agent_profile_id: uuid (Foreign Key)
  - commission_group_id: uuid (Foreign Key)
  - balance: numeric(12,2)
  - credit_limit: numeric(12,2)
  - credit_used: numeric(12,2)
  - commission_balance: numeric(12,2)
  - status: text
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone
  - contact_number: text
- **Relationships:**
  - user_profile_id references profiles(id)
  - agent_profile_id references profiles(id)
  - commission_group_id references commission_groups(id)

### 6. sales

- **Fields:**
  - id: uuid (Primary Key)
  - terminal_id: uuid (Foreign Key)
  - voucher_inventory_id: uuid (Foreign Key)
  - sale_amount: numeric(12,2)
  - retailer_commission: numeric(12,2)
  - agent_commission: numeric(12,2)
  - created_at: timestamp with time zone
  - profit: numeric
  - ref_number: text
  - supplier_commission: numeric
- **Relationships:**
  - terminal_id references terminals(id)
  - voucher_inventory_id references voucher_inventory(id)

### 7. terminals

- **Fields:**
  - id: uuid (Primary Key)
  - retailer_id: uuid (Foreign Key)
  - name: text
  - last_active: timestamp with time zone
  - status: text
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone
  - auth_user_id: uuid (Foreign Key)
  - cashier_profile_id: uuid (Foreign Key)
- **Relationships:**
  - retailer_id references retailers(id)
  - auth_user_id references profiles(id)
  - cashier_profile_id references profiles(id)

### 8. transactions

- **Fields:**
  - id: uuid (Primary Key)
  - type: text
  - amount: numeric(12,2)
  - balance_after: numeric(12,2)
  - retailer_id: uuid (Foreign Key)
  - agent_profile_id: uuid (Foreign Key)
  - sale_id: uuid (Foreign Key)
  - notes: text
  - created_at: timestamp with time zone
- **Relationships:**
  - retailer_id references retailers(id)
  - agent_profile_id references profiles(id)
  - sale_id references sales(id)

### 9. voucher_commission_overrides

- **Fields:**
  - id: uuid (Primary Key)
  - voucher_type_id: uuid (Foreign Key)
  - retailer_pct: numeric(5,2)
  - agent_pct: numeric(5,2)
  - supplier_pct: numeric(5,2)
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone
  - amount: numeric
- **Relationships:**
  - voucher_type_id references voucher_types(id)

### 10. voucher_inventory

- **Fields:**
  - id: uuid (Primary Key)
  - voucher_type_id: uuid (Foreign Key)
  - amount: numeric(12,2)
  - pin: text
  - serial_number: text
  - expiry_date: date
  - status: text
  - created_at: timestamp with time zone
  - sold_at: timestamp with time zone
- **Relationships:**
  - voucher_type_id references voucher_types(id)

### 11. voucher_types

- **Fields:**
  - id: uuid (Primary Key)
  - name: text
  - supplier_commission_pct: numeric(5,2)
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone
