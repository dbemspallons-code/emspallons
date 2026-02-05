import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase env vars for reset-scan-logs');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers });
  }

  try {
    const authHeader = req.headers?.get?.('authorization') || req.headers?.get?.('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }
    const token = authHeader.replace('Bearer ', '').trim();
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }

    const userId = userData.user.id;
    const { data: profile, error: profileErr } = await supabase
      .from('educators')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr) {
      console.error('reset-scan-logs profile error', profileErr);
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers });
    }

    if (!profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers });
    }

    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date();
    end.setUTCHours(23, 59, 59, 999);

    const { error: delLogsErr } = await supabase
      .from('scan_logs')
      .delete()
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (delLogsErr) {
      console.error('reset-scan-logs delete error', delLogsErr);
      return new Response(JSON.stringify({ error: 'Delete failed' }), { status: 500, headers });
    }

    // Optionally clear scan locks for the day
    await supabase
      .from('scan_locks')
      .delete()
      .gte('locked_at', start.toISOString())
      .lte('locked_at', end.toISOString());

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch (err) {
    console.error('reset-scan-logs error', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers });
  }
};
