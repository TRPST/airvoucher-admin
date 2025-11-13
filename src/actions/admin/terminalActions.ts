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
      status,
      short_code
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
    short_code: terminal.short_code,
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
  retailer_id,
  password,
}: {
  name: string;
  retailer_id: string;
  password: string;
}): Promise<ResponseType<{ id: string; aliasEmail: string }>> {
  const supabase = createClient();

  try {
    // Step 1: create terminal first
    const { data: terminal, error: terminalError } = await supabase
      .from('terminals')
      .insert({
        name,
        retailer_id,
        status: 'active',
      })
      .select('id, short_code')
      .single();

    if (terminalError) throw terminalError;

    // Step 2: Create the Supabase Auth user
    const aliasEmail = `${terminal.short_code.toLowerCase()}@terminal.local`;
    const response = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: aliasEmail,
        password,
        userData: { role: 'terminal' },
      }),
    });
    if (!response.ok) throw new Error('Failed to create user');
    const { user } = await response.json();

    // Step 3: Create profile for that auth user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: `${terminal.short_code.toLowerCase()} Terminal`,
        email: aliasEmail,
        role: 'terminal',
      })
      .select('id')
      .single();

    if (profileError) throw profileError;

    // Step 4: Link terminal to that profile ID
    const { error: linkError } = await supabase
      .from('terminals')
      .update({ auth_user_id: profile.id })
      .eq('id', terminal.id);

    if (linkError) throw linkError;

    return { data: { id: terminal.id, aliasEmail }, error: null };
  } catch (err) {
    console.log(`${JSON.stringify(err, null, 2)}`);
    console.error('Error creating terminal with alias user:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Update an existing terminal's details
 */
export async function updateTerminal(
  terminalId: string,
  updates: Partial<Pick<Terminal, 'name' | 'status'>>
): Promise<ResponseType<Terminal>> {
  const supabase = createClient();

  const payload: Record<string, unknown> = {};
  if (typeof updates.name !== 'undefined') {
    payload.name = updates.name;
  }
  if (typeof updates.status !== 'undefined') {
    payload.status = updates.status;
  }

  const { data, error } = await supabase
    .from('terminals')
    .update(payload)
    .eq('id', terminalId)
    .select(
      `
      id,
      name,
      last_active,
      status,
      short_code
    `
    )
    .single();

  if (error) {
    return { data: null, error };
  }

  const terminal: Terminal = {
    id: data.id,
    name: data.name,
    last_active: data.last_active,
    status: data.status as 'active' | 'inactive',
    short_code: data.short_code,
    auth_user_id: '',
    email: '',
  };

  return { data: terminal, error: null };
}

/**
 * Reset a terminal's password
 */
export async function resetTerminalPassword(
  terminalId: string,
  password?: string
): Promise<ResponseType<{ password: string; shortCode: string }>> {
  try {
    const response = await fetch('/api/admin/reset-terminal-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ terminalId, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to reset password');
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    console.error('Error resetting terminal password:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
