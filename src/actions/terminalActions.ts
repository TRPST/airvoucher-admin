import { createClient } from "@/utils/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import { VoucherSaleReceipt, completeVoucherSale } from "@/lib/sale/completeVoucherSale";

export type TerminalProfile = {
  id: string;
  name: string;
  retailer_id: string;
  status: string;
  created_at: string;
  retailer_name?: string;
  retailer_balance?: number;
  retailer_credit_limit?: number;
  retailer_credit_used?: number;
  retailer_commission_balance?: number;
};

export type VoucherType = {
  id: string;
  name: string;
  amount: number;
  count: number;
  supplier_commission_pct: number;
};

/**
 * Fetch terminal profile by user profile ID (creates a virtual terminal for each user)
 */
export async function fetchTerminalProfile(userId: string): Promise<{
  data: TerminalProfile | null;
  error: PostgrestError | Error | null;
}> {
  const supabase = createClient();
  
  try {
    // First, check if there's an existing terminal for this user profile
    const { data: existingTerminal, error: terminalLookupError } = await supabase
      .from("terminals")
      .select(`
        id,
        name,
        retailer_id,
        status,
        created_at,
        retailers!inner (
          name,
          balance,
          credit_limit,
          credit_used,
          commission_balance
        )
      `)
      .eq("id", userId)
      .single();

    // If we found an existing terminal, return it
    if (!terminalLookupError && existingTerminal) {
      const terminalProfile: TerminalProfile = {
        id: existingTerminal.id,
        name: existingTerminal.name,
        retailer_id: existingTerminal.retailer_id,
        status: existingTerminal.status,
        created_at: existingTerminal.created_at,
        retailer_name: (existingTerminal.retailers as any)?.name,
        retailer_balance: (existingTerminal.retailers as any)?.balance,
        retailer_credit_limit: (existingTerminal.retailers as any)?.credit_limit,
        retailer_credit_used: (existingTerminal.retailers as any)?.credit_used,
        retailer_commission_balance: (existingTerminal.retailers as any)?.commission_balance,
      };

      return { data: terminalProfile, error: null };
    }

    // If no terminal found, look for a retailer that has this user as their profile
    const { data: retailer, error: retailerError } = await supabase
      .from("retailers")
      .select(`
        id,
        name,
        balance,
        credit_limit,
        credit_used,
        commission_balance,
        user_profile_id
      `)
      .eq("user_profile_id", userId)
      .single();

    if (retailerError) {
      return { data: null, error: new Error(`No terminal or retailer found for user: ${userId}`) };
    }

    if (!retailer) {
      return { data: null, error: new Error("No retailer profile found for user") };
    }

    // Create a virtual terminal profile based on the retailer data
    const virtualTerminalProfile: TerminalProfile = {
      id: userId, // Use the user ID as the terminal ID
      name: `${retailer.name} Terminal`, // Generate a terminal name
      retailer_id: retailer.id,
      status: 'active', // Assume active status for virtual terminals
      created_at: new Date().toISOString(),
      retailer_name: retailer.name,
      retailer_balance: retailer.balance,
      retailer_credit_limit: retailer.credit_limit,
      retailer_credit_used: retailer.credit_used,
      retailer_commission_balance: retailer.commission_balance,
    };

    return { data: virtualTerminalProfile, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Fetch all available voucher type names for the terminal
 * Only returns active voucher types for sale operations
 */
export async function fetchAvailableVoucherTypes(): Promise<{
  data: string[] | null;
  error: PostgrestError | Error | null;
}> {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from("voucher_types")
      .select("name")
      .eq("is_active", true)  // Only fetch active voucher types for sales
      .order("name");
      
    if (error) {
      return { data: null, error };
    }
    
    // Extract unique voucher type names with proper typing
    const uniqueNames = [...new Set(data?.map((item: { name: string }) => item.name) || [])];
    
    return { data: uniqueNames, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Fetch all available voucher inventory options for a specific voucher type
 */
export async function fetchVoucherInventoryByType(voucherTypeName: string): Promise<{
  data: VoucherType[] | null;
  error: PostgrestError | Error | null;
}> {
  const supabase = createClient();
  
  try {
    console.log(`Fetching inventory for voucher type: ${voucherTypeName}`);

    // Get the voucher type ID(s) for this type name including supplier commission
    const { data: voucherTypes, error: voucherTypesError } = await supabase
      .from("voucher_types")
      .select("id, name, supplier_commission_pct")
      .like("name", `${voucherTypeName}%`);
      
    if (voucherTypesError) {
      console.error("Error fetching voucher type:", voucherTypesError);
      return { data: null, error: voucherTypesError };
    }
    
    if (!voucherTypes || voucherTypes.length === 0) {
      console.log(`No voucher type found with name: ${voucherTypeName}`);
      return { data: [], error: null };
    }
    
    // Get the type IDs
    const typeIds = voucherTypes.map((type: { id: string }) => type.id);
    
    // Get all available vouchers of this type with pagination to handle large inventories
    let allVouchers: any[] = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000;
    
    while (hasMore) {
      // Query vouchers with status = available
      const { data: pageData, error: pageError } = await supabase
        .from("voucher_inventory")
        .select("id, voucher_type_id, amount")
        .in("voucher_type_id", typeIds)
        .eq("status", "available")
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (pageError) {
        console.error(`Error fetching voucher inventory page ${page}:`, pageError);
        return { data: null, error: pageError };
      }
      
      if (pageData && pageData.length > 0) {
        allVouchers = [...allVouchers, ...pageData];
        page++;
        console.log(`Fetched page ${page} with ${pageData.length} vouchers. Total: ${allVouchers.length}`);
      } else {
        hasMore = false;
      }
      
      // Safety check to prevent infinite loops
      if (page > 10) {
        console.warn("Stopped pagination after 10 pages to prevent infinite loops");
        hasMore = false;
      }
    }
    
    if (allVouchers.length === 0) {
      console.log(`No available vouchers found for type: ${voucherTypeName}`);
      return { data: [], error: null };
    }
    
    // Group vouchers by amount and count them
    const amountGroups = new Map<number, { id: string, name: string, count: number, supplier_commission_pct: number }>();
    
    // Create a mapping of type IDs to names and commission rates
    const typeDataMap = new Map<string, { name: string, supplier_commission_pct: number }>();
    voucherTypes.forEach((type: { id: string; name: string; supplier_commission_pct: number }) => {
      typeDataMap.set(type.id, {
        name: type.name,
        supplier_commission_pct: type.supplier_commission_pct || 0
      });
    });
    
    // Group and count vouchers by amount
    allVouchers.forEach(voucher => {
      const amount = voucher.amount;
      const typeId = voucher.voucher_type_id;
      const typeData = typeDataMap.get(typeId);
      const typeName = typeData?.name || voucherTypeName;
      const supplierCommissionPct = typeData?.supplier_commission_pct || 0;
      
      if (!amountGroups.has(amount)) {
        amountGroups.set(amount, {
          id: typeId,
          name: typeName,
          count: 1,
          supplier_commission_pct: supplierCommissionPct
        });
      } else {
        const group = amountGroups.get(amount)!;
        group.count++;
      }
    });
    
    // Convert to array and sort by amount
    const result: VoucherType[] = Array.from(amountGroups.entries()).map(
      ([amount, group]) => ({
        id: group.id,
        name: group.name,
        amount,
        count: group.count,
        supplier_commission_pct: group.supplier_commission_pct
      })
    ).sort((a, b) => a.amount - b.amount);
    
    console.log(`Grouped ${allVouchers.length} vouchers into ${result.length} amount options for ${voucherTypeName}`);
    
    return { data: result, error: null };
  } catch (err) {
    console.error(`Unexpected error in fetchVoucherInventoryByType for ${voucherTypeName}:`, err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Fetch retailer commission data for a specific voucher sale
 */
export async function fetchRetailerCommissionData({
  retailerId,
  voucherTypeId,
  voucherValue,
}: {
  retailerId: string;
  voucherTypeId: string;
  voucherValue: number;
}): Promise<{
  data: { rate: number; amount: number; groupName: string } | null;
  error: PostgrestError | Error | null;
}> {
  const supabase = createClient();
  
  try {
    // Get retailer's commission group
    const { data: retailer, error: retailerError } = await supabase
      .from("retailers")
      .select("commission_group_id, commission_groups!inner(name)")
      .eq("id", retailerId)
      .single();

    if (retailerError) {
      return { data: null, error: retailerError };
    }

    // Get commission rate for this group and voucher type
    const { data: rateData, error: rateError } = await supabase
      .from("commission_group_rates")
      .select("retailer_pct")
      .eq("commission_group_id", retailer.commission_group_id)
      .eq("voucher_type_id", voucherTypeId)
      .single();

    if (rateError) {
      return { data: null, error: rateError };
    }

    // Get voucher type supplier commission
    const { data: voucherType, error: voucherTypeError } = await supabase
      .from("voucher_types")
      .select("supplier_commission_pct")
      .eq("id", voucherTypeId)
      .single();

    if (voucherTypeError) {
      return { data: null, error: voucherTypeError };
    }

    // Calculate commission amount
    const supplierCommission = voucherValue * (voucherType.supplier_commission_pct / 100);
    const retailerCommission = supplierCommission * rateData.retailer_pct;

    return {
      data: {
        rate: rateData.retailer_pct,
        amount: retailerCommission,
        groupName: (retailer.commission_groups as any)?.name || "Unknown",
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Sell a voucher from terminal (using virtual terminal approach)
 */
export async function sellVoucher({
  terminalId,
  voucherTypeId,
  amount,
}: {
  terminalId: string;
  voucherTypeId: string;
  amount: number;
}): Promise<{
  data: {
    sale_id: string;
    voucher: { pin: string; serial_number?: string };
    receipt: VoucherSaleReceipt | null;
  } | null;
  error: PostgrestError | Error | null;
}> {
  const supabase = createClient();
  
  try {
    // Step 1: Get one available voucher of the requested type with the correct amount
    const { data: voucher, error: voucherError } = await supabase
      .from("voucher_inventory")
      .select("id, amount, pin, serial_number, voucher_type_id")
      .eq("voucher_type_id", voucherTypeId)
      .eq("amount", amount)
      .eq("status", "available")
      .limit(1)
      .single();

    if (voucherError) {
      return { data: null, error: voucherError };
    }

    // Step 2: Get retailer information using the userId (terminalId) to find the retailer
    const { data: retailer, error: retailerError } = await supabase
      .from("retailers")
      .select("id, name, agent_profile_id, commission_group_id")
      .eq("user_profile_id", terminalId)
      .single();

    if (retailerError) {
      return { data: null, error: new Error(`No retailer found for user: ${terminalId}`) };
    }

    // Step 3: Get commission rates for this retailer's group and voucher type
    const { data: commissionRate, error: rateError } = await supabase
      .from("commission_group_rates")
      .select("retailer_pct, agent_pct")
      .eq("commission_group_id", retailer.commission_group_id)
      .eq("voucher_type_id", voucherTypeId)
      .single();

    if (rateError) {
      return {
        data: null,
        error: new Error("Commission rate not found for this voucher type"),
      };
    }

    // Step 4: Get voucher type name
    const { data: voucherType, error: voucherTypeError } = await supabase
      .from("voucher_types")
      .select("name")
      .eq("id", voucherTypeId)
      .single();

    if (voucherTypeError) {
      return { data: null, error: voucherTypeError };
    }

    // Step 5: Use completeVoucherSale to process the transaction
    const { data: receiptData, error: saleError } = await completeVoucherSale({
      voucher_inventory_id: voucher.id,
      retailer_id: retailer.id,
      terminal_id: terminalId, // Use the userId as the terminal_id
      voucher_type_id: voucherTypeId,
      sale_amount: voucher.amount,
      retailer_commission_pct: commissionRate.retailer_pct,
      agent_commission_pct: commissionRate.agent_pct,
    });

    if (saleError) {
      return { data: null, error: saleError };
    }

    // If we don't have receipt data from the RPC function yet,
    // we can generate a basic receipt with the available info
    let receipt: VoucherSaleReceipt | null = receiptData;
    
    if (!receipt && receiptData?.sale_id) {
      // Generate a ref number based on timestamp if not provided
      const refNumber = `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Create basic receipt with available data
      receipt = {
        sale_id: receiptData.sale_id,
        voucher_code: voucher.pin,
        serial_number: voucher.serial_number || "",
        ref_number: refNumber,
        retailer_name: retailer.name,
        terminal_name: `${retailer.name} Terminal`,
        terminal_id: terminalId,
        product_name: voucherType.name,
        sale_amount: voucher.amount,
        retailer_commission: voucher.amount * commissionRate.retailer_pct,
        agent_commission: voucher.amount * commissionRate.agent_pct,
        timestamp: new Date().toISOString(),
        instructions: "Dial *136*(voucher number)#",
      };
    }

    return {
      data: {
        sale_id: receiptData?.sale_id || "",
        voucher: {
          pin: voucher.pin,
          serial_number: voucher.serial_number,
        },
        receipt: receipt,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Fetch sales history for a terminal (using virtual terminal approach)
 */
export async function fetchSalesHistory(terminalId: string): Promise<{
  data: any[] | null;
  error: PostgrestError | Error | null;
}> {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from("sales")
      .select(`
        id,
        sale_amount,
        retailer_commission,
        agent_commission,
        profit,
        created_at,
        voucher_inventory (
          pin,
          serial_number,
          voucher_types (
            name
          )
        )
      `)
      .eq("terminal_id", terminalId) // Use the userId as the terminal_id
      .order("created_at", { ascending: false });

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
