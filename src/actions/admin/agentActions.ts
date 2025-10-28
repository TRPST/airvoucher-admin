import { createClient } from "@/utils/supabase/client";
import { Agent, ResponseType } from "../types/adminTypes";

/**
 * Fetch all agents with their profile and performance information
 */
export async function fetchAgents(): Promise<ResponseType<Agent[]>> {
  const supabase = createClient();
  try {
    // Step 1: Fetch all profiles with agent role
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        phone,
        status,
        avatar_url,
        created_at,
        updated_at
      `)
      .eq("role", "agent")
      .order("full_name");

    if (profilesError) {
      return { data: null, error: profilesError };
    }

    if (!profiles || profiles.length === 0) {
      return { data: [], error: null };
    }

    // Step 2: For each agent, calculate performance metrics
    const agentIds = profiles.map(p => p.id);
    
    // Get retailer counts
    const { data: retailerCounts, error: retailerError } = await supabase
      .from("retailers")
      .select("agent_profile_id", { count: "exact" })
      .in("agent_profile_id", agentIds);

    if (retailerError) {
      console.warn("Error fetching retailer counts:", retailerError);
    }

    // Group retailer counts by agent
    const retailerCountMap = new Map<string, number>();
    if (retailerCounts) {
      agentIds.forEach(agentId => {
        const count = retailerCounts.filter(r => r.agent_profile_id === agentId).length;
        retailerCountMap.set(agentId, count);
      });
    }

    // Get current date ranges for performance calculations
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

    // Get sales data for performance metrics
    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select(`
        id,
        created_at,
        agent_commission,
        terminals!inner(
          retailer_id,
          retailers!inner(agent_profile_id)
        )
      `)
      .gte("created_at", firstDayOfYear);

    if (salesError) {
      console.warn("Error fetching sales data:", salesError);
    }

    // Calculate performance metrics for each agent
    const agents: Agent[] = profiles.map(profile => {
      const agentSales = salesData?.filter((sale: any) => 
        sale.terminals?.retailers?.agent_profile_id === profile.id
      ) || [];

      const mtdSales = agentSales.filter((sale: any) => 
        new Date(sale.created_at) >= new Date(firstDayOfMonth)
      );

      const mtdSalesCount = mtdSales.length;
      const mtdCommission = mtdSales.reduce((sum: number, sale: any) => 
        sum + (sale.agent_commission || 0), 0
      );

      const ytdCommission = agentSales.reduce((sum: number, sale: any) => 
        sum + (sale.agent_commission || 0), 0
      );

      // Determine status based on recent activity
      const hasRecentSales = agentSales.some((sale: any) => {
        const saleDate = new Date(sale.created_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return saleDate >= thirtyDaysAgo;
      });

      const hasActiveRetailers = (retailerCountMap.get(profile.id) || 0) > 0;
      const storedStatus = (profile.status as Agent["status"] | null) ?? null;
      const status =
        storedStatus ??
        ((hasActiveRetailers && hasRecentSales) ? "active" : "inactive");

      return {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        status,
        retailer_count: retailerCountMap.get(profile.id) || 0,
        mtd_sales: mtdSalesCount,
        mtd_commission: mtdCommission,
        ytd_commission: ytdCommission,
        total_commission_earned: ytdCommission, // For now, use YTD as total
      };
    });

    return { data: agents, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Fetch a specific agent by ID with detailed information
 */
export async function fetchAgentById(agentId: string): Promise<ResponseType<Agent>> {
  const supabase = createClient();
  try {
    // First get the agent profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        phone,
        status,
        avatar_url,
        created_at,
        updated_at
      `)
      .eq("id", agentId)
      .eq("role", "agent")
      .single();

    if (profileError) {
      return { data: null, error: profileError };
    }

    if (!profile) {
      return { data: null, error: new Error("Agent not found") };
    }

    // Get retailer count
    const { data: retailerCount, error: retailerError } = await supabase
      .from("retailers")
      .select("id", { count: "exact" })
      .eq("agent_profile_id", agentId);

    if (retailerError) {
      console.warn("Error fetching retailer count:", retailerError);
    }

    // Get performance metrics
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

    // Get sales data for this agent
    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select(`
        id,
        created_at,
        agent_commission,
        terminals!inner(
          retailer_id,
          retailers!inner(agent_profile_id)
        )
      `)
      .eq("terminals.retailers.agent_profile_id", agentId)
      .gte("created_at", firstDayOfYear);

    if (salesError) {
      console.warn("Error fetching sales data:", salesError);
    }

    const agentSales = salesData || [];

    const mtdSales = agentSales.filter((sale: any) => 
      new Date(sale.created_at) >= new Date(firstDayOfMonth)
    );

    const mtdSalesCount = mtdSales.length;
    const mtdCommission = mtdSales.reduce((sum: number, sale: any) => 
      sum + (sale.agent_commission || 0), 0
    );

    const ytdCommission = agentSales.reduce((sum: number, sale: any) => 
      sum + (sale.agent_commission || 0), 0
    );

    // Determine status
    const hasRecentSales = agentSales.some((sale: any) => {
      const saleDate = new Date(sale.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return saleDate >= thirtyDaysAgo;
    });

    const hasActiveRetailers = (retailerCount?.length || 0) > 0;
    const storedStatus = (profile.status as Agent["status"] | null) ?? null;
    const status =
      storedStatus ??
      ((hasActiveRetailers && hasRecentSales) ? "active" : "inactive");

    const agent: Agent = {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      status,
      retailer_count: retailerCount?.length || 0,
      mtd_sales: mtdSalesCount,
      mtd_commission: mtdCommission,
      ytd_commission: ytdCommission,
      total_commission_earned: ytdCommission,
    };

    return { data: agent, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Update agent profile information
 */
export async function updateAgent(
  agentId: string,
  updates: {
    full_name?: string;
    email?: string;
    phone?: string;
    avatar_url?: string;
    status?: "active" | "inactive";
  }
): Promise<ResponseType<{ id: string }>> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentId)
    .eq("role", "agent")
    .select("id")
    .single();

  return { data, error };
}

/**
 * Fetch retailers assigned to a specific agent
 */
export async function fetchAgentRetailers(agentId: string): Promise<ResponseType<any[]>> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("retailers")
      .select(`
        id,
        name,
        status,
        balance,
        commission_balance,
        location,
        profiles!retailers_user_profile_id_fkey(full_name, email)
      `)
      .eq("agent_profile_id", agentId)
      .order("name");

    if (error) {
      return { data: null, error };
    }

    // Transform the data to match expected format
    const retailers = data?.map(retailer => ({
      id: retailer.id,
      name: retailer.name,
      status: retailer.status,
      balance: retailer.balance || 0,
      commission_balance: retailer.commission_balance || 0,
      location: retailer.location,
      contact_name: retailer.profiles?.[0]?.full_name || "",
      email: retailer.profiles?.[0]?.email || "",
    })) || [];

    return { data: retailers, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Create a new agent with profile and authentication
 */
export async function createAgent(params: {
  profileData: {
    full_name: string;
    email: string;
    phone?: string;
    status: "active" | "inactive";
  };
  password: string;
}): Promise<ResponseType<{ id: string }>> {
  const supabase = createClient();
  
  try {
    // Use the API route to create a user (this calls the server-side admin client)
    const response = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.profileData.email,
        password: params.password,
        userData: {
          role: "agent",
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
        error: new Error("Failed to create user in authentication system"),
      };
    }

    // Create the profile linked to the new user ID
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: user.id, // Use the UUID from Supabase auth
        role: "agent",
        full_name: params.profileData.full_name,
        email: params.profileData.email,
        phone: params.profileData.phone,
        status: params.profileData.status,
      })
      .select("id")
      .single();

    if (profileError) {
      console.error("Error creating agent profile:", profileError);
      // We can't delete the auth user here as we don't have admin privileges
      // The user will remain in Auth but without a profile
      return { data: null, error: profileError };
    }

    return { data: profileData, error: null };
  } catch (err) {
    console.error("Unexpected error in createAgent:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Assign a retailer to an agent
 */
export async function assignRetailerToAgent(
  retailerId: string,
  agentId: string
): Promise<ResponseType<{ success: boolean }>> {
  const supabase = createClient();
  
  try {
    const { error } = await supabase
      .from("retailers")
      .update({
        agent_profile_id: agentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", retailerId);

    if (error) {
      return { data: null, error };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Remove agent assignment from a retailer
 */
export async function unassignRetailerFromAgent(
  retailerId: string
): Promise<ResponseType<{ success: boolean }>> {
  const supabase = createClient();
  
  try {
    const { error } = await supabase
      .from("retailers")
      .update({
        agent_profile_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", retailerId);

    if (error) {
      return { data: null, error };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Fetch unassigned retailers (not assigned to any agent)
 */
export async function fetchUnassignedRetailers(): Promise<ResponseType<any[]>> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("retailers")
      .select(`
        id,
        name,
        status,
        balance,
        location,
        profiles!retailers_user_profile_id_fkey(full_name, email)
      `)
      .is("agent_profile_id", null)
      .eq("status", "active")
      .order("name");

    if (error) {
      return { data: null, error };
    }

    // Transform the data to match expected format
    const retailers = data?.map(retailer => ({
      id: retailer.id,
      name: retailer.name,
      status: retailer.status,
      balance: retailer.balance || 0,
      location: retailer.location,
      contact_name: retailer.profiles?.[0]?.full_name || "",
      email: retailer.profiles?.[0]?.email || "",
    })) || [];

    return { data: retailers, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
} 
