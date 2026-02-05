/**
 * Netlify Function: Verify QR Token
 * 
 * Route: /.netlify/functions/verify-qr-token
 * Method: POST
 * 
 * Request body:
 * {
 *   "token": "qr-token-string"
 * }
 * 
 * Response:
 * {
 *   "valid": true,
 *   "subscriber": { ... },
 *   "status": "active" or "expired" or "not_found"
 * }
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async (req, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

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
    const { token } = JSON.parse(req.body || '{}');

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'token requis' }),
        { status: 400, headers }
      );
    }

    // Chercher le QR code dans Supabase
    const { data: qrCodes, error: qrError } = await supabase
      .from('qr_codes')
      .select('*, subscribers(*)')
      .eq('token', token)
      .limit(1);

    if (qrError) {
      console.error('Supabase error:', qrError);
      return new Response(
        JSON.stringify({ error: 'Erreur base de données' }),
        { status: 500, headers }
      );
    }

    if (!qrCodes || qrCodes.length === 0) {
      return new Response(
        JSON.stringify({ 
          valid: false,
          status: 'not_found',
          message: 'QR code introuvable'
        }),
        { status: 200, headers }
      );
    }

    const qrCode = qrCodes[0];

    // Vérifier l'expiration
    if (qrCode.expires_at && new Date(qrCode.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          valid: false,
          status: 'expired',
          message: 'QR code expiré',
          expired_at: qrCode.expires_at
        }),
        { status: 200, headers }
      );
    }

    // Vérifier le statut
    if (qrCode.status !== 'active') {
      return new Response(
        JSON.stringify({ 
          valid: false,
          status: qrCode.status,
          message: `QR code ${qrCode.status}`
        }),
        { status: 200, headers }
      );
    }

    // Valide !
    return new Response(
      JSON.stringify({ 
        valid: true,
        status: 'active',
        subscriber: qrCode.subscribers ? {
          id: qrCode.subscribers.id,
          name: qrCode.subscribers.name,
          email: qrCode.subscribers.email
        } : null,
        qr_code_id: qrCode.id
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers }
    );
  }
};
