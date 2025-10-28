import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password, accessToken } = req.body;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (!accessToken || typeof accessToken !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing reset token' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Check for password complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return res.status(400).json({
        error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Set the session using the access token from the URL
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: accessToken, // For password reset, access token is used as refresh token
    });

    if (sessionError) {
      console.error('Error setting session:', sessionError);
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Update the user's password
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      console.error('Error updating password:', updateError);
      return res.status(400).json({ error: 'Failed to update password. Please try again.' });
    }

    // Sign out the user after password reset for security
    await supabase.auth.signOut();

    return res.status(200).json({
      message: 'Password updated successfully. Please log in with your new password.',
    });
  } catch (error) {
    console.error('Unexpected error in reset-password:', error);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
}
