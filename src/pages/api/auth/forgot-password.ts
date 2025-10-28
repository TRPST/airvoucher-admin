import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get the base URL for the password reset redirect
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const redirectUrl = `${protocol}://${host}/auth/reset-password`;

    // Send password reset email using Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      console.error('Error sending reset email:', error);
      // Don't reveal if email exists or not for security
      return res.status(200).json({
        message: 'If this email is registered, you will receive a password reset link shortly.',
      });
    }

    // Always return success message (don't reveal if email exists)
    return res.status(200).json({
      message: 'If this email is registered, you will receive a password reset link shortly.',
    });
  } catch (error) {
    console.error('Unexpected error in forgot-password:', error);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
}
