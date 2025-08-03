import { createClient } from "@/utils/supabase/client";
import { ResponseType } from "../types/adminTypes";

export type CommissionGroupWithCounts = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  retailer_count: number;
  agent_count: number;
};

/**
 * Fetch all commission groups with retailer and agent counts
 */
export async function fetchCommissionGroupsWithCounts(): Promise<
  ResponseType<CommissionGroupWithCounts[]>
> {
  const supabase = createClient();
  
  try {
    // Fetch all commission groups
    const { data: groups, error: groupsError } = await supabase
      .from("commission_groups")
      .select("id, name, description, created_at")
      .order("created_at", { ascending: false });

    if (groupsError) {
      return { data: null, error: groupsError };
    }

    // For each group, get retailer and agent counts
    const groupsWithCounts: CommissionGroupWithCounts[] = [];

    for (const group of groups) {
      // Count retailers in this commission group
      const { count: retailerCount, error: retailerError } = await supabase
        .from("retailers")
        .select("id", { count: "exact", head: true })
        .eq("commission_group_id", group.id);

      if (retailerError) {
        console.error("Error counting retailers:", retailerError);
      }

      // Count agents who have retailers in this commission group
      const { data: agentData, error: agentError } = await supabase
        .from("retailers")
        .select("agent_profile_id")
        .eq("commission_group_id", group.id)
        .not("agent_profile_id", "is", null);

      if (agentError) {
        console.error("Error counting agents:", agentError);
      }

      // Get unique agent count
      const uniqueAgents = new Set(agentData?.map(r => r.agent_profile_id) || []);
      const agentCount = uniqueAgents.size;

      groupsWithCounts.push({
        id: group.id,
        name: group.name,
        description: group.description,
        created_at: group.created_at,
        retailer_count: retailerCount || 0,
        agent_count: agentCount,
      });
    }

    return { data: groupsWithCounts, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Fetch a single commission group by ID
 */
export async function fetchCommissionGroupById(
  groupId: string
): Promise<ResponseType<{ id: string; name: string; description: string | null }>> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("commission_groups")
    .select("id, name, description")
    .eq("id", groupId)
    .single();

  return { data, error };
}
