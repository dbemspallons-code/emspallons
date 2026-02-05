import { supabase } from '../supabase/supabaseClient';

export async function fetchUsers() {
  const { data, error } = await supabase.from('educators').select('*');
  if (error) throw error;
  return data || [];
}

export function subscribeUsers(callback) {
  // Real-time subscription using Supabase Realtime
  const channel = supabase.channel('public:educators').on('postgres_changes', { event: '*', schema: 'public', table: 'educators' }, payload => {
    // fetch fresh list (simpler) - in future we can patch delta updates
    fetchUsers().then(callback).catch(err => console.error('subscription fetchUsers failed', err));
  }).subscribe();

  // Return unsubscribe
  return () => supabase.removeChannel(channel);
}

export async function createUser(userData, options = {}) {
  // Create Supabase Auth user via server (recommended) -- for client, we use signUp
  const { email, password, name, role = 'educator' } = userData;
  if (!email) throw new Error('Email required');
  // Sign up on client (will require email confirmation depending on your supabase setup)
  await supabase.auth.signUp({ email, password });
  const { data: users } = await supabase.from('educators').insert([{ email, name, role }]).select().limit(1);
  return users && users[0];
}

export async function updateUser(userId, updates) {
  const { data, error } = await supabase.from('educators').update(updates).eq('id', userId).select().limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteUser(userId) {
  const { error } = await supabase.from('educators').update({ active: false }).eq('id', userId);
  if (error) throw error;
  return { success: true };
}
