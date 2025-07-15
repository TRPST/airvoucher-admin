import { createClient } from '@/utils/supabase/client';
import { Terminal, ResponseType } from '../types/adminTypes';

/**
 * Fetch terminals for a specific retailer
 */
export async function fetchTerminals(retailerId: string): Promise<ResponseType<Terminal[]>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('terminals')
    .select(
      `
      id,
      name,
      last_active,
      status
    `
    )
    .eq('retailer_id', retailerId);

  if (error) {
    return { data: null, error };
  }

  // Transform the data to match the Terminal type
  const terminals = data.map(terminal => ({
    id: terminal.id,
    name: terminal.name,
    last_active: terminal.last_active,
    status: terminal.status as 'active' | 'inactive',
    auth_user_id: '', // No longer in the database
    email: '', // Email not available in the current query
  }));

  return { data: terminals, error: null };
}

/**
 * Create a new terminal for a retailer
 */
export async function createTerminal(
  retailerId: string,
  name: string
): Promise<ResponseType<{ id: string }>> {
  const supabase = createClient();

  // Create the terminal for the retailer
  const { data: terminal, error: terminalError } = await supabase
    .from('terminals')
    .insert({
      retailer_id: retailerId,
      name,
      status: 'active',
    })
    .select('id')
    .single();

  if (terminalError) {
    return { data: null, error: terminalError };
  }

  return { data: terminal, error: null };
}

/**
 * Create a new terminal with user for a retailer
 */
export async function createTerminalWithUser({
  name,
  contact_person,
  retailer_id,
  email,
  password,
}: {
  name: string;
  contact_person: string;
  retailer_id: string;
  email: string;
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
        email: email,
        password: password,
        userData: {
          role: 'terminal',
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
        full_name: contact_person,
        email: email,
        role: 'terminal',
      })
      .select('id')
      .single();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // We can't delete the auth user here as we don't have admin privileges
      // The user will remain in Auth but without a profile
      return { data: null, error: profileError };
    }

    // Finally, create the terminal
    const { data: terminal, error: terminalError } = await supabase
      .from('terminals')
      .insert({
        name,
        retailer_id,
        status: 'active',
        auth_user_id: user.id,
      })
      .select('id')
      .single();

    if (terminalError) {
      console.error('Error creating terminal:', terminalError);
      // We can't delete the auth user here without admin privileges
      // Just return the error to the client
      return { data: null, error: terminalError };
    }

    return { data: terminal, error: null };
  } catch (error) {
    console.error('Unexpected error in createTerminalWithUser:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
