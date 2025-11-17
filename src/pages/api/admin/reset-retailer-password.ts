import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/utils/supabase/admin';
import { generatePassword } from '@/utils/password';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { retailerId, password: customPassword } = req.body;

    if (!retailerId) {
      return res.status(400).json({ error: 'Retailer ID is required' });
    }

    // Create admin client with service role key
    const supabase = createAdminClient();

    // Get retailer and its user_profile_id
    const { data: retailer, error: retailerError } = await supabase
      .from('retailers')
      .select('user_profile_id, short_code')
      .eq('id', retailerId)
      .single();

    if (retailerError || !retailer) {
      console.error('Error fetching retailer:', retailerError);
      return res.status(404).json({ error: 'Retailer not found' });
    }

    if (!retailer.user_profile_id) {
      return res.status(400).json({ error: 'Retailer does not have an associated user account' });
    }

    // Use custom password if provided, otherwise generate one
    const newPassword = customPassword || generatePassword();

    // Update user password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      retailer.user_profile_id,
      {
        password: newPassword,
      }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return res.status(400).json({ error: updateError.message });
    }

    return res.status(200).json({
      password: newPassword,
      shortCode: retailer.short_code,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
