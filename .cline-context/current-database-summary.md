# Database Schema Overview

## Public Schema Tables

### 1. Profiles (`profiles`)
- **Purpose**: User profile management
- **Columns**:
  - `id` (UUID, Primary Key): Linked to auth.users
  - `role` (Text): User role (admin, retailer, agent, terminal, cashier)
  - `full_name` (Text)
  - `email` (Text)
  - `phone` (Text, Nullable)
  - `avatar_url` (Text, Nullable)
  - `created_at` (Timestamp)
  - `updated_at` (Timestamp)

### 2. Retailers (`retailers`)
- **Purpose**: Retailer account management
- **Columns**:
  - `id` (UUID, Primary Key)
  - `user_profile_id` (UUID, Foreign Key to profiles)
  - `name` (Text)
  - `contact_name` (Text, Nullable)
  - `contact_email` (Text, Nullable)
  - `contact_number` (Text, Nullable)
  - `location` (Text, Nullable)
  - `agent_profile_id` (UUID, Foreign Key to profiles, Nullable)
  - `commission_group_id` (UUID, Foreign Key to commission_groups, Nullable)
  - `balance` (Numeric)
  - `credit_limit` (Numeric)
  - `credit_used` (Numeric)
  - `commission_balance` (Numeric)
  - `status` (Text: active, suspended, inactive)
  - `created_at` (Timestamp)
  - `updated_at` (Timestamp)

### 3. Terminals (`terminals`)
- **Purpose**: Point of sale terminal management
- **Columns**:
  - `id` (UUID, Primary Key)
  - `retailer_id` (UUID, Foreign Key to retailers)
  - `name` (Text)
  - `auth_user_id` (UUID, Foreign Key to profiles, Nullable)
  - `cashier_profile_id` (UUID, Foreign Key to profiles, Nullable)
  - `last_active` (Timestamp, Nullable)
  - `status` (Text: active, inactive)
  - `created_at` (Timestamp)
  - `updated_at` (Timestamp)

### 4. Voucher Types (`voucher_types`)
- **Purpose**: Define types of vouchers
- **Columns**:
  - `id` (UUID, Primary Key)
  - `name` (Text)
  - `supplier_commission_pct` (Numeric)
  - `category` (Text, Nullable: airtime, data, other)
  - `sub_category` (Text, Nullable: daily, weekly, monthly)
  - `network_provider` (Text, Nullable: cellc, mtn, vodacom, telkom)
  - `website_url` (Text, Nullable)
  - `instructions` (Text, Nullable)
  - `help` (Text, Nullable)
  - `created_at` (Timestamp)
  - `updated_at` (Timestamp)

### 5. Voucher Inventory (`voucher_inventory`)
- **Purpose**: Track voucher stock
- **Columns**:
  - `id` (UUID, Primary Key)
  - `voucher_type_id` (UUID, Foreign Key to voucher_types)
  - `amount` (Numeric)
  - `pin` (Text)
  - `serial_number` (Text, Nullable)
  - `expiry_date` (Date, Nullable)
  - `status` (Text: available, sold, disabled)
  - `sold_at` (Timestamp, Nullable)
  - `created_at` (Timestamp)

### 6. Sales (`sales`)
- **Purpose**: Record sales transactions
- **Columns**:
  - `id` (UUID, Primary Key)
  - `terminal_id` (UUID, Foreign Key to terminals, Nullable)
  - `voucher_inventory_id` (UUID, Foreign Key to voucher_inventory)
  - `sale_amount` (Numeric)
  - `retailer_commission` (Numeric)
  - `agent_commission` (Numeric)
  - `profit` (Numeric, Nullable)
  - `ref_number` (Text)
  - `supplier_commission` (Numeric)
  - `created_at` (Timestamp)

### 7. Transactions (`transactions`)
- **Purpose**: Financial transaction tracking
- **Columns**:
  - `id` (UUID, Primary Key)
  - `type` (Text: deposit, withdrawal, sale, commission_credit, commission_payout, adjustment)
  - `amount` (Numeric)
  - `balance_after` (Numeric)
  - `retailer_id` (UUID, Foreign Key to retailers, Nullable)
  - `agent_profile_id` (UUID, Foreign Key to profiles, Nullable)
  - `sale_id` (UUID, Foreign Key to sales, Nullable)
  - `notes` (Text, Nullable)
  - `created_at` (Timestamp)

### 8. Commission Groups (`commission_groups`)
- **Purpose**: Define commission rate groups
- **Columns**:
  - `id` (UUID, Primary Key)
  - `name` (Text)
  - `description` (Text, Nullable)
  - `created_at` (Timestamp)
  - `updated_at` (Timestamp)

### 9. Commission Group Rates (`commission_group_rates`)
- **Purpose**: Define commission rates for voucher types within commission groups
- **Columns**:
  - `id` (UUID, Primary Key)
  - `commission_group_id` (UUID, Foreign Key to commission_groups)
  - `voucher_type_id` (UUID, Foreign Key to voucher_types)
  - `retailer_pct` (Numeric)
  - `agent_pct` (Numeric)
  - `created_at` (Timestamp)
  - `updated_at` (Timestamp)

### 10. Voucher Commission Overrides (`voucher_commission_overrides`)
- **Purpose**: Override default commission rates
- **Columns**:
  - `id` (UUID, Primary Key)
  - `voucher_type_id` (UUID, Foreign Key to voucher_types, Nullable)
  - `commission_group_id` (UUID, Foreign Key to commission_groups, Nullable)
  - `amount` (Numeric)
  - `retailer_pct` (Numeric, Nullable)
  - `agent_pct` (Numeric, Nullable)
  - `supplier_pct` (Numeric, Nullable)
  - `created_at` (Timestamp)
  - `updated_at` (Timestamp)

### 11. Bank Accounts (`bank_accounts`)
- **Purpose**: Store bank account details for profiles
- **Columns**:
  - `id` (UUID, Primary Key)
  - `profile_id` (UUID, Foreign Key to profiles, Nullable)
  - `bank_name` (Text)
  - `account_holder` (Text)
  - `account_number` (Text)
  - `branch_code` (Text, Nullable)
  - `account_type` (Text, Nullable)
  - `is_primary` (Boolean)
  - `created_at` (Timestamp)
  - `updated_at` (Timestamp)

## Auth Schema Tables

### 1. Users (`auth.users`)
- Manages user authentication and core user information
- Includes fields like email, password, last sign-in, metadata

### 2. Other Auth Tables
- Sessions
- Identities
- MFA Factors
- Refresh Tokens
- SSO Providers

## Storage Schema Tables
- Manages file storage and bucket information
- Tracks uploaded objects, multipart uploads

## Relationships
- Profiles are linked to `auth.users`
- Retailers, Terminals, Sales, and Transactions have interconnected relationships
- Commission Groups and Rates provide flexible commission structures