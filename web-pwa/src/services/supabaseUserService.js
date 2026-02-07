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
  const { email, password, name, role = 'educateur' } = userData;
  if (!email) throw new Error('Email requis');
  if (!password || password.length < 6) throw new Error('Mot de passe invalide');

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token || null;

  let res;
  try {
    res = await fetch('/.netlify/functions/admin-create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ email, password, name, role }),
    });
  } catch (err) {
    throw new Error('Impossible de contacter le serveur. Verifiez votre connexion et les fonctions Netlify.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.error || 'Erreur creation utilisateur';
    if (message.includes('Configuration Supabase manquante')) {
      throw new Error('Configuration serveur manquante. Verifiez les variables Netlify (SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY).');
    }
    throw new Error(message);
  }
  return data.user;
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
