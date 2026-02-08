import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Variables Supabase manquantes (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function getBearer(req) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export default async (req, context) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
  if (req.method === 'OPTIONS') return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  if (req.method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  try {
    const token = getBearer(req);
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });

    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !authData?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });

    const { data: profile } = await supabase
      .from('educators')
      .select('id, role')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (!profile || profile.role !== 'admin') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers });

    const params = new URL(req.url).searchParams;
    const limit = parseInt(params.get('limit') || '100', 10);

    const { data, error } = await supabase
      .from('scan_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('get-scan-logs Supabase error', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ success: true, logs: data }), { status: 200, headers });
  } catch (err) {
    console.error('get-scan-logs error', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};
