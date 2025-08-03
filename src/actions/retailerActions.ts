import { createClient } from "@/utils/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import { completeVoucherSale, VoucherSaleReceipt } from "@/lib/sale/completeVoucherSale";

export type RetailerProfile = {
  id: string;
  name: string;
  balance: number;
  credit_limit: number;
  credit_used: number;
  commission_balance: number;
  status: "active" | "suspended" | "inactive";
  user_profile_id: string;
  profile?: {
    full_name: string;
    email: string;
  };
};

export type VoucherType = {
  id: string;
  name: string;
  amount: number;
  count: number;
  supplier_commission_pct: number;
};

export type Terminal = {
  id: string;
  name: string;
  last_active: string | null;
  status: "active" | "inactive";
};

export type Sale = {
  id: string;
  created_at: string;
  sale_amount: number;
  retailer_commission: number;
  terminal_name: string;
  voucher_type: string;
  voucher_amount: number;
  pin: string;
  serial_number?: string;
  ref_number: string;
};

/**
 * Fetch the retailer profile for the current user
 */
export async function fetchMyRetailer(userId: string): Promise<{
  data: RetailerProfile | null;
  error: PostgrestError | Error | null;
}> {
  const supabase = createClient();
  
  try {
    console.log("Fetching retailer for user ID:", userId);

    const { data, error } = await supabase
      .from("retailers")
      .select(
        `
        id,
        name,
        balance,
        credit_limit,
        credit_used,
        commission_balance,
        status,
        user_profile_id,
        profiles!retailers_user_profile_id_fkey(full_name, email)
      `
      )
      .eq("user_profile_id", userId);

    if (error) {
      console.error("Supabase error:", error);
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      console.log("No retailer found for user ID:", userId);
      return {
        data: null,
        error: new Error("No retailer found for this user"),
      };
    }

    // Use the first retailer found (should be just one)
    const retailerData = data[0];

    // Transform the data to match the RetailerProfile type
    const retailer: RetailerProfile = {
      id: retailerData.id,
      name: retailerData.name,
      balance: retailerData.balance || 0,
      credit_limit: retailerData.credit_limit || 0,
      credit_used: retailerData.credit_used || 0,
      commission_balance: retailerData.commission_balance || 0,
      status: retailerData.status || "inactive",
      user_profile_id: retailerData.user_profile_id,
      profile: {
        full_name: retailerData.profiles?.[0]?.full_name || "",
        email: retailerData.profiles?.[0]?.email || "",
      },
    };

    console.log("Retailer found:", retailer.name);
    return { data: retailer, error: null };
  } catch (err) {
    console.error("Unexpected error in fetchMyRetailer:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Fetch all available voucher type names
 * Only returns active voucher types for sale operations
 */
export async function fetchAvailableVoucherTypes(): Promise<{
  data: string[] | null;
  error: PostgrestError | Error | null;
}> {
  const supabase = createClient();
  
  try {
    console.log("Fetching available voucher type names");

    // Get all active voucher types 
    const { data: voucherTypes, error: voucherTypesError } = await supabase
      .from("voucher_types")
      .select("name")
      .eq("is_active", true)  // Only fetch active voucher types for sales
      .order("name");
      
    if (voucherTypesError) {
      console.error("Error fetching voucher types:", voucherTypesError);
      return { data: null, error: voucherTypesError };
    }
    
    if (!voucherTypes || voucherTypes.length === 0) {
      console.log("No active voucher types found");
      return { data: [], error: null };
    }
    
    // Extract unique voucher type names
    const uniqueNames = [...new Set(voucherTypes.map(type => type.name))];
    
    console.log(`Found ${uniqueNames.length} unique active voucher types`);
    return { data: uniqueNames, error: null };
  } catch (err) {
    console.error("Unexpected error in fetchAvailableVoucherTypes:", err);
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
    const typeIds = voucherTypes.map(type => type.id);
    
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
    voucherTypes.forEach(type => {
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
 * Sell a voucher
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

    // Step 2: Get terminal and retailer information
    const { data: terminal, error: terminalError } = await supabase
      .from("terminals")
      .select("retailer_id, name")
      .eq("id", terminalId)
      .single();

    if (terminalError) {
      return { data: null, error: terminalError };
    }

    // Step 3: Get retailer information
    const { data: retailer, error: retailerError } = await supabase
      .from("retailers")
      .select("id, name, agent_profile_id, commission_group_id")
      .eq("id", terminal.retailer_id)
      .single();

    if (retailerError) {
      return { data: null, error: retailerError };
    }

    // Step 4: Get commission rates for this retailer's group and voucher type
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

    // Step 5: Get voucher type name
    const { data: voucherType, error: voucherTypeError } = await supabase
      .from("voucher_types")
      .select("name")
      .eq("id", voucherTypeId)
      .single();

    if (voucherTypeError) {
      return { data: null, error: voucherTypeError };
    }

    // Step 6: Use completeVoucherSale to process the transaction
    const { data: receiptData, error: saleError } = await completeVoucherSale({
      voucher_inventory_id: voucher.id,
      retailer_id: retailer.id,
      terminal_id: terminalId,
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
        terminal_name: terminal.name,
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
 * Fetch sales history with optional filters
 */
export async function fetchSalesHistory({
  terminalId,
  startDate,
  endDate,
}: {
  terminalId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{
  data: Sale[] | null;
  error: PostgrestError | null;
}> {
  const supabase = createClient();
  
  let query = supabase.from("sales").select(`
    id,
    created_at,
    sale_amount,
    retailer_commission,
    terminals(name),
    voucher_inventory(
      pin,
      serial_number,
      amount,
      voucher_types(name)
    )
  `);

  if (terminalId) {
    query = query.eq("terminal_id", terminalId);
  }

  if (startDate) {
    query = query.gte("created_at", startDate);
  }

  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  // Order by newest first
  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    return { data: null, error };
  }

  // Transform the data to match the Sale type
  const sales = data.map((sale: any) => ({
    id: sale.id,
    created_at: sale.created_at,
    sale_amount: sale.sale_amount,
    retailer_commission: sale.retailer_commission,
    terminal_name: sale.terminals?.name || "",
    voucher_type: sale.voucher_inventory?.voucher_types?.name || "",
    voucher_amount: sale.voucher_inventory?.amount || 0,
    pin: sale.voucher_inventory?.pin || "",
    serial_number: sale.voucher_inventory?.serial_number,
    ref_number: `REF-${sale.id.slice(0, 8)}` // Generate a reference number based on sale ID
  }));

  return { data: sales, error: null };
}

/**
 * Fetch commission rate for a specific voucher type and retailer
 */
export async function fetchCommissionRate({
  retailerId,
  voucherTypeId,
}: {
  retailerId: string;
  voucherTypeId: string;
}): Promise<{
  data: { retailer_pct: number } | null;
  error: PostgrestError | Error | null;
}> {
  const supabase = createClient();
  
  try {
    // Get retailer's commission group
    const { data: retailer, error: retailerError } = await supabase
      .from("retailers")
      .select("commission_group_id")
      .eq("id", retailerId)
      .single();

    if (retailerError) {
      return { data: null, error: retailerError };
    }

    // Get commission rate for this group and voucher type
    const { data: commissionRate, error: rateError } = await supabase
      .from("commission_group_rates")
      .select("retailer_pct")
      .eq("commission_group_id", retailer.commission_group_id)
      .eq("voucher_type_id", voucherTypeId)
      .single();

    if (rateError) {
      return { data: null, error: rateError };
    }

    return { data: commissionRate, error: null };
  } catch (err) {
    console.error("Unexpected error in fetchCommissionRate:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Fetch complete commission data for a specific voucher type and retailer
 * This includes commission rate, calculated amount, and group name
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
  data: {
    rate: number;
    amount: number;
    groupName: string;
  } | null;
  error: PostgrestError | Error | null;
}> {
  const supabase = createClient();
  
  try {
    // Step 1: Get retailer's commission group ID
    const { data: retailer, error: retailerError } = await supabase
      .from("retailers")
      .select("commission_group_id")
      .eq("id", retailerId)
      .single();

    if (retailerError) {
      console.error("Error fetching retailer:", retailerError);
      return { data: null, error: retailerError };
    }

    if (!retailer?.commission_group_id) {
      return {
        data: null,
        error: new Error("Retailer has no commission group assigned"),
      };
    }

    // Step 2: Get commission group name
    const { data: commissionGroup, error: groupError } = await supabase
      .from("commission_groups")
      .select("name")
      .eq("id", retailer.commission_group_id)
      .single();

    if (groupError) {
      console.error("Error fetching commission group:", groupError);
      return { data: null, error: groupError };
    }

    // Step 3: Get retailer commission rate for this voucher type
    const { data: commissionRate, error: rateError } = await supabase
      .from("commission_group_rates")
      .select("retailer_pct")
      .eq("commission_group_id", retailer.commission_group_id)
      .eq("voucher_type_id", voucherTypeId)
      .single();

    if (rateError) {
      console.error("Error fetching commission rate:", rateError);
      return {
        data: null,
        error: new Error("Commission rate not found for this voucher type and retailer group"),
      };
    }

    // Step 4: Get supplier commission rate from voucher type
    const { data: voucherType, error: voucherTypeError } = await supabase
      .from("voucher_types")
      .select("supplier_commission_pct")
      .eq("id", voucherTypeId)
      .single();

    if (voucherTypeError) {
      console.error("Error fetching voucher type:", voucherTypeError);
      return { data: null, error: voucherTypeError };
    }

    // Step 5: Calculate the correct commission amount
    // Handle the different formats:
    // - supplier_commission_pct is stored as whole number (3.00 = 3%)
    // - retailer_pct is stored as decimal (0.07 = 7%)
    const supplierCommissionPct = (voucherType.supplier_commission_pct || 0) / 100; // Convert 3.00 to 0.03
    const retailerPct = commissionRate.retailer_pct || 0; // Already decimal format 0.07
    
    // Calculate: Retailer gets a percentage of what Airvoucher receives from the supplier
    const supplierCommissionAmount = voucherValue * supplierCommissionPct;
    const retailerCommissionAmount = supplierCommissionAmount * retailerPct;

    // console.log('Commission calculation:', {
    //   voucherValue,
    //   supplierCommissionPct_raw: voucherType.supplier_commission_pct,
    //   supplierCommissionPct_decimal: supplierCommissionPct,
    //   retailerPct_raw: commissionRate.retailer_pct,
    //   retailerPct_decimal: retailerPct,
    //   supplierCommissionAmount,
    //   retailerCommissionAmount
    // });

    return {
      data: {
        rate: retailerPct, // Already in decimal format for display
        amount: retailerCommissionAmount,
        groupName: commissionGroup.name || "Unknown",
      },
      error: null,
    };
  } catch (err) {
    console.error("Unexpected error in fetchRetailerCommissionData:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Fetch terminals for a retailer
 */
export async function fetchTerminals(retailerId: string): Promise<{
  data: Terminal[] | null;
  error: PostgrestError | null;
}> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("terminals")
    .select(
      `
      id,
      name,
      last_active,
      status
    `
    )
    .eq("retailer_id", retailerId);

  if (error) {
    return { data: null, error };
  }

  // Transform the data to match the Terminal type
  const terminals = data.map((terminal) => ({
    id: terminal.id,
    name: terminal.name,
    last_active: terminal.last_active,
    status: terminal.status as "active" | "inactive",
  }));

  return { data: terminals, error: null };
}

/**
 * Create a new terminal for a retailer with a cashier account
 */
export async function createTerminalForRetailer({
  retailerId,
  terminalName,
  cashierEmail,
  cashierPassword,
}: {
  retailerId: string;
  terminalName: string;
  cashierEmail: string;
  cashierPassword: string;
}): Promise<{
  data: { terminal: Terminal; cashierId: string } | null;
  error: PostgrestError | Error | null;
}> {
  try {
    // Use the API route to create a cashier user and terminal
    const response = await fetch('/api/retailer/create-cashier', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: cashierEmail,
        password: cashierPassword,
        terminalName,
        retailerId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { data: null, error: new Error(errorData.error || 'Failed to create terminal') };
    }

    const data = await response.json();

    return {
      data: {
        terminal: data.terminal,
        cashierId: data.cashierId,
      },
      error: null,
    };
  } catch (err) {
    console.error("Unexpected error in createTerminalForRetailer:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
