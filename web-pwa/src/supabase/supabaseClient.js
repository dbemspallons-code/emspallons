import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

let supabaseInitError = '';
if (!supabaseUrl || !supabaseAnonKey) {
  supabaseInitError =
    'Variables Supabase manquantes — vérifiez .env.local (local) ou les variables Netlify (production).\n\n' +
    'Attendus:\n- VITE_SUPABASE_URL\n- VITE_SUPABASE_ANON_KEY\n\n' +
    'Voir .env.example pour le template.';
} else if (!/^https?:\/\//i.test(supabaseUrl)) {
  supabaseInitError = 'VITE_SUPABASE_URL invalide. Exemple : https://xxxx.supabase.co';
}

export { supabaseInitError };
export const supabase = supabaseInitError ? null : createClient(supabaseUrl, supabaseAnonKey);

if (!supabaseInitError) {
  console.log('✅ Supabase client initialisé');
}
