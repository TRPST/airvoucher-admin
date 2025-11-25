import { PostgrestError } from '@supabase/supabase-js';

export type Retailer = {
  id: string;
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  location?: string;
  secondary_contact_name?: string;
  secondary_contact_phone?: string;
  balance: number;
  credit_limit: number;
  credit_used: number;
  commission_balance: number;
  status: 'active' | 'suspended' | 'inactive';
  full_name: string;
  email: string;
  short_code?: string;
  updated_at?: string;
  agent_name?: string;
  commission_group_name?: string;
  agent_profile_id?: string;
  commission_group_id?: string;
};

export type Agent = {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'inactive';
  retailer_count: number;
  mtd_sales: number;
  mtd_commission: number;
  ytd_commission: number;
  total_commission_earned: number;
};

export type Terminal = {
  id: string;
  name: string;
  last_active: string | null;
  status: 'active' | 'inactive';
  short_code: string;
  auth_user_id?: string; // Now optional since it's been removed from the database
  email?: string; // Optional since we're not fetching it anymore
  serial_number?: string; // Optional serial number of the terminal device
  imei_number?: string; // Optional IMEI number of the terminal device
};

export type VoucherInventory = {
  id: string;
  amount: number;
  pin: string;
  serial_number: string | null;
  expiry_date: string | null;
  status: 'available' | 'sold' | 'disabled';
  voucher_type_name: string;
};

export type VoucherType = {
  id: string;
  name: string;
  supplier_commission_pct: number;
  category: 'airtime' | 'data' | 'other' | 'bill_payment' | null;
  sub_category: 'daily' | 'weekly' | 'monthly' | null;
  network_provider: 'cellc' | 'mtn' | 'vodacom' | 'telkom' | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type NetworkProvider = 'cellc' | 'mtn' | 'vodacom' | 'telkom';
export type VoucherCategory = 'airtime' | 'data' | 'other' | 'bill_payment';
export type DataDuration = 'daily' | 'weekly' | 'monthly';

export type NetworkVoucherSummary = {
  network_provider: NetworkProvider;
  name: string;
  total_vouchers: number;
  total_value: number;
  categories: {
    airtime?: VoucherCategorySummary;
    data?: {
      daily?: VoucherCategorySummary;
      weekly?: VoucherCategorySummary;
      monthly?: VoucherCategorySummary;
    };
  };
};

export type VoucherCategorySummary = {
  voucher_count: number;
  total_value: number;
  available_count: number;
  sold_count: number;
  disabled_count: number;
};

export type CommissionGroup = {
  id: string;
  name: string;
  description?: string;
  rates: CommissionRate[];
};

export type CommissionRate = {
  id: string;
  voucher_type_id: string;
  retailer_pct: number;
  agent_pct: number;
  supplier_pct: number;
  commission_type?: 'fixed' | 'percentage';
  voucher_type_name?: string;
};

export type SalesReport = {
  id: string;
  created_at: string;
  terminal_name: string;
  terminal_short_code: string;
  retailer_name: string;
  retailer_short_code?: string;
  agent_name: string;
  commission_group_name?: string;
  commission_group_id?: string;
  voucher_type: string;
  supplier_commission_pct: number;
  supplier_commission: number;
  amount: number;
  retailer_commission: number;
  agent_commission: number;
  profit: number;
  ref_number?: string;
  // Grouped sale fields
  quantity?: number;
  sale_ids?: string[];
};

export type EarningsSummary = {
  voucher_type: string;
  total_sales: number;
  total_amount: number;
  retailer_commission: number;
  agent_commission: number;
  platform_commission: number;
};

export type InventoryReport = {
  voucher_type: string;
  available: number;
  sold: number;
  disabled: number;
};

export type ProfileData = {
  full_name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'retailer' | 'agent' | 'terminal';
  status?: 'active' | 'inactive';
};

export type RetailerData = {
  name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  location?: string;
  secondary_contact_name?: string;
  secondary_contact_phone?: string;
  agent_profile_id?: string;
  commission_group_id?: string;
  initial_balance?: number;
  credit_limit?: number;
  status?: 'active' | 'suspended' | 'inactive';
};

export type CreateRetailerParams = {
  profileData: ProfileData;
  retailerData: RetailerData;
  password: string;
};

export type ResponseType<T> = {
  data: T | null;
  error: PostgrestError | Error | null;
};

// =====================================================
// Admin Permission System Types
// =====================================================

export type PermissionKey =
  // User Management
  | 'manage_retailers'
  | 'manage_agents'
  | 'manage_terminals'
  | 'manage_admins'
  | 'reset_passwords'
  // Financial Operations
  | 'manage_deposits'
  | 'manage_credit_limits'
  | 'view_financial_data'
  // Inventory & Products
  | 'manage_vouchers'
  | 'manage_commission_groups'
  // Reports & Settings
  | 'view_reports'
  | 'manage_settings'
  // Dashboard
  | 'view_dashboard';

export const ALL_PERMISSIONS: PermissionKey[] = [
  'manage_retailers',
  'manage_agents',
  'manage_terminals',
  'manage_admins',
  'reset_passwords',
  'manage_deposits',
  'manage_credit_limits',
  'view_financial_data',
  'manage_vouchers',
  'manage_commission_groups',
  'view_reports',
  'manage_settings',
  'view_dashboard',
];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  manage_retailers: 'Manage Retailers',
  manage_agents: 'Manage Agents',
  manage_terminals: 'Manage Terminals',
  manage_admins: 'Manage Admins',
  reset_passwords: 'Reset Passwords',
  manage_deposits: 'Manage Deposits',
  manage_credit_limits: 'Manage Credit Limits',
  view_financial_data: 'View Financial Data',
  manage_vouchers: 'Manage Vouchers',
  manage_commission_groups: 'Manage Commission Groups',
  view_reports: 'View Reports',
  manage_settings: 'Manage Settings',
  view_dashboard: 'View Dashboard',
};

