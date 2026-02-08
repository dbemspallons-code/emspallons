import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Variables Supabase manquantes (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export default async (req, context) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (req.method === 'OPTIONS') return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  try {
    const { token, line, controllerId, controllerCode } = JSON.parse(req.body || '{}');
    if (!token || !line) return new Response(JSON.stringify({ error: 'token and line required' }), { status: 400, headers });
    if (!controllerId || !controllerCode) return new Response(JSON.stringify({ error: 'controllerId et controllerCode requis' }), { status: 400, headers });

    const { data: controller, error: ctrlErr } = await supabase
      .from('controllers')
      .select('id, active, code, assigned_line_id')
      .eq('id', controllerId)
      .maybeSingle();
    if (ctrlErr) throw ctrlErr;
    if (!controller || controller.active === false) {
      return new Response(JSON.stringify({ error: 'Controleur inactif' }), { status: 403, headers });
    }
    const expectedCode = (controller.code || '').toUpperCase();
    const providedCode = String(controllerCode || '').trim().toUpperCase();
    if (!expectedCode || providedCode !== expectedCode) {
      return new Response(JSON.stringify({ error: 'Code controleur invalide' }), { status: 403, headers });
    }
    if (controller.assigned_line_id && controller.assigned_line_id !== line) {
      return new Response(JSON.stringify({ allowed: false, reason: 'wrong_line', message: 'Ligne non autorisee' }), { status: 403, headers });
    }

    // Check recent locks for this token on the same line within 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: locks, error: lockErr } = await supabase
      .from('scan_locks')
      .select('*')
      .eq('token', token)
      .eq('line', line)
      .gte('locked_at', thirtyMinutesAgo)
      .limit(1);

    if (lockErr) throw lockErr;

    if (locks && locks.length > 0) {
      return new Response(JSON.stringify({ allowed: false, reason: 'recent_scan', message: 'QR code already scanned recently on this line' }), { status: 200, headers });
    }

    // Insert lock
    const { data, error } = await supabase
      .from('scan_locks')
      .insert([{ token, line }])
      .select();

    if (error) throw error;

    return new Response(JSON.stringify({ allowed: true, lock: data[0] }), { status: 201, headers });
  } catch (err) {
    console.error('lock-scan error', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};
