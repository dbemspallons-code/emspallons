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

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('❌ Variables Supabase manquantes dans Netlify Dashboard');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async (req, context) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    const { subscriber_id } = JSON.parse(req.body || '{}');

    if (!subscriber_id) {
      return new Response(
        JSON.stringify({ error: 'subscriber_id requis' }),
        { status: 400, headers }
      );
    }

    // Générer un token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Insérer dans Supabase
    const { data, error } = await supabase
      .from('qr_codes')
      .insert([{ 
        subscriber_id, 
        token, 
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
