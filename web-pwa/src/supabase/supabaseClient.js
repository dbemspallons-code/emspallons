import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Variables Supabase manquantes — vérifiez .env.local (local) ou les variables Netlify (production).\n\n' +
    'Attendus:\n- VITE_SUPABASE_URL\n- VITE_SUPABASE_ANON_KEY\n\n' +
    'Voir .env.example pour le template.'
  );
}

if (!/^https?:\/\//i.test(supabaseUrl)) {
  throw new Error('❌ VITE_SUPABASE_URL invalide. Exemple : https://xxxx.supabase.co');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('✅ Supabase client initialisé');
