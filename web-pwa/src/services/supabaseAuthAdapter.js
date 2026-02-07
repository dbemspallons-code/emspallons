import { supabase } from '../supabase/supabaseClient';

export function initAuth() {
  // Supabase client initialisé via supabaseClient.js
  return supabase;
}

export function onAuthStateChanged(callback) {
  // Supabase v2 provides onAuthStateChange
  const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user || null;
    callback(user);
  });
  return () => listener?.unsubscribe?.();
}

export async function signIn({ email, password }) {
  const res = await supabase.auth.signInWithPassword({ email, password });
  return res;
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function createUserWithEmailAndPassword({ email, password }) {
  // This uses client signup; for admin creation, use server-side createUser
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const options = origin ? { emailRedirectTo: `${origin}/auth/callback` } : undefined;
  return supabase.auth.signUp({ email, password, options });
}

export async function updatePassword(newPassword) {
  // Supabase requires the user to be logged in and then use updateUser
  return supabase.auth.updateUser({ password: newPassword });
}

// Educator profile helpers (backed by 'educators' table)
export async function getEducatorById(id) {
  const { data, error } = await supabase.from('educators').select('*').eq('id', id).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function setEducator(id, payload, opts = { merge: true }) {
  // if merge true, do upsert
  const insert = { id, ...payload };
  const { data, error } = await supabase.from('educators').upsert(insert).select().limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function anyEducatorExists() {
  const { data, error } = await supabase.from('educators').select('id', { count: 'exact', head: false }).limit(1);
  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

export async function getFirstEducator() {
  const { data, error } = await supabase.from('educators').select('*').order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user || null;
}
