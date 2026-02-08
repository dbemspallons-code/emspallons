/**
 * Netlify Function: Generate QR Token
 * 
 * Route: /.netlify/functions/generate-qr-token
 * Method: POST
 * 
 * Request body:
 * {
 *   "subscriber_id": "uuid-of-subscriber"
 * }
 * 
 * Response:
 * {
 *   "qr_code": {
 *     "id": "...",
 *     "subscriber_id": "...",
 *     "token": "...",
 *     "expires_at": "...",
 *     "status": "active"
 *   }
 * }
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Variables Supabase manquantes (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function getBearer(req) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export default async (req, context) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers }
    );
  }

  try {
    const bearerToken = getBearer(req);
    if (!bearerToken) {
      return new Response(JSON.stringify({ error: 'Accès refusé' }), { status: 401, headers });
    }

    const { data: authData, error: authErr } = await supabase.auth.getUser(bearerToken);
    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Accès refusé' }), { status: 401, headers });
    }

    const { data: profile } = await supabase
      .from('educators')
      .select('id, role, active')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (!profile || profile.active === false || !['admin', 'educateur'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Accès refusé' }), { status: 403, headers });
    }

    const { subscriber_id } = JSON.parse(req.body || '{}');

    if (!subscriber_id) {
      return new Response(
        JSON.stringify({ error: 'subscriber_id requis' }),
        { status: 400, headers }
      );
    }

    // Générer un token
    const qrToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Insérer dans Supabase
    const { data, error } = await supabase
      .from('qr_codes')
      .insert([{ 
        subscriber_id, 
        token: qrToken, 
        expires_at: expiresAt,
        status: 'active'
      }])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        qr_code: data[0] 
      }),
      { status: 201, headers }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers }
    );
  }
};