export const PERMISSION_DESCRIPTIONS: Record<PermissionKey, string> = {
  view_dashboard: 'Access the admin dashboard',
  manage_retailers: 'Create, edit, and delete retailer accounts',
  manage_agents: 'Create, edit, and delete agent accounts',
  manage_terminals: 'Create, edit, and delete terminal accounts',
  manage_admins: 'Create and manage other admin users',
  reset_passwords: 'Reset passwords for users',
  manage_deposits: 'Add deposits to retailer accounts',
  manage_credit_limits: 'Adjust credit limits and balances',
  view_financial_data: 'View balance and financial information',
  manage_vouchers: 'Upload and manage voucher inventory',
  manage_commission_groups: 'Create and edit commission structures',
  view_reports: 'Access the reports section',
  manage_settings: 'Access and modify system settings',
};

export const PERMISSION_CATEGORIES = {
  Dashboard: ['view_dashboard'] as PermissionKey[],
  'User Management': [
    'manage_retailers',
    'manage_agents',
    'manage_terminals',
    'manage_admins',
    'reset_passwords',
  ] as PermissionKey[],
  'Financial Operations': [
    'manage_deposits',
    'manage_credit_limits',
    'view_financial_data',
  ] as PermissionKey[],
  'Inventory & Products': ['manage_vouchers', 'manage_commission_groups'] as PermissionKey[],
  'Reports & Settings': ['view_reports', 'manage_settings'] as PermissionKey[],
};

export type AdminPermission = {
  id: string;
  admin_profile_id: string;
  permission_key: PermissionKey;
  created_at: string;
  updated_at: string;
};

export type AdminUser = {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  is_super_admin: boolean;
  permissions: PermissionKey[];
  created_at: string;
  updated_at: string;
  status: 'active' | 'inactive';
};

export type CreateAdminParams = {
  profileData: {
    full_name: string;
    email: string;
    phone?: string;
  };
  password: string;
  is_super_admin?: boolean;
  permissions?: PermissionKey[];
};
