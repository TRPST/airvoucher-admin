import { PostgrestError } from '@supabase/supabase-js';

export type Retailer = {
  id: string;
  name: string;
  contact_name: string;
  contact_email: string;
  balance: number;
  credit_limit: number;
  credit_used: number;
  commission_balance: number;
  status: 'active' | 'suspended' | 'inactive';
  full_name: string;
  email: string;
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
  auth_user_id?: string; // Now optional since it's been removed from the database
  email?: string; // Optional since we're not fetching it anymore
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
  voucher_type_name?: string;
};

export type SalesReport = {
  id: string;
  created_at: string;
  terminal_name: string;
  retailer_name: string;
  voucher_type: string;
  supplier_commission_pct: number;
  supplier_commission: number;
  amount: number;
  retailer_commission: number;
  agent_commission: number;
  profit: number;
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
};

export type RetailerData = {
  name: string;
  contact_name?: string;
  contact_email?: string;
  location?: string;
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
