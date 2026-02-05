import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async (req, context) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
  if (req.method === 'OPTIONS') return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  if (req.method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  try {
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