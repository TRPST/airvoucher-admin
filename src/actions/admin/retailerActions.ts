import { createClient } from '@/utils/supabase/client';
import {
  Retailer,
  RetailerData,
  ProfileData,
  CreateRetailerParams,
  ResponseType,
} from '../types/adminTypes';

/**
 * Fetch all retailers with their profile and agent information
 */
export async function fetchRetailers(): Promise<ResponseType<Retailer[]>> {
  const supabase = createClient();
  try {
    // Step 1: Fetch all retailers ordered by creation date (newest first)
    const { data, error } = await supabase
      .from('retailers')
      .select(
        `
      id,
      name,
      contact_name,
      contact_email,
      contact_phone,
      location,
      secondary_contact_name,
      secondary_contact_phone,
      balance,
      credit_limit,
      credit_used,
      commission_balance,
      status,
      agent_profile_id,
      commission_group_id,
      short_code,
      updated_at,
      profiles!retailers_user_profile_id_fkey(full_name, email),
      agent_profiles:profiles!retailers_agent_profile_id_fkey(id, full_name)
    `
      )
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error };
    }

    // Step 2: Collect unique commission_group_ids
    const groupIds = Array.from(new Set(data.map(r => r.commission_group_id).filter(Boolean)));

    // Step 3: Fetch all commission groups for those IDs
    let groupMap: Record<string, string> = {};
    if (groupIds.length > 0) {
      const { data: groups, error: groupError } = await supabase
        .from('commission_groups')
        .select('id, name')
        .in('id', groupIds);

      if (groupError) {
        return { data: null, error: groupError };
      }

      groupMap = Object.fromEntries(groups.map((g: any) => [g.id, g.name]));
    }

    // Step 4: Map commission group name to each retailer
    const retailers = data.map((retailer: any) => ({
      id: retailer.id,
      name: retailer.name,
      contact_name: retailer.contact_name || '',
      contact_email: retailer.contact_email || '',
      contact_phone: retailer.contact_phone || undefined,
      location: retailer.location || '',
      secondary_contact_name: retailer.secondary_contact_name || undefined,
      secondary_contact_phone: retailer.secondary_contact_phone || undefined,
      balance: retailer.balance || 0,
      credit_limit: retailer.credit_limit || 0,
      credit_used: retailer.credit_used || 0,
      commission_balance: retailer.commission_balance || 0,
      status: retailer.status as 'active' | 'suspended' | 'inactive',
      full_name: retailer.profiles?.full_name || '',
      email: retailer.profiles?.email || '',
      short_code: retailer.short_code || undefined,
      updated_at: retailer.updated_at || undefined,
      agent_name: retailer.agent_profiles?.full_name,
      commission_group_name: retailer.commission_group_id
        ? groupMap[retailer.commission_group_id] || undefined
        : undefined,
      agent_profile_id: retailer.agent_profile_id,
      commission_group_id: retailer.commission_group_id,
    }));

    return { data: retailers, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Create a new retailer with a profile
 */
export async function createRetailer({
  profileData,
  retailerData,
  password,
}: CreateRetailerParams): Promise<ResponseType<{ id: string }>> {
  const supabase = createClient();

  try {
    // Use the API route to create a user (this calls the server-side admin client)
    const response = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: profileData.email,
        password: password,
        userData: {
          role: 'retailer',
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { data: null, error: new Error(errorData.error || 'Failed to create user') };
    }

    const { user } = await response.json();

    if (!user) {
      return {
        data: null,
        error: new Error('Failed to create user in authentication system'),
      };
    }

    // Next, create the profile linked to the new user ID
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id, // Use the UUID from Supabase auth
        full_name: profileData.full_name,
        email: profileData.email,
        phone: profileData.phone,
        role: 'retailer',
      })
      .select('id')
      .single();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // We can't delete the auth user here as we don't have admin privileges
      // The user will remain in Auth but without a profile
      return { data: null, error: profileError };
    }

    // Finally, create the retailer
    const { data: retailer, error: retailerError } = await supabase
      .from('retailers')
      .insert({
        user_profile_id: profiles.id, // This should be the same as user.id
        name: retailerData.name,
        contact_name: retailerData.contact_name,
        contact_email: retailerData.contact_email,
        contact_phone: retailerData.contact_phone,
        location: retailerData.location,
        secondary_contact_name: retailerData.secondary_contact_name,
        secondary_contact_phone: retailerData.secondary_contact_phone,
        agent_profile_id: retailerData.agent_profile_id,
        commission_group_id: retailerData.commission_group_id,
        balance: retailerData.initial_balance || 0,
        credit_limit: retailerData.credit_limit || 0,
        status: retailerData.status || 'active',
      })
      .select('id')
      .single();

    if (retailerError) {
      console.error('Error creating retailer:', retailerError);
      // We can't delete the auth user here without admin privileges
      // Just return the error to the client
      return { data: null, error: retailerError };
    }

    return { data: retailer, error: null };
  } catch (error) {
    console.error('Unexpected error in createRetailer:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Update an existing retailer
 */
export async function updateRetailer(
  id: string,
  updates: Partial<RetailerData>
): Promise<ResponseType<{ id: string }>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('retailers')
    .update(updates)
    .eq('id', id)
    .select('id')
    .single();

  return { data, error };
}

/**
 * Update retailer balance and credit limit
 */
export async function updateRetailerBalance(
  id: string,
  balance: number,
  creditLimit: number
): Promise<ResponseType<{ id: string }>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('retailers')
    .update({
      balance: balance,
      credit_limit: creditLimit,
    })
    .eq('id', id)
    .select('id')
    .single();

  return { data, error };
}

/**
 * Fetch all profiles with agent role
 */
export async function fetchAgents(): Promise<ResponseType<{ id: string; full_name: string }[]>> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'agent')
      .order('full_name');

    if (error) {
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
