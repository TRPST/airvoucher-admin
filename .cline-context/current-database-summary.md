# Database Schema

## Public Schema Tables

### 1. retailers

- **Fields:**
  - id: uuid (Primary Key)
  - user_profile_id: uuid
  - name: text
  - contact_name: text
  - contact_email: text
  - contact_number: text
  - location: text
  - agent_profile_id: uuid
  - commission_group_id: uuid
  - balance: numeric(12,2) (default 0.00)
  - credit_limit: numeric(12,2) (default 0.00)
  - credit_used: numeric(12,2) (default 0.00)
  - commission_balance: numeric(12,2) (default 0.00)
  - status: text (default 'active', values: 'active', 'suspended', 'inactive')
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone
- **Relationships:**
  - user_profile_id references profiles(id)
  - agent_profile_id references profiles(id)
  - commission_group_id references commission_groups(id)

### 2. terminals

- **Fields:**
  - id: uuid (Primary Key)
  - retailer_id: uuid
  - name: text
  - last_active: timestamp with time zone
  - status: text (default 'active', values: 'active', 'inactive')
  - auth_user_id: uuid
  - cashier_profile_id: uuid
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone
- **Relationships:**
  - retailer_id references retailers(id)
  - auth_user_id references profiles(id)
  - cashier_profile_id references profiles(id)

### 3. transactions

- **Fields:**
  - id: uuid (Primary Key)
  - type: text (values: 'deposit', 'withdrawal', 'sale', 'commission_credit', 'commission_payout', 'adjustment')
  - amount: numeric(12,2)
  - balance_after: numeric(12,2)
  - retailer_id: uuid
  - agent_profile_id: uuid
  - sale_id: uuid
  - notes: text
  - created_at: timestamp with time zone
- **Relationships:**
  - retailer_id references retailers(id)
  - agent_profile_id references profiles(id)
  - sale_id references sales(id)

### 4. profiles

- **Fields:**
  - id: uuid (Primary Key, references auth.users)
  - role: text (values: 'admin', 'retailer', 'agent', 'terminal', 'cashier')
  - full_name: text
  - email: text
  - phone: text
  - avatar_url: text
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone
- **Relationships:**
  - id references auth.users(id)

### 5. sales

- **Fields:**
  - id: uuid (Primary Key)
  - terminal_id: uuid
  - voucher_inventory_id: uuid
  - sale_amount: numeric(12,2)
  - retailer_commission: numeric(12,2)
  - agent_commission: numeric(12,2)
  - profit: numeric(12,2)
  - ref_number: text (default '-')
  - supplier_commission: numeric(12,2) (default 0)
  - created_at: timestamp with time zone
- **Relationships:**
  - terminal_id references terminals(id)
  - voucher_inventory_id references voucher_inventory(id)

### 6. voucher_inventory

- **Fields:**
  - id: uuid (Primary Key)
  - voucher_type_id: uuid
  - amount: numeric(12,2)
  - pin: text
  - serial_number: text
  - expiry_date: date
  - status: text (default 'available', values: 'available', 'sold', 'disabled')
  - sold_at: timestamp with time zone
  - created_at: timestamp with time zone
- **Relationships:**
  - voucher_type_id references voucher_types(id)

### 7. voucher_types

- **Fields:**
  - id: uuid (Primary Key)
  - name: text
  - supplier_commission_pct: numeric(12,2)
  - category: text
  - sub_category: text
  - network_provider: text
  - website_url: text
  - instructions: text
  - help: text
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone
- **Relationships:**
  - No direct foreign key relationships, but referenced by voucher_inventory, commission_group_rates, and voucher_commission_overrides

### 8. commission_groups

- **Fields:**
  - id: uuid (Primary Key)
  - name: text
  - description: text
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone
- **Relationships:**
  - Referenced by retailers and commission_group_rates

### 9. commission_group_rates

- **Fields:**
  - id: uuid (Primary Key)
  - commission_group_id: uuid
  - voucher_type_id: uuid
  - retailer_pct: numeric(12,2)
  - agent_pct: numeric(12,2)
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone
- **Relationships:**
  - commission_group_id references commission_groups(id)
  - voucher_type_id references voucher_types(id)

### 10. voucher_commission_overrides

- **Fields:**
  - id: uuid (Primary Key)
  - voucher_type_id: uuid
  - retailer_pct: numeric(12,2)
  - agent_pct: numeric(12,2)
  - supplier_pct: numeric(12,2)
  - amount: numeric(12,2)
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone
- **Relationships:**
  - voucher_type_id references voucher_types(id)

### 11. bank_accounts

- **Fields:**
  - id: uuid (Primary Key)
  - profile_id: uuid
  - bank_name: text
  - account_holder: text
  - account_number: text
  - branch_code: text
  - account_type: text
  - is_primary: boolean (default true)
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone
- **Relationships:**
  - profile_id references profiles(id)

## Auth Schema Tables

### 1. auth.users

- **Fields:**
  - id: uuid (Primary Key)
  - email: text
  - phone: text
  - encrypted_password: text
  - raw_app_meta_data: jsonb
  - raw_user_meta_data: jsonb
  - last_sign_in_at: timestamp with time zone
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone
- **Relationships:**
  - Referenced by profiles(id)

### 2. auth.identities

- **Fields:**
  - id: uuid (Primary Key)
  - user_id: uuid
  - provider: text
  - identity_data: jsonb
  - last_sign_in_at: timestamp with time zone
- **Relationships:**
  - user_id references auth.users(id)
