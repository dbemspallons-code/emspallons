import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async (req, context) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (req.method === 'OPTIONS') return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  try {
    const { token, line } = JSON.parse(req.body || '{}');
    if (!token || !line) return new Response(JSON.stringify({ error: 'token and line required' }), { status: 400, headers });

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
