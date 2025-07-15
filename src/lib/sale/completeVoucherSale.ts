import { createClient } from '@/utils/supabase/client';

export interface CompleteVoucherSaleParams {
  voucher_inventory_id: string;
  retailer_id: string;
  terminal_id: string;
  in_voucher_type_id: string;
  sale_amount: number;
  retailer_commission_pct: number;
  agent_commission_pct: number;
}

export interface VoucherSaleReceipt {
  sale_id: string;
  voucher_code: string;
  serial_number: string;
  ref_number: string;
  retailer_name: string;
  retailer_id: string;
  terminal_name: string;
  terminal_id: string;
  product_name: string;
  sale_amount: number;
  retailer_commission: number;
  agent_commission: number;
  timestamp: string;
  amount_from_balance: number;
  amount_from_credit: number;
  instructions: string;
  help: string;
  website_url: string;
}

/**
 * Completes a voucher sale transaction by calling the Supabase RPC function
 *
 * This function will:
 * 1. Mark the voucher as sold in voucher_inventory
 * 2. Create a new sale record
 * 3. Add a transaction record
 * 4. Update retailer balance and commission
 * 5. Update terminal last_active timestamp
 *
 * All operations are performed in a single database transaction
 */
export const completeVoucherSale = async (
  params: CompleteVoucherSaleParams
): Promise<{ data: VoucherSaleReceipt | null; error: Error | null }> => {
  const supabase = createClient();

  try {
    // Call the RPC function
    const { data, error } = await supabase.rpc('complete_voucher_sale', params);

    if (error) {
      console.error('Error completing voucher sale:', error);
      return { data: null, error };
    }

    if (!data) {
      return {
        data: null,
        error: new Error('Sale completed but no receipt data returned'),
      };
    }

    // Use instructions from database, fallback to generated instructions if empty
    let fallbackInstructions = 'Dial *136*(voucher number)#';
    if (data.product_name && !data.instructions) {
      const productLower = data.product_name.toLowerCase();

      // Simple instruction generation based on product name
      if (productLower.includes('vodacom')) {
        fallbackInstructions = 'Dial *135*(voucher number)#';
      } else if (productLower.includes('mtn')) {
        fallbackInstructions = 'Dial *136*(voucher number)#';
      } else if (productLower.includes('telkom')) {
        fallbackInstructions = 'Dial *180*(voucher number)#';
      } else if (productLower.includes('cellc')) {
        fallbackInstructions = 'Dial *102*(voucher number)#';
      } else if (productLower.includes('netflix') || productLower.includes('showmax')) {
        fallbackInstructions = "Visit provider website and enter code in 'Redeem Voucher' section";
      }
    }

    // Prepare receipt data with fallback instructions if needed
    const receiptData: VoucherSaleReceipt = {
      ...data,
      instructions: data.instructions || fallbackInstructions,
    };

    return { data: receiptData, error: null };
  } catch (err) {
    console.error('Unexpected error in completeVoucherSale:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
};
